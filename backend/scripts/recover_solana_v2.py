#!/usr/bin/env python3
"""
Script para RECUPERAR fundos de Solana do endereço antigo (derivado incorretamente)
para um novo endereço seguro.

O endereço antigo foi gerado usando:
- Path BIP44: m/44'/0'/0'/0/0 (Bitcoin, não Solana!)  
- Primeiros 32 bytes da public key secp256k1
- Codificação base58

Isso criou um endereço que PARECE ser Solana mas não é derivado corretamente.

A SOLUÇÃO:
Como o "endereço" é na verdade os primeiros 32 bytes da pubkey secp256k1,
e Solana endereços são simplesmente pubkeys Ed25519 em base58,
precisamos verificar se essa pubkey secp256k1 corresponde a alguma
keypair Ed25519 que possamos usar.

SPOILER: Não corresponde. São curvas diferentes.

MAS: Podemos tentar uma abordagem diferente - usar a private key secp256k1
derivada como SEED para criar uma keypair Ed25519.
"""

import os
import sys
import json
import time
import base58
import struct
from typing import Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from bip32 import BIP32
from app.services.crypto_service import CryptoService

# Tentar importar solders (biblioteca Solana moderna)
try:
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.transaction import Transaction
    from solders.system_program import TransferParams, transfer
    from solders.message import Message
    from solders.hash import Hash
    import requests
    SOLDERS_AVAILABLE = True
except ImportError:
    SOLDERS_AVAILABLE = False
    print("⚠️ solders não instalado. Instale com: pip install solders")


# ============================================
# CONFIGURAÇÃO  
# ============================================

# Endereço Solana antigo (onde estão os fundos)
OLD_ADDRESS = "9VPvGwtW5AVqCviQNc3iV1SsMLPajrgpbZHmPgd7D4E"

# Wallet ID
WALLET_ID = "991be417-9dd8-4879-8ddd-09a3a1d4466e"

# RPC Solana Mainnet
SOLANA_RPC = "https://api.mainnet-beta.solana.com"

# Valor mínimo de lamports para rent exemption
RENT_EXEMPT_MINIMUM = 890880  # ~0.00089 SOL


def get_balance(address: str) -> Tuple[float, int]:
    """Retorna saldo em SOL e lamports"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBalance",
        "params": [address]
    }
    resp = requests.post(SOLANA_RPC, json=payload, timeout=30)
    result = resp.json()
    if "error" in result:
        raise ValueError(f"RPC Error: {result['error']}")
    lamports = result["result"]["value"]
    return lamports / 1e9, lamports


def get_recent_blockhash() -> str:
    """Obtém blockhash recente para transação"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getLatestBlockhash",
        "params": [{"commitment": "finalized"}]
    }
    resp = requests.post(SOLANA_RPC, json=payload, timeout=30)
    result = resp.json()
    if "error" in result:
        raise ValueError(f"RPC Error: {result['error']}")
    return result["result"]["value"]["blockhash"]


def send_transaction(signed_tx: bytes) -> str:
    """Envia transação assinada"""
    import base64
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "sendTransaction",
        "params": [
            base64.b64encode(signed_tx).decode(),
            {"encoding": "base64", "preflightCommitment": "confirmed"}
        ]
    }
    resp = requests.post(SOLANA_RPC, json=payload, timeout=60)
    result = resp.json()
    if "error" in result:
        raise ValueError(f"RPC Error: {result['error']}")
    return result["result"]


def main():
    print("=" * 70)
    print("🔧 RECUPERAÇÃO DE FUNDOS SOLANA - ANÁLISE DETALHADA")
    print("=" * 70)
    
    if not SOLDERS_AVAILABLE:
        print("\n❌ Biblioteca solders não disponível. Instalando...")
        os.system("pip install solders")
        print("Por favor, execute o script novamente.")
        return
    
    # 1. Verificar saldo
    print(f"\n📍 Endereço antigo: {OLD_ADDRESS}")
    try:
        sol, lamports = get_balance(OLD_ADDRESS)
        print(f"💰 Saldo: {sol:.9f} SOL ({lamports:,} lamports)")
    except Exception as e:
        print(f"❌ Erro ao verificar saldo: {e}")
        return
    
    if lamports == 0:
        print("⚠️ Sem saldo para recuperar.")
        return
    
    # 2. Buscar mnemonic
    print("\n🔑 Buscando dados da carteira...")
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT encrypted_seed FROM wallets WHERE id = %s", (WALLET_ID,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        print(f"❌ Wallet {WALLET_ID} não encontrada")
        return
    
    crypto = CryptoService()
    mnemonic = crypto.decrypt_data(str(row[0]))
    print(f"✅ Mnemonic: {mnemonic.split()[0]}...{mnemonic.split()[-1]} ({len(mnemonic.split())} palavras)")
    
    # 3. Derivar keypairs
    seed = crypto.mnemonic_to_seed(mnemonic)
    bip32 = BIP32.from_seed(seed)
    
    # Path antigo (Bitcoin coin type!)
    old_path = "m/44'/0'/0'/0/0"
    old_privkey = bip32.get_privkey_from_path(old_path)
    old_pubkey = bip32.get_pubkey_from_path(old_path)
    old_pubkey_bytes = bytes.fromhex(old_pubkey.hex())
    
    # Verificar que conseguimos reproduzir o endereço antigo
    reproduced_address = base58.b58encode(old_pubkey_bytes[:32]).decode()
    
    print(f"\n🔐 Derivação (path={old_path}):")
    print(f"   Private key: {old_privkey.hex()[:16]}...")
    print(f"   Public key:  {old_pubkey.hex()[:32]}...")
    print(f"   Endereço reproduzido: {reproduced_address}")
    print(f"   Match: {'✅' if reproduced_address == OLD_ADDRESS else '❌'}")
    
    if reproduced_address != OLD_ADDRESS:
        print("\n❌ Não foi possível reproduzir o endereço. Abortando.")
        return
    
    # 4. ANÁLISE CRÍTICA
    print("\n" + "=" * 70)
    print("📊 ANÁLISE TÉCNICA")
    print("=" * 70)
    
    print("""
O endereço Solana antigo foi criado de forma INCORRETA:

1. Foi usado BIP44 path m/44'/0'/0'/0/0 (Bitcoin, deveria ser 501 para Solana)
2. Os primeiros 32 bytes da public key SECP256K1 foram usados como "endereço"
3. Solana usa Ed25519, não secp256k1

PROBLEMA:
- A "public key" no endereço antigo NÃO é uma public key Ed25519 válida
- Não existe private key Ed25519 que corresponda a ela
- Portanto, não há como assinar transações de forma convencional

PORÉM, há uma possibilidade:
- Se usarmos a private key secp256k1 (32 bytes) como SEED para Ed25519
- Podemos gerar uma keypair Ed25519 determinística
- E verificar se a public key gerada coincide com o "endereço" antigo
""")
    
    # 5. Tentar abordagem: usar privkey secp256k1 como seed Ed25519
    print("\n🧪 Tentativa 1: Usar private key como seed Ed25519...")
    
    # A private key secp256k1 tem 32 bytes - perfeito para seed Ed25519
    privkey_bytes = bytes.fromhex(old_privkey.hex())
    print(f"   Private key (32 bytes): {privkey_bytes.hex()[:32]}...")
    
    # Criar keypair Ed25519 usando a privkey como seed
    keypair_from_privkey = Keypair.from_seed(privkey_bytes)
    pubkey_from_privkey = str(keypair_from_privkey.pubkey())
    
    print(f"   Ed25519 pubkey gerada: {pubkey_from_privkey}")
    print(f"   Match com endereço antigo: {'✅ SIM!' if pubkey_from_privkey == OLD_ADDRESS else '❌ NÃO'}")
    
    # 6. Tentar abordagem 2: usar os 32 bytes da pubkey como seed
    print("\n🧪 Tentativa 2: Usar bytes da pubkey como seed Ed25519...")
    
    pubkey_32_bytes = old_pubkey_bytes[:32]
    keypair_from_pubkey = Keypair.from_seed(pubkey_32_bytes)
    pubkey_from_pubkey = str(keypair_from_pubkey.pubkey())
    
    print(f"   Ed25519 pubkey gerada: {pubkey_from_pubkey}")
    print(f"   Match com endereço antigo: {'✅ SIM!' if pubkey_from_pubkey == OLD_ADDRESS else '❌ NÃO'}")
    
    # 7. Verificar se o endereço antigo é uma pubkey Ed25519 válida de outra forma
    print("\n🧪 Tentativa 3: Verificar se endereço é pubkey Ed25519 válida...")
    
    try:
        # Decodificar o endereço antigo
        address_bytes = base58.b58decode(OLD_ADDRESS)
        print(f"   Bytes do endereço: {len(address_bytes)} bytes")
        print(f"   Hex: {address_bytes.hex()}")
        
        # Tentar criar uma Pubkey com esses bytes
        try:
            old_pubkey_obj = Pubkey(address_bytes)
            print(f"   ✅ É uma Pubkey Solana válida sintaticamente")
            print(f"   Pubkey: {old_pubkey_obj}")
        except Exception as e:
            print(f"   ❌ Não é uma Pubkey válida: {e}")
            
    except Exception as e:
        print(f"   ❌ Erro ao decodificar: {e}")
    
    # 8. RESULTADO FINAL
    print("\n" + "=" * 70)
    print("📋 RESULTADO")
    print("=" * 70)
    
    # Verificar se alguma das tentativas funcionou
    can_recover = (pubkey_from_privkey == OLD_ADDRESS or pubkey_from_pubkey == OLD_ADDRESS)
    
    if can_recover:
        print("""
✅ RECUPERAÇÃO POSSÍVEL!

Uma das abordagens gerou a mesma pubkey do endereço antigo.
Isso significa que podemos assinar transações!
""")
        # Determinar qual keypair usar
        if pubkey_from_privkey == OLD_ADDRESS:
            recovery_keypair = keypair_from_privkey
            print("Usando: private key secp256k1 como seed")
        else:
            recovery_keypair = keypair_from_pubkey
            print("Usando: bytes da pubkey como seed")
        
        # Criar endereço de destino novo (Ed25519 correto)
        import hashlib
        new_seed = hashlib.pbkdf2_hmac('sha512', seed, b'solana', 2048)[:32]
        new_keypair = Keypair.from_seed(new_seed)
        new_address = str(new_keypair.pubkey())
        
        print(f"\n📤 Preparando transferência:")
        print(f"   De:   {OLD_ADDRESS}")
        print(f"   Para: {new_address}")
        
        # Calcular valor a enviar (deixar 5000 lamports para taxa)
        fee_lamports = 5000
        send_lamports = lamports - fee_lamports
        
        if send_lamports <= 0:
            print(f"   ❌ Saldo insuficiente para cobrir taxa")
            return
        
        print(f"   Valor: {send_lamports / 1e9:.9f} SOL")
        print(f"   Taxa:  {fee_lamports / 1e9:.9f} SOL")
        
        # Pedir confirmação
        print("\n⚠️ CONFIRMAR TRANSFERÊNCIA?")
        confirm = input("Digite 'SIM' para confirmar: ")
        
        if confirm.upper() != 'SIM':
            print("Cancelado pelo usuário.")
            return
        
        # Executar transferência
        print("\n🚀 Executando transferência...")
        
        try:
            # Obter blockhash
            blockhash = get_recent_blockhash()
            print(f"   Blockhash: {blockhash}")
            
            # Criar instrução de transferência
            transfer_ix = transfer(
                TransferParams(
                    from_pubkey=recovery_keypair.pubkey(),
                    to_pubkey=Pubkey.from_string(new_address),
                    lamports=send_lamports
                )
            )
            
            # Criar mensagem
            msg = Message.new_with_blockhash(
                [transfer_ix],
                recovery_keypair.pubkey(),
                Hash.from_string(blockhash)
            )
            
            # Criar e assinar transação
            tx = Transaction.new_unsigned(msg)
            tx.sign([recovery_keypair], Hash.from_string(blockhash))
            
            # Serializar
            signed_tx_bytes = bytes(tx)
            
            # Enviar
            tx_sig = send_transaction(signed_tx_bytes)
            
            print(f"\n✅ SUCESSO!")
            print(f"   Assinatura: {tx_sig}")
            print(f"   Explorer: https://solscan.io/tx/{tx_sig}")
            
        except Exception as e:
            print(f"\n❌ Erro na transferência: {e}")
            import traceback
            traceback.print_exc()
    
    else:
        print("""
❌ RECUPERAÇÃO NÃO É POSSÍVEL

Nenhuma das abordagens conseguiu gerar uma keypair Ed25519 cuja
public key corresponda ao endereço antigo.

EXPLICAÇÃO TÉCNICA:
O endereço antigo é: base58(pubkey_secp256k1[:32])

Isso NÃO é uma public key Ed25519 válida porque:
- secp256k1 e Ed25519 são curvas elípticas DIFERENTES
- Uma public key secp256k1 não tem relação matemática com Ed25519
- Não existe private key Ed25519 que gere essa public key

OS FUNDOS ESTÃO INACESSÍVEIS.

Para sacar, seria necessário:
1. Encontrar uma private key Ed25519 que gere essa pubkey (impossível computacionalmente)
2. Uma vulnerabilidade no Solana (não existe conhecida)

RECOMENDAÇÃO:
- Documentar a perda
- O sistema já foi corrigido para usar Ed25519
- Alertar outros usuários que possam ter depositado em endereços antigos
""")
        
        print(f"\n💰 Valor inacessível: {sol:.9f} SOL (aproximadamente ${sol * 100:.2f} USD)")


if __name__ == "__main__":
    main()
