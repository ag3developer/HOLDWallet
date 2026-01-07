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
from datetime import datetime, timezone

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
from app.core.db import SessionLocal

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
        
        # Cache de tokens biométricos como fallback (produção usa banco de dados)
        self._biometric_tokens: Dict[str, Dict[str, Any]] = {}
    
    def store_biometric_token(self, user_id, token: str, expires_at: datetime) -> None:
        """
        Armazena um token biométrico no banco de dados para autorização de transações.
        
        SEGURANÇA:
        - Invalida TODOS os tokens anteriores do usuário (previne replay attacks)
        - Cada novo token substitui os anteriores
        - Token é single-use (marcado como usado após verificação)
        - Token tem expiração curta (geralmente 5 minutos)
        """
        try:
            from app.models.security import BiometricToken
            
            db = SessionLocal()
            try:
                # SEGURANÇA: Invalidar TODOS os tokens anteriores do usuário
                # Isso garante que apenas o token mais recente seja válido
                try:
                    deleted_count = db.query(BiometricToken).filter(
                        BiometricToken.user_id == str(user_id)
                    ).delete()
                    if deleted_count > 0:
                        logger.info(f"Invalidated {deleted_count} previous tokens for user {user_id}")
                except Exception:
                    pass  # Table might not exist
                
                # Criar novo token (único válido para este usuário)
                biometric_token = BiometricToken(
                    token=token,
                    user_id=str(user_id),
                    expires_at=expires_at
                )
                db.add(biometric_token)
                db.commit()
                logger.info(f"Biometric token stored in DB for user {user_id} (expires: {expires_at})")
            except Exception as db_error:
                logger.warning(f"Failed to store in DB (using memory): {db_error}")
                # Fallback to memory cache - também invalida tokens antigos
                self._invalidate_user_tokens_memory(user_id)
                self._biometric_tokens[token] = {
                    "user_id": str(user_id),
                    "expires_at": expires_at
                }
                logger.info(f"Biometric token stored in memory (fallback) for user {user_id}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error storing biometric token: {e}")
            # Fallback to memory cache
            self._invalidate_user_tokens_memory(user_id)
            self._biometric_tokens[token] = {
                "user_id": str(user_id),
                "expires_at": expires_at
            }
            logger.info(f"Biometric token stored in memory (fallback) for user {user_id}")
    
    def _invalidate_user_tokens_memory(self, user_id) -> int:
        """Remove todos os tokens em memória do usuário (SEGURANÇA)"""
        tokens_to_remove = [
            token for token, data in self._biometric_tokens.items()
            if str(data.get("user_id")) == str(user_id)
        ]
        for token in tokens_to_remove:
            del self._biometric_tokens[token]
        return len(tokens_to_remove)
    
    def verify_biometric_token(self, user_id, token: str) -> bool:
        """Verifica se um token biométrico é válido para o usuário (usando banco de dados)"""
        if not token or not token.startswith("bio_"):
            return False
        
        try:
            from app.models.security import BiometricToken
            
            db = SessionLocal()
            try:
                # Buscar token no banco
                token_record = db.query(BiometricToken).filter(
                    BiometricToken.token == token,
                    BiometricToken.is_used == False
                ).first()
                
                if not token_record:
                    logger.warning(f"Biometric token not found in DB: {token[:20]}...")
                    # Try memory fallback
                    return self._verify_biometric_token_memory(user_id, token)
                
                # Verificar se pertence ao usuário
                if str(token_record.user_id) != str(user_id):
                    logger.warning(f"Biometric token user mismatch: expected {user_id}, got {token_record.user_id}")
                    return False
                
                # Verificar expiração
                if datetime.now(timezone.utc) > token_record.expires_at:
                    # Remover token expirado
                    db.delete(token_record)
                    db.commit()
                    logger.warning(f"Biometric token expired for user {user_id}")
                    return False
                
                # Token válido - marcar como usado
                token_record.is_used = True
                token_record.used_at = datetime.now(timezone.utc)
                db.commit()
                
                logger.info(f"Biometric token verified and consumed from DB for user {user_id}")
                return True
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error verifying biometric token in DB: {e}")
            # Fallback to memory
            return self._verify_biometric_token_memory(user_id, token)
    
    def _verify_biometric_token_memory(self, user_id, token: str) -> bool:
        """Fallback: Verifica token em memória"""
        token_data = self._biometric_tokens.get(token)
        if not token_data:
            logger.warning(f"Biometric token not found in memory: {token[:20]}...")
            return False
        
        # Verificar se pertence ao usuário
        if str(token_data["user_id"]) != str(user_id):
            logger.warning(f"Biometric token user mismatch in memory")
            return False
        
        # Verificar expiração
        if datetime.now(timezone.utc) > token_data["expires_at"]:
            del self._biometric_tokens[token]
            logger.warning(f"Biometric token expired in memory for user {user_id}")
            return False
        
        # Token válido - remover após uso (single-use)
        del self._biometric_tokens[token]
        logger.info(f"Biometric token verified and consumed from memory for user {user_id}")
        return True
    
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
