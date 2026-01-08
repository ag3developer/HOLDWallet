"""
🔍 Script SIMPLES para verificar transações via Blockscout API
==============================================================

Blockscout é uma API pública que NÃO REQUER API KEY.

Uso:
    python check_tx_simple.py [endereço]
"""

import requests
import json
import sys
from datetime import datetime
from decimal import Decimal

# Configurações
ADDRESS = "0xf35180d70920361426b5c3db222DEb450aA19979"
USDT_CONTRACT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

# Blockscout API (Polygon)
BLOCKSCOUT_API = "https://polygon.blockscout.com/api/v2"


def format_value(value: str, decimals: int = 18) -> str:
    """Formata valor para unidade legível"""
    try:
        val = Decimal(value) / Decimal(10 ** decimals)
        if val == 0:
            return "0"
        elif val < 0.0001:
            return f"{val:.8f}"
        elif val < 1:
            return f"{val:.6f}"
        else:
            return f"{val:.4f}"
    except:
        return value


def get_address_info(address: str):
    """Busca informações do endereço"""
    print(f"\n{'='*60}")
    print(f"📍 INFORMAÇÕES DO ENDEREÇO")
    print(f"{'='*60}")
    
    try:
        response = requests.get(f"{BLOCKSCOUT_API}/addresses/{address}", timeout=30)
        data = response.json()
        
        if response.status_code == 200:
            balance = format_value(data.get("coin_balance", "0"), 18)
            tx_count = data.get("transaction_count", 0)
            
            print(f"\n🟣 MATIC Balance: {balance}")
            print(f"📊 Total Transactions: {tx_count}")
            print(f"🔗 Type: {data.get('type', 'Unknown')}")
        else:
            print(f"⚠️ Erro: {data}")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def get_transactions(address: str):
    """Busca transações do endereço"""
    print(f"\n{'='*60}")
    print(f"📊 TRANSAÇÕES DE MATIC")
    print(f"{'='*60}")
    
    try:
        response = requests.get(
            f"{BLOCKSCOUT_API}/addresses/{address}/transactions",
            params={"filter": "to | from"},
            timeout=30
        )
        data = response.json()
        
        if response.status_code != 200:
            print(f"⚠️ Erro: {data}")
            return
        
        transactions = data.get("items", [])
        
        if not transactions:
            print("📭 Nenhuma transação encontrada")
            return
        
        print(f"\n📋 Últimas {len(transactions)} transações:\n")
        
        for i, tx in enumerate(transactions, 1):
            value = format_value(tx.get("value", "0"), 18)
            timestamp = tx.get("timestamp", "?")[:19].replace("T", " ")
            
            from_addr = tx.get("from", {}).get("hash", "?")
            to_addr = tx.get("to", {}).get("hash", "?") if tx.get("to") else "Contract Creation"
            
            is_incoming = to_addr.lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            status = "✅" if tx.get("status") == "ok" else "❌ FALHOU"
            
            print(f"{i}. {direction} - {value} MATIC {status}")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:25]}...")
            print(f"   📤 De: {from_addr[:20]}...{from_addr[-8:]}")
            print(f"   📥 Para: {to_addr[:20] if to_addr != 'Contract Creation' else to_addr}...")
            print()
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def get_token_transfers(address: str):
    """Busca transferências de tokens"""
    print(f"\n{'='*60}")
    print(f"💵 TRANSFERÊNCIAS DE TOKENS (USDT, etc)")
    print(f"{'='*60}")
    
    try:
        response = requests.get(
            f"{BLOCKSCOUT_API}/addresses/{address}/token-transfers",
            timeout=30
        )
        data = response.json()
        
        if response.status_code != 200:
            print(f"⚠️ Erro: {data}")
            return
        
        transfers = data.get("items", [])
        
        if not transfers:
            print("📭 Nenhuma transferência de token encontrada")
            return
        
        print(f"\n📋 Últimas {len(transfers)} transferências de tokens:\n")
        
        for i, tx in enumerate(transfers, 1):
            token = tx.get("token", {})
            decimals = int(token.get("decimals", 18) or 18)
            value = format_value(tx.get("total", {}).get("value", "0"), decimals)
            symbol = token.get("symbol", "???")
            timestamp = tx.get("timestamp", "?")[:19].replace("T", " ")
            
            from_addr = tx.get("from", {}).get("hash", "?")
            to_addr = tx.get("to", {}).get("hash", "?")
            
            is_incoming = to_addr.lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            # Destaca USDT
            emoji = "💵" if symbol == "USDT" else "🪙"
            
            print(f"{i}. {direction} - {value} {symbol} {emoji}")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx.get('tx_hash', '?')[:25]}...")
            print(f"   📤 De: {from_addr[:20]}...{from_addr[-8:]}")
            print(f"   📥 Para: {to_addr[:20]}...{to_addr[-8:]}")
            print()
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def get_token_balances(address: str):
    """Busca saldos de todos os tokens"""
    print(f"\n{'='*60}")
    print(f"🪙 SALDOS DE TOKENS")
    print(f"{'='*60}")
    
    try:
        response = requests.get(
            f"{BLOCKSCOUT_API}/addresses/{address}/tokens",
            timeout=30
        )
        data = response.json()
        
        if response.status_code != 200:
            print(f"⚠️ Erro: {data}")
            return
        
        tokens = data.get("items", [])
        
        if not tokens:
            print("\n📭 Nenhum token encontrado neste endereço")
            return
        
        print(f"\n📋 Tokens encontrados:\n")
        
        for token_data in tokens:
            token = token_data.get("token", {})
            decimals = int(token.get("decimals", 18) or 18)
            value = format_value(token_data.get("value", "0"), decimals)
            symbol = token.get("symbol", "???")
            name = token.get("name", "Unknown")
            
            if float(value) > 0:
                print(f"   💰 {value} {symbol} ({name})")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else ADDRESS
    
    print("\n" + "="*60)
    print("🔍 VERIFICADOR DE TRANSAÇÕES - POLYGON (Blockscout)")
    print("="*60)
    print(f"\n📍 Endereço: {address}")
    print(f"🔗 Blockscout: https://polygon.blockscout.com/address/{address}")
    
    # Informações do endereço
    get_address_info(address)
    
    # Saldos de tokens
    get_token_balances(address)
    
    # Transações MATIC
    get_transactions(address)
    
    # Transferências de tokens
    get_token_transfers(address)
    
    print("\n" + "="*60)
    print("✅ Verificação concluída!")
    print("="*60)
    
    # Links úteis
    print(f"\n📎 Links úteis:")
    print(f"   Blockscout: https://polygon.blockscout.com/address/{address}")
    print(f"   PolygonScan: https://polygonscan.com/address/{address}")
    print(f"   USDT: https://polygonscan.com/token/{USDT_CONTRACT}?a={address}")
    print()


if __name__ == "__main__":
    main()
