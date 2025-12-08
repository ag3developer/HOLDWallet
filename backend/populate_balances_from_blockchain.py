#!/usr/bin/env python3
"""
Script para popular saldos do usuário a partir da blockchain
e salvar no banco de dados
"""
import sys
import os
import asyncio
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.models.balance import WalletBalance
from app.services.blockchain_service import BlockchainService
from datetime import datetime

DATABASE_URL = "sqlite:///./backend/holdwallet.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Network to symbol mapping
NETWORK_SYMBOLS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "polygon": "MATIC",
    "bsc": "BNB",
    "tron": "TRX",
    "base": "BASE",
    "solana": "SOL",
    "litecoin": "LTC",
    "dogecoin": "DOGE",
    "cardano": "ADA",
    "avalanche": "AVAX",
    "polkadot": "DOT",
    "chainlink": "LINK",
    "shiba": "SHIB",
    "xrp": "XRP"
}

async def populate_balances():
    """Popula saldos do blockchain no banco de dados"""
    db = SessionLocal()
    blockchain_service = BlockchainService()
    
    try:
        print("\n" + "="*80)
        print("💰 POPULANDO SALDOS DO BLOCKCHAIN")
        print("="*80)
        
        # Buscar usuário específico
        user = db.query(User).filter(
            User.email == "app@holdwallet.com"
        ).first()
        
        if not user:
            print("❌ Usuário não encontrado!")
            return
        
        print(f"\n👤 Usuário: {user.email}")
        print(f"   ID: {user.id}")
        
        # Buscar carteiras
        wallets = db.query(Wallet).filter(Wallet.user_id == user.id).all()
        
        if not wallets:
            print("❌ Nenhuma carteira encontrada!")
            return
        
        print(f"\n📊 Carteiras encontradas: {len(wallets)}")
        
        # Para cada carteira
        for wallet in wallets:
            print(f"\n💼 Carteira: {wallet.name}")
            
            # Buscar endereços
            addresses = db.query(Address).filter(
                Address.wallet_id == wallet.id,
                Address.is_active == True
            ).all()
            
            if not addresses:
                print("   ❌ Nenhum endereço ativo!")
                continue
            
            print(f"   🔑 Endereços: {len(addresses)}")
            
            # Para cada endereço
            for addr in addresses:
                network = str(addr.network or wallet.network).lower()
                address = str(addr.address)
                
                print(f"\n      📍 {network.upper()} - {address[:20]}...")
                
                try:
                    # Buscar saldo da blockchain
                    print(f"         🔄 Fetching from blockchain...")
                    balance_data = await blockchain_service.get_address_balance(
                        address=address,
                        network=network,
                        include_tokens=True
                    )
                    
                    if not balance_data:
                        print(f"         ⚠️  Sem dados retornados")
                        continue
                    
                    # Processar saldo nativo
                    native_balance = Decimal(str(balance_data.get('native_balance', '0')))
                    symbol = NETWORK_SYMBOLS.get(network, network.upper())
                    
                    if native_balance > 0:
                        print(f"         💾 Salvando {symbol}: {native_balance}")
                        
                        # Procurar saldo existente
                        existing = db.query(WalletBalance).filter(
                            WalletBalance.user_id == user.id,
                            WalletBalance.cryptocurrency == symbol
                        ).first()
                        
                        if existing:
                            existing.available_balance = float(native_balance)
                            existing.total_balance = float(native_balance)
                            existing.updated_at = datetime.now()
                            existing.last_updated_reason = f"Blockchain sync from {network}"
                            print(f"            ✅ Atualizado")
                        else:
                            db.add(WalletBalance(
                                user_id=user.id,
                                cryptocurrency=symbol,
                                available_balance=float(native_balance),
                                locked_balance=0.0,
                                total_balance=float(native_balance),
                                last_updated_reason=f"Initial sync from {network}"
                            ))
                            print(f"            ✅ Criado")
                        
                        db.commit()
                    else:
                        print(f"         ⚠️  Saldo zero para {symbol}")
                    
                    # Processar tokens (USDT, USDC)
                    token_balances = balance_data.get('token_balances', {})
                    if token_balances:
                        from app.config.token_contracts import USDT_CONTRACTS, USDC_CONTRACTS
                        
                        # USDT
                        if network in USDT_CONTRACTS:
                            usdt_addr = USDT_CONTRACTS[network]['address'].lower()
                            for token_addr, token_data in token_balances.items():
                                if token_addr.lower() == usdt_addr:
                                    usdt_balance = Decimal(str(token_data.get('balance', '0')))
                                    if usdt_balance > 0:
                                        print(f"         💾 Salvando USDT: {usdt_balance}")
                                        existing = db.query(WalletBalance).filter(
                                            WalletBalance.user_id == user.id,
                                            WalletBalance.cryptocurrency == "USDT"
                                        ).first()
                                        if existing:
                                            existing.available_balance = float(usdt_balance)
                                            existing.total_balance = float(usdt_balance)
                                            existing.updated_at = datetime.now()
                                        else:
                                            db.add(WalletBalance(
                                                user_id=user.id,
                                                cryptocurrency="USDT",
                                                available_balance=float(usdt_balance),
                                                locked_balance=0.0,
                                                total_balance=float(usdt_balance)
                                            ))
                                        db.commit()
                                        print(f"            ✅ Salvo")
                        
                        # USDC
                        if network in USDC_CONTRACTS:
                            usdc_addr = USDC_CONTRACTS[network]['address'].lower()
                            for token_addr, token_data in token_balances.items():
                                if token_addr.lower() == usdc_addr:
                                    usdc_balance = Decimal(str(token_data.get('balance', '0')))
                                    if usdc_balance > 0:
                                        print(f"         💾 Salvando USDC: {usdc_balance}")
                                        existing = db.query(WalletBalance).filter(
                                            WalletBalance.user_id == user.id,
                                            WalletBalance.cryptocurrency == "USDC"
                                        ).first()
                                        if existing:
                                            existing.available_balance = float(usdc_balance)
                                            existing.total_balance = float(usdc_balance)
                                            existing.updated_at = datetime.now()
                                        else:
                                            db.add(WalletBalance(
                                                user_id=user.id,
                                                cryptocurrency="USDC",
                                                available_balance=float(usdc_balance),
                                                locked_balance=0.0,
                                                total_balance=float(usdc_balance)
                                            ))
                                        db.commit()
                                        print(f"            ✅ Salvo")
                
                except Exception as e:
                    print(f"         ❌ Erro: {str(e)}")
                    continue
        
        print("\n" + "="*80)
        print("✅ PROCESSO CONCLUÍDO!")
        print("="*80)
        
        # Mostrar saldos finais
        print("\n📋 SALDOS FINAIS NO BANCO:")
        balances = db.query(WalletBalance).filter(
            WalletBalance.user_id == user.id
        ).all()
        
        for bal in balances:
            print(f"   {bal.cryptocurrency:10} - {bal.total_balance:.8f}")
        
    except Exception as e:
        print(f"❌ Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Iniciando script de população de saldos...")
    asyncio.run(populate_balances())
