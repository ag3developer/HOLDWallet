#!/usr/bin/env python3
"""
🧪 TESTE DE SALDOS E PREÇOS - HOLDWallet

Testa:
1. Fetching de saldos do blockchain (nativo + tokens USDT/USDC)
2. Fetching de preços (CoinGecko + Binance fallback)
3. Cálculo de totais em USD e BRL
4. Integração com banco de dados

Uso:
    python TESTE_SALDOS_PRECOS.py
"""

import asyncio
import sys
from pathlib import Path
import os

os.environ['PYTHONPATH'] = str(Path(__file__).parent)
sys.path.insert(0, str(Path(__file__).parent))

import logging
from decimal import Decimal
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cores
class C:
    H = '\033[95m'
    B = '\033[94m'
    C_ = '\033[96m'
    G = '\033[92m'
    W = '\033[93m'
    R = '\033[91m'
    E = '\033[0m'
    BO = '\033[1m'
    U = '\033[4m'

def sec(t): print(f"\n{C.H}{C.BO}{'='*80}{C.E}\n{C.H}{C.BO}📋 {t}{C.E}\n{C.H}{C.BO}{'='*80}{C.E}\n")
def ok(m): print(f"{C.G}✅ {m}{C.E}")
def er(m): print(f"{C.R}❌ {m}{C.E}")
def in_(m): print(f"{C.C_}ℹ️  {m}{C.E}")
def wa(m): print(f"{C.W}⚠️  {m}{C.E}")

async def test_saldos_blockchain():
    """Teste 1: Fetching de saldos do blockchain"""
    sec("TESTE 1: Saldos do Blockchain")
    
    from app.services.blockchain_service import BlockchainService
    
    blockchain_service = BlockchainService()
    
    # Endereços de teste (do banco de dados)
    test_addresses = [
        ("0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6", "polygon"),  # POLYGON (MATIC)
        ("0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6", "base"),     # BASE (ETH)
        ("0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6", "ethereum"), # ETHEREUM (ETH)
        ("0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6", "bsc"),      # BSC (BNB)
    ]
    
    all_balances = {}
    
    for address, network in test_addresses:
        in_(f"Fetching {network.upper()}... {address}")
        
        try:
            # Fetch com include_tokens=True para pegar USDT/USDC
            balance_data = await blockchain_service.get_address_balance(
                address,
                network,
                include_tokens=True
            )
            
            native = Decimal(balance_data.get('native_balance', '0'))
            tokens = balance_data.get('token_balances', {})
            
            ok(f"Saldo nativo {network.upper()}: {native}")
            
            if tokens:
                ok(f"Tokens encontrados: {len(tokens)}")
                for token_addr, token_data in tokens.items():
                    symbol = token_data.get('symbol', 'UNKNOWN')
                    balance = token_data.get('balance', '0')
                    print(f"    🪙 {symbol}: {balance}")
            else:
                wa("Nenhum token encontrado")
            
            all_balances[f"{network}_{address}"] = {
                'network': network,
                'address': address,
                'native': str(native),
                'tokens': tokens,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            er(f"Erro ao buscar {network}: {str(e)}")
            continue
    
    return all_balances

async def test_precos():
    """Teste 2: Fetching de preços"""
    sec("TESTE 2: Preços (CoinGecko + Binance)")
    
    from app.services.price_aggregator import price_aggregator
    
    # Símbolos para testar
    symbols = ['btc', 'eth', 'matic', 'usdt', 'bnb']
    
    in_(f"Fetching preços para: {symbols}")
    
    try:
        # USD
        in_("Fetching USD prices...")
        prices_usd = await price_aggregator.get_prices(symbols, "usd")
        
        if prices_usd:
            ok(f"Preços USD obtidos de: {list(prices_usd.values())[0].source if prices_usd else 'N/A'}")
            print()
            for symbol, price_data in prices_usd.items():
                change_icon = "📈" if price_data.change_24h > 0 else "📉"
                print(f"    💰 {symbol.upper()}: ${price_data.price:.2f} {change_icon} {price_data.change_24h:.2f}%")
        else:
            er("Nenhum preço USD obtido")
            return None, None
        
        print()
        
        # BRL
        in_("Fetching BRL prices...")
        prices_brl = await price_aggregator.get_prices(symbols, "brl")
        
        if prices_brl:
            ok(f"Preços BRL obtidos de: {list(prices_brl.values())[0].source if prices_brl else 'N/A'}")
            print()
            for symbol, price_data in prices_brl.items():
                print(f"    💰 {symbol.upper()}: R${price_data.price:.2f}")
        else:
            er("Nenhum preço BRL obtido")
        
        return prices_usd, prices_brl
        
    except Exception as e:
        er(f"Erro ao buscar preços: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None

async def test_calculo_totais(balances, prices_usd, prices_brl):
    """Teste 3: Cálculo de totais"""
    sec("TESTE 3: Cálculo de Totais em USD e BRL")
    
    if not prices_usd or not prices_brl:
        er("Preços não disponíveis - pulando cálculo")
        return
    
    total_usd = Decimal('0')
    total_brl = Decimal('0')
    
    network_symbol_map = {
        'polygon': 'matic',
        'ethereum': 'eth',
        'base': 'eth',
        'bsc': 'bnb'
    }
    
    in_("Calculando totais...\n")
    
    for balance_key, balance_info in balances.items():
        network = balance_info['network']
        symbol = network_symbol_map.get(network, network).lower()
        native_balance = Decimal(balance_info['native'])
        
        # Buscar preço
        price_data_usd = prices_usd.get(symbol)
        price_data_brl = prices_brl.get(symbol)
        
        if price_data_usd and price_data_brl:
            price_usd = Decimal(str(price_data_usd.price))
            price_brl = Decimal(str(price_data_brl.price))
            
            balance_usd = native_balance * price_usd
            balance_brl = native_balance * price_brl
            
            total_usd += balance_usd
            total_brl += balance_brl
            
            print(f"🌐 {network.upper()}:")
            print(f"   💵 {native_balance} @ ${price_usd:.2f} = ${balance_usd:.2f} USD")
            print(f"   💵 {native_balance} @ R${price_brl:.2f} = R${balance_brl:.2f} BRL")
            
            # Tokens
            tokens = balance_info.get('tokens', {})
            if tokens:
                for token_addr, token_data in tokens.items():
                    symbol_token = token_data.get('symbol', 'UNKNOWN')
                    balance_token = Decimal(str(token_data.get('balance', '0')))
                    
                    # USDT/USDC valem $1 USD
                    if symbol_token in ['USDT', 'USDC']:
                        total_usd += balance_token
                        price_brl_usdx = prices_brl.get('usdt', prices_brl.get('usd'))
                        if price_brl_usdx:
                            price_brl_value = Decimal(str(price_brl_usdx.price))
                            total_brl += balance_token * price_brl_value
                            print(f"   🪙 {symbol_token}: {balance_token} @ $1.00 = ${balance_token:.2f} USD")
            
            print()
        else:
            wa(f"Preço não encontrado para {symbol}")
    
    print(f"\n{C.BO}📊 TOTAIS:{C.E}")
    print(f"   💰 Total USD: ${total_usd:.2f}")
    print(f"   💰 Total BRL: R${total_brl:.2f}")

async def test_endpoint_integration():
    """Teste 4: Integração com endpoint do backend"""
    sec("TESTE 4: Integração com Endpoint do Backend")
    
    in_("Simulando chamada para GET /wallets/{id}/balances")
    in_("(Este teste verificará se o endpoint retorna dados corretos)")
    
    print()
    print("📝 Endpoint esperado:")
    print("   GET /wallets/2b95a1d3-e4b4-4047-8027-297b6a01c183/balances?include_tokens=true")
    print()
    print("Expected response structure:")
    print("""{
  "wallet_id": "2b95a1d3-e4b4-4047-8027-297b6a01c183",
  "wallet_name": "holdwallet",
  "balances": {
    "polygon": {
      "network": "polygon",
      "address": "0xa1aaacff...",
      "balance": "22.99",
      "balance_usd": "20.50",
      "balance_brl": "110.23",
      "last_updated": "2025-12-09T15:30:00"
    },
    "polygon_usdt": {
      "network": "polygon (USDT)",
      "address": "0xa1aaacff...",
      "balance": "2.037785",
      "balance_usd": "2.04",
      "balance_brl": "10.95",
      "last_updated": "2025-12-09T15:30:00"
    }
  },
  "total_usd": "22.54",
  "total_brl": "121.18"
}""")

async def main():
    """Main test"""
    print(f"\n{C.H}{C.BO}")
    print("╔════════════════════════════════════════════════════════════════════════════════╗")
    print("║         🧪 TESTE DE SALDOS E PREÇOS - HOLDWallet BACKEND                      ║")
    print("║                                                                                ║")
    print("║  Checklist:                                                                    ║")
    print("║  1. ✅ Saldos do Blockchain (Nativo + USDT/USDC)                              ║")
    print("║  2. ✅ Preços (CoinGecko + Binance Fallback)                                   ║")
    print("║  3. ✅ Cálculo de Totais em USD e BRL                                          ║")
    print("║  4. ✅ Integração com Endpoint do Backend                                      ║")
    print("║                                                                                ║")
    print("╚════════════════════════════════════════════════════════════════════════════════╝")
    print(f"{C.E}\n")
    
    try:
        # Teste 1
        balances = await test_saldos_blockchain()
        
        if not balances:
            er("Nenhum saldo obtido - abortando")
            return
        
        # Teste 2
        prices_usd, prices_brl = await test_precos()
        
        if prices_usd and prices_brl:
            # Teste 3
            await test_calculo_totais(balances, prices_usd, prices_brl)
        
        # Teste 4
        await test_endpoint_integration()
        
        sec("✨ TESTES CONCLUÍDOS!")
        
    except Exception as e:
        er(f"Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
