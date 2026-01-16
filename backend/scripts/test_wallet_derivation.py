#!/usr/bin/env python3
"""
Script para diagnosticar e testar derivação de carteira
Identifica o path correto para um endereço existente
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from bip_utils import (
    Bip39SeedGenerator, 
    Bip44, Bip44Coins, Bip44Changes,
    Bip32Slip10Secp256k1
)
from eth_account import Account
from web3 import Web3

# Configuração
TARGET_ADDRESS = "0xd9f66cae72550eba2552c46dd22038c12aa0d935"  # Endereço que queremos encontrar


def derive_address_bip44(mnemonic: str, coin: Bip44Coins, account: int = 0, address_index: int = 0) -> tuple:
    """Deriva endereço usando BIP44 padrão"""
    seed = Bip39SeedGenerator(mnemonic).Generate()
    bip44 = Bip44.FromSeed(seed, coin)
    bip44_account = bip44.Purpose().Coin().Account(account)
    bip44_change = bip44_account.Change(Bip44Changes.CHAIN_EXT)
    bip44_address = bip44_change.AddressIndex(address_index)
    
    private_key = bip44_address.PrivateKey().Raw().ToHex()
    address = bip44_address.PublicKey().ToAddress()
    
    return address, private_key


def derive_address_direct(mnemonic: str, path: str) -> tuple:
    """Deriva endereço usando path direto"""
    seed = Bip39SeedGenerator(mnemonic).Generate()
    
    # Parse path
    parts = path.replace("m/", "").split("/")
    
    bip32 = Bip32Slip10Secp256k1.FromSeed(seed)
    
    for part in parts:
        hardened = part.endswith("'")
        index = int(part.rstrip("'"))
        if hardened:
            bip32 = bip32.ChildKey(Bip32Slip10Secp256k1.HardenIndex(index))
        else:
            bip32 = bip32.ChildKey(index)
    
    private_key_hex = bip32.PrivateKey().Raw().ToHex()
    
    # Usar eth_account para derivar endereço
    account = Account.from_key(private_key_hex)
    
    return account.address, private_key_hex


def derive_with_eth_account(mnemonic: str) -> tuple:
    """Deriva usando eth_account diretamente (método mais comum)"""
    Account.enable_unaudited_hdwallet_features()
    account = Account.from_mnemonic(mnemonic)
    return account.address, account.key.hex()


def find_matching_address(mnemonic: str, target: str) -> dict:
    """Tenta encontrar o path que gera o endereço alvo"""
    target_lower = target.lower()
    results = []
    
    print(f"\n🔍 Procurando path para: {target}")
    print("=" * 60)
    
    # Teste 1: eth_account direto (mais comum para MetaMask/Trust Wallet)
    print("\n📝 Método 1: eth_account.from_mnemonic (padrão MetaMask)")
    try:
        address, pk = derive_with_eth_account(mnemonic)
        match = "✅ MATCH!" if address.lower() == target_lower else "❌"
        print(f"   Endereço: {address} {match}")
        if address.lower() == target_lower:
            results.append({"method": "eth_account.from_mnemonic", "address": address, "private_key": pk})
    except Exception as e:
        print(f"   Erro: {e}")
    
    # Teste 2: BIP44 Ethereum (m/44'/60'/0'/0/0)
    print("\n📝 Método 2: BIP44 Ethereum (m/44'/60'/0'/0/0)")
    try:
        address, pk = derive_address_bip44(mnemonic, Bip44Coins.ETHEREUM, 0, 0)
        match = "✅ MATCH!" if address.lower() == target_lower else "❌"
        print(f"   Endereço: {address} {match}")
        if address.lower() == target_lower:
            results.append({"method": "BIP44 Ethereum", "address": address, "private_key": pk})
    except Exception as e:
        print(f"   Erro: {e}")
    
    # Teste 3: Vários índices de conta
    print("\n📝 Método 3: BIP44 com diferentes índices")
    for account_idx in range(5):
        for addr_idx in range(5):
            try:
                address, pk = derive_address_bip44(mnemonic, Bip44Coins.ETHEREUM, account_idx, addr_idx)
                if address.lower() == target_lower:
                    print(f"   ✅ ENCONTRADO! Account={account_idx}, Index={addr_idx}")
                    print(f"   Endereço: {address}")
                    results.append({
                        "method": f"BIP44 account={account_idx} index={addr_idx}",
                        "address": address,
                        "private_key": pk
                    })
            except:
                pass
    
    # Teste 4: Paths alternativos comuns
    print("\n📝 Método 4: Paths alternativos")
    alternative_paths = [
        "m/44'/60'/0'/0/0",   # Ethereum padrão
        "m/44'/60'/0'/0",     # Sem índice final
        "m/44'/137'/0'/0/0",  # Polygon (alguns wallets)
        "m/44'/60'/0'",       # Ledger Live
        "m/44'/60'",          # Simplificado
    ]
    
    for path in alternative_paths:
        try:
            address, pk = derive_address_direct(mnemonic, path)
            match = "✅ MATCH!" if address.lower() == target_lower else ""
            if match:
                print(f"   {path}: {address} {match}")
                results.append({"method": f"Path {path}", "address": address, "private_key": pk})
        except Exception as e:
            pass
    
    return results


def test_send_transaction(private_key: str, from_address: str, to_address: str, amount_matic: float):
    """Testa envio de transação (simulação)"""
    print("\n" + "=" * 60)
    print("🧪 TESTE DE ENVIO DE TRANSAÇÃO")
    print("=" * 60)
    
    # Conectar ao Polygon
    rpc_url = os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print("❌ Não foi possível conectar ao Polygon RPC")
        return False
    
    print(f"✅ Conectado ao Polygon")
    
    # Verificar saldo
    from_checksum = Web3.to_checksum_address(from_address)
    balance_wei = w3.eth.get_balance(from_checksum)
    balance_matic = Web3.from_wei(balance_wei, 'ether')
    
    print(f"\n📊 Saldo atual: {balance_matic} MATIC")
    print(f"📤 Valor a enviar: {amount_matic} MATIC")
    print(f"📍 De: {from_address}")
    print(f"📍 Para: {to_address}")
    
    # Criar account
    account = Account.from_key(private_key)
    
    # Verificar se a chave corresponde ao endereço
    if account.address.lower() != from_address.lower():
        print(f"\n❌ ERRO: Chave privada não corresponde ao endereço!")
        print(f"   Esperado: {from_address}")
        print(f"   Da chave: {account.address}")
        return False
    
    print(f"\n✅ Chave privada verificada - corresponde ao endereço")
    
    # Estimar gas
    to_checksum = Web3.to_checksum_address(to_address)
    amount_wei = Web3.to_wei(amount_matic, 'ether')
    
    gas_price = w3.eth.gas_price
    gas_limit = 21000  # Transfer simples
    
    total_cost = amount_wei + (gas_price * gas_limit)
    
    print(f"\n💰 Estimativa de custos:")
    print(f"   Gas Price: {Web3.from_wei(gas_price, 'gwei')} Gwei")
    print(f"   Gas Limit: {gas_limit}")
    print(f"   Custo total: {Web3.from_wei(total_cost, 'ether')} MATIC")
    
    if balance_wei < total_cost:
        print(f"\n❌ Saldo insuficiente!")
        print(f"   Necessário: {Web3.from_wei(total_cost, 'ether')} MATIC")
        print(f"   Disponível: {balance_matic} MATIC")
        return False
    
    print(f"\n✅ Saldo suficiente para a transação")
    
    # Perguntar se quer enviar
    print("\n" + "=" * 60)
    response = input("🚀 Deseja ENVIAR a transação? (sim/não): ").strip().lower()
    
    if response != "sim":
        print("❌ Transação cancelada pelo usuário")
        return False
    
    # Construir transação
    nonce = w3.eth.get_transaction_count(from_checksum)
    
    tx = {
        'nonce': nonce,
        'to': to_checksum,
        'value': amount_wei,
        'gas': gas_limit,
        'gasPrice': gas_price,
        'chainId': 137  # Polygon
    }
    
    print(f"\n📝 Assinando transação...")
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    
    print(f"📤 Enviando transação...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"\n✅ TRANSAÇÃO ENVIADA!")
    print(f"   Hash: {tx_hash.hex()}")
    print(f"   Explorer: https://polygonscan.com/tx/{tx_hash.hex()}")
    
    return True


def main():
    print("=" * 60)
    print("🔐 DIAGNÓSTICO DE DERIVAÇÃO DE CARTEIRA")
    print("=" * 60)
    
    # Solicitar mnemonic
    print("\n⚠️  ATENÇÃO: Este script lida com chaves privadas!")
    print("   Só execute em ambiente seguro.\n")
    
    mnemonic = input("Digite o mnemonic (12/24 palavras): ").strip()
    
    if not mnemonic:
        print("❌ Mnemonic não fornecido")
        return
    
    # Encontrar path correto
    matches = find_matching_address(mnemonic, TARGET_ADDRESS)
    
    if not matches:
        print("\n" + "=" * 60)
        print("❌ NENHUM MATCH ENCONTRADO!")
        print("=" * 60)
        print("\nPossíveis causas:")
        print("1. O mnemonic está incorreto")
        print("2. O endereço foi gerado com um método não-padrão")
        print("3. O endereço foi importado de outra carteira")
        return
    
    print("\n" + "=" * 60)
    print(f"✅ ENCONTRADO {len(matches)} MATCH(ES)!")
    print("=" * 60)
    
    for i, match in enumerate(matches):
        print(f"\n[{i+1}] Método: {match['method']}")
        print(f"    Endereço: {match['address']}")
    
    # Perguntar se quer testar envio
    print("\n" + "=" * 60)
    test = input("Deseja testar envio de transação? (sim/não): ").strip().lower()
    
    if test == "sim":
        to_address = input("Endereço de destino: ").strip()
        amount = float(input("Valor em MATIC: ").strip())
        
        # Usar primeiro match
        match = matches[0]
        test_send_transaction(
            match['private_key'],
            match['address'],
            to_address,
            amount
        )


if __name__ == "__main__":
    main()
