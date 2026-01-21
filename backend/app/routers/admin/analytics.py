"""
📊 HOLD Wallet - Admin Analytics Router
=======================================

Analytics avançados e métricas da plataforma com dados reais.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, distinct
from typing import Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.p2p import P2POrder, P2PMatch, P2PDispute
from app.models.accounting import AccountingEntry
from app.models.wolkpay import (
    WolkPayInvoice, InvoiceStatus,
    WolkPayBillPayment, BillPaymentStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Admin - Analytics"],
    dependencies=[Depends(get_current_admin)]
)


def get_period_dates(period: str):
    """Retorna as datas de início e fim para um período"""
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start_date = now - timedelta(days=7)
        previous_start = now - timedelta(days=14)
        previous_end = start_date
    elif period == "30d":
        start_date = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)
        previous_end = start_date
    elif period == "90d":
        start_date = now - timedelta(days=90)
        previous_start = now - timedelta(days=180)
        previous_end = start_date
    else:  # all
        start_date = None
        previous_start = None
        previous_end = None
    
    return start_date, previous_start, previous_end, now


def calculate_growth(current: float, previous: float) -> float:
    """Calcula a taxa de crescimento percentual"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 2)


@router.get("/overview")
async def get_analytics_overview(
    period: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    📊 Analytics completo da plataforma com dados reais.
    
    Retorna:
    - overview: Métricas principais (usuários, volume, trades, taxas)
    - growth: Crescimento vs período anterior
    - trading: Métricas de trading (OTC, P2P, valor médio)
    - timeframes: Dados diários e semanais para gráficos
    """
    try:
        start_date, previous_start, previous_end, now = get_period_dates(period)
        last_24h = now - timedelta(hours=24)
        
        # =====================
        # OVERVIEW - Usuários
        # =====================
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # Usuários ativos nas últimas 24h (simplificado - apenas login recente)
        active_users_24h = db.query(func.count(User.id)).filter(
            User.last_login >= last_24h
        ).scalar() or 0
        
        # =====================
        # OVERVIEW - Trades OTC
        # =====================
        otc_query = db.query(InstantTrade).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            otc_query = otc_query.filter(InstantTrade.completed_at >= start_date)
        
        otc_trades = otc_query.count()
        
        # Volume OTC
        volume_otc = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        if start_date:
            volume_otc = volume_otc.filter(InstantTrade.completed_at >= start_date)
        volume_otc = float(volume_otc.scalar() or 0)
        
        # =====================
        # OVERVIEW - Trades P2P
        # =====================
        p2p_query = db.query(P2PMatch).filter(
            P2PMatch.status == "completed"
        )
        if start_date:
            p2p_query = p2p_query.filter(P2PMatch.completed_at >= start_date)
        
        p2p_trades = p2p_query.count()
        
        # Volume P2P (usando total_brl para ter valor em BRL)
        volume_p2p = db.query(func.sum(P2PMatch.total_brl)).filter(
            P2PMatch.status == "completed"
        )
        if start_date:
            volume_p2p = volume_p2p.filter(P2PMatch.completed_at >= start_date)
        volume_p2p = float(volume_p2p.scalar() or 0)
        
        total_trades = otc_trades + p2p_trades
        total_volume_brl = volume_otc + volume_p2p
        
        # =====================
        # OVERVIEW - WolkPay (Faturas)
        # =====================
        wolkpay_query = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_query = wolkpay_query.filter(WolkPayInvoice.created_at >= start_date)
        
        wolkpay_count = wolkpay_query.count()
        
        # Volume WolkPay
        wolkpay_volume = db.query(func.sum(WolkPayInvoice.total_amount_brl)).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_volume = wolkpay_volume.filter(WolkPayInvoice.created_at >= start_date)
        wolkpay_volume_brl = float(wolkpay_volume.scalar() or 0)
        
        # Taxas WolkPay
        wolkpay_fees = db.query(func.sum(WolkPayInvoice.service_fee_brl + WolkPayInvoice.network_fee_brl)).filter(
            WolkPayInvoice.status == InvoiceStatus.COMPLETED
        )
        if start_date:
            wolkpay_fees = wolkpay_fees.filter(WolkPayInvoice.created_at >= start_date)
        wolkpay_fees_brl = float(wolkpay_fees.scalar() or 0)
        
        # =====================
        # OVERVIEW - Bill Payment (Pagamento de Boletos)
        # =====================
        billpay_query = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_query = billpay_query.filter(WolkPayBillPayment.created_at >= start_date)
        
        billpay_count = billpay_query.count()
        
        # Volume Bill Payment (valor dos boletos pagos)
        billpay_volume = db.query(func.sum(WolkPayBillPayment.bill_amount_brl)).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_volume = billpay_volume.filter(WolkPayBillPayment.created_at >= start_date)
        billpay_volume_brl = float(billpay_volume.scalar() or 0)
        
        # Taxas Bill Payment
        billpay_fees = db.query(func.sum(WolkPayBillPayment.service_fee_brl + WolkPayBillPayment.network_fee_brl)).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PAID
        )
        if start_date:
            billpay_fees = billpay_fees.filter(WolkPayBillPayment.created_at >= start_date)
        billpay_fees_brl = float(billpay_fees.scalar() or 0)
        
        # Volume total incluindo todos os serviços
        total_volume_all_services = total_volume_brl + wolkpay_volume_brl + billpay_volume_brl
        
        # =====================
        # OVERVIEW - Taxas coletadas
        # =====================
        fees_query = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.status == "processed"
        )
        if start_date:
            fees_query = fees_query.filter(AccountingEntry.created_at >= start_date)
        
        total_fees_collected = float(fees_query.scalar() or 0)
        
        # =====================
        # OVERVIEW - Taxa de conversão (trades completados / iniciados)
        # =====================
        initiated_trades = db.query(func.count(InstantTrade.id))
        if start_date:
            initiated_trades = initiated_trades.filter(InstantTrade.created_at >= start_date)
        initiated_count = initiated_trades.scalar() or 0
        
        conversion_rate = 0.0
        if initiated_count > 0:
            conversion_rate = round((otc_trades / initiated_count) * 100, 1)
        
        # =====================
        # GROWTH - Período anterior para comparação
        # =====================
        users_growth = 0.0
        volume_growth = 0.0
        trades_growth = 0.0
        fees_growth = 0.0
        
        if previous_start and previous_end:
            # Usuários no período anterior
            prev_users = db.query(func.count(User.id)).filter(
                User.created_at >= previous_start,
                User.created_at < previous_end
            ).scalar() or 0
            
            current_new_users = db.query(func.count(User.id)).filter(
                User.created_at >= start_date
            ).scalar() or 0
            
            users_growth = calculate_growth(current_new_users, prev_users)
            
            # Volume anterior
            prev_volume = db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= previous_start,
                InstantTrade.completed_at < previous_end
            ).scalar() or 0
            volume_growth = calculate_growth(total_volume_brl, float(prev_volume))
            
            # Trades anteriores
            prev_trades = db.query(func.count(InstantTrade.id)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= previous_start,
                InstantTrade.completed_at < previous_end
            ).scalar() or 0
            trades_growth = calculate_growth(total_trades, prev_trades)
            
            # Taxas anteriores
            prev_fees = db.query(func.sum(AccountingEntry.amount)).filter(
                AccountingEntry.status == "processed",
                AccountingEntry.created_at >= previous_start,
                AccountingEntry.created_at < previous_end
            ).scalar() or 0
            fees_growth = calculate_growth(total_fees_collected, float(prev_fees))
        
        # =====================
        # TRADING - Métricas detalhadas
        # =====================
        avg_trade_value = 0.0
        if total_trades > 0:
            avg_trade_value = total_volume_brl / total_trades
        
        # Cripto mais negociada (usa symbol, ex: "USDT", "BTC")
        most_traded_crypto = "USDT"  # Default
        try:
            crypto_counts = db.query(
                InstantTrade.symbol,
                func.count(InstantTrade.id).label('count')
            ).filter(
                InstantTrade.status == TradeStatus.COMPLETED
            )
            if start_date:
                crypto_counts = crypto_counts.filter(InstantTrade.completed_at >= start_date)
            
            crypto_counts = crypto_counts.group_by(
                InstantTrade.symbol
            ).order_by(
                func.count(InstantTrade.id).desc()
            ).first()
            
            if crypto_counts:
                most_traded_crypto = crypto_counts[0] or "USDT"
        except Exception as e:
            logger.warning(f"Erro ao buscar cripto mais negociada: {e}")
        
        # =====================
        # TIMEFRAMES - Dados diários (últimos 7 dias)
        # =====================
        daily_data = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_volume = db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= day_start,
                InstantTrade.completed_at < day_end
            ).scalar() or 0
            
            day_trades = db.query(func.count(InstantTrade.id)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= day_start,
                InstantTrade.completed_at < day_end
            ).scalar() or 0
            
            daily_data.append({
                "date": day.strftime("%d/%m"),
                "volume": float(day_volume),
                "trades": day_trades
            })
        
        # =====================
        # TIMEFRAMES - Dados semanais (últimas 4 semanas)
        # =====================
        weekly_data = []
        for i in range(3, -1, -1):
            week_end = now - timedelta(weeks=i)
            week_start = week_end - timedelta(weeks=1)
            
            week_volume = db.query(func.sum(InstantTrade.brl_amount)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= week_start,
                InstantTrade.completed_at < week_end
            ).scalar() or 0
            
            week_trades = db.query(func.count(InstantTrade.id)).filter(
                InstantTrade.status == TradeStatus.COMPLETED,
                InstantTrade.completed_at >= week_start,
                InstantTrade.completed_at < week_end
            ).scalar() or 0
            
            weekly_data.append({
                "week": f"Semana {4 - i}",
                "volume": float(week_volume),
                "trades": week_trades
            })
        
        # =====================
        # RESPONSE
        # =====================
        logger.info(f"✅ Analytics carregado por admin: {current_admin.email}")
        
        return {
            "success": True,
            "data": {
                "overview": {
                    "total_users": total_users,
                    "active_users_24h": active_users_24h,
                    "total_volume_brl": round(total_volume_brl, 2),
                    "total_trades": total_trades,
                    "total_fees_collected": round(total_fees_collected, 2),
                    "conversion_rate": conversion_rate
                },
                "growth": {
                    "users_growth": users_growth,
                    "volume_growth": volume_growth,
                    "trades_growth": trades_growth,
                    "fees_growth": fees_growth
                },
                "trading": {
                    "otc_trades": otc_trades,
                    "p2p_trades": p2p_trades,
                    "avg_trade_value": round(avg_trade_value, 2),
                    "most_traded_crypto": most_traded_crypto
                },
                "wolkpay": {
                    "invoices_completed": wolkpay_count,
                    "volume_brl": round(wolkpay_volume_brl, 2),
                    "fees_collected": round(wolkpay_fees_brl, 2)
                },
                "bill_payment": {
                    "bills_paid": billpay_count,
                    "volume_brl": round(billpay_volume_brl, 2),
                    "fees_collected": round(billpay_fees_brl, 2)
                },
                "total_platform_volume": round(total_volume_all_services, 2),
                "timeframes": {
                    "daily": daily_data,
                    "weekly": weekly_data
                },
                "period": period,
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar analytics: {str(e)}"
        )


@router.get("/trading-volume")
async def get_trading_volume_details(
    period: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    📈 Volume de trading detalhado por criptomoeda e tipo
    """
    try:
        start_date, _, _, now = get_period_dates(period)
        
        # Volume por criptomoeda (usa symbol)
        volume_by_crypto = []
        
        crypto_volumes = db.query(
            InstantTrade.symbol,
            func.sum(InstantTrade.brl_amount).label('total_brl'),
            func.sum(InstantTrade.crypto_amount).label('total_crypto'),
            func.count(InstantTrade.id).label('count')
        ).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        
        if start_date:
            crypto_volumes = crypto_volumes.filter(InstantTrade.completed_at >= start_date)
        
        crypto_volumes = crypto_volumes.group_by(
            InstantTrade.symbol
        ).order_by(
            func.sum(InstantTrade.brl_amount).desc()
        ).all()
        
        for cv in crypto_volumes:
            volume_by_crypto.append({
                "crypto": cv[0],
                "total_brl": float(cv[1] or 0),
                "total_crypto": float(cv[2] or 0),
                "trades_count": cv[3]
            })
        
        # Volume por tipo (compra/venda) - usa operation_type
        buy_volume = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED,
            InstantTrade.operation_type == "buy"
        )
        if start_date:
            buy_volume = buy_volume.filter(InstantTrade.completed_at >= start_date)
        buy_volume = float(buy_volume.scalar() or 0)
        
        sell_volume = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED,
            InstantTrade.operation_type == "sell"
        )
        if start_date:
            sell_volume = sell_volume.filter(InstantTrade.completed_at >= start_date)
        sell_volume = float(sell_volume.scalar() or 0)
        
        return {
            "success": True,
            "data": {
                "by_crypto": volume_by_crypto,
                "by_type": {
                    "buy": round(buy_volume, 2),
                    "sell": round(sell_volume, 2)
                },
                "period": period,
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar volume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/users-activity")
async def get_users_activity(
    period: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    👥 Atividade dos usuários
    """
    try:
        start_date, _, _, now = get_period_dates(period)
        
        # Novos registros por dia
        registrations = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            count = db.query(func.count(User.id)).filter(
                User.created_at >= day_start,
                User.created_at < day_end
            ).scalar() or 0
            
            registrations.append({
                "date": day.strftime("%d/%m"),
                "count": count
            })
        
        # Top traders (por volume)
        top_traders = db.query(
            User.id,
            User.email,
            func.sum(InstantTrade.brl_amount).label('total_volume'),
            func.count(InstantTrade.id).label('trades_count')
        ).join(
            InstantTrade, InstantTrade.user_id == User.id
        ).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        )
        
        if start_date:
            top_traders = top_traders.filter(InstantTrade.completed_at >= start_date)
        
        top_traders = top_traders.group_by(
            User.id, User.email
        ).order_by(
            func.sum(InstantTrade.brl_amount).desc()
        ).limit(10).all()
        
        top_traders_list = []
        for t in top_traders:
            # Mascarar email
            email = t[1]
            if "@" in email:
                parts = email.split("@")
                masked_email = parts[0][:3] + "***@" + parts[1]
            else:
                masked_email = email[:3] + "***"
            
            top_traders_list.append({
                "user_id": str(t[0]),
                "email": masked_email,
                "total_volume": float(t[2] or 0),
                "trades_count": t[3]
            })
        
        return {
            "success": True,
            "data": {
                "registrations_daily": registrations,
                "top_traders": top_traders_list,
                "period": period,
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar atividade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/fees-breakdown")
async def get_fees_breakdown(
    period: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    💰 Breakdown detalhado das taxas coletadas
    """
    try:
        start_date, _, _, now = get_period_dates(period)
        
        # Total por tipo de taxa
        fee_types = db.query(
            AccountingEntry.entry_type,
            func.sum(AccountingEntry.amount).label('total')
        ).filter(
            AccountingEntry.status == "processed"
        )
        
        if start_date:
            fee_types = fee_types.filter(AccountingEntry.created_at >= start_date)
        
        fee_types = fee_types.group_by(AccountingEntry.entry_type).all()
        
        breakdown = {}
        for ft in fee_types:
            breakdown[ft[0] or "other"] = float(ft[1] or 0)
        
        # Taxas por dia
        fees_daily = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_fees = db.query(func.sum(AccountingEntry.amount)).filter(
                AccountingEntry.status == "processed",
                AccountingEntry.created_at >= day_start,
                AccountingEntry.created_at < day_end
            ).scalar() or 0
            
            fees_daily.append({
                "date": day.strftime("%d/%m"),
                "amount": float(day_fees)
            })
        
        return {
            "success": True,
            "data": {
                "breakdown": breakdown,
                "daily": fees_daily,
                "total": sum(breakdown.values()),
                "period": period,
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao carregar fees: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
