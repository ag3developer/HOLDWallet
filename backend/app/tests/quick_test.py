#!/usr/bin/env python3
"""
Script de Teste Rápido - HOLD Wallet Backend
Teste básico para verificar se o sistema está funcionando
"""

import httpx
import json
import uuid

def quick_test():
    """Teste rápido básico incluindo criação de usuário e wallet"""
    base_url = "http://localhost:8000"  # corrigido (antes 8001)
    # Usar timestamp para email único a cada teste
    import time
    timestamp = int(time.time())
    test_email = f"quicktest{timestamp}@holdwallet.com"
    test_password = "quicktest123"
    test_username = f"quicktest{timestamp}"

    print("🔍 TESTE RÁPIDO DO HOLD WALLET")
    print("=" * 40)

    # Test 1: Health Check
    print("1. 🏥 Health Check...")
    try:
        r = httpx.get(f"{base_url}/health/")
        print("   ✅ Sistema online" if r.status_code == 200 else "   ❌ Sistema offline")
        if r.status_code != 200:
            return False
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

    # Test 2: Database
    print("2. 🗄️ Database Check...")
    try:
        r = httpx.get(f"{base_url}/health/db")
        print("   ✅ Database conectado" if r.status_code == 200 else "   ❌ Database com problemas")
    except Exception as e:
        print(f"   ❌ Erro database: {e}")

    # Test 3: API Docs
    print("3. 📚 API Docs...")
    try:
        r = httpx.get(f"{base_url}/openapi.json")
        if r.status_code == 200:
            endpoints = len(r.json().get("paths", {}))
            print(f"   ✅ {endpoints} endpoints disponíveis")
        else:
            print("   ❌ Docs não disponíveis")
    except Exception as e:
        print(f"   ❌ Erro docs: {e}")

    # Test 4: Prices
    print("4. 📈 Price Service...")
    try:
        r = httpx.get(f"{base_url}/prices/supported")
        if r.status_code == 200:
            assets = r.json()
            print(f"   ✅ {len(assets)} ativos suportados")
        else:
            print("   ❌ Price service com problemas")
    except Exception as e:
        print(f"   ❌ Erro prices: {e}")

    # Test 5: Registro/Login
    print("5. 👤 Registro/Login...")
    token = None
    try:
        # Tenta registrar (ignora se já existir)
        reg_payload = {"username": test_username, "email": test_email, "password": test_password}
        rr = httpx.post(f"{base_url}/auth/register", json=reg_payload, timeout=10)
        if rr.status_code in (200, 201):
            print("   ✅ Usuário registrado")
        else:
            print(f"   ℹ️ Registro ignorado (status {rr.status_code})")
        # Login
        lg = httpx.post(f"{base_url}/auth/login", json={"email": test_email, "password": test_password}, timeout=10)
        if lg.status_code == 200:
            token = lg.json().get("access_token")
            print("   ✅ Login ok")
        else:
            print(f"   ❌ Login falhou ({lg.status_code})")
    except Exception as e:
        print(f"   ❌ Erro auth: {e}")

    if not token:
        print("   ❌ Sem token, abortando teste de wallet")
        print("\nTeste parcialmente concluído.")
        return False

    # Test 6: Criação de Wallet
    print("6. 💼 Criação de Wallet...")
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"network": "multi"}
        w = httpx.post(f"{base_url}/wallets/create", json=payload, headers=headers, timeout=15)
        if w.status_code == 200:
            data = w.json()
            print(f"   ✅ Wallet criada ID={data.get('id')} Network={data.get('network')}")
        else:
            print(f"   ❌ Falha wallet ({w.status_code}) -> {w.text}")
    except Exception as e:
        print(f"   ❌ Erro wallet: {e}")

    print("\n✅ Teste rápido concluído!")
    print(f"🌐 Acesse: {base_url}/docs para ver a API completa")
    return True

if __name__ == "__main__":
    quick_test()
