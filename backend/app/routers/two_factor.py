"""
🔐 Two-Factor Authentication Router
===================================
Endpoints para gerenciar autenticação de dois fatores
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.db import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.two_factor_service import two_factor_service
from app.core.logging import get_logger

logger = get_logger(__name__)


router = APIRouter(prefix="/auth/2fa", tags=["Two-Factor Authentication"])


# ==================== Schemas ====================

class Setup2FAResponse(BaseModel):
    """Response do setup de 2FA"""
    secret: str = Field(..., description="Secret TOTP (mostrar apenas UMA vez)")
    qr_code: str = Field(..., description="QR code em base64 para escanear")
    backup_codes: List[str] = Field(..., description="Códigos de backup (guardar com segurança)")
    message: str


class Verify2FARequest(BaseModel):
    """Request para verificar e ativar 2FA"""
    token: str = Field(..., description="Token de 6 dígitos do autenticador", min_length=6, max_length=6)


class Verify2FAResponse(BaseModel):
    """Response da verificação"""
    success: bool
    message: str
    enabled: bool


class Disable2FARequest(BaseModel):
    """Request para desabilitar 2FA"""
    token: str = Field(..., description="Token de 6 dígitos para confirmar", min_length=6, max_length=6)


class Status2FAResponse(BaseModel):
    """Status do 2FA"""
    enabled: bool
    verified: bool
    has_backup_codes: bool
    enabled_at: Optional[str] = None
    last_used_at: Optional[str] = None


# ==================== Endpoints ====================

@router.get("/status", response_model=Status2FAResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔍 Verifica o status do 2FA para o usuário atual
    
    **Returns:**
    - enabled: Se 2FA está ativo
    - verified: Se foi verificado após setup
    - has_backup_codes: Se ainda há códigos de backup
    - enabled_at: Quando foi ativado
    - last_used_at: Último uso
    """
    try:
        twofa_status = two_factor_service.get_2fa_status(db, current_user)
        return twofa_status
    except Exception as e:
        logger.error(f"Error getting 2FA status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get 2FA status"
        )


@router.post("/setup", response_model=Setup2FAResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🚀 Inicia o setup de 2FA
    
    **Retorna:**
    - QR code para escanear com Google Authenticator, Authy, etc
    - Secret manual (caso não consiga escanear)
    - 10 códigos de backup (salvar em local seguro!)
    
    **⚠️ IMPORTANTE:**
    - Salve os códigos de backup! Serão mostrados apenas UMA vez
    - Após escanear QR code, use endpoint /verify para ativar
    - 2FA só será ativado após verificação bem-sucedida
    """
    try:
        result = await two_factor_service.setup_2fa(db, current_user)
        
        return {
            **result,
            "message": "2FA setup complete. Scan QR code and verify to enable."
        }
    except Exception as e:
        logger.error(f"Error setting up 2FA: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup 2FA: {str(e)}"
        )


@router.post("/verify", response_model=Verify2FAResponse)
async def verify_and_enable_2fa(
    request: Verify2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Verifica o token e ativa 2FA
    
    **Após escanear o QR code:**
    1. Abra seu app autenticador (Google Authenticator, Authy, etc)
    2. Digite o código de 6 dígitos exibido
    3. Se correto, 2FA será ativado
    
    **De agora em diante:**
    - Transações sensíveis exigirão código 2FA
    - Você pode usar códigos de backup se perder acesso ao app
    """
    try:
        success = await two_factor_service.verify_and_enable_2fa(
            db,
            current_user,
            request.token
        )
        
        if success:
            return {
                "success": True,
                "message": "✅ 2FA enabled successfully! Your account is now more secure.",
                "enabled": True
            }
        else:
            return {
                "success": False,
                "message": "❌ Invalid token. Please try again.",
                "enabled": False
            }
    except Exception as e:
        logger.error(f"Error verifying 2FA: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify 2FA"
        )


@router.post("/disable")
async def disable_2fa(
    request: Disable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔓 Desabilita 2FA
    
    **⚠️ CUIDADO:** Isso tornará sua conta menos segura!
    
    **Requer:**
    - Token 2FA válido para confirmar
    """
    try:
        # Verificar token antes de desabilitar
        is_valid = await two_factor_service.verify_2fa_for_action(
            db,
            current_user,
            request.token
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA token"
            )
        
        success = await two_factor_service.disable_2fa(db, current_user)
        
        if success:
            return {
                "success": True,
                "message": "2FA has been disabled"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="2FA not found for this user"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling 2FA: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable 2FA"
        )
