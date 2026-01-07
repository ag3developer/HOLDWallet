"""
🔐 WebAuthn Service
===================
Serviço para gerenciar autenticação biométrica (Face ID, Touch ID, Windows Hello)
"""

import json
import base64
import secrets
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,
)

from app.models.user import User
from app.models.webauthn import WebAuthnCredential
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class WebAuthnService:
    """Serviço para gerenciar WebAuthn/Passkeys"""
    
    def __init__(self):
        # Configurações do RP (Relying Party)
        # Usa variáveis de ambiente definidas no settings
        
        # Sempre usar as variáveis do settings (que vêm do .env)
        self.rp_id = settings.WEBAUTHN_RP_ID
        self.rp_name = settings.WEBAUTHN_RP_NAME
        self.origin = settings.WEBAUTHN_ORIGIN
        
        logger.info(f"WebAuthn configurado: rp_id={self.rp_id}, origin={self.origin}, environment={settings.ENVIRONMENT}")
        
        # Cache de challenges (em produção usar Redis)
        self._challenges: Dict[str, bytes] = {}
    
    def generate_registration_options_for_user(
        self, 
        db: Session, 
        user: User,
        authenticator_type: str = "platform"
    ) -> Dict[str, Any]:
        """
        Gera opções para registrar uma nova credencial biométrica
        
        Args:
            db: Sessão do banco
            user: Usuário
            authenticator_type: "platform" (biometria) ou "cross-platform" (yubikey)
        """
        try:
            # Buscar credenciais existentes do usuário
            existing_credentials = db.query(WebAuthnCredential).filter(
                WebAuthnCredential.user_id == user.id,
                WebAuthnCredential.is_active == True
            ).all()
            
            # Converter para formato WebAuthn
            exclude_credentials = [
                PublicKeyCredentialDescriptor(
                    id=base64url_to_bytes(cred.credential_id)
                )
                for cred in existing_credentials
            ]
            
            # Configurar tipo de autenticador
            authenticator_attachment = (
                AuthenticatorAttachment.PLATFORM 
                if authenticator_type == "platform" 
                else AuthenticatorAttachment.CROSS_PLATFORM
            )
            
            # Gerar opções de registro
            options = generate_registration_options(
                rp_id=self.rp_id,
                rp_name=self.rp_name,
                user_id=str(user.id).encode(),
                user_name=user.email,
                user_display_name=user.username or user.email.split('@')[0],
                exclude_credentials=exclude_credentials,
                authenticator_selection=AuthenticatorSelectionCriteria(
                    authenticator_attachment=authenticator_attachment,
                    resident_key=ResidentKeyRequirement.PREFERRED,
                    user_verification=UserVerificationRequirement.REQUIRED,
                ),
                timeout=60000,  # 60 segundos
            )
            
            # Salvar challenge para verificação posterior
            self._challenges[str(user.id)] = options.challenge
            
            logger.info(f"WebAuthn registration options generated for user {user.id}")
            
            return json.loads(options_to_json(options))
            
        except Exception as e:
            logger.error(f"Error generating registration options: {e}")
            raise
    
    def verify_registration(
        self,
        db: Session,
        user: User,
        credential_response: Dict[str, Any],
        device_name: Optional[str] = None
    ) -> WebAuthnCredential:
        """
        Verifica e salva uma nova credencial biométrica
        
        Args:
            db: Sessão do banco
            user: Usuário
            credential_response: Resposta do navegador
            device_name: Nome amigável do dispositivo
        """
        try:
            # Recuperar challenge
            expected_challenge = self._challenges.get(str(user.id))
            if not expected_challenge:
                raise ValueError("Challenge não encontrado ou expirado")
            
            # Verificar a resposta
            verification = verify_registration_response(
                credential=credential_response,
                expected_challenge=expected_challenge,
                expected_rp_id=self.rp_id,
                expected_origin=self.origin,
            )
            
            # Criar credencial no banco
            credential = WebAuthnCredential(
                user_id=user.id,
                credential_id=bytes_to_base64url(verification.credential_id),
                public_key=bytes_to_base64url(verification.credential_public_key),
                sign_count=str(verification.sign_count),
                device_name=device_name or "Dispositivo biométrico",
                authenticator_type="platform",
                is_active=True
            )
            
            db.add(credential)
            db.commit()
            db.refresh(credential)
            
            # Limpar challenge
            del self._challenges[str(user.id)]
            
            logger.info(f"WebAuthn credential registered for user {user.id}")
            
            return credential
            
        except Exception as e:
            logger.error(f"Error verifying registration: {e}")
            db.rollback()
            raise
    
    def generate_authentication_options_for_user(
        self,
        db: Session,
        user: User
    ) -> Dict[str, Any]:
        """
        Gera opções para autenticar com biometria
        """
        try:
            # Buscar credenciais do usuário
            credentials = db.query(WebAuthnCredential).filter(
                WebAuthnCredential.user_id == user.id,
                WebAuthnCredential.is_active == True
            ).all()
            
            if not credentials:
                raise ValueError("Usuário não tem biometria configurada")
            
            # Converter para formato WebAuthn
            allow_credentials = [
                PublicKeyCredentialDescriptor(
                    id=base64url_to_bytes(cred.credential_id)
                )
                for cred in credentials
            ]
            
            # Gerar opções
            options = generate_authentication_options(
                rp_id=self.rp_id,
                allow_credentials=allow_credentials,
                user_verification=UserVerificationRequirement.REQUIRED,
                timeout=60000,
            )
            
            # Salvar challenge
            self._challenges[str(user.id)] = options.challenge
            
            logger.info(f"WebAuthn authentication options generated for user {user.id}")
            
            return json.loads(options_to_json(options))
            
        except Exception as e:
            logger.error(f"Error generating authentication options: {e}")
            raise
    
    def verify_authentication(
        self,
        db: Session,
        user: User,
        credential_response: Dict[str, Any]
    ) -> bool:
        """
        Verifica autenticação biométrica
        
        Returns:
            True se a autenticação for bem sucedida
        """
        try:
            # Recuperar challenge
            expected_challenge = self._challenges.get(str(user.id))
            if not expected_challenge:
                raise ValueError("Challenge não encontrado ou expirado")
            
            # Buscar credencial no banco
            credential_id = credential_response.get("id")
            credential = db.query(WebAuthnCredential).filter(
                WebAuthnCredential.credential_id == credential_id,
                WebAuthnCredential.user_id == user.id,
                WebAuthnCredential.is_active == True
            ).first()
            
            if not credential:
                raise ValueError("Credencial não encontrada")
            
            # Verificar a resposta
            verification = verify_authentication_response(
                credential=credential_response,
                expected_challenge=expected_challenge,
                expected_rp_id=self.rp_id,
                expected_origin=self.origin,
                credential_public_key=base64url_to_bytes(credential.public_key),
                credential_current_sign_count=int(credential.sign_count),
            )
            
            # Atualizar contador e último uso
            credential.sign_count = str(verification.new_sign_count)
            credential.last_used_at = datetime.utcnow()
            db.commit()
            
            # Limpar challenge
            del self._challenges[str(user.id)]
            
            logger.info(f"WebAuthn authentication successful for user {user.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"WebAuthn authentication failed: {e}")
            return False
    
    def get_user_credentials(self, db: Session, user: User) -> List[Dict[str, Any]]:
        """Lista credenciais biométricas do usuário"""
        credentials = db.query(WebAuthnCredential).filter(
            WebAuthnCredential.user_id == user.id,
            WebAuthnCredential.is_active == True
        ).all()
        
        return [
            {
                "id": str(cred.id),
                "device_name": cred.device_name,
                "created_at": cred.created_at.isoformat(),
                "last_used_at": cred.last_used_at.isoformat() if cred.last_used_at else None
            }
            for cred in credentials
        ]
    
    def delete_credential(self, db: Session, user: User, credential_id: str) -> bool:
        """Remove uma credencial biométrica"""
        try:
            credential = db.query(WebAuthnCredential).filter(
                WebAuthnCredential.id == credential_id,
                WebAuthnCredential.user_id == user.id
            ).first()
            
            if credential:
                credential.is_active = False
                db.commit()
                logger.info(f"WebAuthn credential {credential_id} deleted for user {user.id}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error deleting credential: {e}")
            return False
    
    def has_biometric(self, db: Session, user: User) -> bool:
        """Verifica se usuário tem biometria configurada"""
        count = db.query(WebAuthnCredential).filter(
            WebAuthnCredential.user_id == user.id,
            WebAuthnCredential.is_active == True
        ).count()
        return count > 0


# Instância global
webauthn_service = WebAuthnService()
