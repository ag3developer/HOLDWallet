"""
🔄 Swap API Router
==================

Endpoints para swap de criptomoedas.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal
import logging
import asyncio

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.swap import swap_service, swap_fee_service
from app.services.blockchain_service import BlockchainService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swap", tags=["Swap"])

# Mapeamento de chain_id para network
CHAIN_ID_TO_NETWORK = {
    137: "polygon",
    56: "bsc",
    42161: "arbitrum",
    8453: "base",
    1: "ethereum",
    43114: "avalanche",
}

# Mapeamento de network para RPC URL
NETWORK_TO_RPC = {
    "polygon": "https://polygon-rpc.com",
    "bsc": "https://bsc-dataseed.binance.org",
    "arbitrum": "https://arb1.arbitrum.io/rpc",
    "base": "https://mainnet.base.org",
    "ethereum": "https://eth-mainnet.g.alchemy.com/v2/demo",
}


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
        # Converter chain_id para network name
        network = CHAIN_ID_TO_NETWORK.get(request.chain_id)
        if not network:
            # Tentar adicionar Avalanche se faltar no mapeamento
            if request.chain_id == 43114:
                network = "avalanche"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Rede não suportada: chain_id={request.chain_id}"
                )
        
        # Buscar carteiras do usuário
        wallets = db.query(Wallet).filter(
            Wallet.user_id == current_user.id,
            Wallet.is_active == True
        ).all()
        
        if not wallets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário não possui carteira"
            )
        
        # Redes EVM compartilham o mesmo endereço
        evm_networks = ["ethereum", "polygon", "bsc", "arbitrum", "base", "avalanche"]
        
        # Buscar endereço do usuário para esta rede
        user_address = await _get_user_address_for_network(
            wallets, network, evm_networks, db
        )
        
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


@router.get("/user-balances/{chain_id}")
async def get_user_token_balances(
    chain_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    💰 Obter saldos de tokens do usuário para swap.
    
    Retorna lista de tokens que o usuário possui na rede especificada,
    com seus respectivos saldos.
    """
    try:
        # Converter chain_id para network
        network = CHAIN_ID_TO_NETWORK.get(chain_id)
        if not network:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Rede não suportada: chain_id={chain_id}"
            )
        
        # Buscar carteiras do usuário
        wallets = db.query(Wallet).filter(
            Wallet.user_id == current_user.id,
            Wallet.is_active == True
        ).all()
        
        if not wallets:
            return {
                "chain_id": chain_id,
                "network": network,
                "tokens": [],
                "total_usd": "0.00"
            }
        
        # Buscar endereços compatíveis com a rede
        user_tokens = []
        total_usd = Decimal("0")
        
        # Redes EVM compartilham o mesmo endereço
        evm_networks = ["ethereum", "polygon", "bsc", "arbitrum", "base"]
        
        user_address = await _get_user_address_for_network(
            wallets, network, evm_networks, db
        )
        
        if not user_address:
            return {
                "chain_id": chain_id,
                "network": network,
                "tokens": [],
                "total_usd": "0.00"
            }
        
        # Criar blockchain service
        blockchain_service = BlockchainService()
        
        try:
            # Buscar saldo nativo + tokens
            balance_data = await blockchain_service.get_address_balance(
                str(user_address),
                network,
                include_tokens=True
            )
            
            # Obter tokens suportados na rede
            supported_tokens = swap_service.get_supported_tokens(chain_id)
            token_list = supported_tokens.get("tokens", [])
            
            # Processar token nativo
            native_balance = Decimal(balance_data.get("native_balance", "0"))
            native_token = next(
                (t for t in token_list if t["address"] == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"), 
                None
            )
            
            if native_token and native_balance > 0:
                user_tokens.append(await _format_token_balance(
                    native_token, native_balance, chain_id
                ))
                total_usd += Decimal(user_tokens[-1]["balance_usd"])
            
            # Processar tokens ERC20
            token_balances = balance_data.get("token_balances", {})
            for token_addr, token_data in token_balances.items():
                formatted = await _process_erc20_token(
                    token_addr, token_data, token_list, chain_id
                )
                if formatted:
                    user_tokens.append(formatted)
                    total_usd += Decimal(formatted["balance_usd"])
            
        except Exception as balance_error:
            logger.error(f"❌ Erro ao buscar saldo de {user_address}: {balance_error}")
        
        # Ordenar por valor USD (maior primeiro)
        user_tokens.sort(key=lambda x: Decimal(x["balance_usd"]), reverse=True)
        
        return {
            "chain_id": chain_id,
            "network": network,
            "address": str(user_address),
            "tokens": user_tokens,
            "total_usd": f"{total_usd:.2f}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro em get_user_token_balances: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar saldos"
        )


async def _get_user_address_for_network(
    wallets: List[Wallet],
    network: str,
    evm_networks: List[str],
    db: Session
) -> Optional[str]:
    """Buscar endereço do usuário para uma rede específica."""
    for wallet in wallets:
        if network in evm_networks:
            address_record = db.query(Address).filter(
                Address.wallet_id == wallet.id,
                Address.is_active == True,
                Address.network.in_(evm_networks)
            ).first()
        else:
            address_record = db.query(Address).filter(
                Address.wallet_id == wallet.id,
                Address.is_active == True,
                Address.network == network
            ).first()
        
        if address_record:
            return str(address_record.address)
    
    # Asyncio sleep para satisfazer linter (função async sem await)
    await asyncio.sleep(0)
    return None


async def _format_token_balance(
    token_info: Dict[str, Any],
    balance: Decimal,
    chain_id: int
) -> Dict[str, Any]:
    """Formatar informações de saldo de um token."""
    symbol = token_info["symbol"]
    decimals = token_info.get("decimals", 18)
    
    price_usd = await _get_token_price(symbol)
    balance_usd = balance * price_usd
    
    return {
        "address": token_info["address"],
        "symbol": symbol,
        "name": token_info.get("name", symbol),
        "decimals": decimals,
        "balance": str(balance),
        "balance_formatted": f"{balance:.6f}" if decimals >= 6 else f"{balance:.{decimals}f}",
        "balance_usd": f"{balance_usd:.2f}",
        "price_usd": f"{price_usd:.6f}",
        "logo_url": _get_token_logo(symbol, chain_id),
    }


async def _process_erc20_token(
    token_addr: str,
    token_data: Dict[str, Any],
    token_list: List[Dict[str, Any]],
    chain_id: int
) -> Optional[Dict[str, Any]]:
    """Processar um token ERC20 e retornar dados formatados."""
    token_balance = Decimal(token_data.get("balance", "0"))
    if token_balance <= 0:
        return None
    
    symbol = token_data.get("symbol", "UNKNOWN")
    decimals = token_data.get("decimals", 18)
    
    # Buscar info completa do token na lista suportada
    token_info = next(
        (t for t in token_list if t["address"].lower() == token_addr.lower()),
        None
    )
    
    name = token_info["name"] if token_info else symbol
    
    # Buscar preço
    token_price_usd = await _get_token_price(symbol)
    balance_usd = token_balance * token_price_usd
    
    return {
        "address": token_addr,
        "symbol": symbol,
        "name": name,
        "decimals": decimals,
        "balance": str(token_balance),
        "balance_formatted": f"{token_balance:.6f}" if decimals >= 6 else f"{token_balance:.{decimals}f}",
        "balance_usd": f"{balance_usd:.2f}",
        "price_usd": f"{token_price_usd:.6f}",
        "logo_url": _get_token_logo(symbol, chain_id),
    }


async def _get_token_price(symbol: str) -> Decimal:
    """Buscar preço de um token em USD."""
    try:
        from app.services.price_aggregator import price_aggregator
        prices = await price_aggregator.get_prices([symbol.lower()], "usd")
        price_data = prices.get(symbol.lower())
        if price_data:
            return Decimal(str(price_data.price))
    except Exception as e:
        logger.warning(f"⚠️ Não foi possível obter preço de {symbol}: {e}")
    
    # Fallback para stablecoins
    if symbol.upper() in ["USDT", "USDC", "DAI", "BUSD"]:
        return Decimal("1.0")
    
    return Decimal("0")


def _get_token_logo(symbol: str, chain_id: int = 137) -> str:
    """Obter URL do logo do token baseado no chain_id."""
    # Mapeamento de símbolos para IDs do CoinGecko
    SYMBOL_TO_COINGECKO = {
        "ETH": "ethereum",
        "WETH": "weth",
        "MATIC": "matic-network",
        "POL": "matic-network",
        "BNB": "binancecoin",
        "USDT": "tether",
        "USDC": "usd-coin",
        "DAI": "dai",
        "WBTC": "wrapped-bitcoin",
        "LINK": "chainlink",
        "UNI": "uniswap",
        "AAVE": "aave",
        "ARB": "arbitrum",
    }
    
    # chain_id pode ser usado para tokens específicos de rede no futuro
    _ = chain_id  # Silenciar warning
    
    coingecko_id = SYMBOL_TO_COINGECKO.get(symbol.upper())
    if coingecko_id:
        return f"https://assets.coingecko.com/coins/images/{_get_coingecko_image_id(coingecko_id)}/small/{coingecko_id}.png"
    
    # Fallback para CoinGecko search
    return f"https://assets.coingecko.com/coins/images/325/small/{symbol.lower()}.png"


def _get_coingecko_image_id(coingecko_id: str) -> str:
    """Mapeamento de IDs para números de imagem do CoinGecko."""
    IMAGE_IDS = {
        "ethereum": "279",
        "weth": "2518",
        "matic-network": "4713",
        "binancecoin": "825",
        "tether": "325",
        "usd-coin": "6319",
        "dai": "9956",
        "wrapped-bitcoin": "7598",
        "chainlink": "877",
        "uniswap": "12504",
        "aave": "12645",
        "arbitrum": "16547",
    }
    return IMAGE_IDS.get(coingecko_id, "325")


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
