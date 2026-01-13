#!/usr/bin/env python3
"""
🧪 Teste Completo: Instant Trade com PIX Automático (Banco do Brasil)

Este script testa o fluxo completo:
1. Login do usuário
2. Criar cotação (quote)
3. Criar trade com PIX
4. Verificar QR Code gerado

Uso:
    python test_instant_trade_pix.py
"""

import requests
import json
import sys

# ========== CONFIGURAÇÃO ==========
BASE_URL = "http://localhost:8000"

# Credenciais de teste
TEST_EMAIL = "contato@josecarlosmartins.com"
TEST_PASSWORD = "Jcm15!@#"

# Parâmetros do trade
CRYPTO_SYMBOL = "USDT"  # ou ETH, BTC, etc
FIAT_AMOUNT = 100.0  # Valor em BRL para comprar crypto
NETWORK = "polygon"  # ethereum, polygon, bsc, etc

# ========== FUNÇÕES ==========

def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"📋 {msg}")


def login(email: str, password: str) -> str:
    """Faz login e retorna o token JWT"""
    print_header("1. LOGIN")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print_success("Login bem-sucedido!")
        print_info(f"Token: {token[:50]}...")
        return token
    else:
        print_error(f"Erro no login: {response.status_code}")
        print(response.text)
        sys.exit(1)


def create_quote(token: str, symbol: str, amount: float, network: str) -> dict:
    """Cria uma cotação para compra de crypto"""
    print_header("2. CRIAR COTAÇÃO")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Para compra (buy), usar fiat_amount em BRL
    payload = {
        "operation": "buy",
        "symbol": symbol,
        "fiat_amount": amount  # Valor em BRL para comprar crypto
    }
    
    print_info(f"Solicitando cotação: R$ {amount} em {symbol}")
    
    response = requests.post(
        f"{BASE_URL}/instant-trade/quote",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        quote = data.get("quote", {})  # A cotação vem dentro de "quote"
        print_success("Cotação criada!")
        print_info(f"Quote ID: {quote.get('quote_id')}")
        print_info(f"Cripto: {quote.get('crypto_amount')} {quote.get('symbol')}")
        print_info(f"Preço mercado: R$ {quote.get('crypto_price')}")
        print_info(f"Preço OTC: R$ {quote.get('otc_price')}")
        print_info(f"Spread: {quote.get('spread_percentage')}%")
        print_info(f"Taxa rede: {quote.get('network_fee_percentage')}%")
        print_info(f"Total BRL: R$ {quote.get('total_amount')}")
        print_info(f"Expira em: {quote.get('expires_in_seconds', 30)} segundos")
        return quote  # Retornar a cotação diretamente
    else:
        print_error(f"Erro ao criar cotação: {response.status_code}")
        print(response.text)
        sys.exit(1)


def create_trade_with_pix(token: str, quote_data: dict) -> dict:
    """Cria o trade e gera QR Code PIX automaticamente"""
    print_header("3. CRIAR TRADE COM PIX")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "quote_id": quote_data["quote_id"],
        "payment_method": "pix",
        "brl_amount": quote_data.get("fiat_amount"),  # Valor original
        "brl_total_amount": quote_data.get("total_amount"),  # Total com taxas
        "usd_to_brl_rate": 6.0  # Pode vir de outra fonte
    }
    
    print_info("Criando trade com PIX...")
    print_info(f"Quote ID: {payload['quote_id']}")
    print_info(f"Valor BRL: R$ {payload['brl_total_amount']}")
    
    response = requests.post(
        f"{BASE_URL}/instant-trade/create-with-pix",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success("Trade criado com PIX!")
        print_info(f"Trade ID: {data.get('trade_id')}")
        print_info(f"Referência: {data.get('reference_code')}")
        
        pix = data.get("pix", {})
        if pix:
            print("\n" + "-" * 40)
            print("📱 DADOS DO PIX:")
            print("-" * 40)
            print(f"TXID: {pix.get('txid')}")
            print(f"Valor: R$ {pix.get('valor')}")
            print(f"Expira em: {pix.get('expiracao_segundos')} segundos")
            print(f"Chave PIX: {pix.get('chave')}")
            
            qrcode = pix.get("qrcode", "")
            if qrcode:
                print("\n📋 PIX COPIA-E-COLA:")
                print("-" * 40)
                print(qrcode)
                print("-" * 40)
            
            if pix.get("qrcode_image"):
                print("\n✅ Imagem QR Code disponível (base64)")
        
        return data
    else:
        print_error(f"Erro ao criar trade: {response.status_code}")
        try:
            error_data = response.json()
            print(f"Detalhe: {error_data.get('detail', response.text)}")
        except:
            print(response.text)
        return None


def check_pix_status(token: str, trade_id: str):
    """Verifica status do pagamento PIX"""
    print_header("4. VERIFICAR STATUS PIX")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/instant-trade/{trade_id}/pix-status",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success("Status obtido!")
        print_info(f"PIX Pago: {'Sim' if data.get('pix_pago') else 'Não'}")
        print_info(f"Status do Trade: {data.get('trade_status')}")
        if data.get('valor_pago'):
            print_info(f"Valor Pago: R$ {data.get('valor_pago')}")
        if data.get('horario_pagamento'):
            print_info(f"Horário: {data.get('horario_pagamento')}")
        return data
    else:
        print_error(f"Erro ao verificar status: {response.status_code}")
        print(response.text)
        return None


def main():
    print("\n" + "🏦" * 20)
    print("  TESTE: INSTANT TRADE COM PIX BANCO DO BRASIL")
    print("🏦" * 20)
    
    # 1. Login
    token = login(TEST_EMAIL, TEST_PASSWORD)
    
    # 2. Criar cotação
    quote = create_quote(token, CRYPTO_SYMBOL, FIAT_AMOUNT, NETWORK)
    
    # 3. Criar trade com PIX
    trade = create_trade_with_pix(token, quote)
    
    if trade:
        # 4. Verificar status
        trade_id = trade.get("trade_id")
        if trade_id:
            check_pix_status(token, trade_id)
        
        print("\n" + "=" * 60)
        print("🎉 TESTE CONCLUÍDO COM SUCESSO!")
        print("=" * 60)
        print("\nPróximos passos:")
        print("1. Copie o PIX COPIA-E-COLA acima")
        print("2. Pague via app do banco")
        print("3. O sistema receberá webhook e confirmará automaticamente")
        print("4. Crypto será enviada para sua carteira!")
    else:
        print("\n❌ Teste falhou. Verifique os erros acima.")


if __name__ == "__main__":
    main()
