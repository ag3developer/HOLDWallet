"""
🔍 Script para verificar saldo e transações via Web3 + APIs públicas
====================================================================

Verifica:
- Saldo de MATIC (token nativo)
- Saldo de USDT (token ERC20)
- Últimas transações via APIs públicas

Uso:
    python check_wallet_web3.py [endereço]
"""

import json
import sys
from decimal import Decimal
from datetime import datetime

# Tenta importar web3
try:
    from web3 import Web3
except ImportError:
    print("❌ web3 não instalado. Execute: pip install web3")
    sys.exit(1)

import requests

# Configurações
ADDRESS = "0xf35180d70920361426b5c3db222DEb450aA19979"

# RPCs da Polygon (públicos)
POLYGON_RPCS = [
    "https://polygon-rpc.com",
    "https://rpc-mainnet.maticvigil.com",
    "https://polygon.llamarpc.com",
    "https://polygon-mainnet.public.blastapi.io",
]

# Contrato USDT na Polygon
USDT_CONTRACT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"

# ABI mínima para ERC20
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
]


def connect_to_polygon():
    """Tenta conectar a um RPC da Polygon"""
    for rpc in POLYGON_RPCS:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={'timeout': 10}))
            if w3.is_connected():
                print(f"✅ Conectado ao RPC: {rpc}")
                return w3
        except Exception as e:
            print(f"⚠️ Falha no RPC {rpc}: {str(e)[:50]}")
            continue
    
    print("❌ Não foi possível conectar a nenhum RPC")
    return None


def format_value(value: int, decimals: int = 18) -> str:
    """Formata valor de Wei para unidade legível"""
    val = Decimal(value) / Decimal(10 ** decimals)
    if val == 0:
        return "0"
    elif val < 0.0001:
        return f"{val:.8f}"
    elif val < 1:
        return f"{val:.6f}"
    else:
        return f"{val:.4f}"


def get_balances(w3: Web3, address: str):
    """Busca saldos de MATIC e USDT"""
    print(f"\n{'='*60}")
    print(f"💰 SALDO ATUAL")
    print(f"{'='*60}")
    
    address = Web3.to_checksum_address(address)
    
    # Saldo MATIC
    try:
        matic_balance_wei = w3.eth.get_balance(address)
        matic_balance = format_value(matic_balance_wei, 18)
        print(f"\n🟣 MATIC: {matic_balance}")
        print(f"   (Wei: {matic_balance_wei})")
    except Exception as e:
        print(f"❌ Erro ao buscar saldo MATIC: {str(e)}")
    
    # Saldo USDT
    try:
        usdt_contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT),
            abi=ERC20_ABI
        )
        usdt_balance_raw = usdt_contract.functions.balanceOf(address).call()
        usdt_decimals = usdt_contract.functions.decimals().call()
        usdt_balance = format_value(usdt_balance_raw, usdt_decimals)
        print(f"\n💵 USDT: {usdt_balance}")
        print(f"   (Raw: {usdt_balance_raw}, Decimals: {usdt_decimals})")
    except Exception as e:
        print(f"❌ Erro ao buscar saldo USDT: {str(e)}")
    
    # Outros tokens comuns
    other_tokens = {
        "USDC": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",  # USDC nativo
        "USDC.e": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",  # USDC bridged
        "WMATIC": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        "WETH": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    }
    
    print(f"\n🪙 OUTROS TOKENS:")
    for symbol, contract_addr in other_tokens.items():
        try:
            token_contract = w3.eth.contract(
                address=Web3.to_checksum_address(contract_addr),
                abi=ERC20_ABI
            )
            balance_raw = token_contract.functions.balanceOf(address).call()
            if balance_raw > 0:
                decimals = token_contract.functions.decimals().call()
                balance = format_value(balance_raw, decimals)
                print(f"   {symbol}: {balance}")
        except Exception as e:
            pass  # Ignora erros de tokens


def get_recent_blocks_transactions(w3: Web3, address: str, num_blocks: int = 1000):
    """
    Busca transações nos últimos N blocos.
    NOTA: Isso pode ser lento e não encontrar todas as transações.
    """
    print(f"\n{'='*60}")
    print(f"📊 BUSCANDO TRANSAÇÕES NOS ÚLTIMOS {num_blocks} BLOCOS")
    print(f"{'='*60}")
    
    address = Web3.to_checksum_address(address).lower()
    latest_block = w3.eth.block_number
    
    print(f"\n📦 Bloco atual: {latest_block}")
    print(f"🔍 Buscando de {latest_block - num_blocks} até {latest_block}...")
    print("   (Isso pode demorar alguns minutos...)\n")
    
    transactions_found = []
    
    # Busca eventos Transfer do USDT para/de este endereço
    try:
        usdt_contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT),
            abi=ERC20_ABI
        )
        
        # Eventos enviados
        filter_sent = usdt_contract.events.Transfer.create_filter(
            fromBlock=latest_block - num_blocks,
            toBlock='latest',
            argument_filters={'from': Web3.to_checksum_address(address)}
        )
        
        # Eventos recebidos
        filter_received = usdt_contract.events.Transfer.create_filter(
            fromBlock=latest_block - num_blocks,
            toBlock='latest',
            argument_filters={'to': Web3.to_checksum_address(address)}
        )
        
        sent_events = filter_sent.get_all_entries()
        received_events = filter_received.get_all_entries()
        
        all_events = sent_events + received_events
        all_events.sort(key=lambda x: x['blockNumber'], reverse=True)
        
        if all_events:
            print(f"💵 Encontradas {len(all_events)} transferências de USDT:\n")
            
            for i, event in enumerate(all_events[:20], 1):
                value = format_value(event['args']['value'], 6)
                is_incoming = event['args']['to'].lower() == address
                direction = "⬇️ RECEBIDO" if is_incoming else "⬆️ ENVIADO"
                
                # Busca timestamp do bloco
                try:
                    block = w3.eth.get_block(event['blockNumber'])
                    timestamp = datetime.fromtimestamp(block['timestamp']).strftime("%d/%m/%Y %H:%M:%S")
                except:
                    timestamp = "?"
                
                print(f"{i}. {direction} - {value} USDT")
                print(f"   📦 Bloco: {event['blockNumber']}")
                print(f"   📅 Data: {timestamp}")
                print(f"   🔗 TX: {event['transactionHash'].hex()[:20]}...{event['transactionHash'].hex()[-10:]}")
                print(f"   📤 De: {event['args']['from'][:15]}...{event['args']['from'][-8:]}")
                print(f"   📥 Para: {event['args']['to'][:15]}...{event['args']['to'][-8:]}")
                print()
        else:
            print("📭 Nenhuma transferência de USDT encontrada neste período")
            
    except Exception as e:
        print(f"❌ Erro ao buscar eventos: {str(e)}")


def get_transactions_via_covalent(address: str):
    """Busca transações via Covalent API (gratuita)"""
    print(f"\n{'='*60}")
    print(f"📊 BUSCANDO VIA COVALENT API")
    print(f"{'='*60}")
    
    # Covalent API Key gratuita (limitada)
    api_key = "cqt_rQPBdVYw6kMHqP6Ywjgr8XpWbTrQ"
    chain_id = 137  # Polygon
    
    url = f"https://api.covalenthq.com/v1/{chain_id}/address/{address}/transactions_v2/"
    
    try:
        response = requests.get(
            url,
            auth=(api_key, ''),
            params={"page-size": 20},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"⚠️ Erro na API: {response.status_code}")
            return
        
        data = response.json()
        
        if not data.get("data", {}).get("items"):
            print("📭 Nenhuma transação encontrada")
            return
        
        transactions = data["data"]["items"]
        print(f"\n📋 Últimas {len(transactions)} transações:\n")
        
        for i, tx in enumerate(transactions, 1):
            value = format_value(int(tx.get("value", 0)), 18)
            timestamp = tx.get("block_signed_at", "?")[:19].replace("T", " ")
            
            is_incoming = tx.get("to_address", "").lower() == address.lower()
            direction = "⬇️" if is_incoming else "⬆️"
            
            status = "✅" if tx.get("successful") else "❌"
            
            print(f"{i}. {direction} {status} {value} MATIC")
            print(f"   📅 {timestamp}")
            print(f"   🔗 {tx['tx_hash'][:25]}...")
            
            # Token transfers
            if tx.get("log_events"):
                for log in tx["log_events"]:
                    if log.get("decoded") and log["decoded"].get("name") == "Transfer":
                        params = {p["name"]: p["value"] for p in log["decoded"].get("params", [])}
                        if params.get("value"):
                            token_value = format_value(int(params["value"]), log.get("sender_contract_decimals", 18))
                            token_symbol = log.get("sender_contract_ticker_symbol", "?")
                            print(f"   💱 {token_value} {token_symbol}")
            print()
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def get_transactions_direct(address: str):
    """Busca transações diretamente via PolygonScan (sem API key)"""
    print(f"\n{'='*60}")
    print(f"📊 LINK DIRETO PARA POLYGONSCAN")
    print(f"{'='*60}")
    
    print(f"\n🔗 Para ver todas as transações, acesse:")
    print(f"\n   MATIC: https://polygonscan.com/address/{address}")
    print(f"   USDT:  https://polygonscan.com/token/{USDT_CONTRACT}?a={address}")
    print(f"   TODOS: https://polygonscan.com/address/{address}#tokentxns")


def main():
    # Pega endereço do argumento ou usa o padrão
    address = sys.argv[1] if len(sys.argv) > 1 else ADDRESS
    
    print("\n" + "="*60)
    print("🔍 VERIFICADOR DE CARTEIRA - POLYGON")
    print("="*60)
    print(f"\n📍 Endereço: {address}")
    
    # Conecta ao RPC
    w3 = connect_to_polygon()
    
    if w3:
        # Busca saldos
        get_balances(w3, address)
        
        # Busca transações nos últimos blocos
        get_recent_blocks_transactions(w3, address, num_blocks=5000)
    
    # Tenta API Covalent
    get_transactions_via_covalent(address)
    
    # Links diretos
    get_transactions_direct(address)
    
    print("\n" + "="*60)
    print("✅ Verificação concluída!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
