"""
🔄 Swap API Router
==================

Endpoints para swap de criptomoedas.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.swap import swap_service, swap_fee_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swap", tags=["Swap"])


# ============ Schemas ============

class QuoteRequest(BaseModel):
    """Request para obter cotação."""
    chain_id: int = Field(..., description="ID da rede (137=Polygon, 56=BSC)")
    from_token: str = Field(..., description="Endereço do token de origem")
    to_token: str = Field(..., description="Endereço do token de destino")
    amount: str = Field(..., description="Quantidade em unidades mínimas (wei)")
    slippage: float = Field(default=1.0, ge=0.1, le=5.0, description="Tolerância de slippage %")
    
    class Config:
        json_schema_extra = {
            "example": {
                "chain_id": 137,
                "from_token": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                "to_token": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                "amount": "100000000",
                "slippage": 1.0
            }
        }


class ExecuteSwapRequest(BaseModel):
    """Request para executar swap."""
    quote_id: str = Field(..., description="ID da cotação obtida")
    
    class Config:
        json_schema_extra = {
            "example": {
                "quote_id": "q_abc123def456"
            }
        }


class TokenInfo(BaseModel):
    """Informações de um token."""
    address: str
    symbol: str
    name: str
    decimals: int
    logo_url: Optional[str] = None


# ============ Endpoints ============

@router.post("/quote")
async def get_swap_quote(
    request: QuoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    🔄 Obter cotação para swap.
    
    Retorna o melhor preço disponível nos DEXs agregados (1inch),
    incluindo a taxa HOLDWallet e valor líquido que o usuário receberá.
    
    A cotação é válida por 60 segundos.
    """
    try:
        # Obter endereço da carteira do usuário
        # TODO: Buscar do banco baseado no chain_id
        user_address = getattr(current_user, 'polygon_address', None)
        
        if not user_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário não possui carteira na rede selecionada"
            )
        
        # Determinar nível VIP do usuário
        user_vip_level = getattr(current_user, 'vip_level', 'bronze')
        
        result = await swap_service.get_quote(
            chain_id=request.chain_id,
            from_token=request.from_token,
            to_token=request.to_token,
            from_amount=request.amount,
            user_address=user_address,
            user_vip_level=user_vip_level,
            slippage=request.slippage,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", result.get("error", "Falha ao obter cotação"))
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro em get_swap_quote: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao obter cotação"
        )


@router.post("/execute")
async def execute_swap(
    request: ExecuteSwapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    🚀 Executar swap.
    
    Executa a troca de tokens baseada em uma cotação previamente obtida.
    A cotação deve estar dentro do período de validade (60 segundos).
    
    **Fluxo:**
    1. Valida cotação
    2. Aprova token se necessário
    3. Executa swap no DEX
    4. Desconta taxa HOLDWallet
    """
    try:
        # Obter chave privada do usuário (modelo custodial)
        # IMPORTANTE: Em produção, isso deve vir de um HSM/Vault seguro
        user_private_key = getattr(current_user, 'encrypted_private_key', None)
        
        if not user_private_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chave de assinatura não disponível"
            )
        
        # TODO: Descriptografar a chave privada
        # private_key = decrypt(user_private_key)
        
        result = await swap_service.execute_swap(
            quote_id=request.quote_id,
            user_private_key=user_private_key,  # Passar descriptografada
            db=db,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", result.get("error", "Falha ao executar swap"))
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro em execute_swap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao executar swap"
        )


@router.get("/status/{swap_id}")
async def get_swap_status(
    swap_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    📊 Verificar status de um swap.
    
    Retorna o status atual da transação e informações de confirmação.
    """
    try:
        result = await swap_service.get_swap_status(swap_id=swap_id, db=db)
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro em get_swap_status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao consultar status"
        )


@router.get("/history")
async def get_swap_history(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    📜 Histórico de swaps do usuário.
    
    Retorna lista paginada de todos os swaps realizados.
    """
    try:
        result = await swap_service.get_user_history(
            user_id=str(current_user.id),
            page=page,
            per_page=per_page,
            db=db,
        )
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro em get_swap_history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao consultar histórico"
        )


@router.get("/tokens/{chain_id}")
async def get_supported_tokens(
    chain_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    🪙 Listar tokens disponíveis para swap.
    
    Retorna lista de tokens suportados em uma determinada rede.
    """
    try:
        result = swap_service.get_supported_tokens(chain_id=chain_id)
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro em get_supported_tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar tokens"
        )


@router.get("/fees")
async def get_fee_structure(
    current_user: User = Depends(get_current_user),
):
    """
    💰 Obter estrutura de taxas.
    
    Retorna as taxas atuais e limites do sistema de swap.
    """
    try:
        return {
            "fees": swap_fee_service.get_fee_structure(),
            "limits": swap_fee_service.get_limits(),
        }
        
    except Exception as e:
        logger.error(f"❌ Erro em get_fee_structure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter taxas"
        )


@router.get("/networks")
async def get_supported_networks():
    """
    🌐 Listar redes suportadas para swap.
    
    Retorna lista de redes blockchain onde o swap está disponível.
    """
    networks = [
        {
            "chain_id": 137,
            "name": "Polygon",
            "symbol": "MATIC",
            "is_active": True,
            "gas_estimate_usd": 0.03,
        },
        {
            "chain_id": 56,
            "name": "BNB Smart Chain",
            "symbol": "BNB",
            "is_active": True,
            "gas_estimate_usd": 0.10,
        },
        {
            "chain_id": 42161,
            "name": "Arbitrum One",
            "symbol": "ETH",
            "is_active": True,
            "gas_estimate_usd": 0.10,
        },
        {
            "chain_id": 1,
            "name": "Ethereum",
            "symbol": "ETH",
            "is_active": False,  # Desativado por enquanto (gas alto)
            "gas_estimate_usd": 15.0,
        },
    ]
    
    return {"networks": networks}
