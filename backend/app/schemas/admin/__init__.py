"""
🛡️ HOLD Wallet - Admin Schemas Module
======================================

Schemas Pydantic para o módulo administrativo.

Author: HOLD Wallet Team
"""

from .user import (
    UserListItem,
    UserDetailResponse,
    UserUpdateRequest,
    UserActionResponse
)

from .dashboard import (
    DashboardStats,
    RecentActivity,
    SystemHealth,
    DashboardResponse
)

from .trade import (
    TradeStatus,
    TradeType,
    TradeBase,
    TradeDetail,
    TradeListResponse,
    TradeListParams,
    TradeCancelRequest,
    TradeCancelResponse
)

from .p2p import (
    P2POrderStatus,
    P2POrderType,
    DisputeStatus,
    EscrowStatus,
    P2POrderBase,
    P2POrderListResponse,
    DisputeBase,
    DisputeListResponse,
    DisputeResolveRequest,
    DisputeResolveResponse,
    EscrowBase,
    EscrowActionResponse
)

from .settings import (
    TradingSettings,
    P2PSettings,
    SecuritySettings,
    NotificationSettings,
    SystemSettings,
    FlatSystemSettings,
    SettingsUpdateRequest
)

from .report import (
    ReportPeriod,
    VolumeReport,
    UserReport,
    RevenueReport,
    TopTrader,
    VolumeReportResponse,
    UserReportResponse,
    RevenueReportResponse,
    TopTradersResponse,
    ReportExportRequest
)

from .audit import (
    AuditLogBase,
    AuditLogDetail,
    AuditLogListResponse,
    AuditLogListParams,
    AuditLogCreate,
    AuditActions,
    AuditTargetTypes
)

__all__ = [
    # User schemas
    "UserListItem",
    "UserDetailResponse", 
    "UserUpdateRequest",
    "UserActionResponse",
    
    # Dashboard schemas
    "DashboardStats",
    "RecentActivity",
    "SystemHealth",
    "DashboardResponse",
    
    # Trade schemas
    "TradeStatus",
    "TradeType",
    "TradeBase",
    "TradeDetail",
    "TradeListResponse",
    "TradeListParams",
    "TradeCancelRequest",
    "TradeCancelResponse",
    
    # P2P schemas
    "P2POrderStatus",
    "P2POrderType",
    "DisputeStatus",
    "EscrowStatus",
    "P2POrderBase",
    "P2POrderListResponse",
    "DisputeBase",
    "DisputeListResponse",
    "DisputeResolveRequest",
    "DisputeResolveResponse",
    "EscrowBase",
    "EscrowActionResponse",
    
    # Settings schemas
    "TradingSettings",
    "P2PSettings",
    "SecuritySettings",
    "NotificationSettings",
    "SystemSettings",
    "FlatSystemSettings",
    "SettingsUpdateRequest",
    
    # Report schemas
    "ReportPeriod",
    "VolumeReport",
    "UserReport",
    "RevenueReport",
    "TopTrader",
    "VolumeReportResponse",
    "UserReportResponse",
    "RevenueReportResponse",
    "TopTradersResponse",
    "ReportExportRequest",
    
    # Audit schemas
    "AuditLogBase",
    "AuditLogDetail",
    "AuditLogListResponse",
    "AuditLogListParams",
    "AuditLogCreate",
    "AuditActions",
    "AuditTargetTypes"
]
