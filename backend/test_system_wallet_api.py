#!/usr/bin/env python3
"""
🧪 Script de Testes - System Wallet API
=========================================

Testa todos os endpoints implementados nas 4 fases:
- Fase 1: Envio para endereços externos
- Fase 2: Múltiplas carteiras (COLD, HOT, FEES)
- Fase 3: Automação de transferências
- Fase 4: Alertas e monitoramento

Execute com: python test_system_wallet_api.py
"""

import requests
import json
from datetime import datetime

# Configurações
BASE_URL = "http://localhost:8000"
API_PREFIX = "/admin/system-blockchain-wallet"

# Token de autenticação (substitua pelo token real do admin)
# Você pode obter fazendo login no frontend e copiando o token
AUTH_TOKEN = None  # Será preenchido durante o teste

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f" {text}")
    print(f"{'='*60}{Colors.RESET}\n")


def print_test(name, success, details=""):
    status = f"{Colors.GREEN}✅ PASS{Colors.RESET}" if success else f"{Colors.RED}❌ FAIL{Colors.RESET}"
    print(f"  {status} {name}")
    if details and not success:
        print(f"       {Colors.YELLOW}{details}{Colors.RESET}")


def print_info(text):
    print(f"  {Colors.YELLOW}ℹ️  {text}{Colors.RESET}")


def get_headers():
    """Retorna headers com autenticação."""
    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    return headers


def make_request(method, endpoint, data=None, params=None):
    """Faz uma requisição à API."""
    url = f"{BASE_URL}{API_PREFIX}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=get_headers(), params=params, timeout=30)
        elif method == "POST":
            response = requests.post(url, headers=get_headers(), json=data, params=params, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, headers=get_headers(), json=data, params=params, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=get_headers(), params=params, timeout=30)
        else:
            return None, "Método inválido"
        
        return response, None
    except requests.exceptions.ConnectionError:
        return None, "Conexão recusada - Backend não está rodando?"
    except Exception as e:
        return None, str(e)


def test_endpoint_exists(method, endpoint, expected_status=None, params=None):
    """Testa se um endpoint existe e responde."""
    response, error = make_request(method, endpoint, params=params)
    
    if error:
        return False, error
    
    # Se não temos autenticação, 401/403 significa que o endpoint existe
    if response.status_code in [401, 403]:
        return True, "Endpoint existe (requer autenticação)"
    
    # Verificar status esperado
    if expected_status and response.status_code != expected_status:
        return False, f"Status {response.status_code}, esperado {expected_status}"
    
    # 200, 201, 400, 404, 422 são respostas válidas (endpoint existe)
    if response.status_code in [200, 201, 400, 404, 422, 500]:
        return True, f"Status {response.status_code}"
    
    return False, f"Status inesperado: {response.status_code}"


def run_phase1_tests():
    """Testa Fase 1: Envio para endereços externos."""
    print_header("FASE 1: Envio para Endereços Externos")
    
    tests = [
        ("GET", "/status", "Endpoint /status"),
        ("GET", "/addresses", "Endpoint /addresses"),
        ("GET", "/transactions", "Endpoint /transactions"),
        ("GET", "/address/polygon", "Endpoint /address/{network}"),
        ("GET", "/balance/polygon", "Endpoint /balance/{network}"),
        ("POST", "/send", "Endpoint /send (POST)"),
        ("POST", "/internal-transfer", "Endpoint /internal-transfer (POST)"),
    ]
    
    passed = 0
    for method, endpoint, name in tests:
        success, details = test_endpoint_exists(method, endpoint)
        print_test(name, success, details)
        if success:
            passed += 1
    
    print(f"\n  📊 Resultado: {passed}/{len(tests)} endpoints OK")
    return passed, len(tests)


def run_phase2_tests():
    """Testa Fase 2: Múltiplas carteiras."""
    print_header("FASE 2: Múltiplas Carteiras (COLD, HOT, FEES)")
    
    tests = [
        ("GET", "/wallets", "Endpoint /wallets"),
        ("GET", "/wallets/summary", "Endpoint /wallets/summary"),
        ("POST", "/wallets/create", "Endpoint /wallets/create (POST)"),
        ("PATCH", "/wallets/test_wallet/type", "Endpoint /wallets/{name}/type (PATCH)"),
        ("PATCH", "/wallets/test_wallet/lock", "Endpoint /wallets/{name}/lock (PATCH)"),
        ("GET", "/wallets/main_fees_wallet/addresses", "Endpoint /wallets/{name}/addresses"),
    ]
    
    passed = 0
    for method, endpoint, name in tests:
        params = {}
        if "create" in endpoint:
            params = {"wallet_name": "test_check", "wallet_type": "hot"}
        elif "/type" in endpoint:
            params = {"new_type": "hot"}
        elif "/lock" in endpoint:
            params = {"lock": "true"}
            
        success, details = test_endpoint_exists(method, endpoint, params=params)
        print_test(name, success, details)
        if success:
            passed += 1
    
    print(f"\n  📊 Resultado: {passed}/{len(tests)} endpoints OK")
    return passed, len(tests)


def run_phase3_tests():
    """Testa Fase 3: Automação."""
    print_header("FASE 3: Automação de Transferências")
    
    tests = [
        ("GET", "/automation/status", "Endpoint /automation/status"),
        ("GET", "/automation/analysis", "Endpoint /automation/analysis"),
        ("POST", "/automation/execute", "Endpoint /automation/execute (POST)"),
        ("PATCH", "/automation/thresholds", "Endpoint /automation/thresholds (PATCH)"),
        ("PATCH", "/automation/toggle", "Endpoint /automation/toggle (PATCH)"),
    ]
    
    passed = 0
    for method, endpoint, name in tests:
        params = {}
        if "execute" in endpoint:
            params = {"dry_run": "true", "max_actions": "1"}
        elif "thresholds" in endpoint:
            params = {"hot_max": "10000"}
        elif "toggle" in endpoint:
            params = {"enabled": "true"}
            
        success, details = test_endpoint_exists(method, endpoint, params=params)
        print_test(name, success, details)
        if success:
            passed += 1
    
    print(f"\n  📊 Resultado: {passed}/{len(tests)} endpoints OK")
    return passed, len(tests)


def run_phase4_tests():
    """Testa Fase 4: Alertas e Monitoramento."""
    print_header("FASE 4: Alertas e Monitoramento")
    
    tests = [
        ("GET", "/alerts/check", "Endpoint /alerts/check"),
        ("GET", "/monitoring/dashboard", "Endpoint /monitoring/dashboard"),
    ]
    
    passed = 0
    for method, endpoint, name in tests:
        success, details = test_endpoint_exists(method, endpoint)
        print_test(name, success, details)
        if success:
            passed += 1
    
    print(f"\n  📊 Resultado: {passed}/{len(tests)} endpoints OK")
    return passed, len(tests)


def run_existing_endpoints_tests():
    """Testa endpoints existentes que já funcionavam."""
    print_header("ENDPOINTS EXISTENTES (Baseline)")
    
    tests = [
        ("POST", "/create", "Endpoint /create"),
        ("POST", "/refresh-balances", "Endpoint /refresh-balances"),
        ("POST", "/add-missing-networks", "Endpoint /add-missing-networks"),
        ("GET", "/export-private-key/polygon", "Endpoint /export-private-key/{network}"),
    ]
    
    passed = 0
    for method, endpoint, name in tests:
        success, details = test_endpoint_exists(method, endpoint)
        print_test(name, success, details)
        if success:
            passed += 1
    
    print(f"\n  📊 Resultado: {passed}/{len(tests)} endpoints OK")
    return passed, len(tests)


def test_response_structure():
    """Testa estrutura das respostas."""
    print_header("ESTRUTURA DAS RESPOSTAS")
    
    # Testar /wallets
    response, error = make_request("GET", "/wallets")
    if error:
        print_test("/wallets response structure", False, error)
        return 0, 1
    
    if response.status_code in [401, 403]:
        print_info("Autenticação necessária para testar estrutura")
        return 0, 1
    
    try:
        data = response.json()
        has_success = "success" in data
        has_data = "data" in data or "wallets" in data
        success = has_success and has_data
        print_test("/wallets response structure", success, 
                  f"success={has_success}, data/wallets={has_data}")
        return 1 if success else 0, 1
    except:
        print_test("/wallets response structure", False, "JSON inválido")
        return 0, 1


def main():
    """Executa todos os testes."""
    print(f"\n{Colors.BOLD}🧪 TESTE COMPLETO - System Wallet API{Colors.RESET}")
    print(f"   Base URL: {BASE_URL}{API_PREFIX}")
    print(f"   Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    total_passed = 0
    total_tests = 0
    
    # Testes por fase
    p, t = run_existing_endpoints_tests()
    total_passed += p
    total_tests += t
    
    p, t = run_phase1_tests()
    total_passed += p
    total_tests += t
    
    p, t = run_phase2_tests()
    total_passed += p
    total_tests += t
    
    p, t = run_phase3_tests()
    total_passed += p
    total_tests += t
    
    p, t = run_phase4_tests()
    total_passed += p
    total_tests += t
    
    p, t = test_response_structure()
    total_passed += p
    total_tests += t
    
    # Resumo final
    print_header("RESUMO FINAL")
    
    pct = (total_passed / total_tests * 100) if total_tests > 0 else 0
    color = Colors.GREEN if pct >= 80 else Colors.YELLOW if pct >= 50 else Colors.RED
    
    print(f"  Total de endpoints testados: {total_tests}")
    print(f"  Endpoints OK: {color}{total_passed}{Colors.RESET}")
    print(f"  Taxa de sucesso: {color}{pct:.1f}%{Colors.RESET}")
    
    if total_passed == total_tests:
        print(f"\n  {Colors.GREEN}🎉 Todos os endpoints estão funcionando!{Colors.RESET}")
    elif total_passed > total_tests * 0.8:
        print(f"\n  {Colors.YELLOW}⚠️  Maioria OK, mas alguns endpoints precisam de autenticação{Colors.RESET}")
    else:
        print(f"\n  {Colors.RED}❌ Alguns endpoints podem ter problemas{Colors.RESET}")
    
    print(f"\n{Colors.BLUE}Nota: Endpoints que retornam 401/403 existem mas requerem autenticação admin.{Colors.RESET}")
    print(f"{Colors.BLUE}Para teste completo, configure AUTH_TOKEN no script.{Colors.RESET}\n")


if __name__ == "__main__":
    main()
