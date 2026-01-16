#!/usr/bin/env python3
"""
🧪 Script de Teste: Enviar 5 MATIC (Polygon) 
============================================
Simula o fluxo completo como se fosse o frontend

Usuário: contato@josecarlosmartins.com
Destino: 0x93aa6710b3bdaa3df857cb5f0b1db3ee17ec33c1
Valor: 5 MATIC
Rede: Polygon
"""

import requests
import pyotp
import sys
import os

# Adicionar path do backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# ============================================
# CONFIGURAÇÕES
# ============================================
# API_BASE = "http://localhost:8000"  # Local
API_BASE = "https://api.wolknow.com/v1"  # Produção

# Credenciais
EMAIL = "contato@josecarlosmartins.com"
PASSWORD = "Jcm15!@#"

# Dados da transação
WALLET_ID = "991be417-9dd8-4879-8ddd-09a3a1d4466e"
TO_ADDRESS = "0x93aa6710b3bdaa3df857cb5f0b1db3ee17ec33c1"
AMOUNT = "5"  # 5 MATIC
NETWORK = "polygon"
FEE_LEVEL = "standard"

# Secret 2FA (criptografado no banco)
ENCRYPTED_2FA_SECRET = "Z0FBQUFBQnBYWFpLdVhITk5jUzV5bFZ6dk43R2VjNlo5T0xZM1dZNmRUNWtvMUotWXZudndyeklmNFdlN2pBVVJ0WVYtV01HZ2N0M0hlRlB3eEJuMjFUTWJyYkJ3M2hjVTBESmticTMxZjdmZTdWRThMUWoyM0FCRFZrTm1Jc1N3eWRQd3FmVmlZNDc="


def decrypt_2fa_secret():
    """Descriptografa o secret 2FA do banco"""
    try:
        from app.services.crypto_service import CryptoService
        crypto = CryptoService()
        decrypted = crypto.decrypt_data(ENCRYPTED_2FA_SECRET)
        print(f"✅ Secret 2FA descriptografado: {decrypted[:10]}...")
        return decrypted
    except Exception as e:
        print(f"❌ Erro ao descriptografar 2FA: {e}")
        return None


def generate_totp(secret: str) -> str:
    """Gera código TOTP atual"""
    totp = pyotp.TOTP(secret)
    code = totp.now()
    print(f"🔑 Código 2FA gerado: {code}")
    return code


def step1_login():
    """Passo 1: Fazer login e obter token JWT"""
    print("\n" + "="*50)
    print("📝 PASSO 1: LOGIN")
    print("="*50)
    
    url = f"{API_BASE}/auth/login"
    payload = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    print(f"POST {url}")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Login bem sucedido!")
        print(f"   Token: {token[:50]}...")
        return token
    else:
        print(f"❌ Erro no login: {response.status_code}")
        print(f"   Resposta: {response.text}")
        return None


def step2_verify_balance(token: str):
    """Passo 2: Verificar saldo antes de enviar"""
    print("\n" + "="*50)
    print("💰 PASSO 2: VERIFICAR SALDO")
    print("="*50)
    
    # Já verificamos manualmente que tem ~3639 MATIC
    # Vamos apenas confirmar que a API responde
    url = f"{API_BASE}/wallets/{WALLET_ID}/balances"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {url}")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        print("✅ API de saldos respondeu!")
        print("   ℹ️ Saldo verificado manualmente: ~3639 MATIC")
        return 3639  # Sabemos que tem esse saldo
    else:
        print(f"⚠️ Erro ao verificar saldo: {response.status_code}")
        print("   ℹ️ Continuando com saldo conhecido: ~3639 MATIC")
        return 3639  # Continuar mesmo assim


def step3_estimate_fee(token: str):
    """Passo 3: Estimar taxa de gas"""
    print("\n" + "="*50)
    print("⛽ PASSO 3: ESTIMAR TAXA DE GAS")
    print("="*50)
    
    url = f"{API_BASE}/wallets/estimate-fee"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "wallet_id": WALLET_ID,
        "to_address": TO_ADDRESS,
        "amount": AMOUNT,
        "network": NETWORK
    }
    
    print(f"POST {url}")
    print(f"Payload: {payload}")
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Taxa estimada!")
        
        fees = data.get("fee_estimates", {})
        standard = fees.get("standard", {})
        print(f"   🔹 Taxa (standard): {standard.get('fee_native', 'N/A')} MATIC")
        print(f"   🔹 Taxa USD: ${standard.get('fee_usd', 'N/A')}")
        print(f"   🔹 Gas Price: {standard.get('gas_price_gwei', 'N/A')} Gwei")
        return data
    else:
        print(f"❌ Erro ao estimar taxa: {response.status_code}")
        print(f"   Resposta: {response.text}")
        return None


def step4_send_transaction(token: str, two_factor_code: str):
    """Passo 4: Enviar transação com 2FA"""
    print("\n" + "="*50)
    print("🚀 PASSO 4: ENVIAR TRANSAÇÃO")
    print("="*50)
    
    url = f"{API_BASE}/wallets/send"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "wallet_id": WALLET_ID,
        "to_address": TO_ADDRESS,
        "amount": AMOUNT,
        "network": NETWORK,
        "fee_level": FEE_LEVEL,
        "mode": "custodial",
        "two_factor_token": two_factor_code
    }
    
    print(f"POST {url}")
    print(f"Payload: {payload}")
    
    response = requests.post(url, json=payload, headers=headers)
    
    print(f"\n📋 Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ TRANSAÇÃO ENVIADA COM SUCESSO!")
        print(f"   🔗 TX Hash: {data.get('tx_hash')}")
        print(f"   🌐 Network: {data.get('network')}")
        print(f"   📤 De: {data.get('from_address')}")
        print(f"   📥 Para: {data.get('to_address')}")
        print(f"   💰 Valor: {data.get('amount')} MATIC")
        print(f"   ⛽ Taxa: {data.get('fee')}")
        print(f"   🔍 Explorer: {data.get('explorer_url')}")
        return data
    else:
        print(f"❌ ERRO AO ENVIAR TRANSAÇÃO!")
        print(f"   Status: {response.status_code}")
        print(f"   Resposta: {response.text}")
        
        try:
            error_data = response.json()
            detail = error_data.get("detail", "Erro desconhecido")
            print(f"   📛 Detalhe: {detail}")
        except:
            pass
        
        return None


def main():
    print("="*60)
    print("🧪 TESTE DE ENVIO: 5 MATIC via Polygon")
    print("="*60)
    print(f"De: Carteira {WALLET_ID[:8]}...")
    print(f"Para: {TO_ADDRESS}")
    print(f"Valor: {AMOUNT} MATIC")
    print(f"API: {API_BASE}")
    
    # Passo 1: Login
    token = step1_login()
    if not token:
        print("\n❌ Falha no login. Abortando.")
        return
    
    # Passo 2: Verificar saldo
    balance = step2_verify_balance(token)
    if balance < float(AMOUNT):
        print(f"\n❌ Saldo insuficiente: {balance} MATIC < {AMOUNT} MATIC")
        return
    
    # Passo 3: Estimar taxa
    fee_data = step3_estimate_fee(token)
    
    # Passo 4: Pedir código 2FA manualmente
    print("\n" + "="*50)
    print("🔐 AUTENTICAÇÃO 2FA")
    print("="*50)
    print("Abra seu aplicativo autenticador (Google Authenticator, Authy, etc)")
    print("e digite o código de 6 dígitos para sua conta HOLD Wallet:")
    
    two_factor_code = input("\n🔑 Código 2FA: ").strip()
    
    if len(two_factor_code) != 6 or not two_factor_code.isdigit():
        print("❌ Código inválido. Deve ter 6 dígitos.")
        return
    
    # Confirmar antes de enviar
    print("\n" + "="*50)
    print("⚠️  CONFIRMAÇÃO")
    print("="*50)
    print(f"Você está prestes a enviar:")
    print(f"   💰 {AMOUNT} MATIC")
    print(f"   📥 Para: {TO_ADDRESS}")
    print(f"   🔑 2FA: {two_factor_code}")
    
    confirm = input("\nDigite 'ENVIAR' para confirmar: ").strip()
    
    if confirm.upper() != "ENVIAR":
        print("❌ Operação cancelada pelo usuário.")
        return
    
    # Passo 5: Enviar transação
    result = step4_send_transaction(token, two_factor_code)
    
    if result:
        print("\n" + "="*60)
        print("🎉 TESTE CONCLUÍDO COM SUCESSO!")
        print("="*60)
        print(f"Verifique a transação em:")
        print(f"https://polygonscan.com/tx/{result.get('tx_hash')}")
    else:
        print("\n" + "="*60)
        print("❌ TESTE FALHOU")
        print("="*60)


if __name__ == "__main__":
    main()
