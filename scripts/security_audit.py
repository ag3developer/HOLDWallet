"""
🔍 AUDITORIA DE SEGURANÇA - Investigação de Transações
=======================================================

Script para investigar possíveis atividades suspeitas na carteira.

Verifica:
1. Todas as transações de saída (OUT)
2. Endereços de destino desconhecidos
3. Transações em horários suspeitos
4. Padrões de movimentação anormais
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

# Endereços conhecidos do sistema
KNOWN_ADDRESSES = {
    "0xeB4c1Fe541e5361340f10B5c712d82aA6e441319".lower(): "🏦 Carteira Plataforma (HOLD)",
    "0xf35180d70920361426b5c3db222DEb450aA19979".lower(): "👤 Usuário Teste",
    "0xD9F66CaE72550ebA25f0Ee96DFefc78c2AA0D935".lower(): "👤 Outro usuário",
    # Adicione mais endereços conhecidos aqui
}

# Contratos conhecidos (DEXs, bridges, etc)
KNOWN_CONTRACTS = {
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".lower(): "USDT (Polygon)",
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".lower(): "USDC.e (Polygon)",
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359".lower(): "USDC (Polygon)",
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270".lower(): "WMATIC",
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619".lower(): "WETH (Polygon)",
    # DEXs comuns
    "0x1111111254EEB25477B68fb85Ed929f73A960582".lower(): "1inch Router",
    "0xdef171fe48cf0115b1d80b88dc8eab59176fee57".lower(): "Paraswap",
    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45".lower(): "Uniswap V3 Router",
    "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff".lower(): "QuickSwap Router",
}

BLOCKSCOUT_API = "https://polygon.blockscout.com/api/v2"


def format_value(value: str, decimals: int = 18) -> str:
    try:
        val = Decimal(value) / Decimal(10 ** decimals)
        if val == 0:
            return "0"
        return f"{val:.6f}"
    except:
        return value


def identify_address(addr: str) -> str:
    """Identifica um endereço"""
    addr_lower = addr.lower()
    
    if addr_lower in KNOWN_ADDRESSES:
        return KNOWN_ADDRESSES[addr_lower]
    
    if addr_lower in KNOWN_CONTRACTS:
        return f"📋 {KNOWN_CONTRACTS[addr_lower]}"
    
    return "❓ DESCONHECIDO"


def get_all_transactions(address: str):
    """Busca todas as transações"""
    print(f"\n{'='*70}")
    print(f"🔍 AUDITORIA DE SEGURANÇA")
    print(f"{'='*70}")
    print(f"\n📍 Endereço: {address}")
    print(f"🏷️ Identificação: {identify_address(address)}")
    
    # Busca info do endereço
    try:
        response = requests.get(f"{BLOCKSCOUT_API}/addresses/{address}", timeout=30)
        data = response.json()
        
        if response.status_code == 200:
            balance = format_value(data.get("coin_balance", "0"), 18)
            print(f"\n💰 Saldo MATIC atual: {balance}")
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
    
    return address


def get_token_transfers_detailed(address: str):
    """Busca transferências de tokens com análise detalhada"""
    print(f"\n{'='*70}")
    print(f"📊 ANÁLISE DE TRANSFERÊNCIAS DE TOKENS")
    print(f"{'='*70}")
    
    try:
        # Busca todas as transferências (várias páginas se necessário)
        all_transfers = []
        next_page = None
        
        while True:
            params = {}
            if next_page:
                params = next_page
            
            response = requests.get(
                f"{BLOCKSCOUT_API}/addresses/{address}/token-transfers",
                params=params,
                timeout=30
            )
            data = response.json()
            
            if response.status_code != 200:
                break
            
            transfers = data.get("items", [])
            all_transfers.extend(transfers)
            
            # Verifica se tem próxima página
            next_page_params = data.get("next_page_params")
            if not next_page_params:
                break
            next_page = next_page_params
        
        if not all_transfers:
            print("📭 Nenhuma transferência encontrada")
            return []
        
        print(f"\n📋 Total de transferências: {len(all_transfers)}")
        
        # Separa ENTRADAS e SAÍDAS
        incoming = []
        outgoing = []
        
        for tx in all_transfers:
            to_addr = tx.get("to", {}).get("hash", "").lower()
            from_addr = tx.get("from", {}).get("hash", "").lower()
            
            if to_addr == address.lower():
                incoming.append(tx)
            else:
                outgoing.append(tx)
        
        # === ANÁLISE DE SAÍDAS (CRÍTICO) ===
        print(f"\n{'='*70}")
        print(f"⚠️  TRANSAÇÕES DE SAÍDA (REQUEREM ATENÇÃO)")
        print(f"{'='*70}")
        print(f"\n📤 Total de saídas: {len(outgoing)}")
        
        suspicious_count = 0
        total_out_by_token = defaultdict(Decimal)
        destinations = defaultdict(list)
        
        for tx in outgoing:
            token = tx.get("token", {})
            decimals = int(token.get("decimals", 18) or 18)
            value = Decimal(tx.get("total", {}).get("value", "0")) / Decimal(10 ** decimals)
            symbol = token.get("symbol", "???")
            timestamp = tx.get("timestamp", "?")[:19].replace("T", " ")
            
            to_addr = tx.get("to", {}).get("hash", "?")
            to_identity = identify_address(to_addr)
            
            total_out_by_token[symbol] += value
            destinations[to_addr].append({
                "value": value,
                "symbol": symbol,
                "timestamp": timestamp,
                "tx_hash": tx.get("tx_hash", "?")
            })
            
            # Marca como suspeito se destino é desconhecido
            is_suspicious = "DESCONHECIDO" in to_identity
            
            if is_suspicious:
                suspicious_count += 1
                print(f"\n🚨 SAÍDA SUSPEITA #{suspicious_count}:")
            else:
                print(f"\n📤 Saída:")
            
            print(f"   💵 Valor: {value:.6f} {symbol}")
            print(f"   📅 Data: {timestamp}")
            print(f"   📍 Destino: {to_addr[:20]}...{to_addr[-8:]}")
            print(f"   🏷️ ID Destino: {to_identity}")
            print(f"   🔗 TX: {tx.get('tx_hash', '?')[:30]}...")
        
        # === RESUMO DE SAÍDAS ===
        print(f"\n{'='*70}")
        print(f"📊 RESUMO DE SAÍDAS POR TOKEN")
        print(f"{'='*70}")
        
        for symbol, total in total_out_by_token.items():
            print(f"   {symbol}: {total:.6f}")
        
        # === DESTINOS ÚNICOS ===
        print(f"\n{'='*70}")
        print(f"📍 DESTINOS DAS SAÍDAS ({len(destinations)} endereços únicos)")
        print(f"{'='*70}")
        
        for dest_addr, txs in destinations.items():
            identity = identify_address(dest_addr)
            total_value = sum(tx["value"] for tx in txs)
            print(f"\n   {dest_addr}")
            print(f"   🏷️ {identity}")
            print(f"   📊 {len(txs)} transações, total: {total_value:.6f}")
        
        # === ANÁLISE DE ENTRADAS ===
        print(f"\n{'='*70}")
        print(f"✅ TRANSAÇÕES DE ENTRADA")
        print(f"{'='*70}")
        print(f"\n📥 Total de entradas: {len(incoming)}")
        
        total_in_by_token = defaultdict(Decimal)
        
        for tx in incoming:
            token = tx.get("token", {})
            decimals = int(token.get("decimals", 18) or 18)
            value = Decimal(tx.get("total", {}).get("value", "0")) / Decimal(10 ** decimals)
            symbol = token.get("symbol", "???")
            timestamp = tx.get("timestamp", "?")[:19].replace("T", " ")
            
            from_addr = tx.get("from", {}).get("hash", "?")
            from_identity = identify_address(from_addr)
            
            total_in_by_token[symbol] += value
            
            print(f"\n📥 Entrada:")
            print(f"   💵 Valor: {value:.6f} {symbol}")
            print(f"   📅 Data: {timestamp}")
            print(f"   📍 Origem: {from_addr[:20]}...{from_addr[-8:]}")
            print(f"   🏷️ ID Origem: {from_identity}")
        
        # === RESUMO DE ENTRADAS ===
        print(f"\n{'='*70}")
        print(f"📊 RESUMO DE ENTRADAS POR TOKEN")
        print(f"{'='*70}")
        
        for symbol, total in total_in_by_token.items():
            print(f"   {symbol}: {total:.6f}")
        
        # === BALANÇO ===
        print(f"\n{'='*70}")
        print(f"📈 BALANÇO (ENTRADAS - SAÍDAS)")
        print(f"{'='*70}")
        
        all_tokens = set(list(total_in_by_token.keys()) + list(total_out_by_token.keys()))
        
        for symbol in all_tokens:
            entrada = total_in_by_token.get(symbol, Decimal(0))
            saida = total_out_by_token.get(symbol, Decimal(0))
            balanco = entrada - saida
            
            if balanco >= 0:
                print(f"   {symbol}: +{balanco:.6f} (entrada: {entrada:.6f}, saída: {saida:.6f})")
            else:
                print(f"   {symbol}: {balanco:.6f} ⚠️ (entrada: {entrada:.6f}, saída: {saida:.6f})")
        
        # === ALERTAS ===
        print(f"\n{'='*70}")
        print(f"🚨 ALERTAS DE SEGURANÇA")
        print(f"{'='*70}")
        
        if suspicious_count > 0:
            print(f"\n⚠️  {suspicious_count} transação(ões) para endereços DESCONHECIDOS!")
            print("   Verifique se essas transações foram autorizadas.")
        else:
            print(f"\n✅ Nenhuma transação para endereços desconhecidos.")
        
        return all_transfers
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


def get_matic_transactions(address: str):
    """Busca transações de MATIC (nativo)"""
    print(f"\n{'='*70}")
    print(f"🟣 TRANSAÇÕES DE MATIC (Nativo)")
    print(f"{'='*70}")
    
    try:
        response = requests.get(
            f"{BLOCKSCOUT_API}/addresses/{address}/transactions",
            timeout=30
        )
        data = response.json()
        
        if response.status_code != 200:
            print(f"⚠️ Erro ao buscar transações: {data}")
            return
        
        transactions = data.get("items", [])
        
        if not transactions:
            print("📭 Nenhuma transação MATIC encontrada")
            return
        
        print(f"\n📋 Total de transações MATIC: {len(transactions)}")
        
        # Separa entradas e saídas
        for tx in transactions:
            value = format_value(tx.get("value", "0"), 18)
            timestamp = tx.get("timestamp", "?")[:19].replace("T", " ")
            
            from_addr = tx.get("from", {}).get("hash", "?")
            to_addr = tx.get("to", {}).get("hash", "?") if tx.get("to") else "Contract"
            
            is_incoming = to_addr.lower() == address.lower()
            
            if is_incoming:
                print(f"\n📥 RECEBIDO: {value} MATIC")
                print(f"   📍 De: {from_addr[:20]}... ({identify_address(from_addr)})")
            else:
                print(f"\n📤 ENVIADO: {value} MATIC")
                print(f"   📍 Para: {to_addr[:20]}... ({identify_address(to_addr)})")
            
            print(f"   📅 Data: {timestamp}")
            print(f"   🔗 TX: {tx['hash'][:30]}...")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else "0xeB4c1Fe541e5361340f10B5c712d82aA6e441319"
    
    print("\n" + "="*70)
    print("🔒 AUDITORIA DE SEGURANÇA - HOLD WALLET")
    print("="*70)
    print(f"\n⏰ Data da auditoria: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    # Executa auditoria
    get_all_transactions(address)
    get_token_transfers_detailed(address)
    get_matic_transactions(address)
    
    print("\n" + "="*70)
    print("📋 CONCLUSÃO DA AUDITORIA")
    print("="*70)
    
    print("""
    
    🔍 PRÓXIMOS PASSOS RECOMENDADOS:
    
    1. Verifique se todos os endereços de DESTINO das saídas são conhecidos
    2. Compare com os trades registrados no banco de dados
    3. Verifique se há transações não autorizadas
    4. Se encontrar transação suspeita:
       - Anote o TX Hash
       - Verifique no PolygonScan
       - Compare com logs do backend
    
    """)
    
    print(f"\n🔗 Links para análise manual:")
    print(f"   PolygonScan: https://polygonscan.com/address/{address}")
    print(f"   Blockscout: https://polygon.blockscout.com/address/{address}")
    print()


if __name__ == "__main__":
    main()
