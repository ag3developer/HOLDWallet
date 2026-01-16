"""
Address Book Router - API para gerenciamento da agenda de endereços
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, String
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime
import logging
import re

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.address_book import (
    AddressBook, WalletType, WalletCategory, 
    WALLET_TYPE_TO_CATEGORY, EXCHANGES_INFO, WALLETS_INFO
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# SCHEMAS
# ============================================

class AddressBookCreate(BaseModel):
    """Schema para criar entrada na agenda"""
    name: str = Field(..., min_length=1, max_length=100, description="Nome/apelido do endereço")
    address: str = Field(..., min_length=10, max_length=255, description="Endereço blockchain")
    network: str = Field(..., description="Rede blockchain (ethereum, polygon, bitcoin, etc)")
    wallet_type: str = Field(default="other", description="Tipo de carteira (binance, metamask, etc)")
    memo: Optional[str] = Field(None, max_length=255, description="Memo/Tag para redes que precisam")
    notes: Optional[str] = Field(None, max_length=1000, description="Notas/observações")
    is_favorite: bool = Field(default=False, description="Marcar como favorito")
    
    @validator('address')
    def validate_address(cls, v):
        # Remove espaços
        v = v.strip()
        # Validação básica de formato
        if len(v) < 10:
            raise ValueError('Endereço muito curto')
        return v
    
    @validator('network')
    def validate_network(cls, v):
        valid_networks = [
            'ethereum', 'polygon', 'bsc', 'bitcoin', 'tron', 
            'solana', 'xrp', 'litecoin', 'dogecoin', 'base',
            'avalanche', 'arbitrum', 'optimism', 'cardano', 'polkadot'
        ]
        if v.lower() not in valid_networks:
            raise ValueError(f'Rede inválida. Válidas: {", ".join(valid_networks)}')
        return v.lower()


class AddressBookUpdate(BaseModel):
    """Schema para atualizar entrada na agenda"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    wallet_type: Optional[str] = None
    memo: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=1000)
    is_favorite: Optional[bool] = None
    is_verified: Optional[bool] = None


class AddressBookResponse(BaseModel):
    """Schema de resposta para entrada da agenda"""
    id: int
    name: str
    address: str
    network: str
    wallet_type: str
    wallet_category: str
    wallet_info: Optional[dict] = None
    memo: Optional[str]
    notes: Optional[str]
    is_favorite: bool
    is_verified: bool
    use_count: int
    last_used_at: Optional[str]
    created_at: str
    updated_at: Optional[str]
    
    class Config:
        from_attributes = True


class AddressBookListResponse(BaseModel):
    """Schema de resposta para lista de endereços"""
    addresses: List[AddressBookResponse]
    total: int
    favorites_count: int
    exchanges_count: int
    wallets_count: int


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_wallet_info(wallet_type: str) -> Optional[dict]:
    """Retorna informações da carteira/exchange"""
    wallet_type_lower = wallet_type.lower() if wallet_type else "other"
    
    if wallet_type_lower in EXCHANGES_INFO:
        return {**EXCHANGES_INFO[wallet_type_lower], "category": "exchange"}
    elif wallet_type_lower in WALLETS_INFO:
        return {**WALLETS_INFO[wallet_type_lower], "category": "wallet"}
    elif wallet_type_lower in ["personal", "friend", "business"]:
        return {"name": wallet_type_lower.capitalize(), "category": "personal"}
    else:
        return {"name": "Outro", "category": "other"}


def get_wallet_category(wallet_type: str) -> WalletCategory:
    """Retorna a categoria baseada no tipo"""
    try:
        wt = WalletType(wallet_type.lower())
        return WALLET_TYPE_TO_CATEGORY.get(wt, WalletCategory.OTHER)
    except ValueError:
        return WalletCategory.OTHER


def format_address_response(entry: AddressBook) -> AddressBookResponse:
    """Formata resposta de endereço"""
    wallet_type_str = entry.wallet_type.value if entry.wallet_type else "other"
    wallet_category_str = entry.wallet_category.value if entry.wallet_category else "other"
    
    return AddressBookResponse(
        id=entry.id,
        name=entry.name,
        address=entry.address,
        network=entry.network,
        wallet_type=wallet_type_str,
        wallet_category=wallet_category_str,
        wallet_info=get_wallet_info(wallet_type_str),
        memo=entry.memo,
        notes=entry.notes,
        is_favorite=entry.is_favorite,
        is_verified=entry.is_verified,
        use_count=entry.use_count,
        last_used_at=entry.last_used_at.isoformat() if entry.last_used_at else None,
        created_at=entry.created_at.isoformat() if entry.created_at else None,
        updated_at=entry.updated_at.isoformat() if entry.updated_at else None,
    )


# ============================================
# ENDPOINTS
# ============================================

@router.get("/", response_model=AddressBookListResponse)
async def list_address_book(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    network: Optional[str] = Query(None, description="Filtrar por rede"),
    category: Optional[str] = Query(None, description="Filtrar por categoria (exchange, wallet, personal)"),
    search: Optional[str] = Query(None, description="Buscar por nome ou endereço"),
    favorites_only: bool = Query(False, description="Apenas favoritos"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Lista todos os endereços salvos na agenda do usuário.
    
    Permite filtrar por:
    - Rede blockchain
    - Categoria (exchange, wallet, personal)
    - Busca por nome/endereço
    - Apenas favoritos
    """
    try:
        # Query base
        query = db.query(AddressBook).filter(AddressBook.user_id == current_user.id)
        
        # Filtros
        if network:
            query = query.filter(AddressBook.network == network.lower())
        
        if category:
            # Usar o valor da string diretamente para comparação com o enum do banco
            category_lower = category.lower()
            if category_lower in ['exchange', 'wallet', 'personal', 'other']:
                query = query.filter(
                    func.cast(AddressBook.wallet_category, String) == category_lower
                )
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    AddressBook.name.ilike(search_term),
                    AddressBook.address.ilike(search_term)
                )
            )
        
        if favorites_only:
            query = query.filter(AddressBook.is_favorite == True)
        
        # Contagens
        total = query.count()
        
        favorites_count = db.query(AddressBook).filter(
            AddressBook.user_id == current_user.id,
            AddressBook.is_favorite == True
        ).count()
        
        exchanges_count = db.query(AddressBook).filter(
            AddressBook.user_id == current_user.id,
            func.cast(AddressBook.wallet_category, String) == 'exchange'
        ).count()
        
        wallets_count = db.query(AddressBook).filter(
            AddressBook.user_id == current_user.id,
            func.cast(AddressBook.wallet_category, String) == 'wallet'
        ).count()
        
        # Ordenar: favoritos primeiro, depois por uso, depois por nome
        entries = query.order_by(
            AddressBook.is_favorite.desc(),
            AddressBook.use_count.desc(),
            AddressBook.name.asc()
        ).offset(offset).limit(limit).all()
        
        # Formatar resposta
        addresses = [format_address_response(entry) for entry in entries]
        
        return AddressBookListResponse(
            addresses=addresses,
            total=total,
            favorites_count=favorites_count,
            exchanges_count=exchanges_count,
            wallets_count=wallets_count
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar agenda: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar endereços: {str(e)}"
        )


@router.post("/", response_model=AddressBookResponse, status_code=status.HTTP_201_CREATED)
async def create_address_book_entry(
    data: AddressBookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adiciona um novo endereço à agenda.
    
    Tipos de carteira suportados:
    - Exchanges: binance, bitget, bybit, coinbase, kraken, kucoin, okx, etc.
    - Wallets: metamask, trust_wallet, phantom, ledger, trezor, etc.
    - Pessoal: personal, friend, business
    - Outro: other
    """
    try:
        # Verificar se endereço já existe para esta rede
        existing = db.query(AddressBook).filter(
            AddressBook.user_id == current_user.id,
            AddressBook.address.ilike(data.address),
            AddressBook.network == data.network
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Este endereço já está salvo na agenda como '{existing.name}'"
            )
        
        # Determinar tipo e categoria
        try:
            wallet_type = WalletType(data.wallet_type.lower())
        except ValueError:
            wallet_type = WalletType.OTHER
        
        wallet_category = WALLET_TYPE_TO_CATEGORY.get(wallet_type, WalletCategory.OTHER)
        
        # Criar entrada
        entry = AddressBook(
            user_id=current_user.id,
            name=data.name.strip(),
            address=data.address.strip(),
            network=data.network.lower(),
            wallet_type=wallet_type,
            wallet_category=wallet_category,
            memo=data.memo.strip() if data.memo else None,
            notes=data.notes.strip() if data.notes else None,
            is_favorite=data.is_favorite,
            created_at=datetime.utcnow()
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        logger.info(f"✅ Endereço adicionado à agenda: {entry.name} ({entry.network})")
        
        return format_address_response(entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar entrada na agenda: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar endereço: {str(e)}"
        )


@router.get("/{entry_id}", response_model=AddressBookResponse)
async def get_address_book_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtém detalhes de um endereço específico"""
    entry = db.query(AddressBook).filter(
        AddressBook.id == entry_id,
        AddressBook.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado"
        )
    
    return format_address_response(entry)


@router.put("/{entry_id}", response_model=AddressBookResponse)
async def update_address_book_entry(
    entry_id: int,
    data: AddressBookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza um endereço da agenda"""
    try:
        entry = db.query(AddressBook).filter(
            AddressBook.id == entry_id,
            AddressBook.user_id == current_user.id
        ).first()
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Endereço não encontrado"
            )
        
        # Atualizar campos
        if data.name is not None:
            entry.name = data.name.strip()
        
        if data.wallet_type is not None:
            try:
                entry.wallet_type = WalletType(data.wallet_type.lower())
                entry.wallet_category = WALLET_TYPE_TO_CATEGORY.get(
                    entry.wallet_type, WalletCategory.OTHER
                )
            except ValueError:
                entry.wallet_type = WalletType.OTHER
                entry.wallet_category = WalletCategory.OTHER
        
        if data.memo is not None:
            entry.memo = data.memo.strip() if data.memo else None
        
        if data.notes is not None:
            entry.notes = data.notes.strip() if data.notes else None
        
        if data.is_favorite is not None:
            entry.is_favorite = data.is_favorite
        
        if data.is_verified is not None:
            entry.is_verified = data.is_verified
        
        entry.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(entry)
        
        logger.info(f"✅ Endereço atualizado: {entry.name}")
        
        return format_address_response(entry)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar entrada: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar endereço: {str(e)}"
        )


@router.delete("/{entry_id}")
async def delete_address_book_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove um endereço da agenda"""
    try:
        entry = db.query(AddressBook).filter(
            AddressBook.id == entry_id,
            AddressBook.user_id == current_user.id
        ).first()
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Endereço não encontrado"
            )
        
        name = entry.name
        db.delete(entry)
        db.commit()
        
        logger.info(f"✅ Endereço removido da agenda: {name}")
        
        return {"success": True, "message": f"Endereço '{name}' removido da agenda"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar entrada: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover endereço: {str(e)}"
        )


@router.post("/{entry_id}/favorite")
async def toggle_favorite(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alterna o status de favorito de um endereço"""
    entry = db.query(AddressBook).filter(
        AddressBook.id == entry_id,
        AddressBook.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado"
        )
    
    entry.is_favorite = not entry.is_favorite
    entry.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "is_favorite": entry.is_favorite,
        "message": f"{'Adicionado aos' if entry.is_favorite else 'Removido dos'} favoritos"
    }


@router.post("/{entry_id}/use")
async def record_address_use(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registra o uso de um endereço (chamado ao enviar transação)"""
    entry = db.query(AddressBook).filter(
        AddressBook.id == entry_id,
        AddressBook.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado"
        )
    
    entry.use_count += 1
    entry.last_used_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "use_count": entry.use_count}


@router.get("/search/{network}")
async def search_by_network(
    network: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Buscar por nome ou endereço"),
):
    """
    Busca endereços por rede específica.
    Útil para o campo de envio quando o usuário digita o endereço.
    """
    query = db.query(AddressBook).filter(
        AddressBook.user_id == current_user.id,
        AddressBook.network == network.lower()
    )
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                AddressBook.name.ilike(search_term),
                AddressBook.address.ilike(search_term)
            )
        )
    
    # Ordenar por favoritos e uso
    entries = query.order_by(
        AddressBook.is_favorite.desc(),
        AddressBook.use_count.desc(),
        AddressBook.name.asc()
    ).limit(10).all()
    
    return {
        "network": network,
        "results": [format_address_response(entry) for entry in entries]
    }


@router.get("/types/list")
async def list_wallet_types(
    current_user: User = Depends(get_current_user),
):
    """
    Lista todos os tipos de carteiras/exchanges disponíveis.
    Útil para popular o dropdown no frontend.
    """
    exchanges = [
        {"value": key, **value, "category": "exchange"}
        for key, value in EXCHANGES_INFO.items()
    ]
    
    wallets = [
        {"value": key, **value, "category": "wallet"}
        for key, value in WALLETS_INFO.items()
    ]
    
    personal = [
        {"value": "personal", "name": "Pessoal", "category": "personal"},
        {"value": "friend", "name": "Amigo/Conhecido", "category": "personal"},
        {"value": "business", "name": "Comercial", "category": "personal"},
    ]
    
    other = [
        {"value": "other", "name": "Outro", "category": "other"}
    ]
    
    return {
        "exchanges": exchanges,
        "wallets": wallets,
        "personal": personal,
        "other": other
    }


@router.get("/networks/list")
async def list_supported_networks(
    current_user: User = Depends(get_current_user),
):
    """
    Lista todas as redes blockchain suportadas e stablecoins.
    """
    networks = [
        # Blockchains
        {"value": "ethereum", "name": "Ethereum", "symbol": "ETH", "type": "blockchain"},
        {"value": "polygon", "name": "Polygon", "symbol": "MATIC", "type": "blockchain"},
        {"value": "bsc", "name": "BNB Chain", "symbol": "BNB", "type": "blockchain"},
        {"value": "bitcoin", "name": "Bitcoin", "symbol": "BTC", "type": "blockchain"},
        {"value": "tron", "name": "Tron", "symbol": "TRX", "type": "blockchain"},
        {"value": "solana", "name": "Solana", "symbol": "SOL", "type": "blockchain"},
        {"value": "xrp", "name": "XRP Ledger", "symbol": "XRP", "type": "blockchain"},
        {"value": "litecoin", "name": "Litecoin", "symbol": "LTC", "type": "blockchain"},
        {"value": "dogecoin", "name": "Dogecoin", "symbol": "DOGE", "type": "blockchain"},
        {"value": "base", "name": "Base", "symbol": "ETH", "type": "blockchain"},
        {"value": "avalanche", "name": "Avalanche", "symbol": "AVAX", "type": "blockchain"},
        {"value": "arbitrum", "name": "Arbitrum", "symbol": "ETH", "type": "blockchain"},
        {"value": "optimism", "name": "Optimism", "symbol": "ETH", "type": "blockchain"},
        {"value": "cardano", "name": "Cardano", "symbol": "ADA", "type": "blockchain"},
        {"value": "polkadot", "name": "Polkadot", "symbol": "DOT", "type": "blockchain"},
        # Stablecoins
        {"value": "usdt", "name": "Tether", "symbol": "USDT", "type": "stablecoin"},
        {"value": "usdc", "name": "USD Coin", "symbol": "USDC", "type": "stablecoin"},
        {"value": "dai", "name": "DAI", "symbol": "DAI", "type": "stablecoin"},
    ]
    
    return {"networks": networks}
