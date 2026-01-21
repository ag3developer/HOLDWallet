"""
🛡️ HOLD Wallet - Admin Routers Module
======================================

Módulo de routers administrativos para gerenciamento completo do sistema.

Estrutura:
- users.py      → Gestão de usuários
- trades.py     → Gestão de trades OTC
- p2p.py        → Gestão P2P (ordens, matches, escrow, disputas)
- reports.py    → Relatórios e analytics
- settings.py   → Configurações do sistema
- audit.py      → Logs de auditoria
- fees.py       → Dashboard de taxas e receitas da plataforma
- system_blockchain_wallet.py → Carteira blockchain real do sistema

Author: HOLD Wallet Team
"""

from fastapi import APIRouter

# Import all admin routers
from .users import router as users_router
from .trades import router as trades_router
from .p2p import router as p2p_router
from .reports import router as reports_router
from .settings import router as settings_router
from .audit import router as audit_router
from .dashboard import router as dashboard_router
from .analytics import router as analytics_router
from .wallets import router as wallets_router
from .transactions import router as transactions_router
from .fees import router as fees_router
from .system_blockchain_wallet import router as system_blockchain_wallet_router
from .backup import router as backup_router
from .notifications import router as notifications_router
from .security import router as security_router
from .wolkpay_admin import router as wolkpay_admin_router
from .bill_payment_admin import router as bill_payment_admin_router
from .kyc_admin import router as kyc_admin_router
from .user_kyc_admin import router as user_kyc_admin_router
from .locked_balances import router as locked_balances_router

# Create main admin router
admin_router = APIRouter(prefix="/admin", tags=["Admin"])

# Include all sub-routers
admin_router.include_router(dashboard_router)
admin_router.include_router(analytics_router)
admin_router.include_router(users_router)
admin_router.include_router(trades_router)
admin_router.include_router(p2p_router)
admin_router.include_router(reports_router)
admin_router.include_router(settings_router)
admin_router.include_router(audit_router)
admin_router.include_router(wallets_router)
admin_router.include_router(transactions_router)
admin_router.include_router(fees_router)
admin_router.include_router(system_blockchain_wallet_router)
admin_router.include_router(backup_router)
admin_router.include_router(notifications_router)
admin_router.include_router(security_router)
# IMPORTANTE: user_kyc_admin_router deve vir ANTES de kyc_admin_router
# porque kyc_admin_router tem rota /{verification_id} que captura "users"
admin_router.include_router(user_kyc_admin_router)
admin_router.include_router(kyc_admin_router)
admin_router.include_router(locked_balances_router)
# NOTA: wolkpay_admin_router e bill_payment_admin_router são incluídos diretamente no main.py
# para evitar duplicação de prefixos (/admin/admin/...)

__all__ = [
    "admin_router",
    "users_router",
    "trades_router",
    "p2p_router",
    "reports_router",
    "settings_router",
    "audit_router",
    "dashboard_router",
    "analytics_router",
    "wallets_router",
    "transactions_router",
    "fees_router",
    "system_blockchain_wallet_router",
    "backup_router",
    "notifications_router",
    "security_router",
    "wolkpay_admin_router",
    "bill_payment_admin_router",
    "kyc_admin_router",
    "user_kyc_admin_router",
    "locked_balances_router"
]
