#!/usr/bin/env python3
"""
Test fee estimation endpoint and transaction flow
"""

import requests
import json
import time
from datetime import datetime

API_URL = "http://127.0.0.1:8000"

# Credenciais do usuário
LOGIN_CREDS = {
    "email": "app@holdwallet.com",
    "password": "Abc123@@"
}

# Dados da transação para teste
TRANSACTION_DATA = {
    "wallet_id": "cdfd5281-483a-4f4b-ad70-290d65d2216d",
    "to_address": "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa",
    "amount": "5.0",
    "network": "polygon"
}

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {msg}")

def test_fee_estimation():
    """Test fee estimation endpoint"""
    log("🧪 Iniciando teste de estimação de taxa...")
    
    session = requests.Session()
    
    # Step 1: Login
    log("📝 Fazendo login...")
    try:
        login_response = session.post(
            f"{API_URL}/auth/login",
            json=LOGIN_CREDS,
            timeout=10
        )
        login_response.raise_for_status()
        login_data = login_response.json()
        log(f"✅ Login bem-sucedido: {login_data.get('email')}")
    except Exception as e:
        log(f"❌ Erro no login: {e}", "ERROR")
        return False
    
    # Step 2: Estimate fees
    log("💰 Estimando taxas de gás...")
    try:
        fee_response = session.post(
            f"{API_URL}/wallets/estimate-fee",
            json=TRANSACTION_DATA,
            timeout=10
        )
        fee_response.raise_for_status()
        fee_data = fee_response.json()
        
        log(f"✅ Taxas estimadas com sucesso!")
        log(f"   Rede: {fee_data.get('network')}")
        log(f"   Moeda: {fee_data.get('currency')}")
        
        fees = fee_data.get('fee_estimates', {})
        log(f"   Taxa SLOW: {fees.get('slow_fee')}")
        log(f"   Taxa STANDARD: {fees.get('standard_fee')}")
        log(f"   Taxa FAST: {fees.get('fast_fee')}")
        
        return True, fee_data
    except Exception as e:
        log(f"❌ Erro ao estimar taxa: {e}", "ERROR")
        if hasattr(e, 'response') and e.response is not None:
            log(f"   Resposta: {e.response.text}", "ERROR")
        return False, None

def test_transaction_with_2fa():
    """Test complete transaction flow with 2FA"""
    log("🔐 Testando fluxo de transação com 2FA...")
    
    session = requests.Session()
    
    # Step 1: Login
    log("📝 Fazendo login...")
    try:
        login_response = session.post(
            f"{API_URL}/auth/login",
            json=LOGIN_CREDS,
            timeout=10
        )
        login_response.raise_for_status()
    except Exception as e:
        log(f"❌ Erro no login: {e}", "ERROR")
        return False
    
    # Step 2: Estimate fees
    log("💰 Estimando taxas...")
    try:
        fee_response = session.post(
            f"{API_URL}/wallets/estimate-fee",
            json=TRANSACTION_DATA,
            timeout=10
        )
        fee_response.raise_for_status()
        fee_data = fee_response.json()
        log(f"✅ Taxas: {fee_data.get('fee_estimates')}")
    except Exception as e:
        log(f"❌ Erro ao estimar taxa: {e}", "ERROR")
        return False
    
    # Step 3: Get 2FA code (necesita do secret)
    # Para este teste, você precisará gerar manualmente ou usar a função TOTP
    log("⏳ Aguardando código 2FA...")
    log("   Gere um código válido do Google Authenticator ou Authy")
    
    while True:
        try:
            code = input("   Digite o código 2FA (ou 'skip' para pular): ").strip()
            if code.lower() == 'skip':
                log("⏭️  Pulando teste de transação")
                return True
            
            if len(code) != 6 or not code.isdigit():
                log("❌ Código deve ter 6 dígitos", "ERROR")
                continue
            
            break
        except KeyboardInterrupt:
            log("⏹️  Teste cancelado pelo usuário", "WARN")
            return False
    
    # Step 4: Send transaction with 2FA
    log("📤 Enviando transação com 2FA...")
    try:
        transaction_payload = {
            **TRANSACTION_DATA,
            "fee_preference": "standard",
            "two_factor_token": code
        }
        
        send_response = session.post(
            f"{API_URL}/wallets/send",
            json=transaction_payload,
            timeout=30
        )
        send_response.raise_for_status()
        tx_data = send_response.json()
        
        log(f"✅ Transação enviada com sucesso!")
        log(f"   TX Hash: {tx_data.get('tx_hash')}")
        log(f"   Status: {tx_data.get('status')}")
        
        return True
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            log(f"❌ 2FA falhou: Token inválido", "ERROR")
        else:
            log(f"❌ Erro ao enviar transação: {e}", "ERROR")
        if hasattr(e, 'response') and e.response is not None:
            log(f"   Resposta: {e.response.text}", "ERROR")
        return False
    except Exception as e:
        log(f"❌ Erro inesperado: {e}", "ERROR")
        return False

if __name__ == "__main__":
    log("=" * 60)
    log("TESTE DE ESTIMAÇÃO DE TAXA E FLUXO 2FA", "INFO")
    log("=" * 60)
    
    # Test fee estimation
    success, fee_data = test_fee_estimation()
    if not success:
        log("❌ Teste de estimação de taxa falhou!", "ERROR")
        exit(1)
    
    # Test transaction with 2FA
    log("")
    log("=" * 60)
    success = test_transaction_with_2fa()
    
    log("")
    log("=" * 60)
    if success:
        log("✅ TODOS OS TESTES PASSARAM!", "INFO")
    else:
        log("❌ ALGUNS TESTES FALHARAM", "ERROR")
    log("=" * 60)
