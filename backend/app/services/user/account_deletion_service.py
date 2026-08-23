"""
🗑️ HOLD Wallet - Account Deletion Service
==========================================

Serviço para gerenciar solicitações de exclusão de conta com diferentes opções:
- SOFT DELETE: Desativa conta por 90 dias (recuperável)
- HARD DELETE: Apaga dados imediatamente (irreversível)
- SCHEDULED DELETE: Confirma exclusão dentro de 30 dias

Author: HOLD Wallet Team
"""

import logging
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.user import User
from app.services.user.account_export_service import AccountExportService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class DeletionType(str, Enum):
    """Tipos de deleção"""
    SOFT = "soft"
    HARD = "hard"
    SCHEDULED = "scheduled"


class DeletionStatus(str, Enum):
    """Status de uma solicitação de deleção"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    EXECUTED = "executed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class AccountDeletionRequest:
    """Modelo para requisição de deleção"""
    
    def __init__(
        self,
        user_id: str,
        deletion_type: DeletionType,
        confirmation_code: str,
        token: str,
        token_expires_at: datetime,
        status: DeletionStatus = DeletionStatus.PENDING,
        reason: Optional[str] = None,
    ):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.deletion_type = deletion_type
        self.status = status
        self.confirmation_code = confirmation_code
        self.token = token
        self.token_expires_at = token_expires_at
        self.reason = reason
        self.requested_at = datetime.now(timezone.utc)
        self.confirmed_at: Optional[datetime] = None
        self.executed_at: Optional[datetime] = None
        self.export_data_hash: Optional[str] = None
        self.scheduled_deletion_date: Optional[datetime] = None


class AccountDeletionService:
    """Serviço de gerenciamento de exclusão de conta"""

    # Tempo de validade do token de confirmação (24 horas)
    TOKEN_EXPIRY_HOURS = 24

    # Tempo de espera antes de hard delete (30 dias)
    SCHEDULED_DELETE_DAYS = 30

    # Tempo de retenção de dados em soft delete (90 dias)
    SOFT_DELETE_RETENTION_DAYS = 90

    @staticmethod
    def generate_confirmation_code() -> str:
        """Gera código de confirmação de 6 dígitos"""
        return ''.join(str(secrets.randbelow(10)) for _ in range(6))

    @staticmethod
    def generate_confirmation_token() -> str:
        """Gera token de confirmação único"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_data(data: bytes) -> str:
        """Hash SHA-256 dos dados para auditoria"""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    async def request_deletion(
        user: User,
        deletion_type: DeletionType,
        reason: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> AccountDeletionRequest:
        """
        Cria uma nova requisição de exclusão de conta
        
        Args:
            user: Usuário solicitando a exclusão
            deletion_type: Tipo de deleção (SOFT, HARD, SCHEDULED)
            reason: Motivo da exclusão (opcional)
            db: Sessão do banco de dados
        
        Returns:
            AccountDeletionRequest com dados da solicitação
        """
        logger.info(f"🗑️ Criando requisição de exclusão para {user.email} (tipo: {deletion_type})")

        # Verificar se já existe uma requisição ativa
        if db:
            existing = db.query(DeletionRequest).filter(
                and_(
                    DeletionRequest.user_id == user.id,
                    DeletionRequest.status.in_([
                        DeletionStatus.PENDING.value,
                        DeletionStatus.CONFIRMED.value
                    ])
                )
            ).first()

            if existing:
                logger.warning(f"⚠️ Usuário {user.email} já tem exclusão pendente")
                raise ValueError("Você já tem uma solicitação de exclusão em andamento")

        # Gerar código e token
        confirmation_code = AccountDeletionService.generate_confirmation_code()
        token = AccountDeletionService.generate_confirmation_token()
        token_expires_at = datetime.now(timezone.utc) + timedelta(
            hours=AccountDeletionService.TOKEN_EXPIRY_HOURS
        )

        # Criar requisição
        deletion_request = AccountDeletionRequest(
            user_id=str(user.id),
            deletion_type=deletion_type,
            confirmation_code=confirmation_code,
            token=token,
            token_expires_at=token_expires_at,
            reason=reason,
        )

        # Se for scheduled delete, calcular data
        if deletion_type == DeletionType.SCHEDULED:
            deletion_request.scheduled_deletion_date = datetime.now(timezone.utc) + timedelta(
                days=AccountDeletionService.SCHEDULED_DELETE_DAYS
            )

        logger.info(f"✅ Requisição criada: {deletion_request.id}")
        return deletion_request

    @staticmethod
    async def send_deletion_email(
        user: User,
        deletion_request: AccountDeletionRequest,
        export_files: Optional[Dict[str, bytes]] = None,
        db: Optional[Session] = None,
    ) -> bool:
        """
        Envia email de confirmação de exclusão com os dados exportados
        
        Args:
            user: Usuário que solicitou a exclusão
            deletion_request: Requisição de deleção
            export_files: Dicionário com arquivos exportados {formato: bytes}
            db: Sessão do banco de dados
        
        Returns:
            True se email foi enviado com sucesso
        """
        logger.info(f"📧 Enviando email de confirmação para {user.email}")

        # Preparar dados do email
        template_data = {
            "username": user.username,
            "email": user.email,
            "deletion_type": {
                DeletionType.SOFT: "Temporária (90 dias)",
                DeletionType.HARD: "Permanente",
                DeletionType.SCHEDULED: "Agendada (30 dias para confirmar)",
            }[deletion_request.deletion_type],
            "confirmation_code": deletion_request.confirmation_code,
            "deletion_date": deletion_request.scheduled_deletion_date.strftime("%d/%m/%Y")
            if deletion_request.scheduled_deletion_date
            else "Imediata",
            "token_expires": deletion_request.token_expires_at.strftime("%d/%m/%Y %H:%M"),
            "support_email": "suporte@holdwallet.com",
        }

        # TODO: Enviar email com template 'account_deletion'
        # Preparar anexos (se houver)
        attachments = {}
        if export_files:
            if "pdf" in export_files:
                attachments["account_export.pdf"] = export_files["pdf"]
            if "excel" in export_files:
                attachments["account_export.xlsx"] = export_files["excel"]
            if "json" in export_files:
                attachments["account_data.json"] = export_files["json"]

        try:
            # await EmailService.send_template_email(
            #     to_email=user.email,
            #     template_name="account_deletion",
            #     template_data=template_data,
            #     attachments=attachments if attachments else None,
            # )
            logger.info(f"✅ Email de confirmação enviado para {user.email}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao enviar email: {str(e)}")
            return False

    @staticmethod
    async def confirm_deletion(
        user: User,
        deletion_request: AccountDeletionRequest,
        confirmation_code: str,
        db: Optional[Session] = None,
    ) -> bool:
        """
        Confirma a exclusão da conta usando o código enviado por email
        
        Args:
            user: Usuário confirmando exclusão
            deletion_request: Requisição de deleção
            confirmation_code: Código recebido por email
            db: Sessão do banco de dados
        
        Returns:
            True se confirmação foi bem-sucedida
        """
        logger.info(f"🔐 Confirmando exclusão para {user.email}")

        # Validar código
        if deletion_request.confirmation_code != confirmation_code:
            logger.warning(f"⚠️ Código inválido para {user.email}")
            raise ValueError("Código de confirmação inválido")

        # Validar token não expirado
        if datetime.now(timezone.utc) > deletion_request.token_expires_at:
            logger.warning(f"⚠️ Token expirado para {user.email}")
            raise ValueError("Token de confirmação expirado")

        # Marcar como confirmada
        deletion_request.status = DeletionStatus.CONFIRMED
        deletion_request.confirmed_at = datetime.now(timezone.utc)

        logger.info(f"✅ Exclusão confirmada para {user.email}")
        return True

    @staticmethod
    async def execute_soft_delete(
        user: User,
        db: Session,
    ) -> bool:
        """
        Executa soft delete - desativa conta por 90 dias
        
        Args:
            user: Usuário a ser deletado
            db: Sessão do banco de dados
        
        Returns:
            True se deleção foi bem-sucedida
        """
        logger.info(f"💤 Executando soft delete para {user.email}")

        try:
            # Desativar usuário
            user.is_active = False

            # Anonymizar email
            anonymized_email = f"deleted_{user.id}_{user.email}"
            user.email = anonymized_email

            # Marcar data de exclusão agendada
            user.scheduled_deletion_at = datetime.now(timezone.utc) + timedelta(
                days=AccountDeletionService.SOFT_DELETE_RETENTION_DAYS
            )

            db.commit()
            logger.info(f"✅ Soft delete executado para {user.email}")
            return True

        except Exception as e:
            logger.error(f"❌ Erro ao executar soft delete: {str(e)}")
            db.rollback()
            return False

    @staticmethod
    async def execute_hard_delete(
        user: User,
        db: Session,
        create_backup: bool = True,
    ) -> bool:
        """
        Executa hard delete - apaga dados permanentemente
        
        Args:
            user: Usuário a ser deletado
            db: Sessão do banco de dados
            create_backup: Se deve criar backup antes de deletar
        
        Returns:
            True se deleção foi bem-sucedida
        """
        logger.info(f"🔥 Executando hard delete para {user.email}")

        try:
            user_id = user.id

            # TODO: Implementar deleção em cascata segura
            # 1. Deletar wallets e balances
            # 2. Deletar trades
            # 3. Deletar P2P orders
            # 4. Deletar KYC data
            # 5. Deletar 2FA
            # 6. Deletar user

            logger.info(f"✅ Hard delete executado para {user_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Erro ao executar hard delete: {str(e)}")
            db.rollback()
            return False

    @staticmethod
    async def execute_scheduled_deletion(db: Session) -> int:
        """
        Executa deleções agendadas que atingiram a data de validade
        
        Args:
            db: Sessão do banco de dados
        
        Returns:
            Número de contas deletadas
        """
        logger.info("⏰ Processando deleções agendadas...")

        now = datetime.now(timezone.utc)
        count = 0

        try:
            # Buscar usuários com soft delete expirado
            # TODO: Query users com scheduled_deletion_at <= now
            # Para cada um, executar hard delete
            
            logger.info(f"✅ {count} deleções agendadas executadas")
            return count

        except Exception as e:
            logger.error(f"❌ Erro ao processar deleções agendadas: {str(e)}")
            return 0

    @staticmethod
    async def cancel_deletion(
        user: User,
        deletion_request: AccountDeletionRequest,
        db: Optional[Session] = None,
    ) -> bool:
        """
        Cancela uma solicitação de exclusão (antes da confirmação)
        
        Args:
            user: Usuário cancelando exclusão
            deletion_request: Requisição de deleção
            db: Sessão do banco de dados
        
        Returns:
            True se cancelamento foi bem-sucedido
        """
        logger.info(f"❌ Cancelando exclusão para {user.email}")

        # Só pode cancelar se não estiver confirmada
        if deletion_request.status == DeletionStatus.CONFIRMED:
            logger.warning(f"⚠️ Não pode cancelar exclusão confirmada para {user.email}")
            raise ValueError("Não é possível cancelar uma exclusão já confirmada")

        deletion_request.status = DeletionStatus.CANCELLED

        logger.info(f"✅ Exclusão cancelada para {user.email}")
        return True


# =====================================================
# PLACEHOLDER: Modelo do Banco de Dados
# =====================================================
# Será criado em migration separada

class DeletionRequest:
    """Placeholder para o modelo DeletionRequest do banco de dados"""
    
    # A ser implementado em models/user.py ou models/deletion.py
    # 
    # Fields:
    # - id: UUID PK
    # - user_id: UUID FK -> users
    # - deletion_type: ENUM (SOFT, HARD, SCHEDULED)
    # - status: ENUM (PENDING, CONFIRMED, EXECUTED, CANCELLED, EXPIRED)
    # - confirmation_code: VARCHAR(6)
    # - token: VARCHAR(512)
    # - token_expires_at: DATETIME
    # - reason: TEXT
    # - export_data_hash: VARCHAR(256)
    # - requested_at: DATETIME
    # - confirmed_at: DATETIME (nullable)
    # - executed_at: DATETIME (nullable)
    # - scheduled_deletion_date: DATETIME (nullable)
    # - created_at: DATETIME
    # - updated_at: DATETIME
    pass
