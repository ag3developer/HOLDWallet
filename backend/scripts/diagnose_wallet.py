#!/usr/bin/env python3
"""
Script para diagnosticar a carteira - busca mnemonic do banco e testa derivação
"""

import os
import sys
import base64
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text
from eth_account import Account
from web3 import Web3

# Configuração
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "XFTBN_LoZLTcGlhj0MBKZl9uHkUvg4Xd2F6u4RfbBJU=")
TARGET_ADDRESS = "0xd9f66cae72550eba2552c46dd22038c12aa0d935"


def decrypt_seed(encrypted_data: str) -> str:
    """Descriptografa o seed phrase"""
    f = Fernet(ENCRYPTION_KEY.encode())
    decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
    decrypted_data = f.decrypt(decoded_data)
    return decrypted_data.decode()


def derive_with_eth_account(mnemonic: str, account_index: int = 0) -> tuple:
    """Deriva usando eth_account (padrão MetaMask)"""
    Account.enable_unaudited_hdwallet_features()
    account = Account.from_mnemonic(mnemonic, account_path=f"m/44'/60'/0'/0/{account_index}")
    return account.address, account.key.hex()


def find_matching_derivation(mnemonic: str, target_address: str) -> dict:
    """Tenta encontrar qual índice gera o endereço correto"""
    target_lower = target_address.lower()
    
    print(f"\n🔍 Procurando derivação para: {target_address}")
    print("=" * 60)
    
    # Teste com diferentes índices de conta
    Account.enable_unaudited_hdwallet_features()
    
    for i in range(10):
        try:
            account = Account.from_mnemonic(mnemonic, account_path=f"m/44'/60'/0'/0/{i}")
            match = "✅ MATCH!" if account.address.lower() == target_lower else ""
            print(f"   Index {i}: {account.address} {match}")
            
            if account.address.lower() == target_lower:
                return {
                    "index": i,
                    "path": f"m/44'/60'/0'/0/{i}",
                    "address": account.address,
                    "private_key": account.key.hex()
                }
        except Exception as e:
            print(f"   Index {i}: Erro - {e}")
    
    return None


def test_transaction(private_key: str, from_address: str, to_address: str, amount_matic: float):
    """Testa envio de transação"""
    print("\n" + "=" * 60)
    print("🧪 TESTE DE ENVIO DE TRANSAÇÃO")
    print("=" * 60)
    
    rpc_url = os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print("❌ Não foi possível conectar ao Polygon RPC")
        return False
    
    print(f"✅ Conectado ao Polygon")
    
    from_checksum = Web3.to_checksum_address(from_address)
    balance_wei = w3.eth.get_balance(from_checksum)
    balance_matic = Web3.from_wei(balance_wei, 'ether')
    
    print(f"\n📊 Saldo atual: {balance_matic} MATIC")
    print(f"📤 Valor a enviar: {amount_matic} MATIC")
    print(f"📍 De: {from_address}")
    print(f"📍 Para: {to_address}")
    
    account = Account.from_key(private_key)
    
    if account.address.lower() != from_address.lower():
        print(f"\n❌ ERRO: Chave privada não corresponde ao endereço!")
        return False
    
    print(f"\n✅ Chave privada verificada")
    
    to_checksum = Web3.to_checksum_address(to_address)
    amount_wei = Web3.to_wei(amount_matic, 'ether')
    
    gas_price = w3.eth.gas_price
    gas_limit = 21000
    total_cost = amount_wei + (gas_price * gas_limit)
    
    print(f"\n💰 Estimativa:")
    print(f"   Gas Price: {Web3.from_wei(gas_price, 'gwei')} Gwei")
    print(f"   Custo total: {Web3.from_wei(total_cost, 'ether')} MATIC")
    
    if balance_wei < total_cost:
        print(f"\n❌ Saldo insuficiente!")
        return False
    
    print(f"\n✅ Saldo suficiente")
    
    response = input("\n🚀 Deseja ENVIAR a transação? (sim/não): ").strip().lower()
    
    if response != "sim":
        print("❌ Cancelado")
        return False
    
    nonce = w3.eth.get_transaction_count(from_checksum)
    
    tx = {
        'nonce': nonce,
        'to': to_checksum,
        'value': amount_wei,
        'gas': gas_limit,
        'gasPrice': gas_price,
        'chainId': 137
    }
    
    print(f"\n📝 Assinando...")
    signed_tx = w3.eth.account.sign_transaction(tx, private_key)
    
    print(f"📤 Enviando...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"\n✅ TRANSAÇÃO ENVIADA!")
    print(f"   Hash: {tx_hash.hex()}")
    print(f"   Explorer: https://polygonscan.com/tx/{tx_hash.hex()}")
    
    return True


def main():
    print("=" * 60)
    print("🔐 DIAGNÓSTICO COMPLETO DE CARTEIRA")
    print("=" * 60)
    
    print(f"\n📦 Conectando ao banco de dados...")
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Buscar carteira pelo endereço - incluindo a chave privada criptografada
        result = conn.execute(text("""
            SELECT w.id, w.user_id, w.name, w.encrypted_seed, 
                   a.network, a.address, a.encrypted_private_key, a.derivation_path,
                   u.email
            FROM wallets w
            JOIN addresses a ON w.id = a.wallet_id
            JOIN users u ON w.user_id = u.id
            WHERE LOWER(a.address) = LOWER(:address)
            LIMIT 1
        """), {"address": TARGET_ADDRESS})
        
        row = result.fetchone()
        
        if not row:
            print(f"\n❌ Carteira não encontrada para o endereço: {TARGET_ADDRESS}")
            return
        else:
            wallet_id, user_id, name, encrypted_seed, network, address, encrypted_private_key, derivation_path, email = row
            print(f"\n✅ Carteira encontrada!")
            print(f"   ID: {wallet_id}")
            print(f"   Nome: {name}")
            print(f"   Email: {email}")
            print(f"   Network: {network}")
            print(f"   Address: {address}")
            print(f"   Derivation Path: {derivation_path}")
            print(f"   Has encrypted_private_key: {bool(encrypted_private_key)}")
        
        # Se temos a chave privada direta, usar ela!
        if encrypted_private_key:
            print("\n🔓 Descriptografando chave privada direta...")
            
            try:
                private_key = decrypt_seed(encrypted_private_key)
                print(f"   ✅ Chave privada encontrada!")
                
                # Verificar se a chave corresponde ao endereço
                account = Account.from_key(private_key)
                if account.address.lower() == address.lower():
                    print(f"   ✅ Chave corresponde ao endereço!")
                    
                    # Perguntar se quer testar envio
                    test = input("\nDeseja testar envio de transação? (sim/não): ").strip().lower()
                    
                    if test == "sim":
                        to_address = input("Endereço de destino: ").strip()
                        amount = float(input("Valor em MATIC: ").strip())
                        
                        test_transaction(
                            private_key,
                            address,
                            to_address,
                            amount
                        )
                    return
                else:
                    print(f"   ❌ Chave NÃO corresponde ao endereço!")
                    print(f"      Esperado: {address}")
                    print(f"      Da chave: {account.address}")
            except Exception as e:
                print(f"   ❌ Erro ao descriptografar chave: {e}")
        
        # Fallback: tentar com o mnemonic
        if not encrypted_seed:
            print("\n❌ Sem encrypted_seed para tentar derivação")
            return
        
        print("\n🔓 Tentando com mnemonic...")
        
        try:
            mnemonic = decrypt_seed(encrypted_seed)
            words = mnemonic.split()
            print(f"   ✅ Mnemonic: {words[0]} {words[1]} ... {words[-1]} ({len(words)} palavras)")
        except Exception as e:
            print(f"   ❌ Erro ao descriptografar: {e}")
            return
        
        # Encontrar derivação correta
        match = find_matching_derivation(mnemonic, TARGET_ADDRESS)
        
        if not match:
            print("\n" + "=" * 60)
            print("❌ NENHUM MATCH ENCONTRADO!")
            print("=" * 60)
            print("\nIsso significa que:")
            print("1. O endereço no banco foi gerado com outro mnemonic")
            print("2. Ou com um método de derivação não-padrão")
            return
        
        print("\n" + "=" * 60)
        print("✅ DERIVAÇÃO ENCONTRADA!")
        print("=" * 60)
        print(f"   Path: {match['path']}")
        print(f"   Index: {match['index']}")
        print(f"   Address: {match['address']}")
        
        # Perguntar se quer testar envio
        test = input("\nDeseja testar envio de transação? (sim/não): ").strip().lower()
        
        if test == "sim":
            to_address = input("Endereço de destino: ").strip()
            amount = float(input("Valor em MATIC: ").strip())
            
            test_transaction(
                match['private_key'],
                match['address'],
                to_address,
                amount
            )


if __name__ == "__main__":
    main()
