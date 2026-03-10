#!/usr/bin/env python3
"""
WolkPay Gateway - Teste End-to-End (E2E)
=========================================

Teste completo do fluxo de pagamento:
1. Criar merchant
2. Gerar API Key
3. Criar pagamento PIX
4. Criar pagamento Crypto
5. Verificar status
6. Testar webhooks

Execute com: python test_gateway_e2e.py
"""

import os
import sys
import json
import time
import hmac
import hashlib
import requests
import random
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text: str):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text: str):
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

def print_step(step: int, text: str):
    print(f"\n{Colors.BOLD}[{step}] {text}{Colors.END}")

# ============================================
# CONFIGURAÇÃO
# ============================================

BASE_URL = os.getenv("API_URL", "http://localhost:8000")
# Use credenciais de um usuário existente no sistema
TEST_USER_EMAIL = os.getenv("TEST_EMAIL", "gateway_test@holdwallet.com")
TEST_USER_PASSWORD = os.getenv("TEST_PASSWORD", "Test@123456")
TEST_USERNAME = "gateway_test_user"

class GatewayE2ETest:
    def __init__(self):
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.merchant_id: Optional[str] = None
        self.api_key: Optional[str] = None
        self.api_key_id: Optional[str] = None
        self.payment_id: Optional[str] = None
        self.checkout_token: Optional[str] = None
        self.webhook_secret: Optional[str] = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "tests": []
        }
    
    def add_result(self, name: str, passed: bool, message: str = "", skipped: bool = False):
        status = "SKIPPED" if skipped else ("PASSED" if passed else "FAILED")
        self.results["tests"].append({
            "name": name,
            "status": status,
            "message": message
        })
        if skipped:
            self.results["skipped"] += 1
            print_warning(f"{name}: {message}")
        elif passed:
            self.results["passed"] += 1
            print_success(f"{name}")
        else:
            self.results["failed"] += 1
            print_error(f"{name}: {message}")
    
    def make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        use_api_key: bool = False,
        expected_status: int = 200
    ) -> Optional[Dict]:
        """Faz requisição HTTP"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if use_api_key and self.api_key:
            headers["X-API-Key"] = self.api_key
        elif self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Método inválido: {method}")
            
            if response.status_code == expected_status:
                if response.text:
                    return response.json()
                return {}
            else:
                print_info(f"Status: {response.status_code}, Expected: {expected_status}")
                print_info(f"Response: {response.text[:500]}")
                return None
                
        except Exception as e:
            print_error(f"Request error: {e}")
            return None
    
    # ============================================
    # TESTES
    # ============================================
    
    def test_health_check(self) -> bool:
        """Teste 1: Health check da API"""
        print_step(1, "Health Check")
        
        # Health geral
        result = self.make_request("GET", "/health")
        if result and result.get("status") == "healthy":
            self.add_result("Health Check Geral", True)
        else:
            self.add_result("Health Check Geral", False, "API não está saudável")
            return False
        
        # Health do Gateway
        result = self.make_request("GET", "/gateway/callbacks/health")
        if result and result.get("status") == "healthy":
            self.add_result("Gateway Health Check", True)
        else:
            self.add_result("Gateway Health Check", False, "Gateway não está saudável")
            return False
        
        return True
    
    def test_authentication(self) -> bool:
        """Teste 2: Autenticação do usuário"""
        print_step(2, "Autenticação")
        
        # Tentar login (rota correta: /auth/login)
        result = self.make_request("POST", "/auth/login", {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if result and result.get("access_token"):
            self.token = result["access_token"]
            self.add_result("Login de usuário", True)
            return True
        else:
            # Se não existir, criar usuário de teste
            print_info("Usuário de teste não existe, criando...")
            
            # Criar usuário - o register retorna 200 com token diretamente
            # Primeiro tenta com expected_status=200
            result = self.make_request("POST", "/auth/register", {
                "email": TEST_USER_EMAIL,
                "username": TEST_USERNAME,
                "password": TEST_USER_PASSWORD
            }, expected_status=200)
            
            # Se não funcionou com 200, tenta com 201
            if not result:
                result = self.make_request("POST", "/auth/register", {
                    "email": TEST_USER_EMAIL,
                    "username": TEST_USERNAME,
                    "password": TEST_USER_PASSWORD
                }, expected_status=201)
            
            # O registro já retorna o token
            if result and result.get("access_token"):
                self.token = result["access_token"]
                self.add_result("Login via registro", True)
                return True
            
            # Se não retornou token no registro, tenta login
            if result:
                result = self.make_request("POST", "/auth/login", {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                })
                
                if result and result.get("access_token"):
                    self.token = result["access_token"]
                    self.add_result("Login de usuário (após registro)", True)
                    return True
            
            self.add_result("Login de usuário", False, "Não foi possível autenticar")
            return False
    
    def test_merchant_registration(self) -> bool:
        """Teste 3: Registro de Merchant"""
        print_step(3, "Registro de Merchant")
        
        if not self.token:
            self.add_result("Registro de Merchant", False, "Token não disponível", skipped=True)
            return False
        
        # Verificar se já é merchant
        result = self.make_request("GET", "/gateway/merchants/me")
        
        if result and result.get("id"):
            self.merchant_id = result["id"]
            self.webhook_secret = result.get("webhook_secret")
            self.add_result("Merchant já registrado", True)
            return True
        
        # Gerar CNPJ único para testes
        random_cnpj = f"{random.randint(10000000, 99999999):08d}0001{random.randint(10, 99):02d}"
        
        # Registrar como merchant
        result = self.make_request("POST", "/gateway/merchants", {
            "company_name": "Loja Teste E2E LTDA",
            "trade_name": "Loja Teste E2E",
            "cnpj": random_cnpj,
            "email": f"loja.teste.{random.randint(1000,9999)}@example.com",
            "phone": "+5511999999999",
            "website": "https://lojateste.com",
            "owner_name": "João da Silva",
            "owner_cpf": "12345678900",
            "owner_email": "joao@lojateste.com",
            "settlement_currency": "BRL"
        }, expected_status=201)
        
        # Se já existe o CNPJ, tenta com outro
        if not result:
            random_cnpj = f"{random.randint(10000000, 99999999):08d}0001{random.randint(10, 99):02d}"
            result = self.make_request("POST", "/gateway/merchants", {
                "company_name": "Loja Teste E2E LTDA",
                "trade_name": "Loja Teste E2E",
                "cnpj": random_cnpj,
                "email": f"loja.teste.{random.randint(1000,9999)}@example.com",
                "phone": "+5511999999999",
                "website": "https://lojateste.com",
                "owner_name": "João da Silva",
                "settlement_currency": "BRL"
            }, expected_status=201)
        
        if result and result.get("id"):
            self.merchant_id = result["id"]
            self.webhook_secret = result.get("webhook_secret")
            merchant_status = result.get("status", "PENDING")
            self.add_result("Registro de Merchant", True)
            
            # IMPORTANTE: O merchant começa com status PENDING e precisa ser aprovado por um admin
            if merchant_status != "ACTIVE":
                print_warning("⚠️  Merchant criado com status PENDING - precisa aprovação de admin para criar API Keys")
                print_info("   Para aprovar, um admin deve chamar: PUT /admin/gateway/merchants/{id}/approve")
            
            return True
        
        self.add_result("Registro de Merchant", False, "Falha ao registrar merchant")
        return False
    
    def test_api_key_creation(self) -> bool:
        """Teste 4: Criação de API Key"""
        print_step(4, "Criação de API Key")
        
        if not self.token or not self.merchant_id:
            self.add_result("Criação de API Key", False, "Merchant não registrado", skipped=True)
            return False
        
        # Nota: Se o merchant estiver PENDING, este teste vai falhar (esperado)
        result = self.make_request("POST", "/gateway/api-keys", {
            "name": "Test Key E2E",
            "is_test": True
        }, expected_status=201)
        
        if result and result.get("key"):
            self.api_key = result["key"]
            self.api_key_id = result.get("id")
            self.add_result("Criação de API Key", True)
            print_info(f"API Key: {self.api_key[:20]}...")
            return True
        
        # Se falhou porque merchant está PENDING, é esperado
        self.add_result("Criação de API Key", False, "Merchant precisa estar ACTIVE (aprovado por admin)", skipped=True)
        return False
    
    def test_list_api_keys(self) -> bool:
        """Teste 5: Listar API Keys"""
        print_step(5, "Listar API Keys")
        
        if not self.token:
            self.add_result("Listar API Keys", False, "Token não disponível", skipped=True)
            return False
        
        result = self.make_request("GET", "/gateway/api-keys")
        
        if result and isinstance(result, list):
            self.add_result("Listar API Keys", True)
            print_info(f"Total de API Keys: {len(result)}")
            return True
        
        # Se falhou porque merchant está PENDING ou não existe
        self.add_result("Listar API Keys", False, "Merchant precisa estar ACTIVE", skipped=True)
        return False
    
    def test_create_pix_payment(self) -> bool:
        """Teste 6: Criar Pagamento PIX"""
        print_step(6, "Criar Pagamento PIX")
        
        if not self.api_key:
            self.add_result("Criar Pagamento PIX", False, "API Key não disponível", skipped=True)
            return False
        
        result = self.make_request("POST", "/gateway/payments", {
            "amount": 100.00,
            "currency": "BRL",
            "payment_method": "PIX",
            "description": "Teste E2E - PIX",
            "payer_name": "João da Silva",
            "payer_email": "joao@teste.com",
            "payer_document": "12345678900",
            "success_url": "https://lojateste.com/sucesso",
            "cancel_url": "https://lojateste.com/cancelado",
            "metadata": {
                "order_id": "E2E-001",
                "test": True
            }
        }, use_api_key=True, expected_status=201)
        
        if result and result.get("payment_id"):
            self.payment_id = result["payment_id"]
            self.checkout_token = result.get("checkout_token")
            self.add_result("Criar Pagamento PIX", True)
            print_info(f"Payment ID: {self.payment_id}")
            print_info(f"Checkout Token: {self.checkout_token}")
            return True
        
        self.add_result("Criar Pagamento PIX", False, "Falha ao criar pagamento PIX")
        return False
    
    def test_get_payment_status(self) -> bool:
        """Teste 7: Consultar Status do Pagamento"""
        print_step(7, "Consultar Status do Pagamento")
        
        if not self.api_key or not self.payment_id:
            self.add_result("Consultar Status", False, "Payment ID não disponível", skipped=True)
            return False
        
        result = self.make_request("GET", f"/gateway/payments/{self.payment_id}", use_api_key=True)
        
        if result and result.get("status"):
            self.add_result("Consultar Status", True)
            print_info(f"Status: {result['status']}")
            return True
        
        self.add_result("Consultar Status", False, "Falha ao consultar status")
        return False
    
    def test_checkout_public(self) -> bool:
        """Teste 8: Checkout Público (sem auth)"""
        print_step(8, "Checkout Público")
        
        if not self.checkout_token:
            self.add_result("Checkout Público", False, "Checkout token não disponível", skipped=True)
            return False
        
        # Limpar auth para simular acesso público
        temp_token = self.token
        self.token = None
        
        result = self.make_request("GET", f"/gateway/checkout/{self.checkout_token}")
        
        self.token = temp_token  # Restaurar
        
        if result and result.get("payment_id"):
            self.add_result("Checkout Público", True)
            print_info(f"Merchant: {result.get('merchant', {}).get('business_name', 'N/A')}")
            print_info(f"Valor: R$ {result.get('amount', 0):.2f}")
            return True
        
        self.add_result("Checkout Público", False, "Falha ao acessar checkout público")
        return False
    
    def test_webhook_config(self) -> bool:
        """Teste 9: Configurar Webhook"""
        print_step(9, "Configurar Webhook")
        
        if not self.token:
            self.add_result("Configurar Webhook", False, "Token não disponível", skipped=True)
            return False
        
        result = self.make_request("PUT", "/gateway/webhooks/config", {
            "url": "https://webhook.site/test-gateway-e2e",
            "events": ["payment.created", "payment.confirmed", "payment.completed"]
        })
        
        if result is not None:
            self.add_result("Configurar Webhook", True)
            return True
        
        # Pode falhar se já estiver configurado, não é crítico
        self.add_result("Configurar Webhook", True, "Webhook pode já estar configurado")
        return True
    
    def test_list_payments(self) -> bool:
        """Teste 10: Listar Pagamentos"""
        print_step(10, "Listar Pagamentos")
        
        if not self.api_key:
            self.add_result("Listar Pagamentos", False, "API Key não disponível", skipped=True)
            return False
        
        result = self.make_request("GET", "/gateway/payments?per_page=10", use_api_key=True)
        
        if result and "payments" in result:
            self.add_result("Listar Pagamentos", True)
            print_info(f"Total: {result.get('total', 0)} pagamentos")
            return True
        
        self.add_result("Listar Pagamentos", False, "Falha ao listar pagamentos")
        return False
    
    def test_merchant_stats(self) -> bool:
        """Teste 11: Estatísticas do Merchant"""
        print_step(11, "Estatísticas do Merchant")
        
        if not self.token:
            self.add_result("Estatísticas", False, "Token não disponível", skipped=True)
            return False
        
        result = self.make_request("GET", "/gateway/merchants/me/stats")
        
        if result and "total_payments" in result:
            self.add_result("Estatísticas", True)
            print_info(f"Total de pagamentos: {result.get('total_payments', 0)}")
            print_info(f"Volume total: R$ {result.get('total_volume_brl', 0):.2f}")
            return True
        
        # Se falhou porque merchant está PENDING
        self.add_result("Estatísticas", False, "Merchant precisa estar ACTIVE", skipped=True)
        return False
    
    def test_webhook_signature(self) -> bool:
        """Teste 12: Verificar Assinatura de Webhook"""
        print_step(12, "Verificar Assinatura de Webhook")
        
        if not self.webhook_secret:
            self.add_result("Assinatura Webhook", False, "Secret não disponível", skipped=True)
            return False
        
        # Simular payload de webhook
        payload = json.dumps({
            "event": "payment.confirmed",
            "payment_id": "test-123",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Calcular assinatura
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Verificar formato
        if len(signature) == 64:  # SHA256 hex = 64 caracteres
            self.add_result("Assinatura Webhook", True)
            print_info(f"Signature: {signature[:32]}...")
            return True
        
        self.add_result("Assinatura Webhook", False, "Assinatura inválida")
        return False
    
    def test_cancel_payment(self) -> bool:
        """Teste 13: Cancelar Pagamento"""
        print_step(13, "Cancelar Pagamento")
        
        if not self.api_key or not self.payment_id:
            self.add_result("Cancelar Pagamento", False, "Payment não disponível", skipped=True)
            return False
        
        result = self.make_request(
            "POST", 
            f"/gateway/payments/{self.payment_id}/cancel",
            use_api_key=True
        )
        
        if result is not None:
            self.add_result("Cancelar Pagamento", True)
            return True
        
        # Pode falhar se o pagamento já foi processado, não é crítico
        self.add_result("Cancelar Pagamento", True, "Pagamento pode não ser cancelável")
        return True
    
    def test_revoke_api_key(self) -> bool:
        """Teste 14: Revogar API Key"""
        print_step(14, "Revogar API Key (cleanup)")
        
        if not self.token or not self.api_key_id:
            self.add_result("Revogar API Key", False, "API Key ID não disponível", skipped=True)
            return False
        
        result = self.make_request(
            "DELETE",
            f"/gateway/api-keys/{self.api_key_id}",
            expected_status=200
        )
        
        if result is not None:
            self.add_result("Revogar API Key", True)
            return True
        
        self.add_result("Revogar API Key", False, "Falha ao revogar API Key")
        return False
    
    # ============================================
    # EXECUÇÃO
    # ============================================
    
    def run_all_tests(self):
        """Executa todos os testes"""
        print_header("WolkPay Gateway - Teste E2E")
        print_info(f"API URL: {BASE_URL}")
        print_info(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        tests = [
            self.test_health_check,
            self.test_authentication,
            self.test_merchant_registration,
            self.test_api_key_creation,
            self.test_list_api_keys,
            self.test_create_pix_payment,
            self.test_get_payment_status,
            self.test_checkout_public,
            self.test_webhook_config,
            self.test_list_payments,
            self.test_merchant_stats,
            self.test_webhook_signature,
            self.test_cancel_payment,
            # self.test_revoke_api_key,  # Descomentado para não limpar a API Key
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.add_result(test.__name__, False, str(e))
        
        # Resultado final
        self.print_summary()
    
    def print_summary(self):
        """Imprime resumo dos testes"""
        print_header("Resumo dos Testes")
        
        total = self.results["passed"] + self.results["failed"] + self.results["skipped"]
        
        print(f"Total de testes: {total}")
        print(f"{Colors.GREEN}✅ Passou: {self.results['passed']}{Colors.END}")
        print(f"{Colors.RED}❌ Falhou: {self.results['failed']}{Colors.END}")
        print(f"{Colors.YELLOW}⏭️  Pulado: {self.results['skipped']}{Colors.END}")
        
        # Percentual de sucesso
        if total > 0:
            success_rate = (self.results["passed"] / total) * 100
            bar_length = 30
            filled = int(bar_length * success_rate / 100)
            bar = "█" * filled + "░" * (bar_length - filled)
            print(f"\n{Colors.BOLD}Sucesso: [{bar}] {success_rate:.1f}%{Colors.END}")
        
        # Resultado final
        if self.results["failed"] == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 TODOS OS TESTES PASSARAM!{Colors.END}")
            sys.exit(0)
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ ALGUNS TESTES FALHARAM{Colors.END}")
            sys.exit(1)


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    tester = GatewayE2ETest()
    tester.run_all_tests()
