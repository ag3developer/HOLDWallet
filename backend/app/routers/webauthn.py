"""
🔐 WebAuthn Router
==================
Endpoints para gerenciar autenticação biométrica (Face ID, Touch ID, Windows Hello)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.webauthn_service import webauthn_service
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth/webauthn", tags=["WebAuthn"])


# Schemas
class RegisterOptionsRequest(BaseModel):
    authenticator_type: str = "platform"  # platform ou cross-platform


class RegisterCredentialRequest(BaseModel):
    credential: Dict[str, Any]
    device_name: Optional[str] = None


class VerifyCredentialRequest(BaseModel):
    credential: Dict[str, Any]


class WebAuthnStatusResponse(BaseModel):
    has_biometric: bool
    credentials: List[Dict[str, Any]]


class DeleteCredentialRequest(BaseModel):
    credential_id: str


# Endpoints
@router.get("/status", response_model=WebAuthnStatusResponse)
async def get_webauthn_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica se o usuário tem biometria configurada
    """
    try:
        has_biometric = webauthn_service.has_biometric(db, current_user)
        credentials = webauthn_service.get_user_credentials(db, current_user)
        
        return {
            "has_biometric": has_biometric,
            "credentials": credentials
        }
    except Exception as e:
        logger.error(f"Error getting WebAuthn status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao verificar status da biometria"
        )


@router.post("/register/options")
async def get_registration_options(
    request: RegisterOptionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera opções para registrar uma nova credencial biométrica
    """
    try:
        options = webauthn_service.generate_registration_options_for_user(
            db=db,
            user=current_user,
            authenticator_type=request.authenticator_type
        )
        
        return {"options": options}
    except Exception as e:
        logger.error(f"Error generating registration options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar opções de registro: {str(e)}"
        )


@router.post("/register/verify")
async def verify_registration(
    request: RegisterCredentialRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica e salva uma nova credencial biométrica
    """
    try:
        credential = webauthn_service.verify_registration(
            db=db,
            user=current_user,
            credential_response=request.credential,
            device_name=request.device_name
        )
        
        return {
            "success": True,
            "message": "Biometria registrada com sucesso!",
            "credential": {
                "id": str(credential.id),
                "device_name": credential.device_name,
                "created_at": credential.created_at.isoformat()
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error verifying registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao registrar biometria: {str(e)}"
        )


@router.post("/authenticate/options")
async def get_authentication_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera opções para autenticar com biometria
    """
    try:
        options = webauthn_service.generate_authentication_options_for_user(
            db=db,
            user=current_user
        )
        
        return {"options": options}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error generating authentication options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar opções de autenticação: {str(e)}"
        )


@router.post("/authenticate/verify")
async def verify_authentication(
    request: VerifyCredentialRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica autenticação biométrica para autorizar ações sensíveis.
    Retorna um token temporário que pode ser usado como alternativa ao 2FA.
    """
    try:
        success = webauthn_service.verify_authentication(
            db=db,
            user=current_user,
            credential_response=request.credential
        )
        
        if success:
            # Gerar token temporário para uso em transações
            import secrets
            from datetime import datetime, timedelta, timezone
            
            biometric_token = f"bio_{secrets.token_urlsafe(32)}"
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
            
            # Armazenar token no cache do serviço
            webauthn_service.store_biometric_token(current_user.id, biometric_token, expires_at)
            
            logger.info(f"Biometric token generated for user {current_user.id}")
            
            return {
                "success": True,
                "message": "Autenticação biométrica bem sucedida!",
                "biometric_token": biometric_token,
                "expires_in": 300  # 5 minutos em segundos
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Falha na autenticação biométrica"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro na autenticação: {str(e)}"
        )


@router.delete("/credential")
async def delete_credential(
    request: DeleteCredentialRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove uma credencial biométrica
    """
    try:
        success = webauthn_service.delete_credential(
            db=db,
            user=current_user,
            credential_id=request.credential_id
        )
        
        if success:
            return {
                "success": True,
                "message": "Credencial removida com sucesso!"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credencial não encontrada"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover credencial: {str(e)}"
        )


@router.get("/diagnostic")
async def diagnostic_biometric_tables(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔍 Endpoint de diagnóstico para verificar tabelas de autenticação biométrica.
    Requer autenticação.
    """
    from sqlalchemy import text
    from datetime import datetime, timezone
    
    result = {
        "biometric_tokens_table": {"exists": False, "count": 0, "recent_tokens": []},
        "webauthn_credentials_table": {"exists": False, "count": 0, "user_credentials": []},
        "memory_tokens": {"count": 0},
        "issues": [],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # 1. Verificar tabela biometric_tokens
        try:
            check_table = db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'biometric_tokens'
                )
            """))
            result["biometric_tokens_table"]["exists"] = check_table.scalar()
            
            if result["biometric_tokens_table"]["exists"]:
                # Contar registros
                count_result = db.execute(text("SELECT COUNT(*) FROM biometric_tokens"))
                result["biometric_tokens_table"]["count"] = count_result.scalar()
                
                # Tokens recentes do usuário atual
                tokens_result = db.execute(text("""
                    SELECT id, LEFT(token, 30) as token_prefix, expires_at, is_used, created_at
                    FROM biometric_tokens
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    LIMIT 5
                """), {"user_id": str(current_user.id)})
                
                for row in tokens_result:
                    expired = row.expires_at < datetime.now(timezone.utc) if row.expires_at else True
                    result["biometric_tokens_table"]["recent_tokens"].append({
                        "id": row.id,
                        "token_prefix": row.token_prefix + "...",
                        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                        "is_used": row.is_used,
                        "is_expired": expired,
                        "created_at": row.created_at.isoformat() if row.created_at else None
                    })
        except Exception as e:
            result["issues"].append(f"Erro ao verificar biometric_tokens: {str(e)}")
        
        # 2. Verificar tabela webauthn_credentials
        try:
            check_table = db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'webauthn_credentials'
                )
            """))
            result["webauthn_credentials_table"]["exists"] = check_table.scalar()
            
            if result["webauthn_credentials_table"]["exists"]:
                # Contar registros totais
                count_result = db.execute(text("SELECT COUNT(*) FROM webauthn_credentials"))
                result["webauthn_credentials_table"]["count"] = count_result.scalar()
                
                # Credenciais do usuário atual
                creds_result = db.execute(text("""
                    SELECT credential_name, created_at, last_used_at, sign_count
                    FROM webauthn_credentials
                    WHERE user_id = :user_id
                """), {"user_id": current_user.id})
                
                for row in creds_result:
                    result["webauthn_credentials_table"]["user_credentials"].append({
                        "name": row.credential_name,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                        "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None,
                        "sign_count": row.sign_count
                    })
        except Exception as e:
            result["issues"].append(f"Erro ao verificar webauthn_credentials: {str(e)}")
        
        # 3. Verificar tokens em memória
        result["memory_tokens"]["count"] = len(webauthn_service._biometric_tokens)
        
        # 4. Diagnóstico final
        if not result["biometric_tokens_table"]["exists"]:
            result["issues"].append("❌ Tabela biometric_tokens NÃO existe - tokens só funcionam em memória!")
        elif result["biometric_tokens_table"]["count"] == 0:
            result["issues"].append("⚠️ Tabela biometric_tokens vazia - pode estar usando só memória")
            
        if not result["webauthn_credentials_table"]["exists"]:
            result["issues"].append("❌ Tabela webauthn_credentials NÃO existe - biometria não funciona!")
        
        if not result["issues"]:
            result["status"] = "✅ OK - Todas as tabelas existem"
        else:
            result["status"] = "⚠️ Problemas encontrados"
            
    except Exception as e:
        result["issues"].append(f"Erro geral: {str(e)}")
        result["status"] = "❌ Erro"
    
    return result
