#!/usr/bin/env python3
"""
Script para recuperar fundos de Solana do endereço antigo (secp256k1) 
para o novo endereço (Ed25519 correto).

O problema: O sistema antigo derivava endereços Solana usando secp256k1 (curva do Ethereum),
mas Solana usa Ed25519. Isso gerou endereços inválidos onde os usuários depositaram fundos.

Solução: Re-derivar a chave privada do método antigo e transferir para o novo endereço.
"""

import os
import sys
import base58
import hashlib
import requests
import json
from typing import Optional, Tuple

# Adicionar o path do backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from bip32 import BIP32
from app.services.crypto_service import CryptoService


# ============================================
# CONFIGURAÇÃO
# ============================================

# Endereço Solana antigo (com os fundos)
OLD_SOLANA_ADDRESS = "9VPvGwtW5AVqCviQNc3iV1SsMLPajrgpbZHmPgd7D4E"

# Wallet ID do usuário (da tabela wallets)
WALLET_ID = "991be417-9dd8-4879-8ddd-09a3a1d4466e"

# RPC da Solana (mainnet)
SOLANA_RPC = "https://api.mainnet-beta.solana.com"

# Valor a enviar (deixar None para enviar tudo menos taxa)
AMOUNT_TO_SEND = None  # Em SOL, ou None para MAX

# Taxa estimada (em SOL) - Solana tem taxa fixa baixa
SOLANA_FEE = 0.000005  # 5000 lamports

# ============================================
# FUNÇÕES AUXILIARES
# ============================================

def get_solana_balance(address: str) -> Tuple[float, int]:
    """Retorna o saldo em SOL e lamports"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBalance",
        "params": [address]
    }
    response = requests.post(SOLANA_RPC, json=payload, timeout=30)
    result = response.json()
    
    if "error" in result:
        raise Exception(f"Erro RPC: {result['error']}")
    
    lamports = result["result"]["value"]
    sol = lamports / 1_000_000_000
    return sol, lamports


def derive_old_solana_keypair(mnemonic: str) -> Tuple[bytes, bytes, str]:
    """
    Deriva a keypair Solana usando o método ANTIGO (incorreto, secp256k1).
    
    O método antigo usava:
    1. BIP44 path m/44'/501'/0'/0/0
    2. Pegava os primeiros 32 bytes da public key secp256k1
    3. Codificava em base58
    
    Isso NÃO é como Solana funciona, mas é como o código antigo fazia.
    
    Returns:
        Tuple[private_key_bytes, public_key_bytes, address]
    """
    crypto = CryptoService()
    seed = crypto.mnemonic_to_seed(mnemonic)
    bip32 = BIP32.from_seed(seed)
    
    # Path usado anteriormente para Solana
    path = "m/44'/501'/0'/0/0"
    
    # Derivar usando BIP32/secp256k1 (método antigo)
    private_key = bip32.get_privkey_from_path(path)
    public_key = bip32.get_pubkey_from_path(path)
    
    # O método antigo pegava os primeiros 32 bytes da pubkey
    pk_bytes = bytes.fromhex(public_key.hex())
    address = base58.b58encode(pk_bytes[:32]).decode()
    
    return private_key, pk_bytes[:32], address


def derive_new_solana_keypair(mnemonic: str) -> Tuple[bytes, bytes, str]:
    """
    Deriva a keypair Solana usando o método NOVO (correto, Ed25519).
    
    Returns:
        Tuple[private_key_bytes, public_key_bytes, address]
    """
    try:
        from solders.keypair import Keypair
    except ImportError:
        raise ImportError("Instale solders: pip install solders")
    
    crypto = CryptoService()
    seed = crypto.mnemonic_to_seed(mnemonic)
    
    # Derivar seed de 32 bytes para Ed25519 usando PBKDF2
    seed_bytes = hashlib.pbkdf2_hmac('sha512', seed, b'solana', 2048)[:32]
    
    # Criar keypair Ed25519
    keypair = Keypair.from_seed(seed_bytes)
    
    private_key = bytes(keypair)  # 64 bytes (seed + pubkey)
    public_key = bytes(keypair.pubkey())
    address = str(keypair.pubkey())
    
    return private_key, public_key, address


def create_and_sign_transfer(
    from_keypair_bytes: bytes,  # 64 bytes para Ed25519, ou 32 bytes private key
    to_address: str,
    lamports: int,
    recent_blockhash: str
) -> str:
    """
    Cria e assina uma transação de transferência Solana.
    
    NOTA: Esta é a parte complexa. O endereço antigo foi gerado de forma incorreta,
    então a "chave privada" não é uma chave Ed25519 válida.
    
    Na verdade, o que foi armazenado foi a chave privada secp256k1, que NÃO pode
    assinar transações Solana (que usam Ed25519).
    
    ISSO SIGNIFICA QUE OS FUNDOS ESTÃO TECNICAMENTE INACESSÍVEIS.
    """
    raise NotImplementedError("""
    ⚠️ PROBLEMA CRÍTICO IDENTIFICADO:
    
    O endereço Solana antigo foi gerado usando secp256k1 (curva do Ethereum).
    Solana usa Ed25519 para assinaturas.
    
    Isso significa que:
    1. O endereço foi gerado pegando bytes de uma public key secp256k1
    2. Não existe chave privada Ed25519 correspondente a esse endereço
    3. Os fundos estão em um endereço que NINGUÉM pode assinar
    
    SOLUÇÃO: Os fundos podem estar perdidos, A MENOS QUE:
    - O endereço gerado coincidentemente seja uma pubkey Ed25519 válida (improvável)
    - Consigamos encontrar o preimage Ed25519 (computacionalmente impossível)
    
    RECOMENDAÇÃO:
    - Documentar o valor perdido
    - Corrigir o sistema para nunca mais gerar endereços assim
    - Alertar usuários para não depositarem em endereços Solana antigos
    """)


def main():
    print("=" * 60)
    print("🔧 RECUPERAÇÃO DE FUNDOS SOLANA")
    print("=" * 60)
    
    # 1. Verificar saldo no endereço antigo
    print(f"\n📍 Endereço antigo: {OLD_SOLANA_ADDRESS}")
    try:
        sol_balance, lamports = get_solana_balance(OLD_SOLANA_ADDRESS)
        print(f"💰 Saldo: {sol_balance:.9f} SOL ({lamports:,} lamports)")
    except Exception as e:
        print(f"❌ Erro ao consultar saldo: {e}")
        return
    
    if lamports == 0:
        print("⚠️ Endereço sem saldo. Nada a recuperar.")
        return
    
    # 2. Conectar ao banco e buscar o mnemonic
    print("\n🔑 Buscando mnemonic da carteira...")
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("❌ DATABASE_URL não configurada")
        return
    
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT encrypted_seed FROM wallets WHERE id = %s
        ''', (WALLET_ID,))
        
        row = cursor.fetchone()
        if not row:
            print(f"❌ Wallet {WALLET_ID} não encontrada")
            conn.close()
            return
        
        encrypted_seed = row[0]
        conn.close()
        
        # Descriptografar
        crypto = CryptoService()
        mnemonic = crypto.decrypt_data(str(encrypted_seed))
        print(f"✅ Mnemonic recuperado: {mnemonic.split()[0]}... ({len(mnemonic.split())} palavras)")
        
    except Exception as e:
        print(f"❌ Erro ao acessar banco: {e}")
        return
    
    # 3. Derivar keypairs
    print("\n🔐 Derivando keypairs...")
    
    # Método antigo (secp256k1)
    old_privkey, old_pubkey, old_address = derive_old_solana_keypair(mnemonic)
    print(f"   Método ANTIGO (secp256k1):")
    print(f"   - Endereço derivado: {old_address}")
    print(f"   - Match com endereço com fundos: {'✅ SIM' if old_address == OLD_SOLANA_ADDRESS else '❌ NÃO'}")
    
    # Método novo (Ed25519)
    try:
        new_privkey, new_pubkey, new_address = derive_new_solana_keypair(mnemonic)
        print(f"\n   Método NOVO (Ed25519):")
        print(f"   - Endereço derivado: {new_address}")
    except ImportError as e:
        print(f"\n   ⚠️ Não foi possível derivar com Ed25519: {e}")
        new_address = "ERRO"
    
    # 4. Verificar se conseguimos recuperar
    print("\n" + "=" * 60)
    print("📊 ANÁLISE DA SITUAÇÃO")
    print("=" * 60)
    
    if old_address != OLD_SOLANA_ADDRESS:
        print("""
❌ PROBLEMA: O endereço derivado não corresponde ao endereço com fundos.
   Isso pode significar que:
   1. A carteira errada foi selecionada
   2. O método de derivação mudou
   3. O index do endereço é diferente
   
   Próximos passos:
   - Verificar se o WALLET_ID está correto
   - Tentar outros índices de derivação (0, 1, 2, ...)
""")
        return
    
    print("""
⚠️ SITUAÇÃO CRÍTICA:

O endereço com fundos ({}) foi gerado usando secp256k1.
Solana usa Ed25519 para assinar transações.

PROBLEMA TÉCNICO:
- secp256k1 e Ed25519 são curvas criptográficas DIFERENTES
- Uma chave privada secp256k1 NÃO pode assinar para uma "public key" 
  que foi criada pegando bytes arbitrários
- O "endereço" Solana antigo é basicamente um hash de dados secp256k1,
  não uma public key Ed25519 válida

IMPLICAÇÃO:
Os {} SOL neste endereço estão INACESSÍVEIS porque não existe
nenhuma chave privada que possa assinar transações para este endereço.

É como se alguém gerasse um "endereço" Bitcoin pegando letras aleatórias -
pode parecer um endereço, mas não há como gastar os fundos.

LIÇÕES:
1. Sempre usar a curva criptográfica correta para cada blockchain
2. Solana = Ed25519 (NÃO secp256k1)
3. Testar saques antes de aceitar depósitos

RECOMENDAÇÃO:
- Documentar a perda de {} SOL
- O sistema já foi corrigido para usar Ed25519
- Monitorar outros usuários que possam ter depositado em endereços antigos
""".format(OLD_SOLANA_ADDRESS, sol_balance, sol_balance))
    
    # Tentar mesmo assim (vai falhar, mas documenta a tentativa)
    print("\n" + "=" * 60)
    print("🧪 TENTATIVA DE RECUPERAÇÃO (experimental)")
    print("=" * 60)
    
    try:
        # Esta função vai lançar uma exceção explicando o problema
        create_and_sign_transfer(
            old_privkey,
            new_address,
            lamports - int(SOLANA_FEE * 1_000_000_000),
            "BLOCKHASH_PLACEHOLDER"
        )
    except NotImplementedError as e:
        print(str(e))


if __name__ == "__main__":
    main()
