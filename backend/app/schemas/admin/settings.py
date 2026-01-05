"""
🛡️ HOLD Wallet - Admin Settings Schemas
=======================================

Schemas para configurações do sistema.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class TradingSettings(BaseModel):
    """Configurações de trading."""
    trading_enabled: bool = True
    min_trade_amount: float = 10.0
    max_trade_amount: float = 50000.0
    trading_fee_percent: float = 0.5
    daily_limit_usdt: float = 100000.0


class P2PSettings(BaseModel):
    """Configurações P2P."""
    p2p_enabled: bool = True
    p2p_fee_percent: float = 0.3
    escrow_timeout_hours: int = 24
    max_open_orders_per_user: int = 5
    dispute_timeout_hours: int = 72
    auto_release_after_hours: int = 24


class SecuritySettings(BaseModel):
    """Configurações de segurança."""
    require_2fa_for_withdrawals: bool = True
    require_email_verification: bool = True
    require_phone_verification: bool = False
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    session_timeout_minutes: int = 30
    password_min_length: int = 8
    require_kyc_for_high_amounts: bool = True
    kyc_threshold_usdt: float = 10000.0


class NotificationSettings(BaseModel):
    """Configurações de notificações."""
    email_notifications_enabled: bool = True
    sms_notifications_enabled: bool = False
    push_notifications_enabled: bool = True
    admin_alert_email: EmailStr = "admin@holdwallet.com"
    notify_on_large_transactions: bool = True
    large_transaction_threshold_usdt: float = 10000.0


class SystemSettings(BaseModel):
    """Configurações completas do sistema."""
    trading: TradingSettings = TradingSettings()
    p2p: P2PSettings = P2PSettings()
    security: SecuritySettings = SecuritySettings()
    notifications: NotificationSettings = NotificationSettings()


class FlatSystemSettings(BaseModel):
    """Configurações em formato plano (para compatibilidade com frontend)."""
    # Trading
    trading_enabled: bool = True
    min_trade_amount: float = 10.0
    max_trade_amount: float = 50000.0
    trading_fee_percent: float = 0.5
    
    # P2P
    p2p_enabled: bool = True
    p2p_fee_percent: float = 0.3
    escrow_timeout_hours: int = 24
    max_open_orders_per_user: int = 5
    
    # Security
    require_2fa_for_withdrawals: bool = True
    require_email_verification: bool = True
    max_login_attempts: int = 5
    session_timeout_minutes: int = 30
    
    # Notifications
    email_notifications_enabled: bool = True
    admin_alert_email: EmailStr = "admin@holdwallet.com"


class SettingsUpdateRequest(BaseModel):
    """Request para atualizar configurações."""
    # Todos os campos são opcionais para partial update
    trading_enabled: Optional[bool] = None
    min_trade_amount: Optional[float] = None
    max_trade_amount: Optional[float] = None
    trading_fee_percent: Optional[float] = None
    p2p_enabled: Optional[bool] = None
    p2p_fee_percent: Optional[float] = None
    escrow_timeout_hours: Optional[int] = None
    max_open_orders_per_user: Optional[int] = None
    require_2fa_for_withdrawals: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    max_login_attempts: Optional[int] = None
    session_timeout_minutes: Optional[int] = None
    email_notifications_enabled: Optional[bool] = None
    admin_alert_email: Optional[EmailStr] = None
