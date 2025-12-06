"""
🔐 Two-Factor Authentication Service
====================================
Serviço para gerenciar autenticação de dois fatores (TOTP)
"""

import pyotp
import qrcode
import io
import base64
import secrets
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.user import User
from app.models.two_factor import TwoFactorAuth
from app.services.crypto_service import crypto_service
from app.core.logging import get_logger

logger = get_logger(__name__)


class TwoFactorService:
    """Serviço para gerenciar 2FA com TOTP"""
    
    def __init__(self):
        self.issuer_name = "HOLDWallet"
    
    def generate_secret(self) -> str:
        """Gera um novo secret TOTP"""
        return pyotp.random_base32()
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """Gera códigos de backup"""
        codes = []
        for _ in range(count):
            # Gera código de 8 caracteres
            code = secrets.token_hex(4).upper()
            codes.append(code)
        return codes
    
    def get_provisioning_uri(self, secret: str, user_email: str) -> str:
        """Gera URI de provisionamento para apps autenticadores"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=user_email,
            issuer_name=self.issuer_name
        )
    
    def generate_qr_code(self, provisioning_uri: str) -> str:
        """Gera QR code como base64 image"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Converter para base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def verify_token(self, secret: str, token: str) -> bool:
        """Verifica um token TOTP"""
        try:
            totp = pyotp.TOTP(secret)
            # Permite 1 janela de tempo antes/depois (30s cada)
            return totp.verify(token, valid_window=1)
        except Exception as e:
            logger.error(f"Error verifying TOTP token: {e}")
            return False
    
    def verify_backup_code(self, encrypted_codes: str, code: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica um código de backup e o remove se válido
        Returns: (is_valid, updated_encrypted_codes)
        """
        try:
            # Descriptografar códigos
            codes_str = crypto_service.decrypt_data(encrypted_codes)
            codes = codes_str.split(',')
            
            # Verificar se código existe
            if code.upper() in codes:
                # Remover código usado
                codes.remove(code.upper())
                
                # Re-criptografar códigos restantes
                if codes:
                    new_encrypted = crypto_service.encrypt_data(','.join(codes))
                else:
                    new_encrypted = None
                
                return True, new_encrypted
            
            return False, None
        except Exception as e:
            logger.error(f"Error verifying backup code: {e}")
            return False, None
    
    async def setup_2fa(self, db: Session, user: User) -> dict:
        """
        Inicia o setup de 2FA para um usuário
        Returns: secret, QR code, backup codes
        """
        try:
            # Gerar secret
            secret = self.generate_secret()
            
            # Gerar backup codes
            backup_codes = self.generate_backup_codes()
            
            # Criptografar dados sensíveis
            encrypted_secret = crypto_service.encrypt_data(secret)
            encrypted_backup_codes = crypto_service.encrypt_data(','.join(backup_codes))
            
            # Criar ou atualizar registro 2FA
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user.id
            ).first()
            
            if two_fa:
                # Atualizar existente
                two_fa.secret = encrypted_secret
                two_fa.backup_codes = encrypted_backup_codes
                two_fa.is_enabled = False
                two_fa.is_verified = False
            else:
                # Criar novo
                two_fa = TwoFactorAuth(
                    user_id=user.id,
                    secret=encrypted_secret,
                    backup_codes=encrypted_backup_codes,
                    is_enabled=False,
                    is_verified=False
                )
                db.add(two_fa)
            
            db.commit()
            
            # Gerar QR code
            provisioning_uri = self.get_provisioning_uri(secret, user.email)
            qr_code = self.generate_qr_code(provisioning_uri)
            
            logger.info(f"2FA setup initiated for user {user.id}")
            
            return {
                "secret": secret,
                "qr_code": qr_code,
                "backup_codes": backup_codes,
                "provisioning_uri": provisioning_uri
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error setting up 2FA: {e}")
            raise
    
    async def verify_and_enable_2fa(
        self,
        db: Session,
        user: User,
        token: str
    ) -> bool:
        """
        Verifica o token e ativa 2FA se válido
        """
        try:
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user.id
            ).first()
            
            if not two_fa:
                return False
            
            # Descriptografar secret
            secret = crypto_service.decrypt_data(two_fa.secret)
            
            # Verificar token
            if self.verify_token(secret, token):
                two_fa.is_enabled = True
                two_fa.is_verified = True
                two_fa.enabled_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"2FA enabled for user {user.id}")
                return True
            
            return False
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying 2FA token: {e}")
            return False
    
    async def verify_2fa_for_action(
        self,
        db: Session,
        user: User,
        token: str
    ) -> bool:
        """
        Verifica 2FA para uma ação sensível (como enviar transação)
        Aceita tanto TOTP quanto backup code
        """
        try:
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user.id,
                TwoFactorAuth.is_enabled == True
            ).first()
            
            if not two_fa:
                # 2FA não habilitado
                return True
            
            # Tentar como TOTP
            secret = crypto_service.decrypt_data(two_fa.secret)
            if self.verify_token(secret, token):
                two_fa.last_used_at = datetime.utcnow()
                db.commit()
                return True
            
            # Tentar como backup code
            if two_fa.backup_codes:
                is_valid, new_codes = self.verify_backup_code(
                    two_fa.backup_codes,
                    token
                )
                if is_valid:
                    two_fa.backup_codes = new_codes
                    two_fa.last_used_at = datetime.utcnow()
                    db.commit()
                    logger.info(f"Backup code used for user {user.id}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying 2FA for action: {e}")
            return False
    
    async def disable_2fa(self, db: Session, user: User) -> bool:
        """Desabilita 2FA para um usuário"""
        try:
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user.id
            ).first()
            
            if two_fa:
                two_fa.is_enabled = False
                db.commit()
                logger.info(f"2FA disabled for user {user.id}")
                return True
            
            return False
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error disabling 2FA: {e}")
            return False
    
    def get_2fa_status(self, db: Session, user: User) -> dict:
        """Retorna status do 2FA para um usuário"""
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id
        ).first()
        
        if not two_fa:
            return {
                "enabled": False,
                "verified": False,
                "has_backup_codes": False
            }
        
        return {
            "enabled": two_fa.is_enabled,
            "verified": two_fa.is_verified,
            "has_backup_codes": bool(two_fa.backup_codes),
            "enabled_at": two_fa.enabled_at.isoformat() if two_fa.enabled_at else None,
            "last_used_at": two_fa.last_used_at.isoformat() if two_fa.last_used_at else None
        }


# Instância global
two_factor_service = TwoFactorService()
