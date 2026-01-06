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
    Verifica autenticação biométrica para autorizar ações sensíveis
    """
    try:
        success = webauthn_service.verify_authentication(
            db=db,
            user=current_user,
            credential_response=request.credential
        )
        
        if success:
            return {
                "success": True,
                "message": "Autenticação biométrica bem sucedida!"
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
