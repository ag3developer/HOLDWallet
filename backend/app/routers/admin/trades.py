"""
🛡️ HOLD Wallet - Admin Trades Router
=====================================

Gestão de trades OTC (Instant Trades).
Move funcionalidades do admin_instant_trades.py para estrutura organizada.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.core.config import settings
from app.models.user import User
from app.models.instant_trade import InstantTrade, TradeStatus, InstantTradeHistory
from app.models.wallet import Wallet
from app.models.address import Address
from app.models.accounting import AccountingEntry  # Enums não são mais usados

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/trades",
    tags=["Admin - Trades OTC"],
    dependencies=[Depends(get_current_admin)]
)


# ===== SCHEMAS =====

class TradeListItem(BaseModel):
    id: str
    reference_code: str
    user_id: str
    operation_type: str
    symbol: str
    fiat_amount: float
    crypto_amount: float
    total_amount: float
    payment_method: str
    status: str
    wallet_address: Optional[str]
    tx_hash: Optional[str]
    network: Optional[str]
    created_at: datetime
    expires_at: datetime


class TradeStatsResponse(BaseModel):
    total_trades: int
    pending: int
    completed: int
    failed: int
    cancelled: int
    total_volume_brl: float
    total_volume_24h: float


# ===== ENDPOINTS =====

@router.get("", response_model=dict)
async def list_trades(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    operation_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os trades OTC com paginação e filtros
    """
    try:
        query = db.query(InstantTrade)
        
        # Filtro por status
        if status and status != 'all':
            try:
                status_enum = TradeStatus(status)
                query = query.filter(InstantTrade.status == status_enum)
            except ValueError:
                pass  # Ignora status inválido
        
        # Filtro por tipo de operação (buy/sell)
        if operation_type and operation_type != 'all':
            query = query.filter(InstantTrade.operation_type == operation_type)
        
        # Busca por referência ou ID
        if search:
            query = query.filter(
                (InstantTrade.reference_code.ilike(f"%{search}%")) |
                (InstantTrade.id.ilike(f"%{search}%"))
            )
        
        # Total antes da paginação
        total = query.count()
        
        # Ordenar e paginar
        trades = query.order_by(InstantTrade.created_at.desc()).offset(skip).limit(limit).all()
        
        # Buscar usernames
        user_ids = [str(t.user_id) for t in trades]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {str(u.id): u.username for u in users}
        
        # Formatar resposta
        items = []
        for trade in trades:
            items.append({
                "id": str(trade.id),
                "reference_code": trade.reference_code,
                "user_id": str(trade.user_id),
                "username": user_map.get(str(trade.user_id), "Unknown"),
                "operation_type": trade.operation_type.value if hasattr(trade.operation_type, 'value') else trade.operation_type,
                "symbol": trade.symbol,
                "fiat_amount": float(trade.fiat_amount),
                "crypto_amount": float(trade.crypto_amount),
                "crypto_price": float(trade.crypto_price),
                "total_amount": float(trade.total_amount),
                # Campos BRL para pagamentos TED/PIX
                "brl_amount": float(trade.brl_amount) if trade.brl_amount else None,
                "brl_total_amount": float(trade.brl_total_amount) if trade.brl_total_amount else None,
                "usd_to_brl_rate": float(trade.usd_to_brl_rate) if trade.usd_to_brl_rate else None,
                "payment_method": trade.payment_method.value if hasattr(trade.payment_method, 'value') else trade.payment_method,
                "status": trade.status.value if hasattr(trade.status, 'value') else trade.status,
                "created_at": trade.created_at.isoformat(),
                "expires_at": trade.expires_at.isoformat() if trade.expires_at else None
            })
        
        return {
            "success": True,
            "data": {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/stats", response_model=dict)
async def get_trades_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas de trades OTC
    """
    try:
        total = db.query(func.count(InstantTrade.id)).scalar() or 0
        pending = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.PENDING
        ).scalar() or 0
        completed = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        failed = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.FAILED
        ).scalar() or 0
        cancelled = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.CANCELLED
        ).scalar() or 0
        
        # Volume total
        total_volume = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        
        return {
            "success": True,
            "data": {
                "total_trades": total,
                "pending": pending,
                "completed": completed,
                "failed": failed,
                "cancelled": cancelled,
                "total_volume_brl": float(total_volume)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro nas stats de trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/btc/status", response_model=dict)
async def get_btc_platform_status(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna status da carteira BTC da plataforma.
    
    Inclui:
    - Se envio automático está habilitado (via banco ou .env)
    - Endereço da plataforma (banco ou .env)
    - Saldo disponível
    - Fees recomendados
    """
    from app.services.blockchain_deposit_service import blockchain_deposit_service
    
    try:
        # Verificar se está habilitado (primeiro banco, depois .env)
        is_enabled = blockchain_deposit_service.is_btc_auto_enabled(db)
        
        # Obter credenciais (banco ou .env)
        btc_credentials = blockchain_deposit_service.get_platform_btc_credentials(db)
        platform_address = btc_credentials['address'] if btc_credentials else None
        
        result = {
            "success": True,
            "btc_auto_enabled": is_enabled,
            "platform_address": platform_address,
            "source": "database" if btc_credentials and not getattr(settings, 'PLATFORM_BTC_ADDRESS', None) else "env",
            "balance": None,
            "recommended_fees": None,
            "message": None
        }
        
        if is_enabled and platform_address:
            # Consultar saldo
            try:
                from app.services.btc_service import btc_service
                balance = btc_service.get_balance(platform_address)
                if balance and 'error' not in balance:
                    result["balance"] = balance
            except Exception as e:
                logger.warning(f"⚠️ Erro consultando saldo: {e}")
            
            # Consultar fees
            try:
                from app.services.btc_service import btc_service
                fees = btc_service.get_recommended_fees()
                result["recommended_fees"] = fees
            except Exception:
                pass
            
            result["message"] = "Envio automático de BTC está HABILITADO"
        else:
            result["message"] = "Configure BTC na carteira do sistema ou no .env para habilitar"
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro consultando status BTC: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{trade_id}", response_model=dict)
async def get_trade_detail(
    trade_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna detalhes de um trade específico
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Buscar username do usuário
        user = db.query(User).filter(User.id == trade.user_id).first()
        username = user.username if user else "Unknown"
        
        # Buscar histórico
        history = db.query(InstantTradeHistory).filter(
            InstantTradeHistory.trade_id == trade_id
        ).order_by(InstantTradeHistory.created_at.desc()).all()
        
        history_items = []
        for h in history:
            history_items.append({
                "old_status": h.old_status.value if h.old_status else None,
                "new_status": h.new_status.value if h.new_status else None,
                "reason": h.reason,
                "created_at": h.created_at.isoformat()
            })
        
        return {
            "success": True,
            "data": {
                "id": trade.id,
                "reference_code": trade.reference_code,
                "user_id": trade.user_id,
                "username": username,
                "operation_type": trade.operation_type.value,
                "symbol": trade.symbol,
                "name": trade.name,
                "fiat_amount": float(trade.fiat_amount),
                "crypto_amount": float(trade.crypto_amount),
                "crypto_price": float(trade.crypto_price),
                "spread_percentage": float(trade.spread_percentage),
                "spread_amount": float(trade.spread_amount),
                "network_fee_percentage": float(trade.network_fee_percentage),
                "network_fee_amount": float(trade.network_fee_amount),
                "total_amount": float(trade.total_amount),
                # Campos BRL para pagamentos TED/PIX
                "brl_amount": float(trade.brl_amount) if trade.brl_amount else None,
                "brl_total_amount": float(trade.brl_total_amount) if trade.brl_total_amount else None,
                "usd_to_brl_rate": float(trade.usd_to_brl_rate) if trade.usd_to_brl_rate else None,
                "payment_method": trade.payment_method.value,
                "payment_proof_url": trade.payment_proof_url,
                "status": trade.status.value,
                "wallet_address": trade.wallet_address,
                "network": trade.network,
                "tx_hash": trade.tx_hash,
                "error_message": trade.error_message,
                "created_at": trade.created_at.isoformat(),
                "expires_at": trade.expires_at.isoformat(),
                "payment_confirmed_at": trade.payment_confirmed_at.isoformat() if trade.payment_confirmed_at else None,
                "completed_at": trade.completed_at.isoformat() if trade.completed_at else None,
                "history": history_items
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro buscando trade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/cancel", response_model=dict)
async def cancel_trade(
    trade_id: str,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Cancela um trade pendente
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Só pode cancelar trades pendentes
        if trade.status not in [TradeStatus.PENDING, TradeStatus.PAYMENT_PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser cancelado"
            )
        
        old_status = trade.status
        trade.status = TradeStatus.CANCELLED
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.CANCELLED,
            reason=f"Cancelado por admin {current_admin.email}: {reason or 'Sem motivo informado'}"
        )
        db.add(history)
        db.commit()
        
        logger.info(f"🚫 Admin {current_admin.email} cancelou trade {trade.reference_code}")
        
        return {
            "success": True,
            "message": f"Trade {trade.reference_code} cancelado com sucesso",
            "trade_id": trade.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro cancelando trade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== NOVAS AÇÕES DE ADMIN =====

class UpdateStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None


class ConfirmPaymentRequest(BaseModel):
    network: Optional[str] = "polygon"
    notes: Optional[str] = None


class AccountingEntryResponse(BaseModel):
    """Schema de resposta para entradas contábeis (não confundir com o modelo SQLAlchemy)"""
    trade_id: str
    reference_code: str
    type: str  # 'platform_fee', 'network_fee', 'spread'
    amount: float
    currency: str
    description: str
    created_at: datetime


@router.patch("/{trade_id}/status", response_model=dict)
async def update_trade_status(
    trade_id: str,
    request: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza o status de um trade manualmente
    Notifica o usuário sobre a mudança
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Validar novo status
        try:
            new_status = TradeStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido: {request.status}"
            )
        
        old_status = trade.status
        trade.status = new_status
        
        # Atualizar timestamps conforme o status
        if new_status == TradeStatus.COMPLETED:
            trade.completed_at = datetime.now(timezone.utc)
        elif new_status == TradeStatus.PAYMENT_CONFIRMED:
            trade.payment_confirmed_at = datetime.now(timezone.utc)
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=new_status,
            reason=f"Status alterado por admin {current_admin.email}: {request.reason or 'Sem motivo informado'}",
            history_details=request.notes
        )
        db.add(history)
        db.commit()
        db.refresh(trade)
        
        logger.info(f"📝 Admin {current_admin.email} alterou status do trade {trade.reference_code}: {old_status.value} -> {new_status.value}")
        
        # TODO: Notificar usuário via websocket/push
        
        # Retornar trade atualizado
        history_items = []
        for h in trade.history:
            history_items.append({
                "old_status": h.old_status.value if h.old_status else None,
                "new_status": h.new_status.value if h.new_status else None,
                "reason": h.reason,
                "created_at": h.created_at.isoformat()
            })
        
        return {
            "success": True,
            "message": f"Status alterado para {new_status.value}",
            "trade": {
                "id": trade.id,
                "reference_code": trade.reference_code,
                "status": trade.status.value,
                "updated_at": trade.updated_at.isoformat() if trade.updated_at else None,
                "history": history_items
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro atualizando status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/confirm-payment", response_model=dict)
async def confirm_payment_and_deposit(
    trade_id: str,
    request: ConfirmPaymentRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Confirma pagamento e dispara depósito blockchain automaticamente.
    
    Suporta:
    - EVM (ETH, MATIC, USDT, etc): Envio automático via Web3
    - BTC: Envio automático via APIs gratuitas (se configurado)
    """
    from app.services.blockchain_deposit_service import blockchain_deposit_service, NON_EVM_CRYPTOS
    
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Validar status
        if trade.status not in [TradeStatus.PENDING, TradeStatus.PAYMENT_PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ter pagamento confirmado"
            )
        
        # Atualizar para PAYMENT_CONFIRMED
        old_status = trade.status
        trade.status = TradeStatus.PAYMENT_CONFIRMED
        trade.payment_confirmed_at = datetime.now(timezone.utc)
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.PAYMENT_CONFIRMED,
            reason=f"Pagamento confirmado por admin {current_admin.email}",
            history_details=request.notes
        )
        db.add(history)
        db.commit()
        
        logger.info(f"✅ Pagamento confirmado para trade {trade.reference_code}")
        
        # Verificar se é BTC (ou outra non-EVM)
        symbol = str(trade.symbol).upper()
        
        # ===== BITCOIN - Envio automático =====
        if symbol == 'BTC':
            # Verificar se BTC automático está configurado
            if blockchain_deposit_service.is_btc_auto_enabled():
                logger.info(f"🔶 Processando envio automático de BTC...")
                
                deposit_result = await blockchain_deposit_service.send_btc_to_user(
                    db=db,
                    trade=trade
                )
                
                if deposit_result["success"]:
                    history = InstantTradeHistory(
                        trade_id=trade.id,
                        old_status=TradeStatus.PAYMENT_CONFIRMED,
                        new_status=TradeStatus.COMPLETED,
                        reason=f"BTC enviado automaticamente por admin {current_admin.email}",
                        history_details=f"TX: {deposit_result['tx_hash']}"
                    )
                    db.add(history)
                    db.commit()
                    
                    return {
                        "success": True,
                        "message": "Pagamento confirmado e BTC enviado automaticamente!",
                        "trade_id": trade.id,
                        "tx_hash": deposit_result.get("tx_hash"),
                        "wallet_address": deposit_result.get("wallet_address"),
                        "network": "bitcoin",
                        "explorer_url": deposit_result.get("explorer_url"),
                        "status": TradeStatus.COMPLETED.value
                    }
                else:
                    return {
                        "success": False,
                        "message": "Pagamento confirmado mas envio BTC falhou",
                        "trade_id": trade.id,
                        "error": deposit_result.get("error"),
                        "status": TradeStatus.PAYMENT_CONFIRMED.value,
                        "manual_required": True,
                        "hint": "Use o endpoint /manual-complete para completar manualmente"
                    }
            else:
                # BTC não configurado - requer envio manual
                return {
                    "success": True,
                    "message": "Pagamento confirmado! BTC requer envio manual.",
                    "trade_id": trade.id,
                    "status": TradeStatus.PAYMENT_CONFIRMED.value,
                    "manual_required": True,
                    "hint": "Configure PLATFORM_BTC_ADDRESS e PLATFORM_BTC_PRIVATE_KEY_WIF no .env para habilitar envio automático"
                }
        
        # ===== Outras non-EVM - Requer envio manual =====
        if symbol in NON_EVM_CRYPTOS and symbol != 'BTC':
            return {
                "success": True,
                "message": f"Pagamento confirmado! {symbol} requer envio manual.",
                "trade_id": trade.id,
                "status": TradeStatus.PAYMENT_CONFIRMED.value,
                "manual_required": True,
                "hint": f"Envie {trade.crypto_amount} {symbol} para o endereço do usuário e use /manual-complete"
            }
        
        # ===== EVM (USDT, ETH, MATIC, etc) - Envio automático =====
        network = request.network or "polygon"
        deposit_result = blockchain_deposit_service.deposit_crypto_to_user(
            db=db,
            trade=trade,
            network=network
        )
        
        if deposit_result["success"]:
            # Registrar histórico de conclusão
            history = InstantTradeHistory(
                trade_id=trade.id,
                old_status=TradeStatus.PAYMENT_CONFIRMED,
                new_status=TradeStatus.COMPLETED,
                reason=f"Crypto depositada por admin {current_admin.email}",
                history_details=f"TX: {deposit_result['tx_hash']}"
            )
            db.add(history)
            db.commit()
            
            return {
                "success": True,
                "message": "Pagamento confirmado e crypto depositada!",
                "trade_id": trade.id,
                "tx_hash": deposit_result.get("tx_hash"),
                "wallet_address": deposit_result.get("wallet_address"),
                "network": network,
                "status": TradeStatus.COMPLETED.value
            }
        else:
            return {
                "success": False,
                "message": "Pagamento confirmado mas depósito falhou",
                "trade_id": trade.id,
                "tx_hash": None,
                "wallet_address": deposit_result.get("wallet_address"),
                "network": network,
                "status": TradeStatus.PAYMENT_CONFIRMED.value,
                "error": deposit_result.get("error")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro confirmando pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


class ManualCompleteRequest(BaseModel):
    """Schema para completar trade manualmente (BTC, etc)"""
    tx_hash: str
    notes: Optional[str] = None


@router.post("/{trade_id}/manual-complete", response_model=dict)
async def manual_complete_trade(
    trade_id: str,
    request: ManualCompleteRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Completa manualmente um trade de crypto não-EVM (BTC, LTC, etc).
    Usado quando o admin já enviou a crypto manualmente e quer registrar o TX hash.
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Permite completar trades pendentes ou com pagamento confirmado
        allowed_statuses = [
            TradeStatus.PENDING, 
            TradeStatus.PAYMENT_PROCESSING, 
            TradeStatus.PAYMENT_CONFIRMED,
            TradeStatus.FAILED
        ]
        if trade.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser completado manualmente"
            )
        
        old_status = trade.status
        
        # Atualizar trade
        trade.tx_hash = request.tx_hash
        trade.status = TradeStatus.COMPLETED
        trade.completed_at = datetime.now(timezone.utc)
        trade.error_message = None
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.COMPLETED,
            reason=f"Completado manualmente por admin {current_admin.email}",
            history_details=f"TX: {request.tx_hash}" + (f" | Notas: {request.notes}" if request.notes else "")
        )
        db.add(history)
        db.commit()
        
        logger.info(f"✅ Trade {trade.reference_code} completado manualmente. TX: {request.tx_hash}")
        
        return {
            "success": True,
            "message": f"Trade {trade.reference_code} completado com sucesso!",
            "trade_id": trade.id,
            "tx_hash": request.tx_hash,
            "status": TradeStatus.COMPLETED.value
        }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro completando trade manualmente: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/retry-deposit", response_model=dict)
async def retry_trade_deposit(
    trade_id: str,
    network: Optional[str] = "polygon",
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retry manual de depósito para trades que falharam
    """
    from app.services.blockchain_deposit_service import blockchain_deposit_service
    
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Permite retry em PAYMENT_CONFIRMED ou FAILED
        if trade.status not in [TradeStatus.PAYMENT_CONFIRMED, TradeStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode fazer retry de depósito"
            )
        
        # Se estiver FAILED, volta para PAYMENT_CONFIRMED
        if trade.status == TradeStatus.FAILED:
            trade.status = TradeStatus.PAYMENT_CONFIRMED
            trade.error_message = None
            db.commit()
        
        # Tenta depósito novamente
        deposit_result = blockchain_deposit_service.deposit_crypto_to_user(
            db=db,
            trade=trade,
            network=network or "polygon"
        )
        
        if deposit_result["success"]:
            logger.info(f"✅ Retry de depósito OK para {trade.reference_code}! TX: {deposit_result['tx_hash']}")
            return {
                "success": True,
                "message": "Depósito concluído com sucesso",
                "tx_hash": deposit_result["tx_hash"]
            }
        else:
            logger.error(f"❌ Retry de depósito falhou: {deposit_result['error']}")
            return {
                "success": False,
                "message": "Depósito falhou novamente",
                "error": deposit_result["error"]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro no retry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/send-to-accounting", response_model=dict)
async def send_to_accounting(
    trade_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Envia as comissões do trade para o sistema de contabilidade
    Registra: spread, taxa de rede, e total de fees no banco de dados
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Só pode enviar para contabilidade trades completados
        if trade.status != TradeStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas trades concluídos podem ser enviados para contabilidade"
            )
        
        # Verificar se já foi enviado para contabilidade
        existing_entries = db.query(AccountingEntry).filter(
            AccountingEntry.trade_id == trade_id
        ).count()
        
        if existing_entries > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este trade já foi enviado para contabilidade"
            )
        
        # Criar entradas contábeis no banco
        entries_created = []
        now = datetime.now(timezone.utc)
        
        # Spread
        if trade.spread_amount and float(trade.spread_amount) > 0:
            spread_entry = AccountingEntry(
                trade_id=trade.id,
                reference_code=trade.reference_code,
                entry_type="spread",
                amount=trade.spread_amount,
                currency="BRL",
                percentage=trade.spread_percentage,
                base_amount=trade.fiat_amount,
                description=f"Spread de {trade.spread_percentage}% do trade {trade.reference_code}",
                status="processed",
                user_id=trade.user_id,
                created_by=current_admin.email,
                created_at=now
            )
            db.add(spread_entry)
            entries_created.append({
                "type": "spread",
                "amount": float(trade.spread_amount),
                "percentage": float(trade.spread_percentage) if trade.spread_percentage else 0
            })
        
        # Taxa de rede
        if trade.network_fee_amount and float(trade.network_fee_amount) > 0:
            network_entry = AccountingEntry(
                trade_id=trade.id,
                reference_code=trade.reference_code,
                entry_type="network_fee",
                amount=trade.network_fee_amount,
                currency="BRL",
                percentage=trade.network_fee_percentage,
                base_amount=trade.fiat_amount,
                description=f"Taxa de rede de {trade.network_fee_percentage}% do trade {trade.reference_code}",
                status="processed",
                user_id=trade.user_id,
                created_by=current_admin.email,
                created_at=now
            )
            db.add(network_entry)
            entries_created.append({
                "type": "network_fee",
                "amount": float(trade.network_fee_amount),
                "percentage": float(trade.network_fee_percentage) if trade.network_fee_percentage else 0
            })
        
        # Total de fees da plataforma (resumo)
        total_fees = float(trade.spread_amount or 0) + float(trade.network_fee_amount or 0)
        if total_fees > 0:
            total_entry = AccountingEntry(
                trade_id=trade.id,
                reference_code=trade.reference_code,
                entry_type="platform_fee",
                amount=total_fees,
                currency="BRL",
                base_amount=trade.fiat_amount,
                description=f"Total de comissões da plataforma do trade {trade.reference_code}",
                status="processed",
                user_id=trade.user_id,
                created_by=current_admin.email,
                created_at=now
            )
            db.add(total_entry)
            entries_created.append({
                "type": "platform_fee",
                "amount": total_fees
            })
        
        logger.info(f"📊 Admin {current_admin.email} salvou {len(entries_created)} entradas contábeis do trade {trade.reference_code}")
        
        # Registrar no histórico do trade
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=trade.status,
            new_status=trade.status,
            reason=f"Comissões enviadas para contabilidade por {current_admin.email}",
            history_details=f"Total de fees: R$ {total_fees:.2f}"
        )
        db.add(history)
        db.commit()
        
        return {
            "success": True,
            "message": f"Enviado para contabilidade! {len(entries_created)} registros criados.",
            "entries": entries_created,
            "total_fees": total_fees
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro enviando para contabilidade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{trade_id}/accounting", response_model=dict)
async def get_trade_accounting_entries(
    trade_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna as entradas contábeis de um trade do banco de dados
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Buscar entradas do banco de dados
        db_entries = db.query(AccountingEntry).filter(
            AccountingEntry.trade_id == trade_id
        ).order_by(AccountingEntry.created_at.desc()).all()
        
        # Se existem entradas no banco, retornar elas
        if db_entries:
            entries = []
            for entry in db_entries:
                entries.append({
                    "id": entry.id,
                    "trade_id": entry.trade_id,
                    "reference_code": entry.reference_code,
                    "type": entry.entry_type.value if entry.entry_type else None,
                    "amount": float(entry.amount) if entry.amount else 0,
                    "currency": entry.currency,
                    "percentage": float(entry.percentage) if entry.percentage else None,
                    "description": entry.description,
                    "status": entry.status.value if entry.status else None,
                    "created_by": entry.created_by,
                    "created_at": entry.created_at.isoformat() if entry.created_at else None
                })
            
            return {
                "success": True,
                "data": entries,
                "saved_to_db": True
            }
        
        # Se não existe no banco, calcular os valores esperados (preview)
        entries = []
        
        if trade.spread_amount and float(trade.spread_amount) > 0:
            entries.append({
                "trade_id": trade.id,
                "reference_code": trade.reference_code,
                "type": "spread",
                "amount": float(trade.spread_amount),
                "currency": "BRL",
                "percentage": float(trade.spread_percentage) if trade.spread_percentage else None,
                "description": f"Spread ({trade.spread_percentage}%)",
                "status": "pending",
                "created_at": trade.created_at.isoformat() if trade.created_at else None
            })
        
        if trade.network_fee_amount and float(trade.network_fee_amount) > 0:
            entries.append({
                "trade_id": trade.id,
                "reference_code": trade.reference_code,
                "type": "network_fee",
                "amount": float(trade.network_fee_amount),
                "currency": "BRL",
                "percentage": float(trade.network_fee_percentage) if trade.network_fee_percentage else None,
                "description": f"Taxa de rede ({trade.network_fee_percentage}%)",
                "status": "pending",
                "created_at": trade.created_at.isoformat() if trade.created_at else None
            })
        
        return {
            "success": True,
            "data": entries,
            "saved_to_db": False,
            "message": "Entradas ainda não enviadas para contabilidade"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro buscando entradas contábeis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== ENDPOINT PARA VERIFICAR SE PODE PROCESSAR VENDA (PRE-CHECK) =====

@router.get("/{trade_id}/check-sell-ready", response_model=dict)
async def check_sell_ready(
    trade_id: str,
    network: str = "polygon",
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Verifica se uma operação de VENDA pode ser processada.
    
    Faz verificações antes de processar:
    1. Trade existe e é do tipo SELL
    2. Status está correto (PENDING ou PAYMENT_PROCESSING)
    3. Usuário tem saldo de crypto suficiente
    4. Usuário tem saldo de gas OU plataforma pode patrocinar
    
    Use este endpoint ANTES de clicar em "Processar Venda" para evitar erros.
    """
    from app.services.blockchain_withdraw_service import blockchain_withdraw_service
    from app.services.gas_sponsor_service import gas_sponsor_service
    
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Validar que é uma operação de VENDA
        if trade.operation_type.value != "sell":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este trade não é uma operação de VENDA"
            )
        
        # Validar status
        if trade.status not in [TradeStatus.PENDING, TradeStatus.PAYMENT_PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser processado."
            )
        
        # Buscar wallet do usuário
        user_wallet = db.query(Wallet).filter(
            Wallet.user_id == trade.user_id
        ).first()
        
        if not user_wallet:
            return {
                "ready": False,
                "reason": "Carteira do usuário não encontrada",
                "checks": {
                    "trade_found": True,
                    "trade_type": "sell",
                    "status_ok": True,
                    "wallet_found": False,
                    "crypto_balance_ok": False,
                    "gas_ok": False,
                }
            }
        
        # Buscar address do usuário
        user_address = db.query(Address).filter(
            Address.wallet_id == user_wallet.id,
            Address.network.ilike(f"%{network}%")
        ).first()
        
        if not user_address:
            return {
                "ready": False,
                "reason": f"Endereço do usuário não encontrado para rede {network}",
                "checks": {
                    "trade_found": True,
                    "trade_type": "sell",
                    "status_ok": True,
                    "wallet_found": True,
                    "address_found": False,
                    "crypto_balance_ok": False,
                    "gas_ok": False,
                }
            }
        
        # Conectar na rede
        w3 = blockchain_withdraw_service.get_web3(network)
        if not w3:
            return {
                "ready": False,
                "reason": f"Não foi possível conectar à rede {network}",
                "checks": {
                    "trade_found": True,
                    "trade_type": "sell",
                    "status_ok": True,
                    "wallet_found": True,
                    "address_found": True,
                    "network_connected": False,
                }
            }
        
        # Verificar saldo de crypto
        balance_check = blockchain_withdraw_service.check_user_balance(
            w3=w3,
            address=user_address.address,
            symbol=trade.symbol,
            network=network,
            required_amount=trade.crypto_amount
        )
        
        # Verificar saldo de gas
        config = gas_sponsor_service.NETWORK_CONFIG[network.lower()]
        contract_address = blockchain_withdraw_service.NETWORK_CONFIG[network.lower()]["contracts"].get(trade.symbol.upper())
        is_erc20 = contract_address is not None
        
        gas_check = gas_sponsor_service.check_user_gas_balance(
            w3=w3,
            user_address=str(user_address.address),
            network=network,
            is_erc20=is_erc20
        )
        
        # Se usuário não tem gas suficiente, verifica se plataforma pode patrocinar
        platform_can_sponsor = True
        platform_gas_info = None
        
        if not gas_check["has_enough_gas"]:
            gas_deficit = gas_check["gas_deficit"] * Decimal("1.2")  # 20% extra
            gas_deficit = max(gas_deficit, Decimal("0.01"))  # Mínimo 0.01
            
            platform_check = gas_sponsor_service.check_platform_gas_balance(
                w3=w3,
                network=network,
                required_gas=gas_deficit
            )
            
            platform_can_sponsor = platform_check["has_enough"]
            platform_gas_info = {
                "platform_balance": str(platform_check["platform_balance"]),
                "required_gas": str(platform_check["required_gas"]),
                "deficit": str(platform_check.get("deficit", 0)),
                "native_symbol": config["native_symbol"],
            }
        
        # Calcular taxa de gas em BRL se precisar patrocinar
        gas_fee_brl = Decimal("0")
        if not gas_check["has_enough_gas"] and platform_can_sponsor:
            gas_deficit = gas_check["gas_deficit"] * Decimal("1.2")
            gas_deficit = max(gas_deficit, Decimal("0.01"))
            fee_calc = gas_sponsor_service.calculate_gas_fee_brl(gas_deficit, network)
            gas_fee_brl = fee_calc["total_fee_brl"]
        
        # Resultado final
        is_ready = (
            balance_check.get("has_enough", False) and
            (gas_check["has_enough_gas"] or platform_can_sponsor)
        )
        
        reason = None
        if not balance_check.get("has_enough"):
            reason = f"Saldo de crypto insuficiente. Disponível: {balance_check['balance']} {trade.symbol}, Necessário: {balance_check['required']}"
        elif not gas_check["has_enough_gas"] and not platform_can_sponsor:
            reason = f"Saldo de gas insuficiente. Usuário não tem {config['native_symbol']} e plataforma não tem saldo suficiente para patrocinar. Adicione fundos na carteira da plataforma."
        
        return {
            "ready": is_ready,
            "reason": reason,
            "trade": {
                "id": trade.id,
                "reference_code": trade.reference_code,
                "symbol": trade.symbol,
                "crypto_amount": str(trade.crypto_amount),
                "brl_amount": str(trade.brl_amount),
                "user_email": trade.user.email if trade.user else None,
            },
            "checks": {
                "trade_found": True,
                "trade_type": "sell",
                "status_ok": True,
                "wallet_found": True,
                "address_found": True,
                "network_connected": True,
                "crypto_balance_ok": balance_check.get("has_enough", False),
                "crypto_balance": str(balance_check.get("balance", 0)),
                "crypto_required": str(balance_check.get("required", 0)),
                "user_has_gas": gas_check["has_enough_gas"],
                "user_gas_balance": str(gas_check["current_balance"]),
                "gas_required": str(gas_check["required_gas"]),
                "platform_can_sponsor": platform_can_sponsor,
                "platform_gas_info": platform_gas_info,
                "gas_fee_brl": str(gas_fee_brl) if gas_fee_brl > 0 else None,
            },
            "network": network,
            "user_address": user_address.address,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro verificando sell ready: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== ENDPOINT PARA PROCESSAR VENDAS (SELL) =====

class ProcessSellRequest(BaseModel):
    """Request para processar venda (retirar crypto do usuário)"""
    network: str = "polygon"  # ethereum, polygon, base
    notes: Optional[str] = None


@router.post("/{trade_id}/process-sell", response_model=dict)
async def process_sell_trade(
    trade_id: str,
    request: ProcessSellRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Processa uma operação de VENDA (SELL) - Retira crypto do usuário para a plataforma.
    
    FLUXO DE VENDA:
    1. Admin verifica que usuário quer vender (status: PENDING)
    2. Admin clica "Processar Venda"
    3. Sistema:
       - Busca chave privada CUSTODIAL do usuário (criptografada)
       - Descriptografa a chave
       - Transfere crypto: User Wallet → Platform Wallet
       - Registra tx_hash
       - Status: CRYPTO_RECEIVED
    4. Admin então processa pagamento PIX/TED para o usuário
    5. Admin marca como COMPLETED
    
    IMPORTANTE: Este endpoint usa a chave privada CUSTODIAL do usuário
    que está armazenada criptografada no banco de dados.
    """
    from app.services.blockchain_withdraw_service import blockchain_withdraw_service
    
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Validar que é uma operação de VENDA
        if trade.operation_type.value != "sell":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este trade não é uma operação de VENDA"
            )
        
        # Validar status
        if trade.status not in [TradeStatus.PENDING, TradeStatus.PAYMENT_PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser processado. Deve estar PENDING ou PAYMENT_PROCESSING."
            )
        
        logger.info(f"🔄 Admin {current_admin.email} processando VENDA {trade.reference_code}")
        
        # Atualizar para PAYMENT_PROCESSING
        old_status = trade.status
        trade.status = TradeStatus.PAYMENT_PROCESSING
        db.commit()
        
        # Executar withdraw (transferência do usuário para plataforma)
        network = request.network or "polygon"
        withdraw_result = blockchain_withdraw_service.withdraw_crypto_from_user(
            db=db,
            trade=trade,
            network=network
        )
        
        if withdraw_result["success"]:
            # Withdraw OK - crypto recebida
            logger.info(f"✅ Crypto recebida do usuário! TX: {withdraw_result['tx_hash']}")
            
            # Informações do Gas Sponsor
            gas_sponsor_info = withdraw_result.get("gas_sponsor", {})
            gas_sponsored = gas_sponsor_info.get("sponsored", False) if gas_sponsor_info else False
            network_fee_brl = gas_sponsor_info.get("network_fee_brl", "0") if gas_sponsor_info else "0"
            
            # Atualizar status do trade para CRYPTO_RECEIVED
            trade.status = TradeStatus.CRYPTO_RECEIVED
            trade.tx_hash = withdraw_result["tx_hash"]
            
            # Registrar histórico com info do gas sponsor
            history_details = f"TX: {withdraw_result['tx_hash']}, Network: {network}"
            if gas_sponsored:
                history_details += f", Gas Sponsored: {gas_sponsor_info.get('gas_amount_sent')} {gas_sponsor_info.get('native_symbol')}, Taxa Rede: R$ {network_fee_brl}"
            
            history = InstantTradeHistory(
                trade_id=trade.id,
                old_status=old_status,
                new_status=TradeStatus.CRYPTO_RECEIVED,
                reason=f"Crypto retirada do usuário por admin {current_admin.email}",
                history_details=history_details
            )
            db.add(history)
            db.commit()
            db.refresh(trade)
            
            response = {
                "success": True,
                "message": "Crypto recebida com sucesso! Agora processe o pagamento BRL para o usuário.",
                "trade_id": trade.id,
                "tx_hash": withdraw_result["tx_hash"],
                "from_address": withdraw_result["from_address"],
                "to_address": withdraw_result["to_address"],
                "network": withdraw_result["network"],
                "status": TradeStatus.CRYPTO_RECEIVED.value,
                "next_step": "Processar PIX/TED para o usuário e marcar como COMPLETED"
            }
            
            # Adiciona info do gas sponsor se foi usado
            if gas_sponsored:
                response["gas_sponsor"] = {
                    "sponsored": True,
                    "gas_tx_hash": gas_sponsor_info.get("gas_tx_hash"),
                    "gas_amount_sent": gas_sponsor_info.get("gas_amount_sent"),
                    "network_fee_brl": network_fee_brl,
                    "native_symbol": gas_sponsor_info.get("native_symbol"),
                    "message": f"Taxa de rede de R$ {network_fee_brl} foi descontada do valor BRL"
                }
            
            return response
        else:
            # Withdraw falhou
            logger.error(f"❌ Withdraw falhou: {withdraw_result['error']}")
            
            # Reverter status
            trade.status = old_status
            trade.error_message = withdraw_result["error"]
            db.commit()
            
            return {
                "success": False,
                "message": "Falha ao retirar crypto do usuário",
                "trade_id": trade.id,
                "tx_hash": None,
                "from_address": withdraw_result.get("from_address"),
                "to_address": withdraw_result.get("to_address"),
                "network": network,
                "status": old_status.value,
                "error": withdraw_result["error"]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro processando venda: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/complete-sell", response_model=dict)
async def complete_sell_trade(
    trade_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Finaliza uma operação de VENDA após o pagamento BRL ser enviado ao usuário.
    
    Só pode ser chamado após:
    1. Admin processou a venda (process-sell) - crypto foi retirada do usuário
    2. Admin enviou PIX/TED para o usuário
    3. Admin confirma que pagamento foi feito
    
    Status: CRYPTO_RECEIVED → COMPLETED
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Validar que é uma operação de VENDA
        if trade.operation_type.value != "sell":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este trade não é uma operação de VENDA"
            )
        
        # Validar status
        if trade.status != TradeStatus.CRYPTO_RECEIVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser finalizado. Deve estar CRYPTO_RECEIVED (crypto já recebida)."
            )
        
        logger.info(f"✅ Admin {current_admin.email} finalizando VENDA {trade.reference_code}")
        
        # Atualizar para COMPLETED
        old_status = trade.status
        trade.status = TradeStatus.COMPLETED
        trade.completed_at = datetime.now(timezone.utc)
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.COMPLETED,
            reason=f"Venda finalizada por admin {current_admin.email} - Pagamento BRL enviado ao usuário",
            history_details=f"Trade completo em {datetime.now(timezone.utc).isoformat()}"
        )
        db.add(history)
        db.commit()
        
        return {
            "success": True,
            "message": f"Trade {trade.reference_code} finalizado com sucesso!",
            "trade_id": trade.id,
            "status": TradeStatus.COMPLETED.value,
            "completed_at": trade.completed_at.isoformat() if trade.completed_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro finalizando venda: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== GAS SPONSOR STATUS =====

@router.get("/gas-sponsor/status", response_model=dict)
async def get_gas_sponsor_status(
    current_admin: User = Depends(get_current_admin)
):
    """
    Verifica o status do Gas Sponsor - saldo de MATIC/ETH da carteira da plataforma.
    
    Útil para monitorar se a plataforma tem fundos suficientes para patrocinar
    transações de VENDA dos usuários.
    """
    from app.services.gas_sponsor_service import gas_sponsor_service
    
    try:
        # Verifica saldo em cada rede
        networks = ["polygon", "ethereum"]
        balances = {}
        
        for network in networks:
            balance_info = gas_sponsor_service.get_platform_gas_balance(network)
            balances[network] = {
                "balance": str(balance_info.get("balance", 0)),
                "native_symbol": balance_info.get("native_symbol", ""),
                "low_balance_alert": balance_info.get("low_balance_alert", False),
                "platform_address": balance_info.get("platform_address", ""),
                "error": balance_info.get("error")
            }
        
        # Calcula alerta geral
        any_low_balance = any(
            b.get("low_balance_alert", False) 
            for b in balances.values() 
            if not b.get("error")
        )
        
        return {
            "success": True,
            "platform_address": gas_sponsor_service.platform_address,
            "balances": balances,
            "low_balance_alert": any_low_balance,
            "message": "⚠️ Saldo baixo detectado! Abasteça a carteira." if any_low_balance else "✅ Saldo OK para patrocínio de gas"
        }
        
    except Exception as e:
        logger.error(f"❌ Erro verificando gas sponsor status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )