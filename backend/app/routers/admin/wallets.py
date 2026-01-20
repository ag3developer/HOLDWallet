"""
🛡️ HOLD Wallet - Admin Wallets Router
======================================

Gestão de carteiras e saldos dos usuários.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.wallet import Wallet
from app.models.balance import WalletBalance, BalanceHistory

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/wallets",
    tags=["Admin - Wallets"],
    dependencies=[Depends(get_current_admin)]
)


# ===== SCHEMAS =====

class BalanceAdjustRequest(BaseModel):
    user_id: str
    cryptocurrency: str
    amount: float
    reason: str
    operation: str  # 'add', 'subtract' ou 'set'


class BlockWalletRequest(BaseModel):
    reason: str
    freeze_balance: bool = True  # Congela o saldo também


class BlacklistAddressRequest(BaseModel):
    address: str
    network: str
    reason: str
    block_user: bool = False  # Também bloqueia o usuário dono


# ===== ENDPOINTS - WALLETS =====

@router.get("/stats", response_model=dict)
async def get_wallet_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas gerais de wallets
    """
    try:
        from datetime import timedelta
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        total_wallets = db.query(func.count(Wallet.id)).scalar() or 0
        
        # Carteiras criadas hoje
        wallets_today = db.query(func.count(Wallet.id)).filter(
            Wallet.created_at >= today
        ).scalar() or 0
        
        # Carteiras com saldo
        wallets_with_balance = db.query(func.count(func.distinct(WalletBalance.user_id))).filter(
            WalletBalance.available_balance > 0
        ).scalar() or 0
        
        # Saldos totais por crypto
        total_btc = db.query(func.sum(WalletBalance.available_balance)).filter(
            WalletBalance.cryptocurrency == 'BTC'
        ).scalar() or 0
        
        total_eth = db.query(func.sum(WalletBalance.available_balance)).filter(
            WalletBalance.cryptocurrency == 'ETH'
        ).scalar() or 0
        
        total_usdt = db.query(func.sum(WalletBalance.available_balance)).filter(
            WalletBalance.cryptocurrency.in_(['USDT', 'USDC'])
        ).scalar() or 0
        
        total_brl = db.query(func.sum(WalletBalance.available_balance)).filter(
            WalletBalance.cryptocurrency == 'BRL'
        ).scalar() or 0
        
        # Saldos por cryptocurrency para detalhes
        balances_by_crypto = db.query(
            WalletBalance.cryptocurrency,
            func.sum(WalletBalance.available_balance).label('total_available'),
            func.sum(WalletBalance.locked_balance).label('total_locked'),
            func.count(WalletBalance.id).label('count')
        ).group_by(WalletBalance.cryptocurrency).all()
        
        crypto_stats = []
        for b in balances_by_crypto:
            crypto_stats.append({
                "cryptocurrency": b.cryptocurrency,
                "total_available": float(b.total_available or 0),
                "total_locked": float(b.total_locked or 0),
                "wallets_count": b.count or 0
            })
        
        return {
            "success": True,
            "data": {
                "total_wallets": total_wallets,
                "wallets_with_balance": wallets_with_balance,
                "wallets_today": wallets_today,
                "total_btc": float(total_btc),
                "total_eth": float(total_eth),
                "total_usdt": float(total_usdt),
                "total_brl": float(total_brl),
                "balances_by_crypto": crypto_stats
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro obtendo stats de wallets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("", response_model=dict)
async def list_wallets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    network: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todas as wallets criadas com seus endereços blockchain
    """
    from app.models.address import Address
    
    try:
        query = db.query(Wallet)
        
        if search:
            # Buscar por username ou email
            user_ids_match = db.query(User.id).filter(
                (User.username.ilike(f"%{search}%")) |
                (User.email.ilike(f"%{search}%"))
            ).all()
            user_ids_list = [str(u[0]) for u in user_ids_match]
            if user_ids_list:
                query = query.filter(Wallet.user_id.in_(user_ids_list))
            else:
                # Se não encontrou usuários, retorna vazio
                return {
                    "success": True,
                    "data": {
                        "items": [],
                        "total": 0,
                        "skip": skip,
                        "limit": limit
                    }
                }
        
        if network:
            query = query.filter(Wallet.network == network)
        
        total = query.count()
        wallets = query.order_by(desc(Wallet.created_at)).offset(skip).limit(limit).all()
        
        # Buscar usernames e emails
        user_ids = [str(w.user_id) for w in wallets]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {str(u.id): {"username": u.username, "email": u.email} for u in users}
        
        items = []
        for wallet in wallets:
            # Buscar TODOS os endereços desta wallet
            addresses = db.query(Address).filter(
                Address.wallet_id == wallet.id
            ).all()
            
            # Agrupar endereços por rede
            addresses_by_network = {}
            supported_networks = set()
            
            for addr in addresses:
                network_name = addr.network if addr.network else "unknown"
                supported_networks.add(network_name)
                
                if network_name not in addresses_by_network:
                    addresses_by_network[network_name] = []
                
                addresses_by_network[network_name].append({
                    "id": str(addr.id),
                    "address": addr.address,
                    "network": network_name,
                    "address_type": addr.address_type if hasattr(addr, 'address_type') else "receiving",
                    "is_active": addr.is_active if hasattr(addr, 'is_active') else True,
                    "created_at": addr.created_at.isoformat() if addr.created_at else None
                })
            
            # Buscar saldos do usuário (não da wallet)
            balances = db.query(WalletBalance).filter(
                WalletBalance.user_id == str(wallet.user_id)
            ).all()
            
            balance_summary = {}
            total_usd = 0
            for bal in balances:
                crypto = bal.cryptocurrency
                available = float(bal.available_balance) if bal.available_balance else 0
                locked = float(bal.locked_balance) if bal.locked_balance else 0
                balance_summary[crypto] = {
                    "available": available,
                    "locked": locked,
                    "total": available + locked
                }
            
            user_info = user_map.get(str(wallet.user_id), {"username": "Unknown", "email": ""})
            
            items.append({
                "id": str(wallet.id),
                "user_id": str(wallet.user_id),
                "username": user_info["username"],
                "email": user_info["email"],
                "name": wallet.name if hasattr(wallet, 'name') else "Wallet",
                "network": wallet.network if hasattr(wallet, 'network') else "multi",
                "is_active": wallet.is_active if hasattr(wallet, 'is_active') else True,
                "supported_networks": sorted(list(supported_networks)),
                "total_addresses": len(addresses),
                "addresses_by_network": addresses_by_network,
                "balances": balance_summary,
                "created_at": wallet.created_at.isoformat() if wallet.created_at else None,
                "updated_at": wallet.updated_at.isoformat() if hasattr(wallet, 'updated_at') and wallet.updated_at else None
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
        logger.error(f"❌ Erro listando wallets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/user/{user_id}", response_model=dict)
async def get_user_wallets(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna todas as wallets e saldos de um usuário
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        wallets = db.query(Wallet).filter(Wallet.user_id == user_id).all()
        
        wallet_list = []
        for wallet in wallets:
            balances = db.query(WalletBalance).filter(
                WalletBalance.wallet_id == wallet.id
            ).all()
            
            balance_list = []
            for bal in balances:
                balance_list.append({
                    "id": str(bal.id),
                    "cryptocurrency": bal.cryptocurrency,
                    "available": float(bal.available_balance or 0),
                    "locked": float(bal.locked_balance or 0),
                    "total": float((bal.available_balance or 0) + (bal.locked_balance or 0))
                })
            
            wallet_list.append({
                "id": str(wallet.id),
                "network": wallet.network if hasattr(wallet, 'network') else "multi",
                "balances": balance_list,
                "created_at": wallet.created_at.isoformat() if wallet.created_at else None
            })
        
        return {
            "success": True,
            "data": {
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email
                },
                "wallets": wallet_list
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro obtendo wallets do usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/balances", response_model=dict)
async def list_all_balances(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    cryptocurrency: Optional[str] = None,
    min_balance: Optional[float] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os saldos com filtros
    """
    try:
        query = db.query(WalletBalance)
        
        if cryptocurrency:
            query = query.filter(WalletBalance.cryptocurrency == cryptocurrency)
        
        if min_balance is not None:
            query = query.filter(WalletBalance.available_balance >= min_balance)
        
        total = query.count()
        balances = query.order_by(desc(WalletBalance.available_balance)).offset(skip).limit(limit).all()
        
        # Buscar usernames pelo user_id do balance
        user_ids = [str(b.user_id) for b in balances]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {str(u.id): u for u in users}
        
        items = []
        for bal in balances:
            user = user_map.get(str(bal.user_id))
            
            items.append({
                "id": str(bal.id),
                "user_id": str(bal.user_id),
                "username": user.username if user else "Unknown",
                "cryptocurrency": bal.cryptocurrency,
                "total_balance": float(bal.total_balance if bal.total_balance else 0),
                "available_balance": float(bal.available_balance if bal.available_balance else 0),
                "locked_balance": float(bal.locked_balance if bal.locked_balance else 0),
                "updated_at": bal.updated_at.isoformat() if bal.updated_at else None
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
        logger.error(f"❌ Erro listando saldos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/balances/adjust", response_model=dict)
async def adjust_balance(
    request: BalanceAdjustRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Ajusta manualmente o saldo de um usuário (com registro de auditoria)
    """
    try:
        # Verificar usuário
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Buscar wallet do usuário
        wallet = db.query(Wallet).filter(Wallet.user_id == request.user_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet não encontrada")
        
        # Buscar ou criar saldo
        balance = db.query(WalletBalance).filter(
            WalletBalance.wallet_id == wallet.id,
            WalletBalance.cryptocurrency == request.cryptocurrency
        ).first()
        
        if not balance:
            raise HTTPException(
                status_code=404, 
                detail=f"Saldo de {request.cryptocurrency} não encontrado"
            )
        
        old_balance = float(balance.available_balance or 0)
        
        # Aplicar ajuste
        if request.operation == 'add':
            balance.available_balance = (balance.available_balance or 0) + request.amount
        elif request.operation == 'subtract':
            if (balance.available_balance or 0) < request.amount:
                raise HTTPException(status_code=400, detail="Saldo insuficiente")
            balance.available_balance = (balance.available_balance or 0) - request.amount
        else:
            raise HTTPException(status_code=400, detail="Operação inválida")
        
        new_balance = float(balance.available_balance)
        
        # Registrar no histórico
        history = BalanceHistory(
            wallet_balance_id=balance.id,
            old_balance=old_balance,
            new_balance=new_balance,
            change_amount=request.amount if request.operation == 'add' else -request.amount,
            change_type='admin_adjustment',
            description=f"Ajuste admin: {request.reason}",
            performed_by=str(current_admin.id)
        )
        db.add(history)
        
        db.commit()
        
        logger.info(f"✅ Saldo ajustado por {current_admin.email}: {request.user_id} {request.cryptocurrency} {request.operation} {request.amount}")
        
        return {
            "success": True,
            "message": "Saldo ajustado com sucesso",
            "data": {
                "user_id": request.user_id,
                "cryptocurrency": request.cryptocurrency,
                "old_balance": old_balance,
                "new_balance": new_balance,
                "adjustment": request.amount,
                "operation": request.operation,
                "reason": request.reason
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ajustando saldo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/balances/history/{user_id}", response_model=dict)
async def get_balance_history(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    cryptocurrency: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna histórico de alterações de saldo de um usuário
    """
    try:
        # Buscar wallet do usuário
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet não encontrada")
        
        # Buscar balance IDs
        balance_query = db.query(WalletBalance).filter(WalletBalance.wallet_id == wallet.id)
        if cryptocurrency:
            balance_query = balance_query.filter(WalletBalance.cryptocurrency == cryptocurrency)
        
        balance_ids = [str(b.id) for b in balance_query.all()]
        
        if not balance_ids:
            return {
                "success": True,
                "data": {
                    "items": [],
                    "total": 0,
                    "skip": skip,
                    "limit": limit
                }
            }
        
        # Buscar histórico
        query = db.query(BalanceHistory).filter(
            BalanceHistory.wallet_balance_id.in_(balance_ids)
        )
        
        total = query.count()
        history = query.order_by(desc(BalanceHistory.created_at)).offset(skip).limit(limit).all()
        
        items = []
        for h in history:
            items.append({
                "id": str(h.id),
                "old_balance": float(h.old_balance or 0),
                "new_balance": float(h.new_balance or 0),
                "change_amount": float(h.change_amount or 0),
                "change_type": h.change_type,
                "description": h.description,
                "performed_by": h.performed_by,
                "created_at": h.created_at.isoformat() if h.created_at else None
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro obtendo histórico: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{wallet_id}/blockchain-balances", response_model=dict)
async def get_wallet_blockchain_balances(
    wallet_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🔗 Consulta saldos REAIS na blockchain para uma carteira específica.
    
    Inclui saldos nativos + tokens (USDT, USDC) em redes EVM.
    """
    from app.models.address import Address
    from app.services.blockchain_balance_service import blockchain_balance_service
    
    try:
        # Buscar a wallet
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Carteira não encontrada")
        
        # Buscar todos os endereços desta wallet
        addresses = db.query(Address).filter(Address.wallet_id == wallet_id).all()
        
        if not addresses:
            return {
                "success": True,
                "data": {
                    "wallet_id": wallet_id,
                    "message": "Nenhum endereço encontrado para esta carteira",
                    "balances": []
                }
            }
        
        # Redes não suportadas para pular
        skip_networks = ['multi', 'polkadot', 'cardano', 'chainlink', 'shiba', 'xrp']
        
        # Consultar saldos blockchain para cada endereço
        blockchain_balances = []
        total_balances = {}
        
        for addr in addresses:
            network = str(addr.network).lower() if addr.network else "unknown"
            address = str(addr.address)
            
            if network in skip_networks:
                continue
            
            logger.info(f"🔍 Consultando saldo completo: {network} - {address[:15]}...")
            
            try:
                # Usar consulta completa (nativo + tokens)
                result = await blockchain_balance_service.get_complete_balance(network, address)
                
                if result.get("has_balance"):
                    for bal in result.get("balances", []):
                        symbol = bal.get("symbol", network.upper())
                        balance = bal.get("balance", 0)
                        
                        blockchain_balances.append({
                            "address_id": str(addr.id),
                            "address": address,
                            "network": network,
                            "balance": balance,
                            "symbol": symbol,
                            "type": bal.get("type", "native"),
                            "contract": bal.get("contract"),
                            "source": "blockchain",
                            "queried_at": datetime.now(timezone.utc).isoformat()
                        })
                        
                        # Acumular totais
                        if symbol not in total_balances:
                            total_balances[symbol] = 0
                        total_balances[symbol] += balance
                else:
                    # Endereço sem saldo
                    blockchain_balances.append({
                        "address_id": str(addr.id),
                        "address": address,
                        "network": network,
                        "balance": 0,
                        "symbol": blockchain_balance_service._get_native_currency(network),
                        "type": "native",
                        "source": "blockchain",
                        "queried_at": datetime.now(timezone.utc).isoformat()
                    })
                    
            except Exception as e:
                logger.error(f"❌ Erro consultando saldo {network}: {e}")
                blockchain_balances.append({
                    "address_id": str(addr.id),
                    "address": address,
                    "network": network,
                    "balance": None,
                    "symbol": network.upper(),
                    "error": str(e),
                    "source": "error",
                    "queried_at": datetime.now(timezone.utc).isoformat()
                })
        
        return {
            "success": True,
            "data": {
                "wallet_id": wallet_id,
                "total_addresses": len(addresses),
                "queried_addresses": len(blockchain_balances),
                "total_balances": total_balances,
                "balances": blockchain_balances
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro consultando blockchain balances: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{wallet_id}/refresh-blockchain-balances", response_model=dict)
async def refresh_wallet_blockchain_balances(
    wallet_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🔄 Atualiza saldos do banco de dados com valores reais da blockchain.
    
    Consulta a blockchain e atualiza os saldos internos.
    """
    from app.models.address import Address
    from app.services.blockchain_balance_service import blockchain_balance_service
    
    try:
        # Buscar a wallet
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Carteira não encontrada")
        
        # Buscar todos os endereços desta wallet
        addresses = db.query(Address).filter(Address.wallet_id == wallet_id).all()
        
        if not addresses:
            return {
                "success": False,
                "message": "Nenhum endereço encontrado para esta carteira"
            }
        
        updated_balances = []
        errors = []
        
        for addr in addresses:
            network = addr.network.lower() if addr.network else "unknown"
            address = addr.address
            
            try:
                balance_info = await blockchain_balance_service.get_native_balance(network, address)
                
                if balance_info and balance_info.get("success"):
                    new_balance = float(balance_info.get("balance", 0))
                    
                    # Mapear network para cryptocurrency
                    crypto_map = {
                        "bitcoin": "BTC",
                        "ethereum": "ETH",
                        "polygon": "MATIC",
                        "bsc": "BNB",
                        "solana": "SOL",
                        "tron": "TRX",
                        "litecoin": "LTC",
                        "dogecoin": "DOGE",
                        "avalanche": "AVAX",
                        "cardano": "ADA",
                        "polkadot": "DOT",
                        "xrp": "XRP",
                        "base": "ETH",
                        "chainlink": "LINK",
                        "shiba": "SHIB",
                    }
                    
                    crypto_symbol = crypto_map.get(network, network.upper())
                    
                    # Atualizar ou criar WalletBalance
                    wallet_balance = db.query(WalletBalance).filter(
                        WalletBalance.user_id == wallet.user_id,
                        WalletBalance.cryptocurrency == crypto_symbol
                    ).first()
                    
                    if wallet_balance:
                        old_balance = float(wallet_balance.available_balance or 0)
                        wallet_balance.available_balance = new_balance
                        wallet_balance.total_balance = new_balance + (wallet_balance.locked_balance or 0)
                        wallet_balance.updated_at = datetime.now(timezone.utc)
                        
                        updated_balances.append({
                            "network": network,
                            "cryptocurrency": crypto_symbol,
                            "old_balance": old_balance,
                            "new_balance": new_balance,
                            "change": new_balance - old_balance
                        })
                    else:
                        # Criar novo registro de saldo
                        new_wallet_balance = WalletBalance(
                            user_id=wallet.user_id,
                            cryptocurrency=crypto_symbol,
                            available_balance=new_balance,
                            locked_balance=0,
                            total_balance=new_balance,
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        db.add(new_wallet_balance)
                        
                        updated_balances.append({
                            "network": network,
                            "cryptocurrency": crypto_symbol,
                            "old_balance": 0,
                            "new_balance": new_balance,
                            "change": new_balance,
                            "created": True
                        })
                else:
                    errors.append({
                        "network": network,
                        "address": address[:15] + "...",
                        "error": balance_info.get("error") if balance_info else "Falha na consulta"
                    })
            except Exception as e:
                errors.append({
                    "network": network,
                    "address": address[:15] + "...",
                    "error": str(e)
                })
        
        db.commit()
        
        return {
            "success": True,
            "data": {
                "wallet_id": wallet_id,
                "updated_count": len(updated_balances),
                "error_count": len(errors),
                "updated_balances": updated_balances,
                "errors": errors if errors else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro atualizando blockchain balances: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/sync-all-blockchain-balances", response_model=dict)
async def sync_all_blockchain_balances(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🔄 Sincroniza saldos de TODAS as carteiras com a blockchain.
    """
    from app.models.address import Address
    from app.services.blockchain_balance_service import blockchain_balance_service
    
    try:
        logger.info("🔄 Iniciando sincronização de saldos blockchain...")
        
        # Buscar todas as carteiras
        wallets = db.query(Wallet).all()
        logger.info(f"📊 Total de wallets: {len(wallets)}")
        
        if not wallets:
            return {
                "success": True,
                "message": "Nenhuma carteira encontrada",
                "data": {"total_wallets": 0, "total_balances": {}}
            }
        
        skip_networks = ['multi', 'polkadot', 'cardano', 'chainlink', 'shiba', 'xrp']
        
        total_updated = 0
        total_errors = 0
        all_balances = {}  # {symbol: total_global}
        wallets_with_balance = set()
        
        # Dicionário para acumular saldos por (user_id, symbol)
        user_balances = {}  # {(user_id, symbol): total_balance}
        
        for wallet in wallets:
            try:
                addresses = db.query(Address).filter(Address.wallet_id == wallet.id).all()
                
                for addr in addresses:
                    network = str(addr.network).lower() if addr.network else "unknown"
                    address = str(addr.address)
                    
                    if network in skip_networks:
                        continue
                    
                    try:
                        result = await blockchain_balance_service.get_complete_balance(network, address)
                        
                        if result.get("has_balance"):
                            for bal in result.get("balances", []):
                                symbol = bal.get("symbol", network.upper())
                                balance = float(bal.get("balance", 0))
                                
                                if balance > 0:
                                    wallets_with_balance.add(str(wallet.id))
                                    
                                    # Acumular no total global
                                    if symbol not in all_balances:
                                        all_balances[symbol] = 0
                                    all_balances[symbol] += balance
                                    
                                    # Acumular por (user_id, symbol)
                                    key = (wallet.user_id, symbol)
                                    if key not in user_balances:
                                        user_balances[key] = 0
                                    user_balances[key] += balance
                                    
                    except Exception as e:
                        logger.debug(f"Erro ao consultar {network}: {e}")
                        total_errors += 1
            except Exception as e:
                logger.error(f"Erro na wallet {wallet.id}: {e}")
        
        # Agora salvar os saldos acumulados no banco
        logger.info(f"📊 Salvando {len(user_balances)} saldos no banco...")
        
        for (user_id, symbol), total_balance in user_balances.items():
            try:
                existing = db.query(WalletBalance).filter(
                    WalletBalance.user_id == user_id,
                    WalletBalance.cryptocurrency == symbol
                ).first()
                
                if existing:
                    existing.available_balance = total_balance
                    existing.total_balance = total_balance + float(existing.locked_balance or 0)
                    existing.updated_at = datetime.now(timezone.utc)
                    existing.last_updated_reason = "Blockchain sync"
                    logger.info(f"✅ Atualizado {symbol} para user {str(user_id)[:8]}: {total_balance}")
                else:
                    new_bal = WalletBalance(
                        user_id=user_id,
                        cryptocurrency=symbol,
                        available_balance=total_balance,
                        locked_balance=0.0,
                        total_balance=total_balance
                    )
                    db.add(new_bal)
                    logger.info(f"✅ Criado {symbol} para user {str(user_id)[:8]}: {total_balance}")
                
                total_updated += 1
            except Exception as db_err:
                logger.error(f"❌ Erro DB ao salvar {symbol}: {db_err}")
                total_errors += 1
        
        db.commit()
        logger.info(f"✅ Sincronização: {total_updated} atualizados, {total_errors} erros")
        logger.info(f"📊 Totais: {all_balances}")
        
        return {
            "success": True,
            "data": {
                "total_wallets": len(wallets),
                "wallets_with_balance": len(wallets_with_balance),
                "total_updated": total_updated,
                "total_errors": total_errors,
                "total_balances": all_balances,
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro na sincronização: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== ENDPOINTS - SEGURANÇA E BLOQUEIO =====

@router.post("/{wallet_id}/block", response_model=dict)
async def block_wallet(
    wallet_id: str,
    request: BlockWalletRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🚫 Bloqueia uma carteira suspeita.
    
    Ações:
    - Marca carteira como bloqueada
    - Opcionalmente congela os saldos
    - Registra no histórico de auditoria
    - Bloqueia o usuário dono (opcional)
    """
    try:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        # Buscar usuário dono
        user = db.query(User).filter(User.id == wallet.user_id).first()
        
        # Marcar carteira como bloqueada (adiciona campo se não existir)
        if hasattr(wallet, 'is_blocked'):
            wallet.is_blocked = True
        if hasattr(wallet, 'blocked_at'):
            wallet.blocked_at = datetime.now(timezone.utc)
        if hasattr(wallet, 'blocked_reason'):
            wallet.blocked_reason = request.reason
        if hasattr(wallet, 'blocked_by'):
            wallet.blocked_by = str(current_admin.id)
        
        # Congelar saldos se solicitado
        frozen_balances = []
        if request.freeze_balance:
            balances = db.query(WalletBalance).filter(
                WalletBalance.user_id == wallet.user_id
            ).all()
            
            for balance in balances:
                if balance.available_balance > 0:
                    # Mover saldo disponível para bloqueado
                    old_available = float(balance.available_balance)
                    balance.locked_balance = float(balance.locked_balance or 0) + old_available
                    balance.available_balance = 0
                    
                    frozen_balances.append({
                        "cryptocurrency": balance.cryptocurrency,
                        "frozen_amount": old_available
                    })
                    
                    # Registrar histórico
                    history = BalanceHistory(
                        user_id=wallet.user_id,
                        cryptocurrency=balance.cryptocurrency,
                        amount=-old_available,
                        balance_after=0,
                        operation_type="ADMIN_FREEZE",
                        reason=f"Carteira bloqueada por admin: {request.reason}",
                        performed_by=str(current_admin.id)
                    )
                    db.add(history)
        
        db.commit()
        
        logger.warning(f"🚫 Wallet {wallet_id} bloqueada por admin {current_admin.email}: {request.reason}")
        
        return {
            "success": True,
            "message": f"Wallet blocked successfully",
            "wallet_id": wallet_id,
            "user_email": user.email if user else None,
            "reason": request.reason,
            "frozen_balances": frozen_balances,
            "blocked_at": datetime.now(timezone.utc).isoformat(),
            "blocked_by": current_admin.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro bloqueando wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{wallet_id}/unblock", response_model=dict)
async def unblock_wallet(
    wallet_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    ✅ Desbloqueia uma carteira.
    """
    try:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        if hasattr(wallet, 'is_blocked'):
            wallet.is_blocked = False
        if hasattr(wallet, 'blocked_at'):
            wallet.blocked_at = None
        if hasattr(wallet, 'blocked_reason'):
            wallet.blocked_reason = None
        
        db.commit()
        
        logger.info(f"✅ Wallet {wallet_id} desbloqueada por admin {current_admin.email}")
        
        return {
            "success": True,
            "message": "Wallet unblocked successfully",
            "wallet_id": wallet_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{wallet_id}", response_model=dict)
async def delete_wallet(
    wallet_id: str,
    force: bool = Query(False, description="Força exclusão mesmo com saldo"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🗑️ Remove uma carteira do sistema.
    
    ⚠️ CUIDADO: Esta ação é irreversível!
    
    - Por padrão, não permite excluir carteiras com saldo
    - Use force=true para excluir mesmo com saldo (auditar!)
    """
    from app.models.address import Address
    
    try:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        # Verificar saldos
        balances = db.query(WalletBalance).filter(
            WalletBalance.user_id == wallet.user_id
        ).all()
        
        total_balance = sum(float(b.available_balance or 0) + float(b.locked_balance or 0) for b in balances)
        
        if total_balance > 0 and not force:
            raise HTTPException(
                status_code=400,
                detail=f"Wallet has balance ({total_balance}). Use force=true to delete anyway."
            )
        
        user = db.query(User).filter(User.id == wallet.user_id).first()
        user_email = user.email if user else "unknown"
        
        # Registrar antes de deletar
        logger.warning(f"🗑️ DELETANDO wallet {wallet_id} (user: {user_email}) por admin {current_admin.email}")
        
        # Converter user_id para string para compatibilidade com banco
        user_id_str = str(wallet.user_id)
        
        # 1. Deletar endereços associados à wallet (FK constraint)
        deleted_addresses = db.query(Address).filter(Address.wallet_id == wallet.id).delete()
        logger.info(f"🗑️ Deletados {deleted_addresses} endereços da wallet")
        
        # 2. Deletar saldos associados ao usuário
        deleted_balances = db.query(WalletBalance).filter(WalletBalance.user_id == wallet.user_id).delete()
        logger.info(f"🗑️ Deletados {deleted_balances} registros de saldo")
        
        # 3. Deletar histórico de saldos (user_id pode ser TEXT no banco)
        # Usar SQL raw para evitar conflito de tipos UUID vs TEXT
        from sqlalchemy import text
        result = db.execute(text("DELETE FROM balance_history WHERE user_id = :user_id"), {"user_id": user_id_str})
        deleted_history = result.rowcount
        logger.info(f"🗑️ Deletados {deleted_history} registros de histórico")
        
        # 4. Deletar a wallet
        db.delete(wallet)
        db.commit()
        
        logger.warning(f"✅ Wallet {wallet_id} deletada com sucesso!")
        
        return {
            "success": True,
            "message": "Wallet deleted successfully",
            "wallet_id": wallet_id,
            "user_email": user_email,
            "deleted_by": current_admin.email,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "details": {
                "addresses_deleted": deleted_addresses,
                "balances_deleted": deleted_balances,
                "history_deleted": deleted_history
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro deletando wallet: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blacklist/address", response_model=dict)
async def blacklist_address(
    request: BlacklistAddressRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    🚫 Adiciona um endereço à lista negra.
    
    Endereços na blacklist:
    - Não podem receber depósitos
    - Não podem ser usados para saques
    - Transações são bloqueadas automaticamente
    """
    from app.models.blacklist import AddressBlacklist
    
    try:
        # Verificar se já existe
        existing = db.query(AddressBlacklist).filter(
            AddressBlacklist.address == request.address.lower(),
            AddressBlacklist.network == request.network.lower()
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Address already blacklisted"
            )
        
        # Buscar quem é o dono deste endereço
        wallet = db.query(Wallet).filter(
            func.lower(Wallet.address) == request.address.lower()
        ).first()
        
        owner_user = None
        if wallet:
            owner_user = db.query(User).filter(User.id == wallet.user_id).first()
        
        # Criar entrada na blacklist
        blacklist_entry = AddressBlacklist(
            address=request.address.lower(),
            network=request.network.lower(),
            reason=request.reason,
            added_by=str(current_admin.id),
            added_at=datetime.now(timezone.utc),
            user_id=str(wallet.user_id) if wallet else None
        )
        db.add(blacklist_entry)
        
        # Bloquear usuário se solicitado
        if request.block_user and owner_user:
            owner_user.is_active = False
            logger.warning(f"🚫 Usuário {owner_user.email} bloqueado junto com endereço")
        
        db.commit()
        
        logger.warning(f"🚫 Endereço {request.address} ({request.network}) adicionado à blacklist por {current_admin.email}: {request.reason}")
        
        return {
            "success": True,
            "message": "Address blacklisted successfully",
            "address": request.address,
            "network": request.network,
            "reason": request.reason,
            "owner_email": owner_user.email if owner_user else None,
            "owner_blocked": request.block_user and owner_user is not None,
            "added_by": current_admin.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro adicionando à blacklist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/blacklist", response_model=dict)
async def list_blacklisted_addresses(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    📋 Lista todos os endereços na blacklist.
    """
    from app.models.blacklist import AddressBlacklist
    
    try:
        entries = db.query(AddressBlacklist).order_by(
            desc(AddressBlacklist.added_at)
        ).all()
        
        result = []
        for entry in entries:
            user = None
            if entry.user_id:
                user = db.query(User).filter(User.id == entry.user_id).first()
            
            result.append({
                "id": str(entry.id),
                "address": entry.address,
                "network": entry.network,
                "reason": entry.reason,
                "user_email": user.email if user else None,
                "added_at": entry.added_at.isoformat() if entry.added_at else None,
                "added_by": entry.added_by
            })
        
        return {
            "success": True,
            "total": len(result),
            "blacklist": result
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando blacklist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/blacklist/{address}", response_model=dict)
async def remove_from_blacklist(
    address: str,
    network: str = Query(..., description="Network do endereço"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    ✅ Remove um endereço da blacklist.
    """
    from app.models.blacklist import AddressBlacklist
    
    try:
        entry = db.query(AddressBlacklist).filter(
            AddressBlacklist.address == address.lower(),
            AddressBlacklist.network == network.lower()
        ).first()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Address not found in blacklist")
        
        db.delete(entry)
        db.commit()
        
        logger.info(f"✅ Endereço {address} removido da blacklist por {current_admin.email}")
        
        return {
            "success": True,
            "message": "Address removed from blacklist",
            "address": address,
            "network": network
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
