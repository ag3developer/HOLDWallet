"""
🛡️ HOLD Wallet - Admin Reports Router
======================================

Relatórios e analytics do sistema.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, String
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.transaction import Transaction
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.p2p import P2POrder, P2PMatch
from app.models.accounting import AccountingEntry
from app.models.wolkpay import (
    WolkPayInvoice, InvoiceStatus,
    WolkPayBillPayment, BillPaymentStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reports",
    tags=["Admin - Reports"],
    dependencies=[Depends(get_current_admin)]
)


def get_period_config(period: str):
    """Retorna configuração do período"""
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start_date = now - timedelta(days=7)
        prev_start = now - timedelta(days=14)
        prev_end = start_date
        days = 7
    elif period == "30d":
        start_date = now - timedelta(days=30)
        prev_start = now - timedelta(days=60)
        prev_end = start_date
        days = 30
    elif period == "3m":
        start_date = now - timedelta(days=90)
        prev_start = now - timedelta(days=180)
        prev_end = start_date
        days = 90
    elif period == "12m":
        start_date = now - timedelta(days=365)
        prev_start = now - timedelta(days=730)
        prev_end = start_date
        days = 365
    else:
        start_date = None
        prev_start = None
        prev_end = None
        days = 0
    
    return start_date, prev_start, prev_end, now, days


def calc_change(current: float, previous: float) -> float:
    """Calcula variação percentual"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/dashboard")
async def get_reports_dashboard(
    period: str = Query("7d", regex="^(7d|30d|3m|12m)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    📊 Dashboard completo de relatórios com dados reais.
    
    Retorna métricas, volume de trading, distribuição e top traders.
    """
    try:
        start_date, prev_start, prev_end, now, days = get_period_config(period)
        
        # ==================
        # MÉTRICAS PRINCIPAIS
        # ==================
        
        # Volume total (período atual)
        volume_query = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_query = volume_query.filter(InstantTrade.completed_at >= start_date)
        current_volume = float(volume_query.scalar() or 0)
        
        # Volume período anterior
        prev_volume = 0.0
        if prev_start and prev_end:
            prev_volume = float(db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= prev_start,
                InstantTrade.completed_at < prev_end
            ).scalar() or 0)
        
        volume_change = calc_change(current_volume, prev_volume)
        
        # Novos usuários (período atual)
        users_query = db.query(func.count(User.id))
        if start_date:
            users_query = users_query.filter(User.created_at >= start_date)
        current_users = users_query.scalar() or 0
        
        # Novos usuários período anterior
        prev_users = 0
        if prev_start and prev_end:
            prev_users = db.query(func.count(User.id)).filter(
                User.created_at >= prev_start,
                User.created_at < prev_end
            ).scalar() or 0
        
        users_change = calc_change(current_users, prev_users)
        
        # Trades realizados (período atual)
        trades_query = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            trades_query = trades_query.filter(InstantTrade.completed_at >= start_date)
        current_trades = trades_query.scalar() or 0
        
        # Trades período anterior
        prev_trades = 0
        if prev_start and prev_end:
            prev_trades = db.query(func.count(InstantTrade.id)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= prev_start,
                InstantTrade.completed_at < prev_end
            ).scalar() or 0
        
        trades_change = calc_change(current_trades, prev_trades)
        
        # Taxas coletadas
        fees_query = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.status == "processed"
        )
        if start_date:
            fees_query = fees_query.filter(AccountingEntry.created_at >= start_date)
        current_fees = float(fees_query.scalar() or 0)
        
        # Taxa média
        avg_fee_rate = 0.0
        if current_volume > 0:
            avg_fee_rate = round((current_fees / current_volume) * 100, 2)
        
        # Taxas período anterior
        prev_fees = 0.0
        if prev_start and prev_end:
            prev_fees = float(db.query(func.sum(AccountingEntry.amount)).filter(
                AccountingEntry.status == "processed",
                AccountingEntry.created_at >= prev_start,
                AccountingEntry.created_at < prev_end
            ).scalar() or 0)
        
        fees_change = calc_change(current_fees, prev_fees)
        
        # ==================
        # VOLUME DIÁRIO
        # ==================
        volume_data = []
        num_days = min(days, 7) if days > 0 else 7  # Máximo 7 dias no gráfico
        
        for i in range(num_days - 1, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Volume de compra
            buy_vol = db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.operation_type == "buy",
                InstantTrade.completed_at >= day_start,
                InstantTrade.completed_at < day_end
            ).scalar() or 0
            
            # Volume de venda
            sell_vol = db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.operation_type == "sell",
                InstantTrade.completed_at >= day_start,
                InstantTrade.completed_at < day_end
            ).scalar() or 0
            
            volume_data.append({
                "date": day.strftime("%d/%m"),
                "buy_volume": float(buy_vol),
                "sell_volume": float(sell_vol)
            })
        
        # ==================
        # DISTRIBUIÇÃO POR TIPO
        # ==================
        
        # Trades OTC completados
        otc_count = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            otc_count = otc_count.filter(InstantTrade.completed_at >= start_date)
        otc_trades = otc_count.scalar() or 0
        
        # Trades P2P completados
        p2p_count = db.query(func.count(P2PMatch.id)).filter(
            P2PMatch.status == "completed"
        )
        if start_date:
            p2p_count = p2p_count.filter(P2PMatch.completed_at >= start_date)
        p2p_trades = p2p_count.scalar() or 0
        
        # ==================
        # WOLKPAY - Faturas
        # ==================
        wolkpay_count = db.query(func.count(WolkPayInvoice.id)).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_count = wolkpay_count.filter(WolkPayInvoice.created_at >= start_date)
        wolkpay_invoices = wolkpay_count.scalar() or 0
        
        wolkpay_vol = db.query(func.sum(WolkPayInvoice.total_amount_brl)).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_vol = wolkpay_vol.filter(WolkPayInvoice.created_at >= start_date)
        wolkpay_volume = float(wolkpay_vol.scalar() or 0)
        
        wolkpay_fees_q = db.query(func.sum(WolkPayInvoice.service_fee_brl + WolkPayInvoice.network_fee_brl)).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_fees_q = wolkpay_fees_q.filter(WolkPayInvoice.created_at >= start_date)
        wolkpay_fees_total = float(wolkpay_fees_q.scalar() or 0)
        
        # ==================
        # BILL PAYMENT - Boletos
        # ==================
        billpay_count = db.query(func.count(WolkPayBillPayment.id)).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_count = billpay_count.filter(WolkPayBillPayment.created_at >= start_date)
        billpay_bills = billpay_count.scalar() or 0
        
        billpay_vol = db.query(func.sum(WolkPayBillPayment.bill_amount_brl)).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_vol = billpay_vol.filter(WolkPayBillPayment.created_at >= start_date)
        billpay_volume = float(billpay_vol.scalar() or 0)
        
        billpay_fees_q = db.query(func.sum(WolkPayBillPayment.service_fee_brl + WolkPayBillPayment.network_fee_brl)).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_fees_q = billpay_fees_q.filter(WolkPayBillPayment.created_at >= start_date)
        billpay_fees_total = float(billpay_fees_q.scalar() or 0)
        
        total_all_trades = otc_trades + p2p_trades + wolkpay_invoices + billpay_bills
        total_all_volume = current_volume + wolkpay_volume + billpay_volume
        
        # Calcular percentuais
        otc_percent = round((otc_trades / total_all_trades * 100) if total_all_trades > 0 else 0, 1)
        p2p_percent = round((p2p_trades / total_all_trades * 100) if total_all_trades > 0 else 0, 1)
        wolkpay_percent = round((wolkpay_invoices / total_all_trades * 100) if total_all_trades > 0 else 0, 1)
        billpay_percent = round((billpay_bills / total_all_trades * 100) if total_all_trades > 0 else 0, 1)
        
        # ==================
        # TOP TRADERS
        # ==================
        top_traders_query = db.query(
            User.id,
            User.email,
            func.count(InstantTrade.id).label('trades_count'),
            func.sum(InstantTrade.brl_amount).label('total_volume')
        ).join(
            InstantTrade, cast(InstantTrade.user_id, String) == cast(User.id, String)
        ).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        
        if start_date:
            top_traders_query = top_traders_query.filter(InstantTrade.completed_at >= start_date)
        
        top_traders_query = top_traders_query.group_by(
            User.id, User.email
        ).order_by(
            func.sum(InstantTrade.brl_amount).desc()
        ).limit(5)
        
        top_traders = []
        try:
            results = top_traders_query.all()
            for rank, t in enumerate(results, 1):
                # Mascarar email
                email = t[1] or "unknown"
                if "@" in email:
                    parts = email.split("@")
                    masked = parts[0][:3] + "***@" + parts[1][:3] + "..."
                else:
                    masked = email[:5] + "***"
                
                # Calcular taxa paga (estimativa 2% do volume)
                volume = float(t[3] or 0)
                fee_paid = round(volume * 0.02, 2)
                
                top_traders.append({
                    "rank": rank,
                    "user_id": str(t[0]),
                    "email": masked,
                    "trades_count": t[2] or 0,
                    "total_volume": round(volume, 2),
                    "fee_paid": fee_paid
                })
        except Exception as e:
            logger.warning(f"Erro ao buscar top traders: {e}")
        
        # ==================
        # RESPONSE
        # ==================
        logger.info(f"✅ Reports dashboard carregado por: {current_admin.email}")
        
        return {
            "success": True,
            "data": {
                "metrics": [
                    {
                        "title": "Volume Total",
                        "value": total_all_volume,
                        "formatted_value": f"R$ {total_all_volume:,.2f}",
                        "change": volume_change,
                        "change_label": "vs período anterior",
                        "color": "blue"
                    },
                    {
                        "title": "Novos Usuários",
                        "value": current_users,
                        "formatted_value": str(current_users),
                        "change": users_change,
                        "change_label": "vs período anterior",
                        "color": "green"
                    },
                    {
                        "title": "Operações",
                        "value": total_all_trades,
                        "formatted_value": f"{total_all_trades:,}",
                        "change": trades_change,
                        "change_label": "vs período anterior",
                        "color": "purple"
                    },
                    {
                        "title": "Taxas Coletadas",
                        "value": current_fees + wolkpay_fees_total + billpay_fees_total,
                        "formatted_value": f"R$ {(current_fees + wolkpay_fees_total + billpay_fees_total):,.2f}",
                        "change": 0,
                        "change_label": "total do período",
                        "color": "orange"
                    }
                ],
                "volume_data": volume_data,
                "distribution": {
                    "total_trades": total_all_trades,
                    "otc": {
                        "count": otc_trades,
                        "percent": otc_percent,
                        "volume": round(current_volume, 2)
                    },
                    "p2p": {
                        "count": p2p_trades,
                        "percent": p2p_percent
                    },
                    "wolkpay": {
                        "count": wolkpay_invoices,
                        "percent": wolkpay_percent,
                        "volume": round(wolkpay_volume, 2),
                        "fees": round(wolkpay_fees_total, 2)
                    },
                    "bill_payment": {
                        "count": billpay_bills,
                        "percent": billpay_percent,
                        "volume": round(billpay_volume, 2),
                        "fees": round(billpay_fees_total, 2)
                    }
                },
                "top_traders": top_traders,
                "period": period,
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no dashboard de reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar reports: {str(e)}"
        )


@router.get("/overview", response_model=dict)
async def get_reports_overview(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Resumo geral de relatórios
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Definir período
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Usuários
        users_query = db.query(func.count(User.id))
        if start_date:
            users_query = users_query.filter(User.created_at >= start_date)
        new_users = users_query.scalar() or 0
        
        # Trades OTC
        trades_query = db.query(InstantTrade)
        if start_date:
            trades_query = trades_query.filter(InstantTrade.created_at >= start_date)
        
        total_trades = trades_query.count()
        completed_trades = trades_query.filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).count()
        
        # Volume
        volume_query = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_query = volume_query.filter(InstantTrade.created_at >= start_date)
        total_volume = volume_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "users": {
                    "new_registrations": new_users
                },
                "trades": {
                    "total": total_trades,
                    "completed": completed_trades,
                    "completion_rate": round((completed_trades / total_trades * 100) if total_trades > 0 else 0, 2)
                },
                "volume": {
                    "total_brl": float(total_volume)
                },
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/users", response_model=dict)
async def get_users_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório de usuários
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Estatísticas
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        verified_users = db.query(func.count(User.id)).filter(User.is_email_verified == True).scalar() or 0
        admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
        
        # Novos no período
        new_query = db.query(func.count(User.id))
        if start_date:
            new_query = new_query.filter(User.created_at >= start_date)
        new_users = new_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "verified_users": verified_users,
                "unverified_users": total_users - verified_users,
                "admin_users": admin_users,
                "new_users_period": new_users,
                "verification_rate": round((verified_users / total_users * 100) if total_users > 0 else 0, 2),
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório de usuários: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/trades", response_model=dict)
async def get_trades_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório de trades OTC
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Base query
        base_query = db.query(InstantTrade)
        if start_date:
            base_query = base_query.filter(InstantTrade.created_at >= start_date)
        
        total = base_query.count()
        pending = base_query.filter(InstantTrade.status == TradeStatus.PENDING).count()
        completed = base_query.filter(InstantTrade.status == TradeStatus.COMPLETED).count()
        failed = base_query.filter(InstantTrade.status == TradeStatus.FAILED).count()
        cancelled = base_query.filter(InstantTrade.status == TradeStatus.CANCELLED).count()
        expired = base_query.filter(InstantTrade.status == TradeStatus.EXPIRED).count()
        
        # Volume
        volume_query = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_query = volume_query.filter(InstantTrade.created_at >= start_date)
        total_volume = volume_query.scalar() or 0
        
        return {
            "success": True,
            "period": period,
            "data": {
                "total_trades": total,
                "by_status": {
                    "pending": pending,
                    "completed": completed,
                    "failed": failed,
                    "cancelled": cancelled,
                    "expired": expired
                },
                "volume_brl": float(total_volume),
                "completion_rate": round((completed / total * 100) if total > 0 else 0, 2),
                "failure_rate": round((failed / total * 100) if total > 0 else 0, 2),
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório de trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/p2p", response_model=dict)
async def get_p2p_report(
    period: str = Query("30d", regex="^(24h|7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Relatório P2P
    """
    try:
        now = datetime.now(timezone.utc)
        
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Ordens
        orders_query = db.query(P2POrder)
        if start_date:
            orders_query = orders_query.filter(P2POrder.created_at >= start_date)
        
        total_orders = orders_query.count()
        active_orders = orders_query.filter(P2POrder.status == "active").count()
        
        # Matches
        matches_query = db.query(P2PMatch)
        if start_date:
            matches_query = matches_query.filter(P2PMatch.created_at >= start_date)
        
        total_matches = matches_query.count()
        completed_matches = matches_query.filter(P2PMatch.status == "completed").count()
        
        return {
            "success": True,
            "period": period,
            "data": {
                "orders": {
                    "total": total_orders,
                    "active": active_orders
                },
                "matches": {
                    "total": total_matches,
                    "completed": completed_matches,
                    "completion_rate": round((completed_matches / total_matches * 100) if total_matches > 0 else 0, 2)
                },
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no relatório P2P: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
