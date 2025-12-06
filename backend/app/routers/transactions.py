"""
Transaction Router - Endpoints para criação, assinatura e broadcast de transações
"""
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, Float
from typing import List, Optional
import logging

from app.core.security import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.models.transaction import Transaction, TransactionStatus
from app.services.transaction_service import transaction_service
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionCreateResponse,
    TransactionSignRequest,
    TransactionSignResponse,
    TransactionBroadcastRequest,
    TransactionBroadcastResponse,
    TransactionStatusResponse,
    TransactionListResponse,
    TransactionStatsResponse,
    TransactionEstimateRequest,
    TransactionEstimateResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/create", response_model=TransactionCreateResponse)
async def create_transaction(
    request: TransactionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria uma nova transação (ainda não assinada)
    
    - **from_address**: Endereço de origem da transação
    - **to_address**: Endereço de destino
    - **amount**: Valor a ser enviado
    - **network**: Rede blockchain (bitcoin, ethereum, polygon, bsc)
    - **fee_preference**: Preferência de taxa (slow, standard, fast)
    - **memo**: Nota opcional
    - **token_address**: Endereço do token (para ERC-20/BEP-20)
    """
    try:
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        result = await transaction_service.create_transaction(
            db=db,
            from_address=request.from_address,
            to_address=request.to_address,
            amount=request.amount,
            network=request.network,
            user_id=user_id,
            fee_preference=request.fee_preference,
            memo=request.memo,
            token_address=request.token_address
        )
        
        return TransactionCreateResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/sign", response_model=TransactionSignResponse)
async def sign_transaction(
    request: TransactionSignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assina uma transação criada
    
    - **transaction_id**: ID da transação a ser assinada
    - **password**: Senha para descriptografar a carteira (opcional)
    """
    try:
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        result = await transaction_service.sign_transaction(
            db=db,
            transaction_id=request.transaction_id,
            user_id=user_id,
            password=request.password
        )
        
        return TransactionSignResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/broadcast", response_model=TransactionBroadcastResponse)
async def broadcast_transaction(
    request: TransactionBroadcastRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Faz broadcast de uma transação assinada para a blockchain
    
    - **transaction_id**: ID da transação a ser enviada
    """
    try:
        # Get the user ID as int  
        user_id: int = int(current_user.id)  # type: ignore
        
        result = await transaction_service.broadcast_transaction(
            db=db,
            transaction_id=request.transaction_id,
            user_id=user_id
        )
        
        # Agendar verificação de status em background
        if result.get("tx_hash"):
            background_tasks.add_task(
                monitor_transaction_status,
                request.transaction_id,
                user_id
            )
        
        return TransactionBroadcastResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/status/{transaction_id}", response_model=TransactionStatusResponse)
async def get_transaction_status(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica o status de confirmação de uma transação
    
    - **transaction_id**: ID da transação
    """
    try:
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        result = await transaction_service.check_transaction_status(
            db=db,
            transaction_id=transaction_id,
            user_id=user_id
        )
        
        return TransactionStatusResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/", response_model=TransactionListResponse)
async def list_user_transactions(
    limit: int = Query(50, ge=1, le=100, description="Número de transações por página"),
    offset: int = Query(0, ge=0, description="Número de transações para pular"),
    network: Optional[str] = Query(None, description="Filtrar por rede"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista transações do usuário com paginação e filtros
    
    - **limit**: Número máximo de transações (1-100)
    - **offset**: Quantas transações pular para paginação
    - **network**: Filtrar por rede específica (opcional)
    - **status**: Filtrar por status específico (opcional)
    """
    try:
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        result = await transaction_service.get_user_transactions(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
            network=network,
            status=status
        )
        
        return TransactionListResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/estimate", response_model=TransactionEstimateResponse)
async def estimate_transaction_fee(
    request: TransactionEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Estima as taxas para uma transação
    
    - **from_address**: Endereço de origem
    - **to_address**: Endereço de destino
    - **amount**: Valor a ser enviado
    - **network**: Rede blockchain
    - **token_address**: Endereço do token (opcional)
    """
    try:
        # Validar se o endereço de origem pertence ao usuário
        from app.models.address import Address
        from_addr = db.query(Address).filter(
            Address.address == request.from_address,
            Address.wallet.has(user_id=current_user.id)
        ).first()
        
        if not from_addr:
            raise HTTPException(
                status_code=403,
                detail="Endereço de origem não pertence ao usuário"
            )
        
        # Obter estimativas de taxa
        from app.services.blockchain_service import blockchain_service
        fees = await blockchain_service.estimate_fees(
            network=request.network,
            from_address=request.from_address,
            to_address=request.to_address,
            amount=request.amount,
            token_address=request.token_address
        )
        
        # Formatar resposta
        fee_options = {}
        if request.network.lower() == "bitcoin":
            fee_options = {
                "slow": f"{fees.get('slow_fee', 1)} sat/vB",
                "standard": f"{fees.get('standard_fee', 5)} sat/vB",
                "fast": f"{fees.get('fast_fee', 10)} sat/vB"
            }
        else:
            gas_price = fees.get("gas_price", "20")
            fee_options = {
                "slow": f"{float(gas_price) * 0.8:.1f} Gwei",
                "standard": f"{gas_price} Gwei",
                "fast": f"{float(gas_price) * 1.5:.1f} Gwei"
            }
        
        return TransactionEstimateResponse(
            network=request.network,
            estimated_fee=fees.get("estimated_fee", "0.001"),
            fee_options=fee_options,
            gas_limit=fees.get("gas_limit"),
            gas_price=fees.get("gas_price"),
            valid=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return TransactionEstimateResponse(
            network=request.network,
            estimated_fee="0",
            fee_options={},
            valid=False,
            error_message=str(e)
        )


@router.get("/stats", response_model=TransactionStatsResponse)
async def get_transaction_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém estatísticas de transações do usuário
    """
    try:
        from app.models.transaction import Transaction
        from sqlalchemy import func, distinct, Float
        
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        # Contadores por status
        stats_query = db.query(
            Transaction.status,
            func.count(Transaction.id).label('count'),
            func.sum(func.cast(Transaction.amount, Float)).label('total_amount'),
            func.sum(func.cast(Transaction.fee, Float)).label('total_fees')
        ).filter(
            Transaction.user_id == user_id
        ).group_by(Transaction.status).all()
        
        # Inicializar contadores
        total_transactions = 0
        pending_transactions = 0
        confirmed_transactions = 0
        failed_transactions = 0
        total_sent = 0.0
        total_fees_paid = 0.0
        
        # Processar resultados
        for stat in stats_query:
            count = int(stat.count or 0)  # type: ignore
            total_transactions += count
            
            if stat.status == "pending":
                pending_transactions = count
            elif stat.status == "confirmed":
                confirmed_transactions = count
                total_sent += float(stat.total_amount or 0)
                total_fees_paid += float(stat.total_fees or 0)
            elif stat.status in ["failed", "cancelled"]:
                failed_transactions += count
        
        # Redes utilizadas
        networks = db.query(distinct(Transaction.network)).filter(
            Transaction.user_id == user_id
        ).all()
        networks_list = [net[0] for net in networks]
        
        # Última transação
        last_tx = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc()).first()
        
        return TransactionStatsResponse(
            total_transactions=total_transactions,
            pending_transactions=pending_transactions,
            confirmed_transactions=confirmed_transactions,
            failed_transactions=failed_transactions,
            total_sent=str(total_sent),
            total_fees_paid=str(total_fees_paid),
            networks=networks_list,
            last_transaction_date=getattr(last_tx, 'created_at', None) if last_tx else None  # type: ignore
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao obter estatísticas")


@router.delete("/{transaction_id}")
async def cancel_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancela uma transação que ainda não foi enviada (broadcast)
    """
    try:
        from app.models.transaction import Transaction, TransactionStatus
        
        # Get the user ID as int
        user_id: int = int(current_user.id)  # type: ignore
        
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.status.in_([TransactionStatus.created, TransactionStatus.signed])
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="Transação não encontrada ou não pode ser cancelada"
            )
        
        # Update transaction status
        setattr(transaction, 'status', TransactionStatus.cancelled)  # type: ignore
        setattr(transaction, 'updated_at', datetime.now(timezone.utc))  # type: ignore
        db.commit()
        
        return {"message": "Transação cancelada com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro ao cancelar transação")


# Função de background para monitorar status das transações
async def monitor_transaction_status(transaction_id: int, user_id: int):
    """
    Monitora status de uma transação em background
    """
    try:
        from app.core.db import SessionLocal
        
        # Verificar status periodicamente
        for attempt in range(10):  # Máximo 10 tentativas
            await asyncio.sleep(30)  # Aguardar 30 segundos
            
            db = SessionLocal()
            try:
                result = await transaction_service.check_transaction_status(
                    db=db,
                    transaction_id=transaction_id,
                    user_id=user_id
                )
                
                # Se confirmada ou falhou, parar o monitoramento
                if result.get("final", False):
                    break
                    
            finally:
                db.close()
                
    except Exception as e:
        logger.error(f"Erro no monitoramento de transação {transaction_id}: {e}")
