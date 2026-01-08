"""
🧪 Script de Verificação - Multi-Chain Services
==============================================

Verifica se todos os serviços de blockchain estão funcionando corretamente.

Uso:
    python scripts/check_multi_chain_services.py
"""

import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_service(name: str, check_func):
    """Executa verificação de um serviço."""
    try:
        result = check_func()
        if result:
            print(f"  ✅ {name}: OK")
            return True
        else:
            print(f"  ⚠️ {name}: Parcial")
            return True
    except ImportError as e:
        print(f"  ❌ {name}: Biblioteca não instalada - {e}")
        return False
    except Exception as e:
        print(f"  ❌ {name}: Erro - {e}")
        return False


def check_all_services():
    """Verifica todos os serviços de blockchain."""
    
    print("=" * 60)
    print("🌐 VERIFICAÇÃO DE SERVIÇOS MULTI-CHAIN")
    print("=" * 60)
    
    results = {}
    
    # ===== EVM Services (Web3) =====
    print("\n🔷 EVM (Ethereum, Polygon, BSC, Base, Avalanche):")
    
    def check_evm():
        from app.services.blockchain_deposit_service import blockchain_deposit_service
        return blockchain_deposit_service is not None
    
    results['EVM'] = check_service("blockchain_deposit_service", check_evm)
    
    # ===== Bitcoin =====
    print("\n🔶 Bitcoin:")
    
    def check_btc():
        from app.services.btc_service import btc_service
        # Testar validação de endereço
        valid = btc_service.validate_address("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")
        return valid
    
    results['BTC'] = check_service("btc_service", check_btc)
    
    # ===== Litecoin & Dogecoin =====
    print("\n🪙 Litecoin & Dogecoin:")
    
    def check_ltc():
        from app.services.ltc_doge_service import ltc_service
        valid = ltc_service.validate_address("LZ7GHmj4ypU8HJXKnxhXQK8vGkC8jmwpew")
        return valid
    
    def check_doge():
        from app.services.ltc_doge_service import doge_service
        valid = doge_service.validate_address("D7Y55Lq3TKNsn3wRqfLpEqRB7Y5K6tRb6U")
        return valid
    
    results['LTC'] = check_service("ltc_service", check_ltc)
    results['DOGE'] = check_service("doge_service", check_doge)
    
    # ===== Solana =====
    print("\n☀️ Solana:")
    
    def check_sol():
        from app.services.sol_service import sol_service
        valid = sol_service.validate_address("96fGJpCVTMM17d8Zw8tqXrcU4NHE3hAgsBcXSW2n36dB")
        return valid
    
    results['SOL'] = check_service("sol_service", check_sol)
    
    # ===== TRON =====
    print("\n🔺 TRON:")
    
    def check_tron():
        from app.services.tron_service import tron_service
        valid = tron_service.validate_address("TQ15TiASc1ep9c7nW6VJsPjRucuhgwyU4Z")
        return valid
    
    results['TRX'] = check_service("tron_service", check_tron)
    
    # ===== XRP =====
    print("\n💎 XRP (Ripple):")
    
    def check_xrp():
        from app.services.xrp_service import xrp_service
        valid = xrp_service.validate_address("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh")
        return valid
    
    results['XRP'] = check_service("xrp_service", check_xrp)
    
    # ===== Polkadot =====
    print("\n🔴 Polkadot:")
    
    def check_dot():
        from app.services.dot_service import dot_service
        valid = dot_service.validate_address("162Er6RCfoyt2YEkBzuB7Ae3W7Uq9YYQp2EDKL9yJdK37Ek6")
        return valid
    
    results['DOT'] = check_service("dot_service", check_dot)
    
    # ===== Multi-Chain Service =====
    print("\n🌐 Multi-Chain Service (Unificado):")
    
    def check_multi_chain():
        from app.services.multi_chain_service import multi_chain_service
        return multi_chain_service is not None
    
    results['MULTI_CHAIN'] = check_service("multi_chain_service", check_multi_chain)
    
    # ===== Resumo =====
    print("\n" + "=" * 60)
    print("📊 RESUMO")
    print("=" * 60)
    
    working = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\n  Serviços funcionando: {working}/{total}")
    
    # Listar status por moeda
    crypto_status = {
        'BTC': results.get('BTC', False),
        'ETH': results.get('EVM', False),
        'MATIC': results.get('EVM', False),
        'BNB': results.get('EVM', False),
        'USDT': results.get('EVM', False),
        'USDC': results.get('EVM', False),
        'AVAX': results.get('EVM', False),
        'BASE': results.get('EVM', False),
        'LINK': results.get('EVM', False),
        'SHIB': results.get('EVM', False),
        'LTC': results.get('LTC', False),
        'DOGE': results.get('DOGE', False),
        'SOL': results.get('SOL', False),
        'TRX': results.get('TRX', False),
        'XRP': results.get('XRP', False),
        'DOT': results.get('DOT', False),
    }
    
    print("\n  📋 Status por Criptomoeda:")
    for crypto, status in crypto_status.items():
        icon = "✅" if status else "❌"
        print(f"      {icon} {crypto}")
    
    # Moedas pendentes
    print("\n  ⚠️ Pendentes de implementação:")
    print("      - ADA (Cardano): Requer cardano-serialization-lib")
    
    print("\n" + "=" * 60)
    
    if working >= 10:
        print("🎉 Sistema multi-chain está OPERACIONAL!")
    else:
        print("⚠️ Alguns serviços precisam de atenção.")
    
    print("=" * 60)
    
    return working == total


def check_system_wallet():
    """Verifica os endereços da carteira do sistema."""
    
    print("\n" + "=" * 60)
    print("🔐 VERIFICAÇÃO DA CARTEIRA DO SISTEMA")
    print("=" * 60)
    
    from app.core.db import SessionLocal
    from app.models.system_blockchain_wallet import SystemBlockchainWallet, SystemBlockchainAddress
    
    db = SessionLocal()
    
    try:
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            print("\n  ❌ Carteira do sistema não encontrada!")
            print("     Execute: POST /admin/system-wallet/create")
            return False
        
        print(f"\n  ✅ Carteira: {wallet.name}")
        print(f"     ID: {wallet.id}")
        
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        print(f"\n  📋 Endereços ({len(addresses)} redes):")
        
        valid_count = 0
        placeholder_count = 0
        
        for addr in addresses:
            # Verificar se é endereço válido ou placeholder
            is_valid = True
            
            # Critérios de endereço válido
            if addr.network in ['ethereum', 'polygon', 'bsc', 'base', 'avalanche', 'multi']:
                is_valid = addr.address.startswith('0x') and len(addr.address) == 42
            elif addr.network == 'bitcoin':
                is_valid = (addr.address.startswith('1') and len(addr.address) == 34) or \
                           (addr.address.startswith('bc1') and len(addr.address) >= 42)
            elif addr.network == 'litecoin':
                is_valid = addr.address.startswith('L') and len(addr.address) == 34
            elif addr.network == 'dogecoin':
                is_valid = addr.address.startswith('D') and len(addr.address) == 34
            elif addr.network == 'tron':
                is_valid = addr.address.startswith('T') and len(addr.address) == 34
            elif addr.network == 'solana':
                is_valid = len(addr.address) >= 32 and not addr.address.startswith('So')
            elif addr.network == 'xrp':
                is_valid = addr.address.startswith('r') and len(addr.address) >= 25
            elif addr.network == 'polkadot':
                is_valid = addr.address.startswith('1') and len(addr.address) >= 45
            elif addr.network == 'cardano':
                is_valid = addr.address.startswith('addr1')
            
            if is_valid:
                valid_count += 1
                icon = "✅"
            else:
                placeholder_count += 1
                icon = "⚠️"
            
            print(f"     {icon} {addr.network}: {addr.address[:25]}...")
        
        print(f"\n  📊 Resultado: {valid_count} válidos | {placeholder_count} placeholders")
        
        return placeholder_count == 0
        
    finally:
        db.close()


if __name__ == "__main__":
    # Verificar serviços
    check_all_services()
    
    # Verificar carteira do sistema
    check_system_wallet()
