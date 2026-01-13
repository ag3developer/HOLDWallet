"""
🔐 KYC Router - User Endpoints
==============================
Endpoints para verificação KYC do usuário.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import uuid

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.kyc import KYCLevel, DocumentType, KYCPersonalData, KYCVerification
from app.models.wolkpay import WolkPayPayer, WolkPayInvoice, PersonType
from app.schemas.kyc import (
    KYCStartRequest, KYCPersonalDataRequest, KYCSubmitRequest,
    KYCStatusResponse, KYCVerificationResponse, KYCDocumentResponse,
    KYCRequirementsResponse, KYCLevelEnum, DocumentTypeEnum
)
from app.services.kyc_service import KYCService

router = APIRouter(prefix="/kyc", tags=["kyc"])


def get_client_info(request: Request) -> tuple:
    """Extrai IP e User-Agent do request"""
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip, user_agent


# ============================================================
# ENDPOINTS DO USUÁRIO
# ============================================================

@router.get("/prefill-data")
async def get_prefill_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Busca dados já existentes do usuário para pré-preencher o formulário KYC.
    
    Fontes de dados:
    1. KYC anterior (se existir)
    2. Dados de pagamentos WolkPay anteriores
    3. Dados do perfil do usuário
    
    Retorna dados parciais para facilitar o preenchimento.
    """
    prefill_data = {}
    
    # 1. Tentar buscar de KYC anterior (através da verificação)
    verification = db.query(KYCVerification).filter(
        KYCVerification.user_id == current_user.id
    ).order_by(desc(KYCVerification.created_at)).first()
    
    if verification and verification.personal_data:
        kyc_data = verification.personal_data
        prefill_data = {
            "full_name": kyc_data.full_name,
            "document_number": kyc_data.document_number,
            "birth_date": str(kyc_data.birth_date) if kyc_data.birth_date else None,
            "phone": kyc_data.phone,
            "mother_name": kyc_data.mother_name,
            "zip_code": kyc_data.zip_code,
            "street": kyc_data.street,
            "number": kyc_data.number,
            "complement": kyc_data.complement,
            "neighborhood": kyc_data.neighborhood,
            "city": kyc_data.city,
            "state": kyc_data.state,
            "source": "kyc"
        }
        return {"success": True, "data": prefill_data, "source": "kyc"}
    
    # 2. Tentar buscar de pagamentos WolkPay anteriores
    payer_data = db.query(WolkPayPayer).join(
        WolkPayInvoice,
        WolkPayInvoice.id == WolkPayPayer.invoice_id
    ).filter(
        WolkPayInvoice.beneficiary_id == str(current_user.id),
        WolkPayPayer.person_type == PersonType.PF  # Só pessoa física
    ).order_by(desc(WolkPayPayer.created_at)).first()
    
    if payer_data:
        prefill_data = {
            "full_name": payer_data.full_name,
            "document_number": payer_data.cpf,
            "birth_date": str(payer_data.birth_date) if payer_data.birth_date else None,
            "phone": payer_data.phone,
            "zip_code": payer_data.zip_code,
            "street": payer_data.street,
            "number": payer_data.number,
            "complement": payer_data.complement,
            "neighborhood": payer_data.neighborhood,
            "city": payer_data.city,
            "state": payer_data.state,
            "source": "wolkpay"
        }
        return {"success": True, "data": prefill_data, "source": "wolkpay"}
    
    # 3. Dados básicos do perfil do usuário
    # Usar username como fallback (User model não tem first_name/last_name)
    user_data = {
        "full_name": current_user.username if current_user.username else None,
        "source": "profile"
    }
    
    # Filtrar None
    prefill_data = {k: v for k, v in user_data.items() if v}
    
    if prefill_data:
        return {"success": True, "data": prefill_data, "source": "profile"}
    
    return {"success": True, "data": {}, "source": None}


@router.post("/start", response_model=KYCVerificationResponse)
async def start_verification(
    data: KYCStartRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Inicia uma nova verificação KYC.
    
    - **level**: Nível de KYC desejado (basic, intermediate, advanced)
    - **consent**: Consentimento LGPD (obrigatório)
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    try:
        # Converte enum do schema para enum do model
        level = KYCLevel(data.level.value)
        
        verification = await service.create_verification(
            user_id=current_user.id,
            level=level,
            consent=data.consent,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return verification
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/status", response_model=KYCStatusResponse)
async def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém o status atual da verificação KYC do usuário.
    
    Retorna:
    - Status da verificação
    - Nível atual
    - Progresso dos documentos
    - Próximos passos
    """
    service = KYCService(db)
    return await service.get_user_status(current_user.id)


@router.get("/my-limits")
async def get_my_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém os limites operacionais do usuário logado.
    
    Retorna os limites para cada serviço:
    - instant_trade: Compra/venda instantânea
    - p2p: Negociação P2P
    - wolkpay: Recebimento via PIX
    - withdraw_crypto: Saque em criptomoedas
    - withdraw_fiat: Saque em reais (PIX/TED)
    - internal_transfer: Transferência interna
    
    Cada serviço inclui:
    - daily_limit_brl: Limite diário em R$
    - monthly_limit_brl: Limite mensal em R$
    - transaction_limit_brl: Limite por operação em R$
    - is_enabled: Se o serviço está disponível
    - kyc_level: Nível KYC atual do usuário
    
    Valores None indicam limite ilimitado.
    """
    service = KYCService(db)
    
    # Obtém limites efetivos do usuário
    limits = await service.get_user_limits(current_user.id)
    
    # Obtém nível KYC
    kyc_level = await service.get_user_kyc_level(current_user.id)
    kyc_level_str = kyc_level.value if hasattr(kyc_level, 'value') else str(kyc_level)
    
    # Formata resposta amigável
    formatted_limits = {}
    for service_name, service_limits in limits.items():
        # Ignora chaves que não são serviços (kyc_level, kyc_level_name são strings)
        if not isinstance(service_limits, dict):
            continue
            
        daily = service_limits.get('daily_limit_brl')
        monthly = service_limits.get('monthly_limit_brl')
        per_op = service_limits.get('transaction_limit_brl')
        
        formatted_limits[service_name] = {
            "daily_limit_brl": float(daily) if daily else None,
            "monthly_limit_brl": float(monthly) if monthly else None,
            "transaction_limit_brl": float(per_op) if per_op else None,
            "is_enabled": service_limits.get('is_enabled', True),
            "is_unlimited_daily": daily is None,
            "is_unlimited_monthly": monthly is None,
            "is_unlimited_per_operation": per_op is None,
        }
    
    return {
        "kyc_level": kyc_level_str,
        "kyc_level_name": _get_level_name(kyc_level_str),
        "limits": formatted_limits,
        "message": _get_limits_message(kyc_level_str)
    }


def _get_level_name(level: str) -> str:
    """Retorna nome amigável do nível KYC"""
    names = {
        "none": "Sem Verificação",
        "basic": "Básico",
        "intermediate": "Intermediário", 
        "advanced": "Avançado",
        "premium": "Premium"
    }
    return names.get(level.lower(), level)


def _get_limits_message(level: str) -> str:
    """Retorna mensagem sobre os limites do nível"""
    messages = {
        "none": "Complete sua verificação KYC para aumentar seus limites operacionais.",
        "basic": "Você tem acesso aos limites básicos. Faça upgrade para limites maiores!",
        "intermediate": "Limites intermediários ativos. Upgrade para avançado para limites ainda maiores.",
        "advanced": "Limites avançados ativos. Você tem acesso a operações de alto volume.",
        "premium": "Limites premium! Você tem acesso ilimitado ou limites personalizados."
    }
    return messages.get(level.lower(), "")


@router.get("/verification", response_model=KYCVerificationResponse)
async def get_verification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém detalhes da verificação KYC ativa do usuário.
    """
    service = KYCService(db)
    verification = await service.get_active_verification(current_user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma verificação KYC encontrada"
        )
    
    return verification


@router.post("/personal-data", response_model=dict)
async def save_personal_data(
    data: KYCPersonalDataRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Salva os dados pessoais para verificação KYC.
    
    Se não existir verificação ativa, cria uma automaticamente com nível BASIC.
    
    Dados sensíveis são criptografados (LGPD compliant):
    - CPF, RG, telefone, endereço
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    # Obtém verificação ativa
    verification = await service.get_active_verification(current_user.id)
    
    # Se não existe verificação, criar automaticamente com nível BASIC
    if not verification:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[KYC] Criando verificação automática para usuário {current_user.id}")
        
        try:
            verification = await service.create_verification(
                user_id=current_user.id,
                level=KYCLevel.BASIC,
                consent=True,  # Consent implícito ao enviar dados
                ip_address=ip,
                user_agent=user_agent
            )
            logger.info(f"[KYC] Verificação criada: {verification.id}")
        except ValueError as e:
            # Se já existe verificação em andamento, tentar buscar novamente
            logger.warning(f"[KYC] Erro ao criar verificação: {e}")
            verification = await service.get_active_verification(current_user.id)
            if not verification:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
    
    try:
        personal_data = await service.save_personal_data(
            verification_id=verification.id,
            data=data,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "Dados pessoais salvos com sucesso",
            "verification_id": str(verification.id)
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/documents", response_model=KYCDocumentResponse)
async def upload_document(
    request: Request,
    document_type: DocumentTypeEnum = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Faz upload de um documento para verificação KYC.
    
    - **document_type**: Tipo do documento (identity_front, identity_back, selfie, etc)
    - **file**: Arquivo do documento (JPEG, PNG ou PDF, máx 10MB)
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    # Obtém verificação ativa
    verification = await service.get_active_verification(current_user.id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicie uma verificação KYC primeiro"
        )
    
    # Validação básica do arquivo
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome do arquivo é obrigatório"
        )
    
    try:
        # Converte enum
        doc_type = DocumentType(document_type.value)
        
        document = await service.upload_document(
            verification_id=verification.id,
            file=file.file,
            document_type=doc_type,
            original_filename=file.filename,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return document
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove um documento enviado.
    
    Só é possível remover documentos enquanto a verificação está pendente.
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    # Verifica se o documento pertence ao usuário
    verification = await service.get_active_verification(current_user.id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    # Verifica se o documento pertence à verificação
    doc_ids = [str(d.id) for d in verification.documents]
    if str(document_id) not in doc_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Documento não pertence à sua verificação"
        )
    
    try:
        success = await service.delete_document(
            document_id=document_id,
            ip_address=ip,
            user_agent=user_agent
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento não encontrado"
            )
        
        return {"success": True, "message": "Documento removido"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/documents/file/{user_id}/{verification_id}/{filename}")
async def serve_local_document(
    user_id: str,
    verification_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Serve um documento KYC armazenado localmente.
    
    Este endpoint é usado quando os documentos estão salvos localmente
    (desenvolvimento) em vez do S3/Spaces.
    """
    import os
    from fastapi.responses import FileResponse
    
    # Verifica se o usuário tem acesso (é o dono ou é admin)
    is_owner = str(current_user.id) == user_id
    is_admin = getattr(current_user, 'is_admin', False) == True
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado ao documento"
        )
    
    # Constrói o caminho do arquivo
    file_path = os.path.join("uploads", "kyc", user_id, verification_id, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Detecta o content type
    import mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    if not content_type:
        content_type = "application/octet-stream"
    
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=filename
    )


@router.post("/submit", response_model=KYCVerificationResponse)
async def submit_verification(
    request: Request,
    data: KYCSubmitRequest = KYCSubmitRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submete a verificação KYC para análise.
    
    Pré-requisitos:
    - Dados pessoais preenchidos
    - Todos os documentos necessários enviados
    """
    ip, user_agent = get_client_info(request)
    service = KYCService(db)
    
    # Obtém verificação ativa
    verification = await service.get_active_verification(current_user.id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação não encontrada"
        )
    
    try:
        updated = await service.submit_for_review(
            verification_id=verification.id,
            ip_address=ip,
            user_agent=user_agent
        )
        
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/requirements/{level}", response_model=KYCRequirementsResponse)
async def get_requirements(
    level: KYCLevelEnum,
    db: Session = Depends(get_db)
):
    """
    Obtém os requisitos para um nível de KYC.
    
    Retorna:
    - Documentos necessários
    - Campos obrigatórios
    - Benefícios do nível
    - Limites por serviço
    """
    service = KYCService(db)
    
    try:
        kyc_level = KYCLevel(level.value)
        return service.get_requirements(kyc_level)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/my-data")
async def get_my_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém os dados pessoais do usuário (LGPD - direito à informação).
    
    Dados sensíveis são parcialmente mascarados.
    """
    service = KYCService(db)
    
    verification = await service.get_active_verification(current_user.id)
    if not verification or not verification.personal_data:
        return {
            "has_data": False,
            "message": "Nenhum dado pessoal encontrado"
        }
    
    personal_data = verification.personal_data
    
    # Retorna dados mascarados
    from app.services.encryption_service import encryption_service
    
    return {
        "has_data": True,
        "data": {
            "full_name": personal_data.full_name,
            "birth_date": str(personal_data.birth_date),
            "nationality": personal_data.nationality,
            "document_number_masked": encryption_service.mask_cpf(
                encryption_service.decrypt(personal_data.document_number) if personal_data.document_number else ""
            ),
            "city": personal_data.city,
            "state": personal_data.state,
            "phone_masked": encryption_service.mask_phone(
                encryption_service.decrypt(personal_data.phone) if personal_data.phone else ""
            ),
            "occupation": personal_data.occupation,
            "created_at": str(personal_data.created_at),
            "updated_at": str(personal_data.updated_at),
        },
        "verification_status": verification.status.value,
        "verification_level": verification.level.value,
    }


@router.get("/export")
async def export_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exporta todos os dados do usuário (LGPD - portabilidade).
    
    Retorna JSON estruturado com todos os dados coletados.
    """
    service = KYCService(db)
    
    verification = await service.get_active_verification(current_user.id)
    if not verification:
        return {
            "user_id": str(current_user.id),
            "email": current_user.email,
            "kyc_data": None,
            "message": "Nenhuma verificação KYC encontrada"
        }
    
    # Obtém dados descriptografados (para exportação)
    personal_data = await service.get_personal_data(verification.id, decrypt=True)
    
    export = {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "export_date": str(datetime.utcnow()),
        "kyc_verification": {
            "id": str(verification.id),
            "status": verification.status.value,
            "level": verification.level.value,
            "created_at": str(verification.created_at),
            "submitted_at": str(verification.submitted_at) if verification.submitted_at else None,
            "approved_at": str(verification.approved_at) if verification.approved_at else None,
        },
        "documents": [
            {
                "type": doc.document_type.value,
                "status": doc.status.value,
                "uploaded_at": str(doc.uploaded_at),
                "file_hash": doc.file_hash,
            }
            for doc in verification.documents
        ]
    }
    
    # Adiciona dados pessoais se existirem
    if personal_data:
        export["personal_data"] = {
            "full_name": personal_data.full_name,
            "birth_date": str(personal_data.birth_date),
            "nationality": personal_data.nationality,
            "city": personal_data.city,
            "state": personal_data.state,
            "occupation": personal_data.occupation,
            # Dados descriptografados para exportação
            "document_number": getattr(personal_data, '_document_number_decrypted', '[criptografado]'),
            "phone": getattr(personal_data, '_phone_decrypted', '[criptografado]'),
        }
    
    return export


# Import datetime for export endpoint
from datetime import datetime


# ============================================================
# ENDPOINTS DE VALIDAÇÃO SERPRO/CPF
# ============================================================

@router.post("/validate-cpf")
async def validate_cpf(
    cpf: str = Form(..., description="CPF para validar"),
    name: Optional[str] = Form(None, description="Nome para validação cruzada"),
    birth_date: Optional[str] = Form(None, description="Data nascimento YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Valida CPF em tempo real via SERPRO/BigData.
    
    Verifica:
    - Validade matemática do CPF
    - Situação cadastral na Receita Federal
    - Correspondência com nome (se fornecido)
    - Correspondência com data de nascimento (se fornecida)
    
    Args:
        cpf: Número do CPF (com ou sem formatação)
        name: Nome completo para validação cruzada (opcional)
        birth_date: Data de nascimento formato YYYY-MM-DD (opcional)
        
    Returns:
        Resultado da validação com status e detalhes
    """
    from app.services.serpro_service import serpro_service
    
    result = await serpro_service.validate_cpf(
        cpf=cpf,
        name=name,
        birth_date=birth_date
    )
    
    return result


@router.get("/cpf-situation/{cpf}")
async def get_cpf_situation(
    cpf: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consulta situação cadastral do CPF (consulta simplificada).
    
    Retorna apenas o status do CPF na Receita Federal.
    Mais rápido e econômico que validação completa.
    
    Args:
        cpf: Número do CPF
        
    Returns:
        Status do CPF (regular, suspenso, cancelado, etc.)
    """
    from app.services.serpro_service import serpro_service
    
    result = await serpro_service.get_cpf_situation(cpf)
    
    return result


@router.post("/validate-cpf-face")
async def validate_cpf_with_face(
    cpf: str = Form(..., description="CPF para validar"),
    selfie: UploadFile = File(..., description="Selfie para comparação facial"),
    name: Optional[str] = Form(None, description="Nome para validação cruzada"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Valida CPF com verificação facial via SERPRO Datavalid.
    
    Compara a selfie enviada com a foto do CPF na base da Receita Federal.
    Este é o método mais seguro de validação.
    
    Args:
        cpf: Número do CPF
        selfie: Imagem facial para comparação
        name: Nome para validação cruzada (opcional)
        
    Returns:
        Resultado com match facial e validação do CPF
    """
    from app.services.serpro_service import serpro_service
    
    # Lê a imagem
    face_image = await selfie.read()
    
    result = await serpro_service.validate_cpf_with_face(
        cpf=cpf,
        face_image=face_image,
        name=name
    )
    
    return result


# ============================================================
# ENDPOINTS DE VERIFICAÇÃO BIOMÉTRICA (AWS)
# ============================================================

@router.post("/biometric/liveness-session")
async def create_liveness_session(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma sessão de liveness detection (prova de vida) no AWS Rekognition.
    
    O frontend deve usar o session_id retornado para integrar com o
    FaceLivenessDetector do AWS Amplify UI.
    
    Returns:
        session_id: ID da sessão para usar no frontend
    """
    from app.services.biometric_verification_service import get_biometric_service
    
    kyc_service = KYCService(db)
    verification = await kyc_service.get_verification_by_user(current_user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inicie uma verificação KYC primeiro"
        )
    
    biometric_service = get_biometric_service(db)
    result = await biometric_service.create_liveness_session(str(verification.id))
    
    if not result.get('session_id'):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar sessão de liveness"
        )
    
    return result


@router.post("/biometric/verify-liveness")
async def verify_liveness(
    session_id: str = Form(..., description="ID da sessão de liveness"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica o resultado de uma sessão de liveness.
    
    Chame este endpoint após o usuário completar o liveness detection no frontend.
    
    Args:
        session_id: ID da sessão retornado por /biometric/liveness-session
        
    Returns:
        Resultado da verificação de liveness
    """
    from app.services.biometric_verification_service import get_biometric_service
    
    kyc_service = KYCService(db)
    verification = await kyc_service.get_verification_by_user(current_user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação KYC não encontrada"
        )
    
    # Buscar documento com foto para comparação
    document_image = None
    for doc in verification.documents:
        if doc.document_type in [DocumentType.RG_FRONT, DocumentType.CNH_FRONT]:
            from app.services.s3_service import s3_service
            document_image = await s3_service.download_file(doc.s3_key)
            break
    
    biometric_service = get_biometric_service(db)
    result = await biometric_service.verify_liveness(
        verification_id=str(verification.id),
        session_id=session_id,
        document_image=document_image
    )
    
    return result


@router.post("/biometric/verify-selfie")
async def verify_selfie(
    selfie: UploadFile = File(..., description="Selfie do usuário"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica selfie comparando com o documento enviado.
    
    Compara a face da selfie com a face do documento usando AWS Rekognition.
    
    Args:
        selfie: Arquivo de imagem da selfie
        
    Returns:
        Resultado da comparação facial
    """
    from app.services.biometric_verification_service import get_biometric_service
    from app.services.s3_service import s3_service
    
    kyc_service = KYCService(db)
    verification = await kyc_service.get_verification_by_user(current_user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação KYC não encontrada"
        )
    
    # Buscar documento com foto
    document_image = None
    for doc in verification.documents:
        if doc.document_type in [DocumentType.RG_FRONT, DocumentType.CNH_FRONT, DocumentType.PASSPORT]:
            document_image = await s3_service.download_file(doc.s3_key)
            break
    
    if not document_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um documento com foto primeiro (RG, CNH ou Passaporte)"
        )
    
    # Ler selfie
    selfie_bytes = await selfie.read()
    
    biometric_service = get_biometric_service(db)
    result = await biometric_service.verify_selfie(
        verification_id=str(verification.id),
        selfie_image=selfie_bytes,
        document_image=document_image
    )
    
    return result


@router.post("/biometric/auto-verify")
async def run_auto_verification(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executa verificação biométrica automatizada completa.
    
    Este endpoint executa:
    1. OCR dos documentos
    2. Extração de dados
    3. Comparação facial (documento vs selfie)
    4. Análise de fraude
    
    Retorna uma decisão: APPROVED, REJECTED ou MANUAL_REVIEW
    """
    from app.services.biometric_verification_service import get_biometric_service
    
    kyc_service = KYCService(db)
    verification = await kyc_service.get_verification_by_user(current_user.id)
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verificação KYC não encontrada"
        )
    
    # Verificar se tem documentos necessários
    has_doc_with_photo = any(
        doc.document_type in [DocumentType.RG_FRONT, DocumentType.CNH_FRONT, DocumentType.PASSPORT]
        for doc in verification.documents
    )
    has_selfie = any(
        doc.document_type == DocumentType.SELFIE
        for doc in verification.documents
    )
    
    if not has_doc_with_photo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um documento com foto primeiro"
        )
    
    if not has_selfie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie uma selfie primeiro"
        )
    
    biometric_service = get_biometric_service(db)
    result = await biometric_service.run_full_verification(
        verification_id=str(verification.id),
        user_id=str(current_user.id)
    )
    
    return result


@router.get("/biometric/document-ocr/{document_id}")
async def get_document_ocr(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extrai texto e dados de um documento específico usando OCR.
    
    Args:
        document_id: ID do documento
        
    Returns:
        Dados extraídos do documento
    """
    from app.services.biometric_verification_service import get_biometric_service
    from app.services.s3_service import s3_service
    from app.models.kyc import KYCDocument
    
    # Buscar documento
    document = db.query(KYCDocument).filter(
        KYCDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado"
        )
    
    # Verificar se pertence ao usuário
    verification = document.verification
    if str(verification.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )
    
    # Baixar e analisar
    document_image = await s3_service.download_file(document.s3_key)
    
    if not document_image:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao baixar documento"
        )
    
    biometric_service = get_biometric_service(db)
    result = await biometric_service.verify_document(
        verification_id=str(verification.id),
        document=document,
        document_image=document_image
    )
    
    return result
