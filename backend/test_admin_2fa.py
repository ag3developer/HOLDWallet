#!/usr/bin/env python3
"""
🔐 Script de Teste Admin com 2FA - EarnPool
============================================

Este script faz login como admin com autenticação 2FA e testa
os endpoints administrativos do EarnPool.

Uso:
    python test_admin_2fa.py
"""

import requests
import json
from getpass import getpass

# Configuração
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@wolknow.com"
ADMIN_PASSWORD = "Admin123@@"

def print_header(title: str):
    """Imprime cabeçalho formatado"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_response(response, title: str = "Response"):
    """Imprime resposta formatada"""
    print(f"\n📋 {title}")
    print(f"   Status: {response.status_code}")
    try:
        data = response.json()
        print(f"   Data: {json.dumps(data, indent=2, default=str)}")
        return data
    except:
        print(f"   Text: {response.text[:500]}")
        return None

def main():
    print_header("🔐 Login Admin com 2FA - HOLDWallet")
    
    # 1. Primeira etapa: Login com email/senha
    print("\n📧 Fazendo login com email/senha...")
    print(f"   Email: {ADMIN_EMAIL}")
    
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )
    
    login_data = print_response(login_response, "Login Response")
    
    if login_response.status_code != 200:
        print("\n❌ Erro no login!")
        return
    
    # Verificar se precisa de 2FA
    if login_data.get("requires_2fa"):
        print("\n🔑 2FA Necessário!")
        print("   Abra seu app autenticador e digite o código de 6 dígitos.")
        
        # Pedir código 2FA
        totp_code = input("\n   Digite o código 2FA: ").strip()
        
        if not totp_code or len(totp_code) != 6:
            print("❌ Código inválido! Deve ter 6 dígitos.")
            return
        
        # Verificar 2FA
        print(f"\n🔐 Verificando código 2FA...")
        
        verify_response = requests.post(
            f"{BASE_URL}/auth/verify-2fa",
            json={
                "email": ADMIN_EMAIL,
                "code": totp_code
            }
        )
        
        verify_data = print_response(verify_response, "2FA Verification")
        
        if verify_response.status_code != 200:
            print("\n❌ Erro na verificação 2FA!")
            return
        
        access_token = verify_data.get("access_token")
    else:
        # Login direto sem 2FA
        access_token = login_data.get("access_token")
    
    if not access_token:
        print("\n❌ Token não recebido!")
        return
    
    print(f"\n✅ Login bem-sucedido!")
    print(f"   Token: {access_token[:50]}...")
    
    # Headers para requisições autenticadas
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # =========================================================================
    # TESTES DOS ENDPOINTS ADMIN DO EARNPOOL
    # =========================================================================
    
    print_header("📊 Testando Endpoints Admin EarnPool")
    
    # 2. GET /earnpool/admin/overview - Visão geral do pool
    print("\n📈 [1/4] GET /earnpool/admin/overview")
    overview_response = requests.get(
        f"{BASE_URL}/earnpool/admin/overview",
        headers=headers
    )
    print_response(overview_response, "Pool Overview")
    
    # 3. GET /earnpool/admin/deposits - Listar depósitos
    print("\n💰 [2/4] GET /earnpool/admin/deposits")
    deposits_response = requests.get(
        f"{BASE_URL}/earnpool/admin/deposits",
        headers=headers
    )
    print_response(deposits_response, "All Deposits")
    
    # 4. GET /earnpool/admin/withdrawals - Listar saques pendentes
    print("\n📤 [3/4] GET /earnpool/admin/withdrawals")
    withdrawals_response = requests.get(
        f"{BASE_URL}/earnpool/admin/withdrawals",
        headers=headers
    )
    withdrawals_data = print_response(withdrawals_response, "Pending Withdrawals")
    
    # 5. GET /earnpool/config - Config atual
    print("\n⚙️ [4/4] GET /earnpool/config")
    config_response = requests.get(
        f"{BASE_URL}/earnpool/config",
        headers=headers
    )
    config_data = print_response(config_response, "Current Config")
    
    # =========================================================================
    # MENU INTERATIVO
    # =========================================================================
    
    print_header("🎮 Menu Interativo")
    
    while True:
        print("\n" + "-"*40)
        print("Opções disponíveis:")
        print("  1. Ver overview do pool")
        print("  2. Listar todos os depósitos")
        print("  3. Listar saques pendentes")
        print("  4. Aprovar um saque")
        print("  5. Rejeitar um saque")
        print("  6. Processar yields semanais")
        print("  7. Atualizar configuração do pool")
        print("  8. Ver configuração atual")
        print("  0. Sair")
        print("-"*40)
        
        choice = input("\nEscolha uma opção: ").strip()
        
        if choice == "0":
            print("\n👋 Até logo!")
            break
            
        elif choice == "1":
            # Overview
            r = requests.get(f"{BASE_URL}/earnpool/admin/overview", headers=headers)
            print_response(r, "Pool Overview")
            
        elif choice == "2":
            # Depósitos
            r = requests.get(f"{BASE_URL}/earnpool/admin/deposits", headers=headers)
            print_response(r, "All Deposits")
            
        elif choice == "3":
            # Saques
            r = requests.get(f"{BASE_URL}/earnpool/admin/withdrawals", headers=headers)
            print_response(r, "Pending Withdrawals")
            
        elif choice == "4":
            # Aprovar saque
            withdrawal_id = input("   ID do saque para aprovar: ").strip()
            if withdrawal_id:
                r = requests.post(
                    f"{BASE_URL}/earnpool/admin/withdrawals/{withdrawal_id}/approve",
                    headers=headers
                )
                print_response(r, f"Approve Withdrawal {withdrawal_id}")
                
        elif choice == "5":
            # Rejeitar saque
            withdrawal_id = input("   ID do saque para rejeitar: ").strip()
            reason = input("   Motivo da rejeição: ").strip()
            if withdrawal_id:
                r = requests.post(
                    f"{BASE_URL}/earnpool/admin/withdrawals/{withdrawal_id}/reject",
                    headers=headers,
                    json={"reason": reason or "Rejeitado pelo admin"}
                )
                print_response(r, f"Reject Withdrawal {withdrawal_id}")
                
        elif choice == "6":
            # Processar yields
            print("\n⚠️  Isso vai calcular e distribuir yields para todos os depósitos ativos!")
            confirm = input("   Confirmar? (s/n): ").strip().lower()
            if confirm == "s":
                r = requests.post(
                    f"{BASE_URL}/earnpool/admin/process-yields",
                    headers=headers
                )
                print_response(r, "Process Yields")
                
        elif choice == "7":
            # Atualizar config
            print("\n📝 Atualizar configuração (deixe em branco para manter atual)")
            
            apy = input("   APY anual (ex: 8.0): ").strip()
            min_deposit = input("   Depósito mínimo USD (ex: 100): ").strip()
            lock_days = input("   Dias de lock (ex: 365): ").strip()
            early_fee = input("   Taxa saque antecipado % (ex: 3.0): ").strip()
            
            update_data = {}
            if apy: update_data["apy_percentage"] = float(apy)
            if min_deposit: update_data["min_deposit_usd"] = float(min_deposit)
            if lock_days: update_data["lock_period_days"] = int(lock_days)
            if early_fee: update_data["early_withdrawal_fee"] = float(early_fee)
            
            if update_data:
                r = requests.put(
                    f"{BASE_URL}/earnpool/admin/config",
                    headers=headers,
                    json=update_data
                )
                print_response(r, "Update Config")
            else:
                print("   Nenhuma alteração feita.")
                
        elif choice == "8":
            # Ver config
            r = requests.get(f"{BASE_URL}/earnpool/config", headers=headers)
            print_response(r, "Current Config")
            
        else:
            print("   ❌ Opção inválida!")

if __name__ == "__main__":
    main()
