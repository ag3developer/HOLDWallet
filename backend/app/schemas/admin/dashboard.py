"""
🛡️ HOLD Wallet - Admin Dashboard Schemas
========================================

Schemas para dashboard administrativo.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DashboardStats(BaseModel):
    """Estatísticas do dashboard."""
    total_users: int
    active_users: int
    new_users_today: int
    new_users_week: int
    
    total_trades: int
    pending_trades: int
    completed_trades_today: int
    completed_trades_week: int
    
    total_volume_usdt: float
    volume_today_usdt: float
    volume_week_usdt: float
    
    open_disputes: int
    total_escrow_usdt: float
    
    # P2P stats
    active_p2p_orders: int
    total_p2p_matches: int


class RecentActivity(BaseModel):
    """Atividade recente no sistema."""
    id: str
    type: str  # 'trade', 'user_register', 'dispute', 'withdrawal', etc.
    user_id: Optional[str] = None
    username: Optional[str] = None
    description: str
    amount: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SystemHealth(BaseModel):
    """Status de saúde do sistema."""
    database: str  # 'healthy', 'degraded', 'down'
    cache: str
    api: str
    blockchain_node: str
    
    active_connections: int
    requests_per_minute: int
    avg_response_time_ms: float


class DashboardResponse(BaseModel):
    """Resposta completa do dashboard."""
    stats: DashboardStats
    recent_activities: List[RecentActivity]
    health: Optional[SystemHealth] = None
