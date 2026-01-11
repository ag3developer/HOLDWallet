"""
🔐 Encryption Service - LGPD Compliance
========================================
Serviço de criptografia para dados sensíveis do KYC.
Usa Fernet (AES-128-CBC) para criptografia simétrica.

Author: HOLD Wallet Team
"""

from cryptography.fernet import Fernet, InvalidToken
from typing import Optional
import base64
import hashlib
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Serviço de criptografia para dados sensíveis.
    Compatível com LGPD e requisitos de compliance.
    """
    
    def __init__(self, key: Optional[str] = None):
        """
        Inicializa o serviço com uma chave de criptografia.
        
        Args:
            key: Chave Fernet em base64. Se não fornecida, usa ENCRYPTION_KEY do settings.
        """
        encryption_key = key or settings.ENCRYPTION_KEY
        
        if not encryption_key:
            raise ValueError("ENCRYPTION_KEY não configurada. Defina no .env")
        
        try:
            # Tenta usar a chave diretamente (se já for válida)
            self.fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        except Exception:
            # Se falhar, deriva uma chave válida a partir da string
            derived_key = self._derive_key(encryption_key)
            self.fernet = Fernet(derived_key)
    
    def _derive_key(self, password: str) -> bytes:
        """
        Deriva uma chave Fernet válida a partir de uma senha/string qualquer.
        Usa SHA-256 e codifica em base64 URL-safe.
        """
        # Hash SHA-256 da senha
        hash_bytes = hashlib.sha256(password.encode()).digest()
        # Fernet requer 32 bytes em base64 URL-safe
        return base64.urlsafe_b64encode(hash_bytes)
    
    def encrypt(self, data: str) -> str:
        """
        Criptografa uma string.
        
        Args:
            data: Texto plano para criptografar
            
        Returns:
            Texto criptografado em base64
        """
        if not data:
            return data
        
        try:
            encrypted = self.fernet.encrypt(data.encode('utf-8'))
            return encrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Erro ao criptografar dados: {e}")
            raise ValueError("Falha na criptografia dos dados")
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Descriptografa uma string.
        
        Args:
            encrypted_data: Texto criptografado em base64
            
        Returns:
            Texto plano original
        """
        if not encrypted_data:
            return encrypted_data
        
        try:
            decrypted = self.fernet.decrypt(encrypted_data.encode('utf-8'))
            return decrypted.decode('utf-8')
        except InvalidToken:
            logger.error("Token inválido ao descriptografar. Chave incorreta ou dados corrompidos.")
            raise ValueError("Falha na descriptografia: dados corrompidos ou chave incorreta")
        except Exception as e:
            logger.error(f"Erro ao descriptografar dados: {e}")
            raise ValueError("Falha na descriptografia dos dados")
    
    def encrypt_dict(self, data: dict, fields: list) -> dict:
        """
        Criptografa campos específicos de um dicionário.
        
        Args:
            data: Dicionário com dados
            fields: Lista de campos para criptografar
            
        Returns:
            Dicionário com campos criptografados
        """
        result = data.copy()
        for field in fields:
            if field in result and result[field]:
                result[field] = self.encrypt(str(result[field]))
        return result
    
    def decrypt_dict(self, data: dict, fields: list) -> dict:
        """
        Descriptografa campos específicos de um dicionário.
        
        Args:
            data: Dicionário com dados criptografados
            fields: Lista de campos para descriptografar
            
        Returns:
            Dicionário com campos descriptografados
        """
        result = data.copy()
        for field in fields:
            if field in result and result[field]:
                try:
                    result[field] = self.decrypt(str(result[field]))
                except ValueError:
                    # Campo pode não estar criptografado (migração)
                    logger.warning(f"Campo {field} não está criptografado ou já foi descriptografado")
        return result
    
    @staticmethod
    def mask_cpf(cpf: str) -> str:
        """
        Mascara um CPF para exibição.
        Ex: 123.456.789-00 -> ***.456.***-00
        """
        if not cpf:
            return ""
        
        # Remove formatação
        cpf_clean = ''.join(filter(str.isdigit, cpf))
        
        if len(cpf_clean) != 11:
            return "*" * len(cpf)
        
        # Mascara: mostra apenas dígitos do meio
        return f"***.{cpf_clean[3:6]}.***-{cpf_clean[9:11]}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """
        Mascara um telefone para exibição.
        Ex: 11999999999 -> (**) *****-9999
        """
        if not phone:
            return ""
        
        # Remove formatação
        phone_clean = ''.join(filter(str.isdigit, phone))
        
        if len(phone_clean) < 8:
            return "*" * len(phone)
        
        # Mostra apenas os últimos 4 dígitos
        return f"(**) *****-{phone_clean[-4:]}"
    
    @staticmethod
    def mask_email(email: str) -> str:
        """
        Mascara um email para exibição.
        Ex: joao.silva@email.com -> jo***@email.com
        """
        if not email or '@' not in email:
            return "*" * len(email) if email else ""
        
        local, domain = email.split('@', 1)
        
        if len(local) <= 2:
            masked_local = local[0] + "*" * (len(local) - 1)
        else:
            masked_local = local[:2] + "*" * (len(local) - 2)
        
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def mask_rg(rg: str) -> str:
        """
        Mascara um RG para exibição.
        """
        if not rg:
            return ""
        
        rg_clean = ''.join(filter(str.isalnum, rg))
        
        if len(rg_clean) < 4:
            return "*" * len(rg)
        
        # Mostra apenas os últimos 3 caracteres
        return "*" * (len(rg_clean) - 3) + rg_clean[-3:]
    
    @staticmethod
    def hash_file(file_content: bytes) -> str:
        """
        Gera hash SHA-256 de um arquivo.
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            
        Returns:
            Hash SHA-256 em hexadecimal
        """
        return hashlib.sha256(file_content).hexdigest()
    
    @staticmethod
    def generate_key() -> str:
        """
        Gera uma nova chave Fernet.
        Útil para setup inicial.
        
        Returns:
            Chave Fernet em base64
        """
        return Fernet.generate_key().decode('utf-8')


# Instância global do serviço
encryption_service = EncryptionService()


# ============================================================
# CAMPOS QUE DEVEM SER CRIPTOGRAFADOS (LGPD)
# ============================================================

KYC_ENCRYPTED_FIELDS = [
    'document_number',  # CPF
    'rg_number',        # RG
    'phone',            # Telefone
    'zip_code',         # CEP
    'street',           # Rua
    'number',           # Número
    'complement',       # Complemento
    'neighborhood',     # Bairro
    'fatca_tin',        # Tax ID Number
    'serpro_data',      # Dados do SERPRO
]


def encrypt_personal_data(data: dict) -> dict:
    """
    Criptografa dados pessoais sensíveis para armazenamento.
    """
    return encryption_service.encrypt_dict(data, KYC_ENCRYPTED_FIELDS)


def decrypt_personal_data(data: dict) -> dict:
    """
    Descriptografa dados pessoais para uso.
    """
    return encryption_service.decrypt_dict(data, KYC_ENCRYPTED_FIELDS)
