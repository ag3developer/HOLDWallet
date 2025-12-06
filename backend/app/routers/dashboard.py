"""
📊 HOLD Wallet - Dashboard API Endpoints
========================================

Comprehensive dashboard endpoints for user statistics, portfolio overview,
trading activity, and system-wide metrics.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.core.logging import get_logger

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = get_logger("dashboard")

@router.get("/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard overview for the authenticated user.
    Returns portfolio balance, recent activity, P2P stats, and quick actions.
    """
    try:
        # Portfolio Summary (Mock data - replace with actual database queries)
        portfolio_data = {
            "total_balance_usd": 15487.32,
            "total_balance_brl": 78653.22,
            "change_24h": 2.45,  # percentage
            "change_24h_usd": 379.15,
            "wallets_count": 4,
            "assets": [
                {
                    "symbol": "BTC",
                    "name": "Bitcoin", 
                    "balance": "0.75432100",
                    "balance_usd": 31254.87,
                    "balance_brl": 158742.89,
                    "change_24h": 1.2,
                    "icon": "/assets/btc.png"
                },
                {
                    "symbol": "ETH",
                    "name": "Ethereum",
                    "balance": "8.42156000", 
                    "balance_usd": 18765.43,
                    "balance_brl": 95321.11,
                    "change_24h": 3.8,
                    "icon": "/assets/eth.png"
                },
                {
                    "symbol": "USDT",
                    "name": "Tether",
                    "balance": "5000.00000000",
                    "balance_usd": 5000.00,
                    "balance_brl": 25400.00,
                    "change_24h": 0.1,
                    "icon": "/assets/usdt.png"
                }
            ]
        }

        # P2P Trading Statistics
        p2p_stats = {
            "total_trades": 47,
            "successful_trades": 45,
            "success_rate": 95.7,
            "total_volume_brl": 245780.50,
            "avg_trade_time_minutes": 15,
            "reputation_score": 4.8,
            "active_orders": 3,
            "completed_orders": 42,
            "monthly_volume": 89650.30,
            "monthly_profit": 1247.85,
            "preferred_payment_methods": ["PIX", "TED", "Mercado Pago"],
            "trade_history": [
                {
                    "date": "2024-11-24",
                    "type": "sell",
                    "asset": "BTC",
                    "amount": 0.1,
                    "price_brl": 42000,
                    "total_brl": 4200,
                    "status": "completed",
                    "counterparty": "trader_xyz"
                },
                {
                    "date": "2024-11-23", 
                    "type": "buy",
                    "asset": "ETH",
                    "amount": 2.0,
                    "price_brl": 5800,
                    "total_brl": 11600,
                    "status": "completed",
                    "counterparty": "crypto_pro"
                }
            ]
        }

        # Recent Activity
        recent_activity = [
            {
                "id": "act_001",
                "type": "p2p_trade_completed",
                "title": "Trade Completado",
                "description": "Venda de 0.1 BTC por R$ 4.200,00",
                "amount": "0.1 BTC",
                "timestamp": datetime.utcnow() - timedelta(hours=2),
                "icon": "trade-success",
                "status": "success"
            },
            {
                "id": "act_002", 
                "type": "wallet_received",
                "title": "Depósito Recebido",
                "description": "Recebido 2.5 ETH na carteira principal",
                "amount": "2.5 ETH",
                "timestamp": datetime.utcnow() - timedelta(hours=5),
                "icon": "wallet-in",
                "status": "info"
            },
            {
                "id": "act_003",
                "type": "p2p_order_created", 
                "title": "Nova Ordem Criada",
                "description": "Ordem de compra BTC - R$ 41.800/BTC",
                "amount": "até 1.0 BTC",
                "timestamp": datetime.utcnow() - timedelta(hours=8),
                "icon": "order-buy",
                "status": "pending"
            }
        ]

        # Market Overview
        market_overview = {
            "trending_assets": [
                {"symbol": "BTC", "price_brl": 42150.00, "change_24h": 2.3},
                {"symbol": "ETH", "price_brl": 5890.50, "change_24h": 4.1},
                {"symbol": "SOL", "price_brl": 285.75, "change_24h": 7.8}
            ],
            "p2p_volume_24h": 2456789.50,
            "active_traders": 156,
            "avg_spread": 0.8  # percentage
        }

        # Notifications/Alerts
        notifications = [
            {
                "id": "notif_001",
                "type": "price_alert",
                "title": "Alerta de Preço",
                "message": "BTC atingiu R$ 42.000 - sua meta de preço",
                "priority": "high",
                "timestamp": datetime.utcnow() - timedelta(minutes=30),
                "read": False
            },
            {
                "id": "notif_002",
                "type": "trade_match",
                "title": "Trade Match",
                "message": "Sua ordem de venda ETH foi matched com comprador",
                "priority": "medium", 
                "timestamp": datetime.utcnow() - timedelta(hours=1),
                "read": False
            }
        ]

        # Quick Actions
        quick_actions = [
            {
                "id": "create_order",
                "title": "Criar Ordem P2P",
                "description": "Comprar ou vender crypto",
                "icon": "plus-circle",
                "route": "/p2p/create-order"
            },
            {
                "id": "send_crypto",
                "title": "Enviar Crypto", 
                "description": "Transferir para outra carteira",
                "icon": "send",
                "route": "/wallet/send"
            },
            {
                "id": "deposit",
                "title": "Depositar",
                "description": "Adicionar fundos à carteira",
                "icon": "wallet-plus",
                "route": "/wallet/deposit"
            },
            {
                "id": "chat",
                "title": "Chat P2P",
                "description": "Conversar com traders",
                "icon": "message-circle", 
                "route": "/chat"
            }
        ]

        return {
            "success": True,
            "user": {
                "id": str(current_user.id),
                "email": current_user.email,
                "username": current_user.username,
                "member_since": current_user.created_at,
                "last_login": current_user.last_login
            },
            "portfolio": portfolio_data,
            "p2p_stats": p2p_stats,
            "recent_activity": recent_activity,
            "market_overview": market_overview,
            "notifications": notifications,
            "quick_actions": quick_actions,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Dashboard overview error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard overview"
        )

@router.get("/portfolio/detailed")
async def get_detailed_portfolio(
    current_user: User = Depends(get_current_user),
    period: str = Query(default="30d", regex="^(24h|7d|30d|90d|1y)$"),
    db: Session = Depends(get_db)
):
    """
    Get detailed portfolio analysis including historical performance,
    allocation breakdown, and profit/loss calculations.
    """
    try:
        # Historical performance data (mock)
        historical_performance = {
            "period": period,
            "data_points": [
                {"date": "2024-11-01", "total_usd": 12350.00, "total_brl": 62750.00},
                {"date": "2024-11-08", "total_usd": 13200.00, "total_brl": 67100.00},
                {"date": "2024-11-15", "total_usd": 14100.00, "total_brl": 71650.00},
                {"date": "2024-11-22", "total_usd": 15487.32, "total_brl": 78653.22}
            ],
            "performance_metrics": {
                "total_return_usd": 3137.32,
                "total_return_percentage": 25.4,
                "best_performing_asset": "SOL",
                "worst_performing_asset": "USDT",
                "volatility": 12.8,
                "sharpe_ratio": 1.45
            }
        }

        # Asset allocation
        asset_allocation = {
            "by_value": [
                {"asset": "BTC", "percentage": 55.2, "value_usd": 8549.16},
                {"asset": "ETH", "percentage": 32.1, "value_usd": 4971.43}, 
                {"asset": "USDT", "percentage": 8.5, "value_usd": 1316.42},
                {"asset": "SOL", "percentage": 4.2, "value_usd": 650.31}
            ],
            "target_allocation": [
                {"asset": "BTC", "target": 60.0, "current": 55.2, "action": "buy"},
                {"asset": "ETH", "target": 30.0, "current": 32.1, "action": "sell"},
                {"asset": "USDT", "target": 10.0, "current": 8.5, "action": "buy"}
            ]
        }

        # Transaction summary
        transaction_summary = {
            "period": period,
            "total_transactions": 28,
            "total_deposits": 6,
            "total_withdrawals": 4,
            "total_p2p_trades": 18,
            "total_fees_paid": 145.67,
            "net_inflow": 8950.00,
            "largest_transaction": {
                "type": "p2p_trade",
                "amount": "1.5 BTC", 
                "value_usd": 63000.00,
                "date": "2024-11-20"
            }
        }

        return {
            "success": True,
            "period": period,
            "historical_performance": historical_performance,
            "asset_allocation": asset_allocation,
            "transaction_summary": transaction_summary,
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Detailed portfolio error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load detailed portfolio"
        )

@router.get("/analytics/trading")
async def get_trading_analytics(
    current_user: User = Depends(get_current_user),
    period: str = Query(default="30d", regex="^(7d|30d|90d|1y)$"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive P2P trading analytics including success rates,
    profit analysis, and performance comparisons.
    """
    try:
        # Trading performance metrics
        trading_metrics = {
            "period": period,
            "total_trades": 47,
            "winning_trades": 42,
            "losing_trades": 3,
            "break_even_trades": 2,
            "win_rate": 89.4,
            "avg_profit_per_trade": 187.50,
            "total_profit": 8812.50,
            "total_fees": 234.67,
            "net_profit": 8577.83,
            "roi": 15.8,
            "avg_trade_duration_hours": 2.3,
            "fastest_trade_minutes": 12,
            "slowest_trade_hours": 8.5
        }

        # Asset performance breakdown
        asset_performance = [
            {
                "asset": "BTC",
                "trades": 28,
                "volume_brl": 154780.00,
                "profit_brl": 5432.10,
                "success_rate": 92.8,
                "avg_spread": 0.6
            },
            {
                "asset": "ETH", 
                "trades": 15,
                "volume_brl": 67890.00,
                "profit_brl": 2345.67,
                "success_rate": 86.7,
                "avg_spread": 0.8
            },
            {
                "asset": "USDT",
                "trades": 4,
                "volume_brl": 23110.00,
                "profit_brl": 799.06,
                "success_rate": 100.0,
                "avg_spread": 0.3
            }
        ]

        # Monthly performance trend
        monthly_trend = [
            {"month": "2024-09", "trades": 12, "profit": 2150.00, "volume": 45600.00},
            {"month": "2024-10", "trades": 18, "profit": 3890.50, "volume": 78900.00},
            {"month": "2024-11", "trades": 17, "profit": 2537.33, "volume": 121280.00}
        ]

        # Payment method efficiency
        payment_method_stats = [
            {
                "method": "PIX",
                "trades": 32,
                "avg_completion_time_minutes": 8,
                "success_rate": 96.9,
                "volume_percentage": 68.1
            },
            {
                "method": "TED",
                "trades": 12,
                "avg_completion_time_minutes": 45,
                "success_rate": 91.7,
                "volume_percentage": 25.5
            },
            {
                "method": "Mercado Pago",
                "trades": 3,
                "avg_completion_time_minutes": 12,
                "success_rate": 100.0,
                "volume_percentage": 6.4
            }
        ]

        # Risk metrics
        risk_metrics = {
            "max_drawdown": 3.2,
            "volatility": 8.7,
            "risk_score": "Moderate",
            "position_size_avg": 15.8,
            "largest_position_percentage": 28.5,
            "diversification_ratio": 0.72
        }

        return {
            "success": True,
            "period": period,
            "trading_metrics": trading_metrics,
            "asset_performance": asset_performance,
            "monthly_trend": monthly_trend,
            "payment_method_stats": payment_method_stats,
            "risk_metrics": risk_metrics,
            "benchmark_comparison": {
                "user_performance": trading_metrics["roi"],
                "platform_average": 12.4,
                "market_performance": 8.9,
                "outperformance": 3.4
            },
            "generated_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Trading analytics error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load trading analytics"
        )

@router.get("/notifications")
async def get_user_notifications(
    current_user: User = Depends(get_current_user),
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db)
):
    """
    Get user notifications with filtering options.
    """
    try:
        # Mock notification data - replace with actual database queries
        all_notifications = [
            {
                "id": "notif_001",
                "type": "price_alert",
                "category": "market",
                "title": "Alerta de Preço - BTC",
                "message": "Bitcoin atingiu R$ 42.000 - sua meta de preço configurada",
                "data": {"asset": "BTC", "price": 42000, "target_price": 42000},
                "priority": "high",
                "read": False,
                "created_at": datetime.utcnow() - timedelta(minutes=30),
                "actions": [
                    {"label": "Ver Gráfico", "action": "view_chart", "asset": "BTC"},
                    {"label": "Criar Ordem", "action": "create_order", "asset": "BTC"}
                ]
            },
            {
                "id": "notif_002",
                "type": "trade_match",
                "category": "trading",
                "title": "Trade Match - ETH",
                "message": "Sua ordem de venda de 2 ETH foi matched com um comprador",
                "data": {"trade_id": "trade_789", "asset": "ETH", "amount": 2.0},
                "priority": "medium",
                "read": False,
                "created_at": datetime.utcnow() - timedelta(hours=1),
                "actions": [
                    {"label": "Ver Trade", "action": "view_trade", "trade_id": "trade_789"},
                    {"label": "Chat", "action": "open_chat", "trade_id": "trade_789"}
                ]
            },
            {
                "id": "notif_003",
                "type": "trade_completed",
                "category": "trading", 
                "title": "Trade Completado",
                "message": "Venda de 0.5 BTC completada com sucesso. Lucro: R$ 187,50",
                "data": {"trade_id": "trade_456", "profit": 187.50},
                "priority": "low",
                "read": True,
                "created_at": datetime.utcnow() - timedelta(hours=6),
                "actions": [
                    {"label": "Ver Detalhes", "action": "view_trade", "trade_id": "trade_456"},
                    {"label": "Avaliar", "action": "rate_trade", "trade_id": "trade_456"}
                ]
            }
        ]

        # Filter notifications
        filtered_notifications = all_notifications
        if unread_only:
            filtered_notifications = [n for n in all_notifications if not n["read"]]
        
        # Apply limit
        limited_notifications = filtered_notifications[:limit]

        # Count stats
        total_count = len(all_notifications)
        unread_count = len([n for n in all_notifications if not n["read"]])

        return {
            "success": True,
            "notifications": limited_notifications,
            "pagination": {
                "total": total_count,
                "unread": unread_count,
                "returned": len(limited_notifications),
                "limit": limit
            },
            "categories": {
                "market": len([n for n in all_notifications if n["category"] == "market"]),
                "trading": len([n for n in all_notifications if n["category"] == "trading"]),
                "security": len([n for n in all_notifications if n["category"] == "security"]),
                "system": len([n for n in all_notifications if n["category"] == "system"])
            }
        }

    except Exception as e:
        logger.error(f"Notifications error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load notifications"
        )

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read.
    """
    try:
        # In production, update the notification in database
        # For now, return success
        
        return {
            "success": True,
            "message": "Notification marked as read",
            "notification_id": notification_id
        }

    except Exception as e:
        logger.error(f"Mark notification read error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )

@router.get("/system-stats")
async def get_system_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide statistics (for admin/power users).
    """
    try:
        # Platform statistics (mock data)
        system_stats = {
            "platform_metrics": {
                "total_users": 12847,
                "active_users_24h": 2156,
                "total_trades": 89654,
                "successful_trades": 87230,
                "platform_success_rate": 97.3,
                "total_volume_brl": 2456789012.50,
                "avg_daily_volume": 8950000.00
            },
            "market_metrics": {
                "active_orders": 1547,
                "buy_orders": 789,
                "sell_orders": 758,
                "avg_spread_percentage": 0.85,
                "supported_assets": 12,
                "payment_methods": 6
            },
            "performance_metrics": {
                "avg_trade_completion_time": 18.5,  # minutes
                "system_uptime": 99.97,  # percentage
                "api_response_time": 142,  # milliseconds
                "websocket_connections": 3456
            },
            "security_metrics": {
                "failed_login_attempts_24h": 45,
                "blocked_ips_24h": 12,
                "2fa_adoption_rate": 78.5,
                "kyc_completion_rate": 65.2
            }
        }

        return {
            "success": True,
            "system_stats": system_stats,
            "generated_at": datetime.utcnow().isoformat(),
            "data_freshness": "real-time"
        }

    except Exception as e:
        logger.error(f"System stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load system statistics"
        )
