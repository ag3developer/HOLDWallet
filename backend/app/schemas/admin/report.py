"""
🛡️ HOLD Wallet - Admin Report Schemas
=====================================

Schemas para relatórios administrativos.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class ReportPeriod(str, Enum):
    """Período do relatório."""
    DAILY = "7d"
    MONTHLY = "30d"
    QUARTERLY = "3m"
    YEARLY = "12m"


class VolumeReport(BaseModel):
    """Relatório de volume."""
    date: str
    buy_volume: float
    sell_volume: float
    total_volume: float
    trade_count: int
    unique_users: int


class UserReport(BaseModel):
    """Relatório de usuários."""
    date: str
    new_users: int
    active_users: int
    returning_users: int
    churned_users: int


class RevenueReport(BaseModel):
    """Relatório de receita."""
    date: str
    trading_fees: float
    p2p_fees: float
    other_fees: float
    total_revenue: float


class TopTrader(BaseModel):
    """Top trader."""
    rank: int
    user_id: str
    username: str
    trade_count: int
    total_volume_usdt: float
    fees_paid_usdt: float


class VolumeReportResponse(BaseModel):
    """Resposta de relatório de volume."""
    period: str
    data: List[VolumeReport]
    total_buy_volume: float
    total_sell_volume: float
    total_volume: float
    total_trades: int


class UserReportResponse(BaseModel):
    """Resposta de relatório de usuários."""
    period: str
    data: List[UserReport]
    total_new_users: int
    total_active_users: int
    retention_rate: float


class RevenueReportResponse(BaseModel):
    """Resposta de relatório de receita."""
    period: str
    data: List[RevenueReport]
    total_revenue: float
    revenue_growth_percent: float


class TopTradersResponse(BaseModel):
    """Resposta de top traders."""
    period: str
    traders: List[TopTrader]


class ReportExportRequest(BaseModel):
    """Request para exportar relatório."""
    report_type: str  # 'volume', 'users', 'revenue', 'trades'
    period: ReportPeriod
    format: str = "csv"  # 'csv', 'xlsx', 'pdf'
    filters: Optional[dict] = None
