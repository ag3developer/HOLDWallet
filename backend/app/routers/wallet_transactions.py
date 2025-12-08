"""
USDT Transaction Router - Endpoints para enviar USDT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.transaction import Transaction
from app.models.address import Address
from app.models.wallet import Wallet
from app.services.usdt_transaction_service import usdt_transaction_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wallets", tags=["wallet-transactions"])


# ============ Pydantic Schemas ============

class SendUSDTRequest(BaseModel):
    """Request para enviar USDT"""
    wallet_id: int = Field(..., description="ID da carteira")
    to_address: str = Field(..., description="Endereço de destino")
    amount: str = Field(..., description="Valor a enviar (ex: 100.5)")
    token: str = Field(default="USDT", description="Token (USDT, USDC, DAI)")
    network: str = Field(..., description="Rede (ethereum, polygon, bsc, etc)")
    fee_level: str = Field(
        default="standard",
        description="Velocidade da transação (slow, standard, fast)"
    )
    note: Optional[str] = Field(None, description="Nota/memo da transação")


class SendUSDTResponse(BaseModel):
    """Response do envio de USDT"""
    valid: bool
    tx_hash: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    amount: Optional[str] = None
    token: Optional[str] = None
    network: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    explorer_url: Optional[str] = None


class ValidateTransactionRequest(BaseModel):
    """Request para validar uma transação"""
    wallet_id: int
    to_address: str
    amount: str
    token: str = "USDT"
    network: str


class EstimateGasRequest(BaseModel):
    """Request para estimar gas"""
    wallet_id: int
    to_address: str
    amount: str
    token: str = "USDT"
    network: str
    fee_level: str = "standard"


class EstimateGasResponse(BaseModel):
    """Response da estimativa de gas"""
    valid: bool
    gas: Optional[int] = None
    gas_price_gwei: Optional[str] = None
    total_cost_native: Optional[str] = None
    total_cost_usd: Optional[str] = None
    native_symbol: Optional[str] = None
    error: Optional[str] = None


# ============ Endpoints ============

@router.post("/{wallet_id}/send", response_model=SendUSDTResponse)
async def send_usdt(
    wallet_id: int,
    request: SendUSDTRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Enviar USDT para outro endereço
    
    🔐 Requer autenticação
    """
    try:
        # Validar que a carteira pertence ao usuário
        wallet = db.query(Wallet).filter(
            Wallet.id == wallet_id,
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carteira não encontrada"
            )
        
        # Buscar endereço de origem
        from_address = db.query(Address).filter(
            Address.wallet_id == wallet_id,
            Address.network == request.network,
            Address.address_type == "receiving"
        ).first()
        
        if not from_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Endereço não encontrado para rede {request.network}"
            )
        
        # Validar transação
        validation = usdt_transaction_service.validate_transfer(
            str(from_address.address),
            request.to_address,
            request.amount,
            request.token,
            request.network
        )
        
        if not validation['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation['error']
            )
        
        # Preparar transação (sem assinar ainda)
        prep = usdt_transaction_service.prepare_transaction(
            str(from_address.address),
            request.to_address,
            request.amount,
            request.token,
            request.network,
            request.fee_level
        )
        
        if not prep.get('valid'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=prep.get('error', 'Erro ao preparar transação')
            )
        
        # TODO: Aqui seria o ponto de assinar com private key
        # Por segurança, private key deveria vir de:
        # 1. Descripto do banco (com passphrase do usuário)
        # 2. Ou chaveiro do dispositivo
        # 3. Hardware wallet
        
        # ⚠️ PARA PRODUÇÃO: Implementar com segurança adequada!
        
        # Por enquanto, retornar erro pedindo implementação de signing
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Assinatura de transação ainda não implementada. "
                   "Por favor, use a testnet para testar."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar USDT: {e}")
        return SendUSDTResponse(
            valid=False,
            error=str(e)
        )


@router.post("/{wallet_id}/estimate-gas", response_model=EstimateGasResponse)
async def estimate_gas(
    wallet_id: int,
    request: EstimateGasRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Estimar custo de gas para uma transação USDT
    
    🔐 Requer autenticação
    """
    try:
        # Validar carteira
        wallet = db.query(Wallet).filter(
            Wallet.id == wallet_id,
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carteira não encontrada"
            )
        
        # Buscar endereço
        from_address = db.query(Address).filter(
            Address.wallet_id == wallet_id,
            Address.network == request.network
        ).first()
        
        if not from_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Endereço não encontrado para rede {request.network}"
            )
        
        # Estimar gas
        gas_estimate = usdt_transaction_service.estimate_gas_cost(
            str(from_address.address),
            request.to_address,
            request.amount,
            request.token,
            request.network,
            request.fee_level
        )
        
        if not gas_estimate.get('valid'):
            return EstimateGasResponse(
                valid=False,
                error=gas_estimate.get('error', 'Erro ao estimar gas')
            )
        
        return EstimateGasResponse(
            valid=True,
            gas=gas_estimate.get('gas'),
            gas_price_gwei=gas_estimate.get('gas_price_gwei'),
            total_cost_native=gas_estimate.get('total_cost_native'),
            total_cost_usd=gas_estimate.get('total_cost_usd'),
            native_symbol=gas_estimate.get('native_symbol')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao estimar gas: {e}")
        return EstimateGasResponse(
            valid=False,
            error=str(e)
        )


@router.post("/{wallet_id}/validate-transaction")
async def validate_transaction(
    wallet_id: int,
    request: ValidateTransactionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Validar uma transação USDT antes de enviar
    
    🔐 Requer autenticação
    """
    try:
        # Validar carteira
        wallet = db.query(Wallet).filter(
            Wallet.id == wallet_id,
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carteira não encontrada"
            )
        
        # Buscar endereço
        from_address = db.query(Address).filter(
            Address.wallet_id == wallet_id,
            Address.network == request.network
        ).first()
        
        if not from_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Endereço não encontrado para rede {request.network}"
            )
        
        # Validar transação
        validation = usdt_transaction_service.validate_transfer(
            str(from_address.address),
            request.to_address,
            request.amount,
            request.token,
            request.network
        )
        
        return validation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao validar transação: {e}")
        return {
            'valid': False,
            'error': str(e)
        }
