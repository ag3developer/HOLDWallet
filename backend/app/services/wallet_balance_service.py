"""
💰 Wallet Balance Service - Core Balance Management Logic
========================================================

Handles all balance operations: get, freeze, unfreeze, transfer, and history tracking.
All operations include audit logging via BalanceHistory.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from typing import Dict, Optional, List, Union
import uuid

from app.models.balance import WalletBalance, BalanceHistory


class WalletBalanceService:
    """Service for managing user wallet balances with freeze/lock capabilities"""
    
    @staticmethod
    def get_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str
    ) -> Optional[Dict]:
        """
        Get user's balance for a specific cryptocurrency.
        
        Case-insensitive search - works with both 'polygon_usdt' and 'POLYGON_USDT'.
        
        Returns:
            {
                'available_balance': float,
                'locked_balance': float,
                'total_balance': float,
                'cryptocurrency': str
            }
        """
        from sqlalchemy import func
        
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == str(user_id),
            func.lower(WalletBalance.cryptocurrency) == cryptocurrency.lower()
        ).first()
        
        if not balance:
            # Create new balance entry if doesn't exist
            return WalletBalanceService._create_balance(db, user_id, cryptocurrency)
        
        return {
            'available_balance': balance.available_balance,
            'locked_balance': balance.locked_balance,
            'total_balance': balance.total_balance,
            'cryptocurrency': balance.cryptocurrency,
        }
    
    @staticmethod
    def get_all_balances(
        db: Session,
        user_id: Union[str, object]
    ) -> List[Dict]:
        """Get all cryptocurrency balances for a user"""
        balances = db.query(WalletBalance).filter(
            WalletBalance.user_id == str(user_id)
        ).all()
        
        return [
            {
                'cryptocurrency': b.cryptocurrency,
                'available_balance': b.available_balance,
                'locked_balance': b.locked_balance,
                'total_balance': b.total_balance,
            }
            for b in balances
        ]
    
    @staticmethod
    def freeze_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "P2P Trade",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Freeze (lock) a portion of user's available balance.
        
        Raises:
            ValueError: If insufficient available balance
        """
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get or create balance
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not balance:
            balance = WalletBalanceService._create_balance(db, user_id, cryptocurrency)
        
        # Get balance object from dict
        if isinstance(balance, dict):
            raise ValueError(f"Cannot freeze on newly created balance")
        
        # Check if enough available balance
        if balance.available_balance < amount:
            raise ValueError(
                f"Insufficient balance. Available: {balance.available_balance}, "
                f"Requested: {amount} {cryptocurrency}"
            )
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Update balance
        balance.available_balance -= amount
        balance.locked_balance += amount
        balance.last_updated_reason = f"Frozen: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "freeze",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    @staticmethod
    def unfreeze_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "Trade Cancelled",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Unfreeze (unlock) a portion of user's locked balance.
        
        Raises:
            ValueError: If insufficient locked balance
        """
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get balance
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not balance:
            raise ValueError(f"No balance found for {user_id} in {cryptocurrency}")
        
        # Check if enough locked balance
        if balance.locked_balance < amount:
            raise ValueError(
                f"Insufficient locked balance. Locked: {balance.locked_balance}, "
                f"Requested: {amount} {cryptocurrency}"
            )
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Update balance
        balance.available_balance += amount
        balance.locked_balance -= amount
        balance.last_updated_reason = f"Unfrozen: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "unfreeze",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    @staticmethod
    def transfer_balance(
        db: Session,
        from_user_id: Union[str, object],
        to_user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "P2P Trade Completion",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Transfer balance from one user to another (e.g., releasing escrow).
        
        Raises:
            ValueError: If insufficient locked balance on sender
        """
        from_user_id = str(from_user_id)
        to_user_id = str(to_user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get sender balance
        from_balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == from_user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not from_balance:
            raise ValueError(f"No balance found for sender {from_user_id} in {cryptocurrency}")
        
        # Check if enough locked balance (transfers come from locked balance)
        if from_balance.locked_balance < amount:
            raise ValueError(
                f"Insufficient locked balance. Locked: {from_balance.locked_balance}, "
                f"Requested: {amount} {cryptocurrency}"
            )
        
        # Get or create recipient balance
        to_balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == to_user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not to_balance:
            to_balance = WalletBalance(
                user_id=to_user_id,
                cryptocurrency=cryptocurrency,
                available_balance=0.0,
                locked_balance=0.0,
                total_balance=0.0
            )
            db.add(to_balance)
        
        # Record old states
        from_available_before = from_balance.available_balance
        from_locked_before = from_balance.locked_balance
        to_available_before = to_balance.available_balance
        to_locked_before = to_balance.locked_balance
        
        # Update sender (removes from locked)
        from_balance.locked_balance -= amount
        from_balance.last_updated_reason = f"Transferred out: {reason}"
        from_balance.updated_at = datetime.now(timezone.utc)
        
        # Update recipient (adds to available)
        to_balance.available_balance += amount
        to_balance.total_balance += amount
        to_balance.last_updated_reason = f"Transferred in: {reason}"
        to_balance.updated_at = datetime.now(timezone.utc)
        
        # Record history for both
        WalletBalanceService._record_history(
            db,
            from_user_id,
            cryptocurrency,
            "transfer_out",
            amount,
            from_available_before,
            from_balance.available_balance,
            from_locked_before,
            from_balance.locked_balance,
            reference_id,
            f"Transfer out: {reason}"
        )
        
        WalletBalanceService._record_history(
            db,
            to_user_id,
            cryptocurrency,
            "transfer_in",
            amount,
            to_available_before,
            to_balance.available_balance,
            to_locked_before,
            to_balance.locked_balance,
            reference_id,
            f"Transfer in: {reason}"
        )
        
        db.add(from_balance)
        db.add(to_balance)
        db.commit()
        
        return {
            'from': from_balance.to_dict(),
            'to': to_balance.to_dict()
        }
    
    @staticmethod
    def deposit_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "Deposit",
        reference_id: Optional[str] = None
    ) -> Dict:
        """Add balance to user (e.g., after blockchain confirmation)"""
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get or create balance
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not balance:
            balance = WalletBalance(
                user_id=user_id,
                cryptocurrency=cryptocurrency,
                available_balance=0.0,
                locked_balance=0.0,
                total_balance=0.0
            )
            db.add(balance)
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Update balance
        balance.available_balance += amount
        balance.total_balance += amount
        balance.last_updated_reason = f"Deposited: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "deposit",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    @staticmethod
    def get_history(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: Optional[str] = None,
        operation_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get balance change history for a user"""
        query = db.query(BalanceHistory).filter(
            BalanceHistory.user_id == str(user_id)
        )
        
        if cryptocurrency:
            query = query.filter(BalanceHistory.cryptocurrency == cryptocurrency.upper())
        
        if operation_type:
            query = query.filter(BalanceHistory.operation_type == operation_type)
        
        history = query.order_by(BalanceHistory.created_at.desc()).limit(limit).offset(offset).all()
        
        return [h.to_dict() for h in history]
    
    @staticmethod
    def debit_locked_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "Bill Payment",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Debit (remove) a portion of user's locked balance.
        Used for bill payments where crypto goes to the system.
        
        This is a "burn" operation - the crypto is removed from the user's
        balance and recorded as a debit (payment) to the system.
        
        Raises:
            ValueError: If insufficient locked balance
        """
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get balance
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not balance:
            raise ValueError(f"No balance found for {user_id} in {cryptocurrency}")
        
        # Check if enough locked balance
        if balance.locked_balance < amount:
            raise ValueError(
                f"Insufficient locked balance. Locked: {balance.locked_balance}, "
                f"Requested: {amount} {cryptocurrency}"
            )
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Debit from locked balance (removes from total too)
        balance.locked_balance -= amount
        balance.total_balance -= amount  # Also reduce total since crypto is leaving the wallet
        balance.last_updated_reason = f"Debited: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "debit",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    @staticmethod
    def debit_available_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "Bill Payment",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Debit (remove) directly from user's AVAILABLE balance.
        Used for bill payments - simpler than freeze + debit.
        
        This debits directly from available_balance without needing to
        freeze first. Similar to how Instant Trade works.
        
        Case-insensitive search - works with both 'polygon_usdt' and 'POLYGON_USDT'.
        
        Raises:
            ValueError: If insufficient available balance
        """
        from sqlalchemy import func
        
        user_id = str(user_id)
        
        # Get balance (case-insensitive)
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            func.lower(WalletBalance.cryptocurrency) == cryptocurrency.lower()
        ).first()
        
        if not balance:
            raise ValueError(f"No balance found for {user_id} in {cryptocurrency}")
        
        # Check if enough available balance
        if balance.available_balance < amount:
            raise ValueError(
                f"Insufficient available balance. Available: {balance.available_balance}, "
                f"Requested: {amount} {cryptocurrency}"
            )
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Debit from available balance (removes from total too)
        balance.available_balance -= amount
        balance.total_balance -= amount
        balance.last_updated_reason = f"Debited: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "debit",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    @staticmethod
    def credit_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str,
        amount: float,
        reason: str = "Refund",
        reference_id: Optional[str] = None
    ) -> Dict:
        """
        Credit (add) balance directly to user's available balance.
        Used for refunds from bill payments.
        
        This is a "mint" operation - crypto appears in the user's wallet
        from the system (no source user needed).
        
        Creates balance if doesn't exist.
        """
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        # Get or create balance
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.cryptocurrency == cryptocurrency
        ).first()
        
        if not balance:
            balance = WalletBalance(
                user_id=user_id,
                cryptocurrency=cryptocurrency,
                available_balance=0.0,
                locked_balance=0.0,
                total_balance=0.0
            )
            db.add(balance)
        
        # Record old state
        old_available = balance.available_balance
        old_locked = balance.locked_balance
        
        # Credit to available balance
        balance.available_balance += amount
        balance.total_balance += amount
        balance.last_updated_reason = f"Credited: {reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        # Record history
        WalletBalanceService._record_history(
            db,
            user_id,
            cryptocurrency,
            "credit",
            amount,
            old_available,
            balance.available_balance,
            old_locked,
            balance.locked_balance,
            reference_id,
            reason
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance.to_dict()
    
    # ============ Private Helper Methods ============
    
    @staticmethod
    def _create_balance(
        db: Session,
        user_id: Union[str, object],
        cryptocurrency: str
    ) -> Dict:
        """Create a new balance entry for a user"""
        user_id = str(user_id)
        cryptocurrency = cryptocurrency.upper()
        
        balance = WalletBalance(
            user_id=user_id,
            cryptocurrency=cryptocurrency,
            available_balance=0.0,
            locked_balance=0.0,
            total_balance=0.0,
            last_updated_reason="Initial balance"
        )
        
        db.add(balance)
        db.commit()
        
        return {
            'available_balance': 0.0,
            'locked_balance': 0.0,
            'total_balance': 0.0,
            'cryptocurrency': cryptocurrency,
        }
    
    @staticmethod
    def _record_history(
        db: Session,
        user_id: str,
        cryptocurrency: str,
        operation_type: str,
        amount: float,
        balance_before: float,
        balance_after: float,
        locked_before: float,
        locked_after: float,
        reference_id: Optional[str] = None,
        reason: Optional[str] = None
    ) -> None:
        """Record a balance change in history"""
        history = BalanceHistory(
            user_id=user_id,
            cryptocurrency=cryptocurrency,
            operation_type=operation_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            locked_before=locked_before,
            locked_after=locked_after,
            reference_id=reference_id,
            reason=reason
        )
        
        db.add(history)
        db.commit()
