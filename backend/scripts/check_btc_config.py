#!/usr/bin/env python3
"""
🔶 Script de Verificação - Envio Automático BTC
===============================================

Verifica se todas as configurações necessárias para 
envio automático de Bitcoin estão corretas.

Uso:
    python scripts/check_btc_config.py
"""

import sys
import os

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.core.config import settings


def check_btc_config():
    """Verifica configurações de BTC."""
    print("=" * 60)
    print("🔶 VERIFICAÇÃO DE CONFIGURAÇÃO BTC")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # 1. Verificar bitcoinlib
    print("\n1️⃣ Verificando bibliotecas...")
    try:
        from bitcoinlib.keys import Key
        print("   ✅ bitcoinlib instalado corretamente")
    except ImportError as e:
        print(f"   ❌ bitcoinlib NÃO instalado: {e}")
        errors.append("bitcoinlib não instalado")
    
    # 2. Verificar btc_service
    print("\n2️⃣ Verificando BTCService...")
    try:
        from app.services.btc_service import btc_service
        print(f"   ✅ BTCService inicializado")
        print(f"   📡 Modo: {'testnet' if btc_service.testnet else 'mainnet'}")
        print(f"   🔗 API: {btc_service.blockstream_api}")
        
        # Testar conexão com API
        try:
            fees = btc_service.get_recommended_fees()
            print(f"   ✅ Conexão com API OK (fees: {fees['hour']} sat/vB)")
        except Exception as e:
            print(f"   ⚠️ Erro ao consultar API: {e}")
            warnings.append("Conexão com API instável")
    except Exception as e:
        print(f"   ❌ Erro ao importar BTCService: {e}")
        errors.append("BTCService não funciona")
    
    # 3. Verificar carteira do sistema no banco
    print("\n3️⃣ Verificando carteira BTC do sistema (banco de dados)...")
    db = SessionLocal()
    try:
        from app.services.system_blockchain_wallet_service import system_wallet_service
        
        btc_data = system_wallet_service.get_private_key_for_sending(db, 'bitcoin')
        
        if btc_data:
            print(f"   ✅ Carteira BTC encontrada no banco:")
            print(f"      📍 Endereço: {btc_data['address'][:20]}...")
            print(f"      🔑 Private Key WIF: {'Sim' if btc_data.get('private_key_wif') else 'Não'}")
            
            # Verificar saldo
            try:
                balance = btc_service.get_balance(btc_data['address'])
                print(f"      💰 Saldo: {balance['confirmed_btc']:.8f} BTC")
                
                if balance['confirmed_btc'] < 0.0001:
                    warnings.append(f"Saldo BTC baixo: {balance['confirmed_btc']} BTC")
            except Exception as e:
                print(f"      ⚠️ Erro ao consultar saldo: {e}")
        else:
            print("   ⚠️ Nenhuma carteira BTC encontrada no banco")
            warnings.append("Carteira BTC não configurada no banco")
            
            # Verificar fallback .env
            env_address = getattr(settings, 'PLATFORM_BTC_ADDRESS', None)
            env_wif = getattr(settings, 'PLATFORM_BTC_PRIVATE_KEY_WIF', None)
            
            if env_address and env_wif:
                print(f"   ✅ Fallback .env encontrado:")
                print(f"      📍 PLATFORM_BTC_ADDRESS: {env_address[:20]}...")
            else:
                print("   ❌ Nenhuma configuração BTC encontrada (banco ou .env)")
                errors.append("Carteira BTC não configurada")
    finally:
        db.close()
    
    # 4. Verificar se há usuários com endereço BTC
    print("\n4️⃣ Verificando endereços BTC de usuários...")
    db = SessionLocal()
    try:
        from app.models.address import Address
        from sqlalchemy import func
        
        btc_addresses = db.query(Address).filter(
            func.lower(Address.network) == 'bitcoin',
            Address.is_active == True
        ).count()
        
        print(f"   📊 Total de endereços BTC de usuários: {btc_addresses}")
        
        if btc_addresses == 0:
            warnings.append("Nenhum usuário tem endereço BTC cadastrado")
    finally:
        db.close()
    
    # 5. Verificar multi_chain_service
    print("\n5️⃣ Verificando MultiChainService...")
    try:
        from app.services.multi_chain_service import multi_chain_service
        
        is_btc = multi_chain_service.is_utxo_crypto('BTC')
        print(f"   ✅ BTC identificado como UTXO: {is_btc}")
        
        network = multi_chain_service.get_network_for_crypto('BTC')
        print(f"   ✅ Rede para BTC: {network}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        errors.append("MultiChainService com problemas")
    
    # 6. Verificar blockchain_deposit_service
    print("\n6️⃣ Verificando BlockchainDepositService...")
    try:
        from app.services.blockchain_deposit_service import blockchain_deposit_service
        
        db = SessionLocal()
        try:
            is_enabled = blockchain_deposit_service.is_btc_auto_enabled(db)
            print(f"   ✅ Envio automático BTC habilitado: {is_enabled}")
            
            if not is_enabled:
                warnings.append("Envio automático BTC não está habilitado")
        finally:
            db.close()
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        errors.append("BlockchainDepositService com problemas")
    
    # Resumo
    print("\n" + "=" * 60)
    print("📋 RESUMO")
    print("=" * 60)
    
    if not errors and not warnings:
        print("\n✅ TUDO OK! Envio automático de BTC está configurado corretamente.")
    else:
        if errors:
            print("\n❌ ERROS CRÍTICOS:")
            for err in errors:
                print(f"   • {err}")
        
        if warnings:
            print("\n⚠️ AVISOS:")
            for warn in warnings:
                print(f"   • {warn}")
    
    print("\n" + "=" * 60)
    
    return len(errors) == 0


if __name__ == "__main__":
    success = check_btc_config()
    sys.exit(0 if success else 1)
