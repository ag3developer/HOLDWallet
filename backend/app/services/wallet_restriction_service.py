"""
🔒 HOLD Wallet - Wallet Restriction Service
============================================

Serviço para verificar restrições de operações em wallets.
Permite bloqueio granular por tipo de operação.

Tipos de restrição:
- instant_trade: Bloqueia criação de trades OTC
- deposit: Sistema não credita depósitos na carteira
- withdrawal: Não pode sacar/enviar crypto
- p2p: Não pode usar P2P marketplace
- transfer: Não pode transferir internamente
- swap: Não pode fazer swap entre cryptos

Author: HOLD Wallet Team
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Tuple
import logging

from app.models.wallet import Wallet
from app.models.user import User

logger = logging.getLogger(__name__)


class WalletRestrictionError(Exception):
    """Erro quando operação é bloqueada por restrição"""
    def __init__(self, operation: str, reason: str):
        self.operation = operation
        self.reason = reason
        super().__init__(f"Operação '{operation}' bloqueada: {reason}")


class WalletRestrictionService:
    """
    Serviço centralizado para verificar restrições de wallet.
    Use este serviço em todos os endpoints financeiros.
    """
    
    # Mensagens de erro por tipo de operação
    ERROR_MESSAGES = {
        'instant_trade': 'Sua carteira está temporariamente impedida de realizar trades instantâneos. Entre em contato com o suporte.',
        'deposit': 'Depósitos estão temporariamente suspensos para sua conta. Entre em contato com o suporte.',
        'withdrawal': 'Saques estão temporariamente suspensos para sua conta. Entre em contato com o suporte.',
        'p2p': 'Acesso ao P2P está temporariamente suspenso para sua conta. Entre em contato com o suporte.',
        'transfer': 'Transferências estão temporariamente suspensas para sua conta. Entre em contato com o suporte.',
        'swap': 'Swaps estão temporariamente suspensos para sua conta. Entre em contato com o suporte.',
    }
    
    @staticmethod
    def check_operation_allowed(
        db: Session,
        user_id: str,
        operation_type: str,
        raise_exception: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifica se uma operação é permitida para o usuário.
        
        Args:
            db: Sessão do banco de dados
            user_id: ID do usuário
            operation_type: Tipo de operação ('instant_trade', 'deposit', 'withdrawal', 'p2p', 'transfer', 'swap')
            raise_exception: Se True, levanta HTTPException quando bloqueado
        
        Returns:
            Tuple[bool, Optional[str]]: (is_allowed, error_message)
        
        Raises:
            HTTPException: Se raise_exception=True e operação bloqueada
        """
        # 1. Verificar se usuário está ativo
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            if raise_exception:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuário não encontrado"
                )
            return False, "Usuário não encontrado"
        
        if not user.is_active:
            error_msg = "Sua conta está desativada. Entre em contato com o suporte."
            if raise_exception:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_msg
                )
            return False, error_msg
        
        # 2. Buscar wallet do usuário
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            # Usuário sem wallet pode não ter restrições de wallet
            return True, None
        
        # 3. Verificar bloqueio total
        if hasattr(wallet, 'is_blocked') and wallet.is_blocked:
            error_msg = f"Sua carteira está bloqueada: {wallet.blocked_reason or 'Entre em contato com o suporte.'}"
            logger.warning(f"🚫 Operação {operation_type} bloqueada para user {user_id}: Wallet bloqueada")
            if raise_exception:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_msg
                )
            return False, error_msg
        
        # 4. Verificar restrição específica
        restriction_map = {
            'instant_trade': 'restrict_instant_trade',
            'deposit': 'restrict_deposits',
            'withdrawal': 'restrict_withdrawals',
            'p2p': 'restrict_p2p',
            'transfer': 'restrict_transfers',
            'swap': 'restrict_swap',
        }
        
        restriction_field = restriction_map.get(operation_type)
        if restriction_field and hasattr(wallet, restriction_field):
            is_restricted = getattr(wallet, restriction_field, False)
            if is_restricted:
                error_msg = WalletRestrictionService.ERROR_MESSAGES.get(
                    operation_type, 
                    'Esta operação está temporariamente indisponível para sua conta.'
                )
                logger.warning(f"🚫 Operação {operation_type} bloqueada para user {user_id}: Restrição específica")
                if raise_exception:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=error_msg
                    )
                return False, error_msg
        
        return True, None
    
    @staticmethod
    def get_user_restrictions(db: Session, user_id: str) -> dict:
        """
        Retorna todas as restrições ativas para um usuário.
        Útil para mostrar no frontend quais operações estão bloqueadas.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "Usuário não encontrado"}
        
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        
        result = {
            "user_active": user.is_active,
            "wallet_found": wallet is not None,
            "is_blocked": False,
            "blocked_reason": None,
            "restrictions": {
                "instant_trade": False,
                "deposit": False,
                "withdrawal": False,
                "p2p": False,
                "transfer": False,
                "swap": False,
            }
        }
        
        if wallet:
            result["is_blocked"] = getattr(wallet, 'is_blocked', False)
            result["blocked_reason"] = getattr(wallet, 'blocked_reason', None)
            result["restrictions"]["instant_trade"] = getattr(wallet, 'restrict_instant_trade', False)
            result["restrictions"]["deposit"] = getattr(wallet, 'restrict_deposits', False)
            result["restrictions"]["withdrawal"] = getattr(wallet, 'restrict_withdrawals', False)
            result["restrictions"]["p2p"] = getattr(wallet, 'restrict_p2p', False)
            result["restrictions"]["transfer"] = getattr(wallet, 'restrict_transfers', False)
            result["restrictions"]["swap"] = getattr(wallet, 'restrict_swap', False)
        
        return result
    
    @staticmethod
    def can_credit_deposit(db: Session, user_id: str) -> bool:
        """
        Verifica se o sistema pode creditar um depósito para este usuário.
        Use esta função nos webhooks de depósito.
        
        Returns:
            True se pode creditar, False se depósitos estão bloqueados
        """
        allowed, _ = WalletRestrictionService.check_operation_allowed(
            db, user_id, 'deposit', raise_exception=False
        )
        return allowed


# Singleton para uso fácil
wallet_restriction_service = WalletRestrictionService()
