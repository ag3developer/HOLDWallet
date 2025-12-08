#!/usr/bin/env python3
"""
Script interativo para enviar transação com 2FA
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def login():
    """Faz login e retorna o token"""
    print("\n" + "="*60)
    print("🔑 HOLDWALLET - LOGIN")
    print("="*60)
    
    email = input("\n📧 Email: ").strip()
    password = input("🔐 Senha: ").strip()
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            token = response.json()['access_token']
            print(f"\n✅ Login bem-sucedido!")
            return token, email
        else:
            print(f"\n❌ Erro no login: {response.json()}")
            return None, None
    except Exception as e:
        print(f"\n❌ Erro de conexão: {e}")
        return None, None

def send_transaction(token):
    """Envia uma transação com 2FA"""
    print("\n" + "="*60)
    print("📤 ENVIAR TRANSAÇÃO")
    print("="*60)
    
    print("\n💡 Valores padrão:")
    print("   Wallet ID: cdfd5281-483a-4f4b-ad70-290d65d2216d")
    print("   Endereço destino: 0x7913436c1B61575F66d31B6d5b77767A7dC30EFa")
    print("   Rede: polygon")
    
    wallet_id = input("\n💰 Wallet ID (Enter para padrão): ").strip()
    if not wallet_id:
        wallet_id = "cdfd5281-483a-4f4b-ad70-290d65d2216d"
    
    to_address = input("📍 Endereço destino (Enter para padrão): ").strip()
    if not to_address:
        to_address = "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa"
    
    amount = input("💵 Quantidade (em MATIC): ").strip()
    if not amount:
        amount = "5"
    
    network = input("🌐 Rede (Enter para polygon): ").strip()
    if not network:
        network = "polygon"
    
    fee_level = input("⚡ Nível de taxa (standard/fast/slow): ").strip()
    if not fee_level:
        fee_level = "standard"
    
    # Pergunta sobre 2FA
    print("\n" + "="*60)
    print("🔐 AUTENTICAÇÃO DE DOIS FATORES (2FA)")
    print("="*60)
    print("\nSeu autenticador (Google Authenticator, Authy, etc) está pronto?")
    use_2fa = input("Digitar código 2FA? (s/n): ").strip().lower() == 's'
    
    two_factor_token = None
    if use_2fa:
        two_factor_token = input("\n📱 Digite o código do seu autenticador (6 dígitos): ").strip()
        if len(two_factor_token) != 6 or not two_factor_token.isdigit():
            print("❌ Código inválido! Deve ter 6 dígitos.")
            return
    
    # Montar payload
    payload = {
        "wallet_id": wallet_id,
        "to_address": to_address,
        "amount": amount,
        "network": network,
        "fee_level": fee_level
    }
    
    if two_factor_token:
        payload["two_factor_token"] = two_factor_token
    
    # Enviar
    print("\n" + "="*60)
    print("⏳ Enviando transação...")
    print("="*60)
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/wallets/send", json=payload, headers=headers)
        
        print(f"\n📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ TRANSAÇÃO ENVIADA COM SUCESSO!")
            print(f"\n📋 Detalhes:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            data = response.json()
            print(f"\n❌ ERRO: {data.get('message', 'Erro desconhecido')}")
            print(f"\n📋 Resposta completa:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
    
    except Exception as e:
        print(f"\n❌ Erro de conexão: {e}")

def main():
    print("\n" + "="*60)
    print("🏦 HOLDWALLET - ENVIO DE TRANSAÇÃO COM 2FA")
    print("="*60)
    
    # Login
    token, email = login()
    if not token:
        print("\n❌ Falha na autenticação. Encerrando...")
        sys.exit(1)
    
    print(f"\n👤 Usuário: {email}")
    
    # Loop de transações
    while True:
        send_transaction(token)
        
        continuar = input("\n\nEnviar outra transação? (s/n): ").strip().lower()
        if continuar != 's':
            print("\n👋 Até logo!")
            break

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⛔ Operação cancelada pelo usuário")
        sys.exit(0)
