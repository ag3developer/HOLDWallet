"""
🔍 Script para verificar transações de um endereço na Polygon
=============================================================

Verifica:
- Transações de MATIC (token nativo)
- Transações de USDT (token ERC20)

Uso:
    python check_transactions.py [endereço]

Se não passar endereço, usa o padrão: 0xf35180d70920361426b5c3db222DEb450aA19979
"""

import requests
import json
from datetime import datetime
from decimal import Decimal
import sys

# Configurações
POLYGONSCAN_API_KEY = ""  # Opcional - funciona sem API key mas com rate limit
ADDRESS = "0xf35180d70920361426b5c3db222DEb450aA19979"

# Contrato USDT na Polygon
USDT_CONTRACT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

# URLs da API
POLYGONSCAN_API = "https://api.polygonscan.com/api"


def format_timestamp(timestamp: str) -> str:
    """Converte timestamp Unix para data legível"""
    try:
        dt = datetime.fromtimestamp(int(timestamp))
        return dt.strftime("%d/%m/%Y %H:%M:%S")
    except:
        return timestamp


def format_value(value: str, decimals: int = 18) -> str:
    """Formata valor de Wei para unidade legível"""
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


def get_matic_transactions(address: str, limit: int = 20):
    """Busca transações de MATIC (token nativo)"""
    print(f"\n{'='*60}")
    print(f"📊 TRANSAÇÕES DE MATIC (Polygon)")
    print(f"{'='*60}")
    
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": limit,
        "sort": "desc"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] != "1":
            print(f"⚠️ Nenhuma transação encontrada ou erro: {data.get('message', 'Unknown')}")
            return []
        
        transactions = data["result"]
        
        if not transactions:
            print("📭 Nenhuma transação de MATIC encontrada")
            return []
        
        print(f"\n📋 Últimas {len(transactions)} transações:\n")
        
        for i, tx in enumerate(transactions, 1):
            value = format_value(tx["value"], 18)
            timestamp = format_timestamp(tx["timeStamp"])
            
            # Determina direção
            is_incoming = tx["to"].lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            # Status
            status = "✅" if tx["isError"] == "0" else "❌ FALHOU"
            
            # Gas usado
            gas_used = format_value(str(int(tx["gasUsed"]) * int(tx["gasPrice"])), 18)
            
            print(f"{i}. {direction} - {value} MATIC")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:20]}...{tx['hash'][-10:]}")
            print(f"   📤 De: {tx['from'][:15]}...{tx['from'][-8:]}")
            print(f"   📥 Para: {tx['to'][:15]}...{tx['to'][-8:]}")
            print(f"   ⛽ Gas: {gas_used} MATIC")
            print(f"   {status}")
            print()
        
        return transactions
        
    except Exception as e:
        print(f"❌ Erro ao buscar transações: {str(e)}")
        return []


def get_usdt_transactions(address: str, limit: int = 20):
    """Busca transações de USDT (token ERC20)"""
    print(f"\n{'='*60}")
    print(f"💵 TRANSAÇÕES DE USDT (Polygon)")
    print(f"{'='*60}")
    
    params = {
        "module": "account",
        "action": "tokentx",
        "contractaddress": USDT_CONTRACT,
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": limit,
        "sort": "desc"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] != "1":
            print(f"⚠️ Nenhuma transação encontrada ou erro: {data.get('message', 'Unknown')}")
            return []
        
        transactions = data["result"]
        
        if not transactions:
            print("📭 Nenhuma transação de USDT encontrada")
            return []
        
        print(f"\n📋 Últimas {len(transactions)} transações:\n")
        
        for i, tx in enumerate(transactions, 1):
            # USDT tem 6 decimais na Polygon
            value = format_value(tx["value"], 6)
            timestamp = format_timestamp(tx["timeStamp"])
            
            # Determina direção
            is_incoming = tx["to"].lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            print(f"{i}. {direction} - {value} USDT")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:20]}...{tx['hash'][-10:]}")
            print(f"   📤 De: {tx['from'][:15]}...{tx['from'][-8:]}")
            print(f"   📥 Para: {tx['to'][:15]}...{tx['to'][-8:]}")
            print()
        
        return transactions
        
    except Exception as e:
        print(f"❌ Erro ao buscar transações: {str(e)}")
        return []


def get_all_token_transfers(address: str, limit: int = 20):
    """Busca todas as transferências de tokens ERC20"""
    print(f"\n{'='*60}")
    print(f"🪙 TODAS AS TRANSFERÊNCIAS DE TOKENS ERC20")
    print(f"{'='*60}")
    
    params = {
        "module": "account",
        "action": "tokentx",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": limit,
        "sort": "desc"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] != "1":
            print(f"⚠️ Nenhuma transferência encontrada: {data.get('message', 'Unknown')}")
            return []
        
        transactions = data["result"]
        
        if not transactions:
            print("📭 Nenhuma transferência de token encontrada")
            return []
        
        print(f"\n📋 Últimas {len(transactions)} transferências:\n")
        
        for i, tx in enumerate(transactions, 1):
            decimals = int(tx.get("tokenDecimal", 18))
            value = format_value(tx["value"], decimals)
            timestamp = format_timestamp(tx["timeStamp"])
            token_symbol = tx.get("tokenSymbol", "???")
            token_name = tx.get("tokenName", "Unknown")
            
            # Determina direção
            is_incoming = tx["to"].lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            print(f"{i}. {direction} - {value} {token_symbol} ({token_name})")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:20]}...{tx['hash'][-10:]}")
            print(f"   📤 De: {tx['from'][:15]}...{tx['from'][-8:]}")
            print(f"   📥 Para: {tx['to'][:15]}...{tx['to'][-8:]}")
            print()
        
        return transactions
        
    except Exception as e:
        print(f"❌ Erro ao buscar transferências: {str(e)}")
        return []


def get_balance(address: str):
    """Busca saldo atual de MATIC e USDT"""
    print(f"\n{'='*60}")
    print(f"💰 SALDO ATUAL")
    print(f"{'='*60}")
    
    # Saldo MATIC
    params = {
        "module": "account",
        "action": "balance",
        "address": address,
        "tag": "latest"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] == "1":
            matic_balance = format_value(data["result"], 18)
            print(f"\n🟣 MATIC: {matic_balance}")
        else:
            print(f"⚠️ Erro ao buscar saldo MATIC")
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
    
    # Saldo USDT
    params = {
        "module": "account",
        "action": "tokenbalance",
        "contractaddress": USDT_CONTRACT,
        "address": address,
        "tag": "latest"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] == "1":
            usdt_balance = format_value(data["result"], 6)
            print(f"💵 USDT: {usdt_balance}")
        else:
            print(f"⚠️ Erro ao buscar saldo USDT")
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def get_internal_transactions(address: str, limit: int = 10):
    """Busca transações internas (contratos)"""
    print(f"\n{'='*60}")
    print(f"📜 TRANSAÇÕES INTERNAS (Contratos)")
    print(f"{'='*60}")
    
    params = {
        "module": "account",
        "action": "txlistinternal",
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": limit,
        "sort": "desc"
    }
    
    if POLYGONSCAN_API_KEY:
        params["apikey"] = POLYGONSCAN_API_KEY
    
    try:
        response = requests.get(POLYGONSCAN_API, params=params, timeout=30)
        data = response.json()
        
        if data["status"] != "1":
            print(f"⚠️ Nenhuma transação interna encontrada")
            return []
        
        transactions = data["result"]
        
        if not transactions:
            print("📭 Nenhuma transação interna encontrada")
            return []
        
        print(f"\n📋 Últimas {len(transactions)} transações internas:\n")
        
        for i, tx in enumerate(transactions, 1):
            value = format_value(tx["value"], 18)
            timestamp = format_timestamp(tx["timeStamp"])
            
            is_incoming = tx["to"].lower() == address.lower()
            direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
            
            print(f"{i}. {direction} - {value} MATIC (interno)")
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:20]}...{tx['hash'][-10:]}")
            print()
        
        return transactions
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return []


def main():
    # Pega endereço do argumento ou usa o padrão
    address = sys.argv[1] if len(sys.argv) > 1 else ADDRESS
    
    print("\n" + "="*60)
    print("🔍 VERIFICADOR DE TRANSAÇÕES - POLYGON")
    print("="*60)
    print(f"\n📍 Endereço: {address}")
    print(f"🔗 PolygonScan: https://polygonscan.com/address/{address}")
    
    # Busca saldo atual
    get_balance(address)
    
    # Busca transações MATIC
    get_matic_transactions(address, limit=10)
    
    # Busca transações USDT
    get_usdt_transactions(address, limit=10)
    
    # Busca todas as transferências de tokens
    get_all_token_transfers(address, limit=10)
    
    # Transações internas
    get_internal_transactions(address, limit=5)
    
    print("\n" + "="*60)
    print("✅ Verificação concluída!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
