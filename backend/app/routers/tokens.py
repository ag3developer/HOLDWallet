"""
Token Router - Endpoints específicos para operações com tokens
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from app.core.security import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.services.token_service import token_service
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tokens", tags=["tokens"])

# Schemas
class TokenInfoRequest(BaseModel):
    token_symbol: str = Field(..., description="USDT, USDC, DAI, etc")
    network: str = Field(..., description="ethereum, polygon, bsc, etc")

class TokenInfoResponse(BaseModel):
    symbol: str
    network: str
    address: str
    decimals: int
    name: str

class TokenTransferDataRequest(BaseModel):
    to_address: str = Field(..., description="Endereço destinatário (0x...)")
    amount: str = Field(..., description="Valor em formato legível (ex: 10.5)")
    token_symbol: str = Field(..., description="USDT, USDC, etc")
    network: str = Field(..., description="ethereum, polygon, etc")

class TokenTransferDataResponse(BaseModel):
    to: str
    amount_wei: str
    amount_formatted: str
    function_data: str
    token_symbol: str
    network: str

class AvailableTokensResponse(BaseModel):
    tokens: Dict[str, List[str]]

class TokenGasEstimateRequest(BaseModel):
    network: str = Field(..., description="ethereum, polygon, etc")
    token_symbol: str = Field(..., description="USDT, USDC, etc")

class TokenGasEstimateResponse(BaseModel):
    safe: int
    standard: int
    fast: int
    gwei: Dict[str, str]

# Endpoints

@router.get("/available", response_model=AvailableTokensResponse)
async def get_available_tokens():
    """
    Retorna lista de todos os tokens disponíveis e suas redes suportadas
    
    Exemplo de resposta:
    {
      "tokens": {
        "USDT": ["ethereum", "polygon", "bsc", ...],
        "USDC": ["ethereum", "polygon", ...],
        "DAI": ["ethereum", "polygon", ...]
      }
    }
    """
    try:
        tokens = token_service.list_available_tokens()
        return AvailableTokensResponse(tokens=tokens)
    except Exception as e:
        logger.error(f"Erro ao listar tokens: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar tokens")

@router.post("/info", response_model=TokenInfoResponse)
async def get_token_info(request: TokenInfoRequest):
    """
    Retorna informações de um token específico em uma rede
    
    Exemplo:
    {
      "token_symbol": "USDT",
      "network": "polygon"
    }
    
    Resposta:
    {
      "symbol": "USDT",
      "network": "polygon",
      "address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "decimals": 6,
      "name": "Tether USD (PoS)"
    }
    """
    try:
        info = token_service.get_token_info(
            request.token_symbol,
            request.network
        )
        # Remover ABI da resposta (é grande)
        info.pop('abi', None)
        return TokenInfoResponse(**info)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao obter info do token: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter informações")

@router.post("/transfer-data", response_model=TokenTransferDataResponse)
async def get_transfer_function_data(request: TokenTransferDataRequest):
    """
    Gera os dados para preparar uma transação de transferência de token
    
    Isso retorna a data codificada que deve ser usada em uma transação EVM
    
    Exemplo:
    {
      "to_address": "0x1234567890123456789012345678901234567890",
      "amount": "10.5",
      "token_symbol": "USDT",
      "network": "polygon"
    }
    
    Resposta:
    {
      "to": "0x1234...",
      "amount_wei": "10500000",
      "amount_formatted": "10.5",
      "function_data": "0xa9059cbb...",
      "token_symbol": "USDT",
      "network": "polygon"
    }
    """
    try:
        data = token_service.get_transfer_function_data(
            request.to_address,
            request.amount,
            request.token_symbol,
            request.network
        )
        return TokenTransferDataResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao gerar transfer data: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar dados de transação")

@router.get("/gas-estimate")
async def estimate_token_gas(
    network: str = Query(..., description="ethereum, polygon, etc"),
    token_symbol: str = Query(..., description="USDT, USDC, etc")
) -> TokenGasEstimateResponse:
    """
    Estima o gas necessário para transferência de token em uma rede
    
    Query parameters:
    - network: ethereum, polygon, bsc, etc
    - token_symbol: USDT, USDC, DAI, etc
    
    Exemplo:
    GET /tokens/gas-estimate?network=polygon&token_symbol=USDT
    
    Resposta:
    {
      "safe": 70000,
      "standard": 75000,
      "fast": 85000,
      "gwei": {
        "safe": "30",
        "standard": "50",
        "fast": "100"
      }
    }
    """
    try:
        estimate = token_service.estimate_token_gas(
            network=network,
            from_address="0x0000000000000000000000000000000000000000",
            token_symbol=token_symbol,
            to_address="0x0000000000000000000000000000000000000000",
            amount="1"
        )
        return TokenGasEstimateResponse(**estimate)
    except Exception as e:
        logger.error(f"Erro ao estimar gas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao estimar gas")

@router.get("/supported-networks/{token_symbol}")
async def get_supported_networks(token_symbol: str):
    """
    Retorna lista de redes onde um token está disponível
    
    Exemplo:
    GET /tokens/supported-networks/USDT
    
    Resposta:
    {
      "token": "USDT",
      "networks": ["ethereum", "polygon", "bsc", "arbitrum", "optimism", ...]
    }
    """
    try:
        from app.config.token_contracts import get_supported_networks_for_token
        networks = get_supported_networks_for_token(token_symbol)
        
        if not networks:
            raise HTTPException(
                status_code=404,
                detail=f"Token não encontrado: {token_symbol}"
            )
        
        return {
            "token": token_symbol,
            "networks": networks
        }
    except Exception as e:
        logger.error(f"Erro ao obter redes suportadas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao obter redes")

@router.post("/validate")
async def validate_token_network(
    token_symbol: str = Query(...),
    network: str = Query(...)
):
    """
    Valida se um token está disponível em uma rede específica
    
    Query parameters:
    - token_symbol: USDT, USDC, etc
    - network: ethereum, polygon, etc
    
    Resposta:
    {
      "valid": true,
      "token": "USDT",
      "network": "polygon",
      "message": "Token disponível nesta rede"
    }
    """
    try:
        is_valid = token_service.validate_token_and_network(
            token_symbol,
            network
        )
        
        return {
            "valid": is_valid,
            "token": token_symbol,
            "network": network,
            "message": "Token disponível nesta rede" if is_valid else "Token não disponível nesta rede"
        }
    except Exception as e:
        logger.error(f"Erro ao validar token: {e}")
        raise HTTPException(status_code=500, detail="Erro ao validar token")

@router.post("/format-amount")
async def format_amount(
    amount: str = Query(..., description="Valor a converter"),
    token_symbol: str = Query(...),
    network: str = Query(...),
    direction: str = Query("to_wei", description="to_wei ou from_wei")
):
    """
    Converte um valor entre formato legível e formato de contrato (wei)
    
    Query parameters:
    - amount: Valor a converter
    - token_symbol: USDT, USDC, etc
    - network: ethereum, polygon, etc
    - direction: "to_wei" (legível → wei) ou "from_wei" (wei → legível)
    
    Exemplo:
    POST /tokens/format-amount?amount=10.5&token_symbol=USDT&network=polygon&direction=to_wei
    
    Resposta:
    {
      "original": "10.5",
      "converted": "10500000",
      "decimals": 6,
      "direction": "to_wei"
    }
    """
    try:
        from app.config.token_contracts import get_token_decimals
        
        if direction == "to_wei":
            converted = token_service.format_amount_for_contract(
                amount, token_symbol, network
            )
        elif direction == "from_wei":
            converted = token_service.format_amount_from_contract(
                amount, token_symbol, network
            )
        else:
            raise ValueError("direction deve ser 'to_wei' ou 'from_wei'")
        
        decimals = get_token_decimals(token_symbol, network)
        
        return {
            "original": amount,
            "converted": converted,
            "decimals": decimals,
            "direction": direction
        }
    except Exception as e:
        logger.error(f"Erro ao formatar amount: {e}")
        raise HTTPException(status_code=400, detail=str(e))
