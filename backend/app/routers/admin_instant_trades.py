"""
🚀 HOLD Wallet - Admin Instant Trades Router
============================================

Endpoints administrativos para gerenciar operações OTC.
Apenas usuários com is_admin=True podem acessar.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.instant_trade import InstantTrade, TradeStatus, InstantTradeHistory
from app.services.blockchain_deposit_service import blockchain_deposit_service
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin/instant-trades",
    tags=["Admin - Instant Trades"],
    dependencies=[Depends(get_current_admin)]
)


# ===== SCHEMAS =====

class ConfirmPaymentRequest(BaseModel):
    """Request para confirmar pagamento"""
    trade_id: str
    network: str = "polygon"  # ethereum, polygon, base
    notes: Optional[str] = None


class ConfirmPaymentResponse(BaseModel):
    """Response após confirmar pagamento"""
    success: bool
    message: str
    trade_id: str
    tx_hash: Optional[str]
    wallet_address: Optional[str]
    network: str
    status: str
    error: Optional[str] = None


class AdminTradeListItem(BaseModel):
    """Item da lista de trades para admin"""
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
    payment_confirmed_at: Optional[datetime]
    completed_at: Optional[datetime]
    expires_at: datetime


# ===== ENDPOINTS =====

@router.get("/pending", response_model=List[AdminTradeListItem])
async def list_pending_trades(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os trades com pagamento confirmado aguardando depósito
    
    Status: PAYMENT_CONFIRMED
    """
    try:
        trades = db.query(InstantTrade).filter(
            InstantTrade.status == TradeStatus.PAYMENT_CONFIRMED
        ).order_by(InstantTrade.created_at.desc()).all()
        
        result = []
        for trade in trades:
            result.append(AdminTradeListItem(
                id=trade.id,
                reference_code=trade.reference_code,
                user_id=trade.user_id,
                operation_type=trade.operation_type.value,
                symbol=trade.symbol,
                fiat_amount=float(trade.fiat_amount),
                crypto_amount=float(trade.crypto_amount),
                total_amount=float(trade.total_amount),
                payment_method=trade.payment_method.value,
                status=trade.status.value,
                wallet_address=trade.wallet_address,
                tx_hash=trade.tx_hash,
                network=trade.network,
                created_at=trade.created_at,
                payment_confirmed_at=trade.payment_confirmed_at,
                completed_at=trade.completed_at,
                expires_at=trade.expires_at
            ))
        
        logger.info(f"✅ Admin {current_admin.email} listou {len(result)} trades pendentes")
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro listando trades pendentes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar trades: {str(e)}"
        )


@router.get("/all", response_model=List[AdminTradeListItem])
async def list_all_trades(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os trades (com paginação e filtro por status)
    """
    try:
        query = db.query(InstantTrade)
        
        if status_filter:
            query = query.filter(InstantTrade.status == status_filter)
        
        trades = query.order_by(
            InstantTrade.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        result = []
        for trade in trades:
            result.append(AdminTradeListItem(
                id=trade.id,
                reference_code=trade.reference_code,
                user_id=trade.user_id,
                operation_type=trade.operation_type.value,
                symbol=trade.symbol,
                fiat_amount=float(trade.fiat_amount),
                crypto_amount=float(trade.crypto_amount),
                total_amount=float(trade.total_amount),
                payment_method=trade.payment_method.value,
                status=trade.status.value,
                wallet_address=trade.wallet_address,
                tx_hash=trade.tx_hash,
                network=trade.network,
                created_at=trade.created_at,
                payment_confirmed_at=trade.payment_confirmed_at,
                completed_at=trade.completed_at,
                expires_at=trade.expires_at
            ))
        
        logger.info(f"✅ Admin {current_admin.email} listou {len(result)} trades")
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro listando trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar trades: {str(e)}"
        )


@router.post("/confirm-payment", response_model=ConfirmPaymentResponse)
async def confirm_payment_and_deposit(
    request: ConfirmPaymentRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Confirma pagamento e dispara depósito blockchain automaticamente
    
    FLUXO:
    1. Admin confirma que recebeu o pagamento (PIX/TED)
    2. Status muda para PAYMENT_CONFIRMED
    3. Sistema dispara depósito blockchain
    4. Crypto é enviada para wallet do usuário
    5. Status muda para COMPLETED
    6. tx_hash é registrado
    """
    try:
        # 1. Busca o trade
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == request.trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {request.trade_id} não encontrado"
            )
        
        # 2. Valida status
        if trade.status != TradeStatus.PENDING and trade.status != TradeStatus.PAYMENT_PROCESSING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade está com status {trade.status.value}, não pode ser confirmado"
            )
        
        # 3. Atualiza status para PAYMENT_CONFIRMED
        old_status = trade.status
        trade.status = TradeStatus.PAYMENT_CONFIRMED
        trade.payment_confirmed_at = datetime.now()
        
        # Registra histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.PAYMENT_CONFIRMED,
            reason=f"Pagamento confirmado por admin {current_admin.email}",
            history_details=request.notes
        )
        db.add(history)
        db.commit()
        db.refresh(trade)
        
        logger.info(f"✅ Pagamento confirmado para trade {trade.reference_code}")
        
        # 4. Dispara depósito blockchain
        logger.info(f"🚀 Iniciando depósito blockchain para {trade.reference_code}")
        
        deposit_result = blockchain_deposit_service.deposit_crypto_to_user(
            db=db,
            trade=trade,
            network=request.network
        )
        
        if deposit_result["success"]:
            # Depósito OK
            logger.info(f"✅ Depósito concluído! TX: {deposit_result['tx_hash']}")
            
            # Registra histórico de conclusão
            history = InstantTradeHistory(
                trade_id=trade.id,
                old_status=TradeStatus.PAYMENT_CONFIRMED,
                new_status=TradeStatus.COMPLETED,
                reason=f"Crypto depositada por admin {current_admin.email}",
                history_details=f"TX: {deposit_result['tx_hash']}"
            )
            db.add(history)
            db.commit()
            
            return ConfirmPaymentResponse(
                success=True,
                message="Pagamento confirmado e crypto depositada com sucesso!",
                trade_id=trade.id,
                tx_hash=deposit_result["tx_hash"],
                wallet_address=deposit_result["wallet_address"],
                network=deposit_result["network"],
                status=TradeStatus.COMPLETED.value,
                error=None
            )
        else:
            # Depósito falhou
            logger.error(f"❌ Depósito falhou: {deposit_result['error']}")
            
            # Atualiza trade com erro
            trade.status = TradeStatus.FAILED
            trade.error_message = deposit_result["error"]
            db.commit()
            
            return ConfirmPaymentResponse(
                success=False,
                message="Pagamento confirmado mas depósito falhou",
                trade_id=trade.id,
                tx_hash=None,
                wallet_address=deposit_result.get("wallet_address"),
                network=request.network,
                status=TradeStatus.FAILED.value,
                error=deposit_result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro confirmando pagamento: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao confirmar pagamento: {str(e)}"
        )


@router.post("/manual-deposit/{trade_id}")
async def manual_deposit_retry(
    trade_id: str,
    network: str = "polygon",
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retry manual de depósito para trades que falharam
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
        
        # Permite retry em PAYMENT_CONFIRMED ou FAILED
        if trade.status not in [TradeStatus.PAYMENT_CONFIRMED, TradeStatus.FAILED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade está com status {trade.status.value}, não pode fazer retry"
            )
        
        # Volta para PAYMENT_CONFIRMED se estiver FAILED
        if trade.status == TradeStatus.FAILED:
            trade.status = TradeStatus.PAYMENT_CONFIRMED
            trade.error_message = None
            db.commit()
        
        # Tenta depósito novamente
        deposit_result = blockchain_deposit_service.deposit_crypto_to_user(
            db=db,
            trade=trade,
            network=network
        )
        
        if deposit_result["success"]:
            logger.info(f"✅ Retry de depósito OK! TX: {deposit_result['tx_hash']}")
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
            detail=f"Erro no retry: {str(e)}"
        )
