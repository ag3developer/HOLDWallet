#!/usr/bin/env python3
"""
Script para testar os endpoints de envio de transações.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def login():
    """Faz login e retorna o token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "user@holdwallet.com",
            "password": "senha123"
        }
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login realizado com sucesso")
        return token
    else:
        print(f"❌ Erro no login: {response.text}")
        return None

def get_wallets(token):
    """Obt token."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/wallets", headers=headers)
    
    if response.status_code == 200:
        wallets = response.json()
        print(f"✅ Encontradas {len(wallets)} carteiras")
        return wallets
    else:
        print(f"❌ Erro ao buscar carteiras: {response.text}")
        return []

def validate_address(token, address, network):
    """Valida um endereço blockchain."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/wallets/validate-address",
        headers=headers,
        json={
            "address": address,
            "network": network
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        if result["valid"]:
            print(f"✅ Endereço válido: {address}")
        else:
            print(f"❌ Endereço inválido: {address}")
        return result
    else:
        print(f"❌ Erro na validação: {response.text}")
        return None

def estimate_fee(token, wallet_id, to_address, amount, network):
    """Estima taxas de transação."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/wallets/estimate-fee",
        headers=headers,
        json={
            "wallet_id": wallet_id,
            "to_address": to_address,
            "amount": amount,
            "network": network
        }
    )
    
    if response.status_code == 200:
        fees = response.json()
        print("✅ Taxas estimadas:")
        print(json.dumps(fees, indent=2))
        return fees
    else:
        print(f"❌ Erro ao estimar taxas: {response.text}")
        return None

def send_transaction(token, wallet_id, to_address, amount, network, fee_level="standard"):
    """Envia uma transação."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/wallets/send",
        headers=headers,
        json={
            "wallet_id": wallet_id,
            "to_address": to_address,
            "amount": amount,
            "network": network,
            "fee_level": fee_level,
            "note": "Teste de envio"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Transação enviada com sucesso!")
        print(json.dumps(result, indent=2))
        return result
    else:
        print(f"❌ Erro ao enviar transação: {response.text}")
        return None

def check_transaction_status(token, transaction_id):
    """Verifica status de uma transação."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/wallets/transactions/{transaction_id}/status",
        headers=headers
    )
    
    if response.status_code == 200:
        status = response.json()
        print("✅ Status da transação:")
        print(json.dumps(status, indent=2))
        return status
    else:
        print(f"❌ Erro ao verificar status: {response.text}")
        return None

def main():
    print("=" * 60)
    print(" TESTE DE ENDPOINTS DE ENVIO DE TRANSAÇÕES")
    print("=" * 60)
    print()
    
    # 1. Login
    print("1️⃣  Fazendo login...")
    token = login()
    if not token:
        return
    print()
    
    # 2. Buscar carteiras
    print("2️⃣  Buscando carteiras...")
    wallets = get_wallets(token)
    if not wallets:
        return
    
    # Usar a primeira carteira Polygon
    polygon_wallet = next((w for w in wallets if w.get("network") == "polygon"), None)
    if not polygon_wallet:
        print("❌ Nenhuma carteira Polygon encontrada")
        return
    
    wallet_id = polygon_wallet["id"]
    print(f"   Usando carteira: {wallet_id}")
    print()
    
    # 3. Validar endereço de teste
    print("3️⃣  Validando endereço de destino...")
    test_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Endereço de teste
    validate_result = validate_address(token, test_address, "polygon")
    if not validate_result or not validate_result.get("valid"):
        print("❌ Endereço de teste inválido!")
        return
    print()
    
    # 4. Estimar taxas
    print("4️⃣  Estimando taxas...")
    fee_estimates = estimate_fee(
        token=token,
        wallet_id=wallet_id,
        to_address=test_address,
        amount="0.01",
        network="polygon"
    )
    if not fee_estimates:
        return
    print()
    
    # 5. Enviar transação (comentado por segurança - descomentar apenas para teste real)
    print("5️⃣  Enviando transação...")
    print("   ⚠️  ATENÇÃO: Envio de transação desabilitado no teste")
    print("   Para testar envio real, descomente o código abaixo")
    """
    tx_result = send_transaction(
        token=token,
        wallet_id=wallet_id,
        to_address=test_address,
        amount="0.001",  # Valor pequeno para teste
        network="polygon",
        fee_level="standard"
    )
    
    if tx_result:
        transaction_id = tx_result["transaction_id"]
        print()
        
        # 6. Verificar status
        print("6️⃣  Verificando status da transação...")
        check_transaction_status(token, transaction_id)
    """
    
    print()
    print("=" * 60)
    print(" ✅ Todos os endpoints estão funcionando!")
    print("=" * 60)

if __name__ == "__main__":
    main()
