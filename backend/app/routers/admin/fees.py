"""
💰 HOLD Wallet - Admin Fees & Revenue Dashboard API
====================================================

API endpoints for viewing platform fees and revenue statistics.
Provides insights into P2P commissions, OTC spreads, and network fees.
"""

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timedelta

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/fees", tags=["admin-fees"])


@router.get("/summary")
async def get_fee_summary(
    period: str = Query("month", description="Period: day, week, month, year, all"),
    db: Session = Depends(get_db)
):
    """
    Get summary of all fees collected by the platform
    Uses accounting_entries for OTC fees and fee_history for P2P fees
    """
    try:
        # Calculate date filter
        date_filter = ""
        params = {}
        
        if period != "all":
            if period == "day":
                start_date = datetime.now() - timedelta(days=1)
            elif period == "week":
                start_date = datetime.now() - timedelta(weeks=1)
            elif period == "month":
                start_date = datetime.now() - timedelta(days=30)
            elif period == "year":
                start_date = datetime.now() - timedelta(days=365)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            date_filter = "WHERE created_at >= :start_date"
            params["start_date"] = start_date.strftime("%Y-%m-%d %H:%M:%S")
        
        # Get OTC fees from accounting_entries (real data)
        otc_query = text(f"""
            SELECT 
                COALESCE(SUM(amount), 0) as total_fees,
                COALESCE(COUNT(*), 0) as total_transactions,
                COALESCE(AVG(amount), 0) as avg_fee
            FROM accounting_entries
            {date_filter}
        """)
        otc_summary = db.execute(otc_query, params).fetchone()
        
        # Get breakdown by entry type from accounting_entries
        breakdown_query = text(f"""
            SELECT 
                entry_type as fee_type,
                COALESCE(SUM(amount), 0) as total_fees,
                COALESCE(COUNT(*), 0) as transaction_count,
                COALESCE(AVG(percentage), 0) as avg_percentage
            FROM accounting_entries
            {date_filter}
            GROUP BY entry_type
            ORDER BY total_fees DESC
        """)
        breakdown_results = db.execute(breakdown_query, params).fetchall()
        
        breakdown = [
            {
                "fee_type": row.fee_type,
                "total_fees": round(float(row.total_fees), 2),
                "transaction_count": int(row.transaction_count),
                "avg_percentage": round(float(row.avg_percentage), 2)
            }
            for row in breakdown_results
        ]
        
        # Get instant trades volume (completed trades)
        volume_query = text(f"""
            SELECT COALESCE(SUM(brl_amount), 0) as total_volume
            FROM instant_trades
            WHERE status = 'COMPLETED'
            {date_filter.replace('WHERE', 'AND') if date_filter else ''}
        """)
        volume_result = db.execute(volume_query, params).fetchone()
        total_volume = float(volume_result.total_volume) if volume_result else 0
        
        return {
            "success": True,
            "data": {
                "period": period,
                "summary": {
                    "total_fees_brl": round(float(otc_summary.total_fees), 2) if otc_summary else 0,
                    "total_transactions": int(otc_summary.total_transactions) if otc_summary else 0,
                    "avg_fee_brl": round(float(otc_summary.avg_fee), 2) if otc_summary else 0,
                    "total_volume_processed": round(total_volume, 2)
                },
                "breakdown_by_type": breakdown
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get fee summary: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "data": {
                "period": period,
                "summary": {
                    "total_fees_brl": 0,
                    "total_transactions": 0,
                    "avg_fee_brl": 0,
                    "total_volume_processed": 0
                },
                "breakdown_by_type": [],
                "note": f"Error: {str(e)}"
            }
        }


@router.get("/history")
async def get_fee_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    fee_type: Optional[str] = Query(None, description="Filter by fee type: p2p_commission, otc_spread, network_fee"),
    cryptocurrency: Optional[str] = Query(None, description="Filter by cryptocurrency: BTC, ETH, USDT, etc"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get detailed fee history with pagination and filters
    Uses accounting_entries for OTC fees (real data)
    """
    try:
        conditions = []
        params = {}
        
        if fee_type:
            conditions.append("entry_type = :fee_type")
            params["fee_type"] = fee_type
        
        if start_date:
            conditions.append("created_at >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            conditions.append("created_at <= :end_date")
            params["end_date"] = end_date + " 23:59:59"
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        offset = (page - 1) * limit
        
        # Get total count from accounting_entries
        count_query = text(f"SELECT COUNT(*) as total FROM accounting_entries {where_clause}")
        count_result = db.execute(count_query, params).fetchone()
        total = count_result.total if count_result else 0
        
        # Get fee history from accounting_entries with trade info
        history_query = text(f"""
            SELECT 
                ae.id,
                ae.trade_id,
                ae.entry_type as fee_type,
                ae.amount,
                ae.currency,
                ae.percentage,
                ae.base_amount,
                ae.description,
                ae.status,
                ae.user_id,
                ae.created_at,
                it.symbol as cryptocurrency,
                it.operation_type,
                it.brl_amount as gross_amount,
                u.email as user_email
            FROM accounting_entries ae
            LEFT JOIN instant_trades it ON ae.trade_id = it.id
            LEFT JOIN users u ON ae.user_id::uuid = u.id
            {where_clause}
            ORDER BY ae.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        params["limit"] = limit
        params["offset"] = offset
        
        results = db.execute(history_query, params).fetchall()
        
        fees = [
            {
                "id": str(row.id),
                "trade_id": str(row.trade_id) if row.trade_id else None,
                "fee_type": row.fee_type,
                "cryptocurrency": row.cryptocurrency or "USDT",
                "fiat_currency": "BRL",
                "gross_amount": float(row.gross_amount) if row.gross_amount else 0,
                "fee_percentage": float(row.percentage) if row.percentage else 0,
                "fee_amount": float(row.amount) if row.amount else 0,
                "net_amount": float(row.base_amount) if row.base_amount else 0,
                "fee_amount_brl": float(row.amount) if row.amount else 0,
                "payer_user_id": str(row.user_id) if row.user_id else None,
                "user_email": row.user_email,
                "status": row.status or "collected",
                "description": row.description,
                "created_at": str(row.created_at) if row.created_at else None
            }
            for row in results
        ]
        
        return {
            "success": True,
            "data": fees,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get fee history: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "data": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "pages": 0
            },
            "note": f"Error: {str(e)}"
        }


@router.get("/daily-revenue")
async def get_daily_revenue(
    days: int = Query(30, ge=1, le=365, description="Number of days to show"),
    db: Session = Depends(get_db)
):
    """
    Get daily revenue chart data for the last N days
    Uses accounting_entries for OTC fees
    """
    try:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        # Get daily revenue from accounting_entries
        query = text("""
            SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(amount), 0) as daily_revenue,
                COALESCE(COUNT(*), 0) as transaction_count
            FROM accounting_entries
            WHERE created_at >= :start_date
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """)
        
        results = db.execute(query, {"start_date": start_date}).fetchall()
        
        # Get daily trade volume from instant_trades
        volume_query = text("""
            SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(brl_amount), 0) as daily_volume
            FROM instant_trades
            WHERE created_at >= :start_date AND status = 'COMPLETED'
            GROUP BY DATE(created_at)
        """)
        volume_results = db.execute(volume_query, {"start_date": start_date}).fetchall()
        volume_map = {str(row.date): float(row.daily_volume) for row in volume_results}
        
        daily_data = [
            {
                "date": str(row.date),
                "revenue": round(float(row.daily_revenue), 2),
                "transactions": int(row.transaction_count),
                "volume": round(volume_map.get(str(row.date), 0), 2)
            }
            for row in results
        ]
        
        # Calculate totals
        total_revenue = sum(d["revenue"] for d in daily_data)
        total_transactions = sum(d["transactions"] for d in daily_data)
        total_volume = sum(d["volume"] for d in daily_data)
        
        return {
            "success": True,
            "data": {
                "daily_data": daily_data,
                "totals": {
                    "total_revenue": round(total_revenue, 2),
                    "total_transactions": total_transactions,
                    "total_volume": round(total_volume, 2),
                    "avg_daily_revenue": round(total_revenue / len(daily_data), 2) if daily_data else 0
                },
                "period_days": days
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get daily revenue: {str(e)}")
        return {
            "success": True,
            "data": {
                "daily_data": [],
                "totals": {
                    "total_revenue": 0,
                    "total_transactions": 0,
                    "total_volume": 0,
                    "avg_daily_revenue": 0
                },
                "period_days": days
            },
            "note": f"Error: {str(e)}"
        }


@router.get("/top-fee-payers")
async def get_top_fee_payers(
    limit: int = Query(10, ge=1, le=50, description="Number of top payers to show"),
    period: str = Query("month", description="Period: week, month, year, all"),
    db: Session = Depends(get_db)
):
    """
    Get top users who paid the most fees (high-volume traders)
    """
    try:
        # Calculate date filter
        date_filter = ""
        params = {"limit": limit}
        
        if period != "all":
            if period == "week":
                start_date = datetime.now() - timedelta(weeks=1)
            elif period == "month":
                start_date = datetime.now() - timedelta(days=30)
            elif period == "year":
                start_date = datetime.now() - timedelta(days=365)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            date_filter = "AND fh.created_at >= :start_date"
            params["start_date"] = start_date.strftime("%Y-%m-%d %H:%M:%S")
        
        query = text(f"""
            SELECT 
                fh.payer_user_id,
                COALESCE(u.email, 'Unknown') as user_email,
                COALESCE(tp.display_name, 'Unknown Trader') as display_name,
                COALESCE(SUM(fh.fee_amount_brl), 0) as total_fees_paid,
                COALESCE(COUNT(*), 0) as transaction_count,
                COALESCE(SUM(fh.gross_amount), 0) as total_volume
            FROM fee_history fh
            LEFT JOIN users u ON fh.payer_user_id = CAST(u.id AS TEXT)
            LEFT JOIN trader_profiles tp ON fh.payer_user_id = CAST(tp.user_id AS TEXT)
            WHERE fh.payer_user_id IS NOT NULL
            {date_filter}
            GROUP BY fh.payer_user_id, u.email, tp.display_name
            ORDER BY total_fees_paid DESC
            LIMIT :limit
        """)
        
        results = db.execute(query, params).fetchall()
        
        top_payers = [
            {
                "user_id": row.payer_user_id,
                "email": row.user_email,
                "display_name": row.display_name,
                "total_fees_paid": round(float(row.total_fees_paid), 2),
                "transaction_count": int(row.transaction_count),
                "total_volume": round(float(row.total_volume), 2)
            }
            for row in results
        ]
        
        return {
            "success": True,
            "data": {
                "top_payers": top_payers,
                "period": period
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get top fee payers: {str(e)}")
        return {
            "success": True,
            "data": {
                "top_payers": [],
                "period": period
            },
            "note": "Fee tables may not exist yet."
        }


@router.get("/settings")
async def get_fee_settings(db: Session = Depends(get_db)):
    """
    Get current platform fee settings
    """
    # These are the platform's fee settings
    # In a production system, these would be stored in the database
    return {
        "success": True,
        "data": {
            "p2p_fee_percentage": 0.5,  # 0.5% for P2P trades
            "otc_spread_percentage": 3.0,  # 3% spread for OTC trades
            "network_fee_percentage": 0.25,  # 0.25% network fee
            "withdrawal_fee": {
                "BTC": 0.0001,
                "ETH": 0.005,
                "USDT": 1.0,
                "USDC": 1.0,
                "SOL": 0.01
            },
            "minimum_trade_amount_brl": 10.0,
            "maximum_trade_amount_brl": 100000.0
        }
    }


@router.put("/settings")
async def update_fee_settings(
    settings: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update platform fee settings (admin only)
    
    Note: In production, this should:
    1. Check admin permissions
    2. Store settings in database
    3. Log the change for audit
    """
    # TODO: Implement database storage for settings
    # For now, return a message that settings were received
    return {
        "success": True,
        "message": "Fee settings update received. Database storage pending implementation.",
        "received_settings": settings
    }


@router.get("/system-wallet")
async def get_system_wallet_balance(db: Session = Depends(get_db)):
    """
    Get the current balance of the system blockchain wallet with ALL 16 supported currencies
    """
    try:
        # Get the main system blockchain wallet
        wallet_query = text("""
            SELECT id, name, description, is_active, created_at, updated_at
            FROM system_blockchain_wallets 
            WHERE name = 'main_fees_wallet' AND is_active = true
            LIMIT 1
        """)
        wallet = db.execute(wallet_query).fetchone()
        
        if not wallet:
            return {
                "success": True,
                "data": None,
                "message": "Wallet not found"
            }
        
        wallet_id = str(wallet.id)
        
        # Get all addresses with balances for all networks
        addresses_query = text("""
            SELECT network, address, cached_balance, cached_balance_usd, 
                   cached_usdt_balance, cached_usdc_balance, cached_balance_updated_at
            FROM system_blockchain_addresses 
            WHERE wallet_id = :wallet_id AND is_active = true
            ORDER BY network
        """)
        addresses = db.execute(addresses_query, {"wallet_id": wallet_id}).fetchall()
        
        # Build balances object
        balances = {}
        total_native_usd = 0
        total_usdt = 0
        total_usdc = 0
        
        for addr in addresses:
            network = addr.network.upper()
            balances[network] = float(addr.cached_balance or 0)
            total_usdt += float(addr.cached_usdt_balance or 0)
            total_usdc += float(addr.cached_usdc_balance or 0)
        
        # Add stablecoin totals to balances
        balances["USDT"] = total_usdt
        balances["USDC"] = total_usdc
        
        # Get fees from accounting_entries (OTC commissions)
        fees_query = text("""
            SELECT 
                COALESCE(SUM(CASE WHEN entry_type = 'spread' THEN amount ELSE 0 END), 0) as otc_spread,
                COALESCE(SUM(CASE WHEN entry_type = 'network_fee' THEN amount ELSE 0 END), 0) as network_fee,
                COALESCE(SUM(CASE WHEN entry_type = 'platform_fee' THEN amount ELSE 0 END), 0) as platform_fee,
                COALESCE(SUM(amount), 0) as total_fees
            FROM accounting_entries
        """)
        fees = db.execute(fees_query).fetchone()
        
        fees_data = {
            "otc_spread": round(float(fees.otc_spread or 0), 2) if fees else 0,
            "network_fee": round(float(fees.network_fee or 0), 2) if fees else 0,
            "platform_fee": round(float(fees.platform_fee or 0), 2) if fees else 0,
            "total": round(float(fees.total_fees or 0), 2) if fees else 0
        }
        
        return {
            "success": True,
            "data": {
                "id": wallet_id,
                "name": wallet.name,
                "description": wallet.description,
                "balances": balances,
                "total_usdt": total_usdt,
                "total_usdc": total_usdc,
                "total_stables": total_usdt + total_usdc,
                "fees_collected": fees_data,
                "is_active": wallet.is_active,
                "created_at": str(wallet.created_at) if wallet.created_at else None,
                "updated_at": str(wallet.updated_at) if wallet.updated_at else None
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get system wallet: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "data": None,
            "note": f"Error retrieving system wallet: {str(e)}"
        }


@router.get("/accounting-entries")
async def get_accounting_entries(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    entry_type: Optional[str] = Query(None, description="Filter by entry type: spread, network_fee, platform_fee"),
    status: Optional[str] = Query(None, description="Filter by status: pending, processed, sent_to_erp"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get accounting entries from OTC trades (spread, network fees, platform fees)
    These are the commissions recorded from instant trades
    """
    try:
        # Build query conditions
        conditions = []
        params = {}
        
        if entry_type:
            conditions.append("entry_type = :entry_type")
            params["entry_type"] = entry_type
        
        if status:
            conditions.append("status = :status")
            params["status"] = status
        
        if start_date:
            conditions.append("created_at >= :start_date")
            params["start_date"] = start_date
        
        if end_date:
            conditions.append("created_at <= :end_date")
            params["end_date"] = end_date + " 23:59:59"
        
        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
        
        # Count total
        count_query = text(f"""
            SELECT COUNT(*) as total FROM accounting_entries {where_clause}
        """)
        total_result = db.execute(count_query, params).fetchone()
        total = total_result.total if total_result else 0
        
        # Get paginated data
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_query = text(f"""
            SELECT 
                ae.id,
                ae.trade_id,
                ae.reference_code,
                ae.entry_type,
                ae.amount,
                ae.currency,
                ae.percentage,
                ae.base_amount,
                ae.description,
                ae.status,
                ae.user_id,
                ae.created_by,
                ae.created_at,
                ae.updated_at,
                it.symbol as trade_symbol,
                it.operation_type as trade_operation,
                u.username as user_name
            FROM accounting_entries ae
            LEFT JOIN instant_trades it ON ae.trade_id = it.id
            LEFT JOIN users u ON ae.user_id = CAST(u.id AS VARCHAR)
            {where_clause}
            ORDER BY ae.created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        results = db.execute(data_query, params).fetchall()
        
        entries = []
        for row in results:
            entries.append({
                "id": row.id,
                "trade_id": row.trade_id,
                "reference_code": row.reference_code,
                "entry_type": row.entry_type,
                "amount": float(row.amount) if row.amount else 0,
                "currency": row.currency,
                "percentage": float(row.percentage) if row.percentage else None,
                "base_amount": float(row.base_amount) if row.base_amount else None,
                "description": row.description,
                "status": row.status,
                "user_id": row.user_id,
                "user_name": row.user_name,
                "created_by": row.created_by,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "trade_symbol": row.trade_symbol,
                "trade_operation": row.trade_operation
            })
        
        # Calculate totals
        totals_query = text(f"""
            SELECT 
                entry_type,
                SUM(amount) as total_amount,
                COUNT(*) as count
            FROM accounting_entries
            {where_clause}
            GROUP BY entry_type
        """)
        
        totals_result = db.execute(totals_query, {k: v for k, v in params.items() if k not in ['limit', 'offset']}).fetchall()
        
        totals = {
            "spread": 0,
            "network_fee": 0,
            "platform_fee": 0,
            "grand_total": 0
        }
        
        for row in totals_result:
            if row.entry_type == "spread":
                totals["spread"] = float(row.total_amount or 0)
            elif row.entry_type == "network_fee":
                totals["network_fee"] = float(row.total_amount or 0)
            elif row.entry_type == "platform_fee":
                totals["platform_fee"] = float(row.total_amount or 0)
        
        totals["grand_total"] = totals["spread"] + totals["network_fee"]
        
        return {
            "success": True,
            "data": entries,
            "totals": totals,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to get accounting entries: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "data": [],
            "totals": {
                "spread": 0,
                "network_fee": 0,
                "platform_fee": 0,
                "grand_total": 0
            },
            "pagination": {
                "page": 1,
                "limit": limit,
                "total": 0,
                "pages": 0
            },
            "note": f"Error or table not found: {str(e)}"
        }


@router.get("/accounting-summary")
async def get_accounting_summary(
    period: str = Query("month", description="Period: day, week, month, year, all"),
    db: Session = Depends(get_db)
):
    """
    Get summary of accounting entries (OTC commissions)
    """
    try:
        # Calculate date filter
        date_filter = ""
        params = {}
        
        if period != "all":
            if period == "day":
                start_date = datetime.now() - timedelta(days=1)
            elif period == "week":
                start_date = datetime.now() - timedelta(weeks=1)
            elif period == "month":
                start_date = datetime.now() - timedelta(days=30)
            elif period == "year":
                start_date = datetime.now() - timedelta(days=365)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            date_filter = "WHERE created_at >= :start_date"
            params["start_date"] = start_date.strftime("%Y-%m-%d %H:%M:%S")
        
        # Get totals by type
        query = text(f"""
            SELECT 
                entry_type,
                SUM(amount) as total_amount,
                COUNT(*) as count,
                AVG(percentage) as avg_percentage
            FROM accounting_entries
            {date_filter}
            GROUP BY entry_type
        """)
        
        results = db.execute(query, params).fetchall()
        
        breakdown = []
        grand_total = 0
        total_entries = 0
        
        for row in results:
            amount = float(row.total_amount or 0)
            breakdown.append({
                "entry_type": row.entry_type,
                "total_amount": amount,
                "count": row.count,
                "avg_percentage": float(row.avg_percentage or 0)
            })
            # Não somar platform_fee pois é o resumo dos outros
            if row.entry_type != "platform_fee":
                grand_total += amount
            total_entries += row.count
        
        # Count unique trades
        trades_query = text(f"""
            SELECT COUNT(DISTINCT trade_id) as unique_trades
            FROM accounting_entries
            {date_filter}
        """)
        trades_result = db.execute(trades_query, params).fetchone()
        unique_trades = trades_result.unique_trades if trades_result else 0
        
        return {
            "success": True,
            "data": {
                "period": period,
                "breakdown": breakdown,
                "totals": {
                    "grand_total": grand_total,
                    "total_entries": total_entries,
                    "unique_trades": unique_trades
                }
            }
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to get accounting summary: {str(e)}")
        return {
            "success": True,
            "data": {
                "period": period,
                "breakdown": [],
                "totals": {
                    "grand_total": 0,
                    "total_entries": 0,
                    "unique_trades": 0
                }
            },
            "note": f"Error or table not found: {str(e)}"
        }
