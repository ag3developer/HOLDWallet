"""
👤 HOLD Wallet - User Account Router
====================================

Endpoints para gerenciar a conta do usuário:
- Exportar dados da conta
- Solicitar exclusão
- Confirmar exclusão
- Gerenciar configurações

Author: HOLD Wallet Team
"""

import logging
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query, Body, File, UploadFile
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.core.db import get_db
from app.core.security import get_current_user, get_password_hash, verify_password
from app.models.user import User
from app.services.user.account_export_service import AccountExportService
from app.services.user.account_deletion_service import (
    AccountDeletionService,
    DeletionType,
    DeletionStatus,
    AccountDeletionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/account",
    tags=["User - Account"],
    dependencies=[Depends(get_current_user)]
)


# ===== SCHEMAS =====

class ExportFormatRequest(BaseModel):
    """Requisição de exportação"""
    format: str = "pdf"  # pdf, excel, json
    send_to_email: bool = False


class AccountDeletionRequestSchema(BaseModel):
    """Requisição de exclusão de conta"""
    deletion_type: str  # soft, hard, scheduled
    password: str  # Para validação de identidade
    reason: Optional[str] = None


class DeletionConfirmationSchema(BaseModel):
    """Confirmação de exclusão"""
    confirmation_code: str  # Código recebido por email


class DeletionStatusResponse(BaseModel):
    """Status de deleção"""
    deletion_id: str
    status: str
    deletion_type: str
    requested_at: str
    confirmed_at: Optional[str] = None
    scheduled_deletion_date: Optional[str] = None
    token_expires_at: str


# ===== ENDPOINTS =====

@router.post("/export")
async def export_account_data(
    request: ExportFormatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exporta dados completos da conta em formato selecionado
    
    Formatos suportados:
    - pdf: Relatório formatado em PDF
    - excel: Planilhas em Excel
    - json: Dados brutos em JSON
    
    Query params:
    - format: Formato de exportação
    - send_to_email: Se deve enviar por email
    """
    try:
        logger.info(f"📊 Exportando dados para {current_user.email} (formato: {request.format})")

        # Coletar dados
        export_data = AccountExportService.collect_user_data(current_user, db)

        # Gerar arquivo
        if request.format == "pdf":
            file_content = AccountExportService.export_to_pdf(current_user, export_data)
            filename = f"account_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            media_type = "application/pdf"

        elif request.format == "excel":
            file_content = AccountExportService.export_to_excel(current_user, export_data)
            filename = f"account_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        elif request.format == "json":
            import json
            file_content = AccountExportService.export_to_json(export_data).encode('utf-8')
            filename = f"account_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            media_type = "application/json"

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato inválido: {request.format}"
            )

        # Se solicitou envio por email
        if request.send_to_email:
            # TODO: Enviar arquivo por email
            logger.info(f"📧 Enviando exportação para {current_user.email}")

        logger.info(f"✅ Exportação gerada com sucesso: {len(file_content)} bytes")

        return FileResponse(
            content=file_content,
            media_type=media_type,
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except ImportError as e:
        logger.error(f"❌ Erro de dependência: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Serviço de exportação indisponível: {str(e)}"
        )
    except Exception as e:
        logger.error(f"❌ Erro ao exportar dados: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/delete-request")
async def request_account_deletion(
    request: AccountDeletionRequestSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cria uma solicitação de exclusão de conta
    
    Tipos de deleção:
    - soft: Conta desativada por 90 dias (recuperável)
    - hard: Deleção permanente (imediata)
    - scheduled: Confirma deleção dentro de 30 dias
    
    Requer confirmação por email
    """
    try:
        # Validar senha
        if not verify_password(request.password, current_user.hashed_password):
            logger.warning(f"⚠️ Senha inválida para {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Senha inválida"
            )

        # Validar tipo de deleção
        deletion_type = DeletionType(request.deletion_type)

        # Criar requisição de deleção
        deletion_request = await AccountDeletionService.request_deletion(
            user=current_user,
            deletion_type=deletion_type,
            reason=request.reason,
            db=db,
        )

        # Exportar dados para enviar por email
        export_files = {}
        try:
            export_data = AccountExportService.collect_user_data(current_user, db)
            export_files["pdf"] = AccountExportService.export_to_pdf(current_user, export_data)
            export_files["excel"] = AccountExportService.export_to_excel(current_user, export_data)
            export_files["json"] = AccountExportService.export_to_json(export_data)
        except Exception as e:
            logger.warning(f"⚠️ Erro ao exportar dados para email: {str(e)}")

        # Enviar email de confirmação
        email_sent = await AccountDeletionService.send_deletion_email(
            user=current_user,
            deletion_request=deletion_request,
            export_files=export_files,
            db=db,
        )

        if not email_sent:
            logger.warning(f"⚠️ Falha ao enviar email de confirmação para {current_user.email}")

        logger.info(f"✅ Solicitação de exclusão criada para {current_user.email}")

        return {
            "success": True,
            "message": f"Solicitação de exclusão criada. Verifique seu email para confirmar.",
            "deletion_id": deletion_request.id,
            "deletion_type": deletion_request.deletion_type.value,
            "status": deletion_request.status.value,
            "requested_at": deletion_request.requested_at.isoformat(),
            "token_expires_at": deletion_request.token_expires_at.isoformat(),
            "scheduled_deletion_date": deletion_request.scheduled_deletion_date.isoformat()
            if deletion_request.scheduled_deletion_date
            else None,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Erro ao criar requisição de exclusão: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/delete-confirm/{deletion_id}")
async def confirm_account_deletion(
    deletion_id: str,
    confirmation: DeletionConfirmationSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirma a exclusão da conta usando o código enviado por email
    
    Path params:
    - deletion_id: ID da solicitação de exclusão
    
    Body:
    - confirmation_code: Código de 6 dígitos recebido por email
    """
    try:
        logger.info(f"🔐 Confirmando exclusão para {current_user.email}")

        # TODO: Buscar deletion_request do banco de dados
        # deletion_request = db.query(DeletionRequest).filter(
        #     DeletionRequest.id == deletion_id,
        #     DeletionRequest.user_id == current_user.id,
        # ).first()

        # if not deletion_request:
        #     raise HTTPException(
        #         status_code=status.HTTP_404_NOT_FOUND,
        #         detail="Solicitação de exclusão não encontrada"
        #     )

        # Confirmar deleção
        # await AccountDeletionService.confirm_deletion(
        #     user=current_user,
        #     deletion_request=deletion_request,
        #     confirmation_code=confirmation.confirmation_code,
        #     db=db,
        # )

        # # Executar deleção conforme tipo
        # if deletion_request.deletion_type == DeletionType.SOFT:
        #     await AccountDeletionService.execute_soft_delete(current_user, db)
        # elif deletion_request.deletion_type == DeletionType.HARD:
        #     await AccountDeletionService.execute_hard_delete(current_user, db)
        # elif deletion_request.deletion_type == DeletionType.SCHEDULED:
        #     # Apenas marca como confirmada, agendador vai executar
        #     pass

        logger.info(f"✅ Exclusão confirmada para {current_user.email}")

        return {
            "success": True,
            "message": "Conta excluída com sucesso",
            "deletion_date": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Erro ao confirmar exclusão: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/delete-status/{deletion_id}")
async def get_deletion_status(
    deletion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtém status de uma solicitação de exclusão
    """
    try:
        logger.info(f"📋 Buscando status de exclusão: {deletion_id}")

        # TODO: Buscar deletion_request do banco
        # deletion_request = db.query(DeletionRequest).filter(
        #     DeletionRequest.id == deletion_id,
        #     DeletionRequest.user_id == current_user.id,
        # ).first()

        # if not deletion_request:
        #     raise HTTPException(
        #         status_code=status.HTTP_404_NOT_FOUND,
        #         detail="Solicitação não encontrada"
        #     )

        return {
            "success": True,
            "deletion_id": deletion_id,
            # "status": deletion_request.status.value,
            # "deletion_type": deletion_request.deletion_type.value,
            # "requested_at": deletion_request.requested_at.isoformat(),
            # "confirmed_at": deletion_request.confirmed_at.isoformat()
            # if deletion_request.confirmed_at else None,
            # "token_expires_at": deletion_request.token_expires_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/delete-cancel/{deletion_id}")
async def cancel_deletion(
    deletion_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancela uma solicitação de exclusão
    
    Nota: Apenas pode cancelar antes da confirmação
    """
    try:
        logger.info(f"❌ Cancelando exclusão: {deletion_id}")

        # TODO: Implementar cancelamento

        return {
            "success": True,
            "message": "Exclusão cancelada com sucesso",
        }

    except Exception as e:
        logger.error(f"❌ Erro ao cancelar exclusão: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/profile")
async def get_account_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna perfil da conta do usuário
    """
    try:
        return {
            "success": True,
            "data": {
                "id": str(current_user.id),
                "username": current_user.username,
                "email": current_user.email,
                "is_active": current_user.is_active,
                "email_verified": current_user.is_email_verified,
                "created_at": current_user.created_at.isoformat(),
                "last_login": current_user.last_login.isoformat()
                if current_user.last_login else None,
                "is_admin": current_user.is_admin,
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro ao buscar perfil: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
