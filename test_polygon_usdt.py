#!/usr/bin/env python3
"""
Script para testar saldo USDT na rede Polygon
"""
import requests
import json
from datetime import datetime

# Configuração
API_BASE_URL = "http://127.0.0.1:8000"
WALLET_ID = "ada6ce2a-9a69-4328-860c-e918d37f23bb"  # ID da carteira para testar
USER_EMAIL = "app@holdwallet.com"  # Email do usuário
USER_PASSWORD = "Abc123@@"  # Senha do usuário

def get_auth_token():
    """Obter token de autenticação"""
    print("\n📌 [TESTE] Obtendo token de autenticação...")
    
    # Tentar com credenciais do usuário
    login_response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        }
    )
    
    if login_response.status_code == 200:
        token = login_response.json().get("access_token")
        print(f"✅ Token obtido: {token[:20]}...")
        return token
    else:
        print(f"❌ Erro ao obter token: {login_response.status_code}")
        print(f"   Resposta: {login_response.text}")
        return None

def get_wallet_balances(wallet_id, token):
    """Buscar saldos da carteira"""
    print(f"\n📌 [TESTE] Buscando saldos da carteira {wallet_id}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Requisição para obter balances (com tokens)
    response = requests.get(
        f"{API_BASE_URL}/wallets/{wallet_id}/balances?include_tokens=true",
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Saldos obtidos com sucesso!")
        print(f"\n📊 RESPOSTA COMPLETA:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # Procurar especificamente USDT Polygon
        print(f"\n🔍 BUSCANDO USDT POLYGON:")
        if isinstance(data, dict):
            for key, value in data.items():
                if 'polygon' in key.lower() and 'usdt' in key.lower():
                    print(f"   ✅ Encontrado: {key} = {value}")
                    return value
            
            # Se não encontrou, mostrar todas as chaves
            print(f"   ❌ Chave específica não encontrada")
            print(f"   Chaves disponíveis:")
            for key in data.keys():
                if 'usdt' in key.lower() or 'polygon' in key.lower():
                    print(f"      - {key}: {data[key]}")
        
        return None
    else:
        print(f"❌ Erro ao buscar saldos: {response.status_code}")
        print(f"   Resposta: {response.text}")
        return None

def test_polygon_usdt_endpoint():
    """Testar endpoint específico de USDT Polygon"""
    print("\n" + "="*60)
    print("🧪 TESTE: SALDO USDT NA REDE POLYGON")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Obter token
    token = get_auth_token()
    if not token:
        print("\n❌ Não foi possível autenticar. Tentando sem token...")
        # Tentar sem autenticação para teste
        response = requests.get(f"{API_BASE_URL}/wallets/{WALLET_ID}/balances?include_tokens=true")
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.text}")
        return
    
    # Buscar saldos
    usdt_balance = get_wallet_balances(WALLET_ID, token)
    
    print("\n" + "="*60)
    print("📝 RESUMO DO TESTE")
    print("="*60)
    
    if usdt_balance is not None:
        print(f"✅ SALDO USDT POLYGON ENCONTRADO: {usdt_balance}")
    else:
        print(f"❌ SALDO USDT POLYGON NÃO ENCONTRADO")
        print(f"   Verifique se:")
        print(f"   1. A carteira ID {WALLET_ID} existe")
        print(f"   2. Há fundos USDT na rede Polygon")
        print(f"   3. O endpoint retorna 'include_tokens=true'")

def main():
    try:
        test_polygon_usdt_endpoint()
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
