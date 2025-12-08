#!/usr/bin/env python3
"""
Script para listar carteiras e testar saldo USDT Polygon
"""
import requests
import json
from datetime import datetime

# Configuração
API_BASE_URL = "http://127.0.0.1:8000"
USER_EMAIL = "app@holdwallet.com"
USER_PASSWORD = "Abc123@@"

def get_auth_token():
    """Obter token de autenticação"""
    print("\n📌 [TESTE] Obtendo token de autenticação...")
    
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

def list_wallets(token):
    """Listar todas as carteiras"""
    print(f"\n📌 [TESTE] Listando carteiras...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{API_BASE_URL}/wallets",
        headers=headers
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Carteiras obtidas com sucesso!")
        print(f"\n📊 CARTEIRAS:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        if isinstance(data, list) and len(data) > 0:
            return data[0]['id']  # Retornar primeiro wallet ID
        elif isinstance(data, dict) and 'data' in data and len(data['data']) > 0:
            return data['data'][0]['id']
        return None
    else:
        print(f"❌ Erro ao listar carteiras: {response.status_code}")
        print(f"   Resposta: {response.text}")
        return None

def get_wallet_balances(wallet_id, token):
    """Buscar saldos da carteira com tokens"""
    print(f"\n📌 [TESTE] Buscando saldos da carteira {wallet_id}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
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
        
        # Procurar USDT Polygon
        print(f"\n🔍 BUSCANDO USDT POLYGON:")
        if isinstance(data, dict):
            for key, value in data.items():
                if 'polygon' in key.lower() and 'usdt' in key.lower():
                    print(f"   ✅ Encontrado: {key} = {value}")
                    return value
            
            print(f"   ❌ USDT Polygon não encontrado")
            print(f"   Chaves com 'usdt' ou 'polygon':")
            for key in data.keys():
                if 'usdt' in key.lower() or 'polygon' in key.lower():
                    print(f"      - {key}: {data[key]}")
        
        return None
    else:
        print(f"❌ Erro ao buscar saldos: {response.status_code}")
        print(f"   Resposta: {response.text}")
        return None

def main():
    print("\n" + "="*60)
    print("🧪 TESTE: SALDO USDT NA REDE POLYGON")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"API URL: {API_BASE_URL}")
    print(f"Email: {USER_EMAIL}")
    
    try:
        # Obter token
        token = get_auth_token()
        if not token:
            print("\n❌ Falha na autenticação")
            return
        
        # Listar carteiras
        wallet_id = list_wallets(token)
        if not wallet_id:
            print("\n❌ Nenhuma carteira encontrada")
            return
        
        # Buscar saldos
        usdt_balance = get_wallet_balances(wallet_id, token)
        
        print("\n" + "="*60)
        print("📝 RESUMO DO TESTE")
        print("="*60)
        
        if usdt_balance is not None and usdt_balance > 0:
            print(f"✅ SALDO USDT POLYGON ENCONTRADO: {usdt_balance}")
        else:
            print(f"⚠️  SALDO USDT POLYGON: Zero ou não disponível")
            print(f"   Possíveis razões:")
            print(f"   1. Nenhum USDT transferido para Polygon")
            print(f"   2. O endereço Polygon da carteira não tem fundos")
            print(f"   3. Backend ainda não retorna o saldo corretamente")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
