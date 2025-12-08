#!/usr/bin/env python3
"""
Script para testar envio de USDT com 2FA
Testa o fluxo completo:
1. Login
2. Estimar taxas USDT
3. Enviar USDT com 2FA
"""

import requests
import json
import time
from datetime import datetime

# Configuração
API_BASE = "http://127.0.0.1:8000"
EMAIL = "app@holdwallet.com"
PASSWORD = "Abc123@@"
WALLET_ID = "cdfd5281-483a-4f4b-ad70-290d65d2216d"
FROM_ADDRESS = "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6"
TO_ADDRESS = "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa"
AMOUNT = "0.5"  # 0.5 USDT para teste (quantidade pequena)
NETWORK = "polygon"
TOKEN_SYMBOL = "USDT"
TWO_FA_TOKEN = "726005"  # Obter do app autenticador

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.END}")

def print_json(obj, label=""):
    if label:
        print(f"\n{Colors.BOLD}{label}:{Colors.END}")
    print(json.dumps(obj, indent=2, ensure_ascii=False))

def test_usdt_send():
    """Testa envio de USDT completo"""
    
    print_header("TESTE COMPLETO: Envio de USDT com 2FA")
    
    session = requests.Session()
    access_token = None
    
    # ============================================
    # PASSO 1: LOGIN
    # ============================================
    print_header("PASSO 1: Login no Sistema")
    
    login_url = f"{API_BASE}/auth/login"
    login_data = {
        "email": EMAIL,
        "password": PASSWORD
    }
    
    print_info(f"Fazendo login com: {EMAIL}")
    print_info(f"URL: POST {login_url}")
    print_json(login_data, "Payload")
    
    try:
        response = session.post(login_url, json=login_data)
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')
            print_success(f"Login bem-sucedido! Token obtido")
            session.headers.update({'Authorization': f'Bearer {access_token}'})
            print_json(data, "Resposta")
        else:
            print_error(f"Erro no login: {response.status_code}")
            print_json(response.json(), "Resposta")
            return
    except Exception as e:
        print_error(f"Exceção: {e}")
        return
    
    # ============================================
    # PASSO 2: ESTIMAR TAXAS USDT
    # ============================================
    print_header("PASSO 2: Estimar Taxas para USDT")
    
    estimate_url = f"{API_BASE}/wallets/estimate-fee"
    estimate_data = {
        "wallet_id": WALLET_ID,
        "to_address": TO_ADDRESS,
        "amount": AMOUNT,
        "network": NETWORK
    }
    
    print_info(f"Estimando taxas para {AMOUNT} USDT em {NETWORK}")
    print_info(f"URL: POST {estimate_url}")
    print_json(estimate_data, "Payload")
    
    try:
        response = session.post(estimate_url, json=estimate_data)
        if response.status_code == 200:
            fee_data = response.json()
            print_success("Taxas estimadas com sucesso!")
            print_json(fee_data, "Resposta")
            
            # Extrair taxas
            slow_fee = fee_data.get('fee_estimates', {}).get('slow_fee')
            standard_fee = fee_data.get('fee_estimates', {}).get('standard_fee')
            fast_fee = fee_data.get('fee_estimates', {}).get('fast_fee')
            
            print(f"\nTaxas estimadas:")
            print(f"  Lenta (5-10min): {slow_fee}")
            print(f"  Padrão (2-5min): {standard_fee}")
            print(f"  Rápida (<1min): {fast_fee}")
        else:
            print_error(f"Erro ao estimar taxas: {response.status_code}")
            print_json(response.json(), "Resposta")
            return
    except Exception as e:
        print_error(f"Exceção: {e}")
        return
    
    # ============================================
    # PASSO 3: ENVIAR USDT COM 2FA
    # ============================================
    print_header("PASSO 3: Enviar USDT com 2FA")
    
    send_url = f"{API_BASE}/wallets/send"
    send_data = {
        "wallet_id": WALLET_ID,
        "to_address": TO_ADDRESS,
        "amount": AMOUNT,
        "network": NETWORK,
        "fee_level": "standard",
        "token_symbol": TOKEN_SYMBOL,
        "two_factor_token": TWO_FA_TOKEN
    }
    
    print_info(f"Enviando {AMOUNT} USDT de {FROM_ADDRESS} para {TO_ADDRESS}")
    print_info(f"Rede: {NETWORK}")
    print_info(f"Token: {TOKEN_SYMBOL}")
    print_info(f"2FA Token: {TWO_FA_TOKEN}")
    print_info(f"URL: POST {send_url}")
    print_json(send_data, "Payload")
    
    try:
        response = session.post(send_url, json=send_data)
        
        if response.status_code == 200:
            tx_data = response.json()
            print_success("Transação enviada com sucesso!")
            print_json(tx_data, "Resposta")
            
            # Extrair dados importantes
            tx_hash = tx_data.get('tx_hash')
            transaction_id = tx_data.get('transaction_id')
            explorer_url = tx_data.get('explorer_url')
            
            print_header("RESUMO DA TRANSAÇÃO")
            print(f"Transaction ID: {Colors.BOLD}{transaction_id}{Colors.END}")
            print(f"TX Hash: {Colors.BOLD}{tx_hash}{Colors.END}")
            print(f"Status: {Colors.BOLD}{tx_data.get('status')}{Colors.END}")
            print(f"Explorer: {Colors.BOLD}{explorer_url}{Colors.END}")
            print(f"Tempo estimado: {Colors.BOLD}{tx_data.get('estimated_confirmation_time')}{Colors.END}")
            
        else:
            print_error(f"Erro ao enviar transação: {response.status_code}")
            error_data = response.json()
            print_json(error_data, "Resposta")
            
            if response.status_code == 403:
                print_error("Erro 403: Verifique se o 2FA token está correto")
            elif response.status_code == 400:
                print_error("Erro 400: Verifique se os dados da transação estão corretos")
            
            return
    except Exception as e:
        print_error(f"Exceção: {e}")
        return
    
    # ============================================
    # SUCESSO!
    # ============================================
    print_header("TESTE CONCLUÍDO COM SUCESSO!")
    print(f"\n{Colors.GREEN}🎉 Transação USDT enviada com sucesso!{Colors.END}\n")
    print(f"Próximos passos:")
    print(f"1. Aguarde confirmação (2-5 minutos)")
    print(f"2. Verifique status em: {explorer_url}")
    print(f"3. Veja no histórico de transações")

if __name__ == "__main__":
    print("\n")
    print(f"{Colors.BOLD}{Colors.BLUE}╔════════════════════════════════════════════════════════╗{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}║    TESTE DE ENVIO DE USDT COM 2FA - HOLDWALLET        ║{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}╚════════════════════════════════════════════════════════╝{Colors.END}\n")
    
    print(f"Configuração:")
    print(f"  API URL: {API_BASE}")
    print(f"  Email: {EMAIL}")
    print(f"  Wallet ID: {WALLET_ID}")
    print(f"  De: {FROM_ADDRESS}")
    print(f"  Para: {TO_ADDRESS}")
    print(f"  Valor: {AMOUNT} {TOKEN_SYMBOL}")
    print(f"  Rede: {NETWORK}")
    print(f"  2FA Token: {TWO_FA_TOKEN}")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    test_usdt_send()
