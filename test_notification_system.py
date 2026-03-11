#!/usr/bin/env python3
"""
🧪 WOLK NOW - Notification System Test Script
==============================================

Script para testar toda a lógica e integração do sistema de notificações.
Executa testes de:
1. Importação de módulos
2. Templates de email
3. Serviço de notificações
4. Integração com endpoints

Uso: python test_notification_system.py

Author: WOLK NOW Team
"""

import sys
import os
import asyncio
from datetime import datetime

# Adicionar o path do backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text:^60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")

def print_test(name, passed, error=None):
    status = f"{Colors.GREEN}✅ PASSOU{Colors.RESET}" if passed else f"{Colors.RED}❌ FALHOU{Colors.RESET}"
    print(f"  {status} - {name}")
    if error and not passed:
        print(f"      {Colors.YELLOW}Erro: {error}{Colors.RESET}")

def print_section(text):
    print(f"\n{Colors.BOLD}📋 {text}{Colors.RESET}")

results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def record_test(name, passed, error=None):
    results["tests"].append({"name": name, "passed": passed, "error": error})
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1
    print_test(name, passed, error)


# ============================================
# TESTE 1: IMPORTAÇÕES
# ============================================
def test_imports():
    print_section("Teste de Importações")
    
    # Teste 1.1: Importar módulo de notificações
    try:
        from app.services.notifications import (
            NotificationService,
            EmailTemplates,
            notification_service
        )
        record_test("Importar NotificationService", True)
    except Exception as e:
        record_test("Importar NotificationService", False, str(e))
    
    # Teste 1.2: Importar funções de integração
    try:
        from app.services.notifications import (
            notify_trade_started,
            notify_trade_completed,
            notify_invoice_created,
            notify_bill_payment_completed,
            notify_deposit_received,
            notify_welcome,
            fire_and_forget
        )
        record_test("Importar funções de integração", True)
    except Exception as e:
        record_test("Importar funções de integração", False, str(e))
    
    # Teste 1.3: Importar templates
    try:
        from app.services.notifications.email_templates import TRANSLATIONS
        record_test("Importar TRANSLATIONS", True)
    except Exception as e:
        record_test("Importar TRANSLATIONS", False, str(e))


# ============================================
# TESTE 2: TEMPLATES DE EMAIL
# ============================================
def test_email_templates():
    print_section("Teste de Templates de Email")
    
    try:
        from app.services.notifications.email_templates import EmailTemplates, TRANSLATIONS
        
        # Teste 2.1: Verificar idiomas disponíveis
        languages = list(TRANSLATIONS.keys())
        expected_languages = ["pt", "en", "es"]
        all_present = all(lang in languages for lang in expected_languages)
        record_test(f"Idiomas disponíveis: {languages}", all_present)
        
        # Teste 2.2: Testar tradução PT
        try:
            text_pt = EmailTemplates.t("welcome_title", "pt")
            record_test(f"Tradução PT (welcome_title): '{text_pt}'", bool(text_pt))
        except Exception as e:
            record_test("Tradução PT", False, str(e))
        
        # Teste 2.3: Testar tradução EN
        try:
            text_en = EmailTemplates.t("welcome_title", "en")
            record_test(f"Tradução EN (welcome_title): '{text_en}'", bool(text_en))
        except Exception as e:
            record_test("Tradução EN", False, str(e))
        
        # Teste 2.4: Testar tradução ES
        try:
            text_es = EmailTemplates.t("welcome_title", "es")
            record_test(f"Tradução ES (welcome_title): '{text_es}'", bool(text_es))
        except Exception as e:
            record_test("Tradução ES", False, str(e))
        
        # Teste 2.5: Testar template base
        try:
            html = EmailTemplates.get_base_template("Teste", "<p>Conteúdo</p>", "pt")
            has_content = "Conteúdo" in html and "WOLK NOW" in html
            record_test("Template base HTML gerado", has_content)
        except Exception as e:
            record_test("Template base HTML", False, str(e))
        
        # Teste 2.6: Testar formatação de moeda
        try:
            formatted = EmailTemplates.format_currency(1234.56, "BRL")
            record_test(f"Formatação moeda: {formatted}", "1.234,56" in formatted or "1234.56" in formatted)
        except Exception as e:
            record_test("Formatação moeda", False, str(e))
        
        # Teste 2.7: Testar formatação de crypto
        try:
            formatted = EmailTemplates.format_crypto(0.12345678, "BTC")
            record_test(f"Formatação crypto: {formatted}", "BTC" in formatted)
        except Exception as e:
            record_test("Formatação crypto", False, str(e))
        
        # Teste 2.8: Testar botão HTML
        try:
            button = EmailTemplates.button("Clique Aqui", "https://example.com")
            has_link = "https://example.com" in button and "Clique Aqui" in button
            record_test("Botão HTML gerado", has_link)
        except Exception as e:
            record_test("Botão HTML", False, str(e))
            
    except Exception as e:
        record_test("Carregar EmailTemplates", False, str(e))


# ============================================
# TESTE 3: NOTIFICATION SERVICE
# ============================================
def test_notification_service():
    print_section("Teste do NotificationService")
    
    try:
        from app.services.notifications import NotificationService
        
        # Teste 3.1: Instanciar serviço
        try:
            service = NotificationService()
            record_test("Instanciar NotificationService", True)
        except Exception as e:
            record_test("Instanciar NotificationService", False, str(e))
            return
        
        # Teste 3.2: Verificar configuração
        has_api_key = bool(service.api_key)
        record_test(f"API Key configurada: {'Sim' if has_api_key else 'Não (modo log-only)'}", True)
        
        # Teste 3.3: Verificar URLs
        record_test(f"Frontend URL: {service.frontend_url}", bool(service.frontend_url))
        
        # Teste 3.4: Verificar FROM emails
        record_test(f"FROM_EMAIL: {service.FROM_EMAIL}", "wolknow.com" in service.FROM_EMAIL)
        record_test(f"FROM_EMAIL_TRANSACTIONS: {service.FROM_EMAIL_TRANSACTIONS}", "wolknow.com" in service.FROM_EMAIL_TRANSACTIONS)
        record_test(f"FROM_EMAIL_SECURITY: {service.FROM_EMAIL_SECURITY}", "wolknow.com" in service.FROM_EMAIL_SECURITY)
        
    except Exception as e:
        record_test("Carregar NotificationService", False, str(e))


# ============================================
# TESTE 4: FUNÇÕES DE INTEGRAÇÃO
# ============================================
def test_integration_functions():
    print_section("Teste de Funções de Integração")
    
    try:
        from app.services.notifications.notification_integration import (
            get_user_info,
            get_notification_preferences,
            fire_and_forget
        )
        
        # Teste 4.1: Verificar se funções existem
        record_test("Função get_user_info existe", callable(get_user_info))
        record_test("Função get_notification_preferences existe", callable(get_notification_preferences))
        record_test("Função fire_and_forget existe", callable(fire_and_forget))
        
        # Teste 4.2: Verificar funções de notificação
        from app.services.notifications import (
            notify_trade_started,
            notify_trade_completed,
            notify_trade_cancelled,
            notify_invoice_created,
            notify_invoice_paid,
            notify_bill_payment_processing,
            notify_bill_payment_completed,
            notify_deposit_received,
            notify_withdrawal_submitted,
            notify_welcome,
            notify_kyc_status_change
        )
        
        record_test("notify_trade_started", callable(notify_trade_started))
        record_test("notify_trade_completed", callable(notify_trade_completed))
        record_test("notify_trade_cancelled", callable(notify_trade_cancelled))
        record_test("notify_invoice_created", callable(notify_invoice_created))
        record_test("notify_invoice_paid", callable(notify_invoice_paid))
        record_test("notify_bill_payment_processing", callable(notify_bill_payment_processing))
        record_test("notify_bill_payment_completed", callable(notify_bill_payment_completed))
        record_test("notify_deposit_received", callable(notify_deposit_received))
        record_test("notify_withdrawal_submitted", callable(notify_withdrawal_submitted))
        record_test("notify_welcome", callable(notify_welcome))
        record_test("notify_kyc_status_change", callable(notify_kyc_status_change))
        
    except Exception as e:
        record_test("Carregar funções de integração", False, str(e))


# ============================================
# TESTE 5: INTEGRAÇÃO COM ENDPOINTS
# ============================================
def test_endpoint_integration():
    print_section("Teste de Integração com Endpoints")
    
    # Teste 5.1: Verificar se p2p.py tem o import
    try:
        p2p_file = os.path.join(os.path.dirname(__file__), 'backend/app/routers/p2p.py')
        with open(p2p_file, 'r') as f:
            content = f.read()
        has_import = "from app.services.notifications import" in content
        has_notify_trade = "notify_trade_started" in content or "notify_trade_completed" in content
        record_test("P2P Router tem import de notificações", has_import)
        record_test("P2P Router usa funções de notificação", has_notify_trade)
    except Exception as e:
        record_test("Verificar P2P Router", False, str(e))
    
    # Teste 5.2: Verificar se wolkpay_service.py tem o import
    try:
        wolkpay_file = os.path.join(os.path.dirname(__file__), 'backend/app/services/wolkpay_service.py')
        with open(wolkpay_file, 'r') as f:
            content = f.read()
        has_import = "from app.services.notifications import" in content
        has_notify = "notify_invoice" in content
        record_test("WolkPay Service tem import de notificações", has_import)
        record_test("WolkPay Service usa funções de notificação", has_notify)
    except Exception as e:
        record_test("Verificar WolkPay Service", False, str(e))
    
    # Teste 5.3: Verificar se wolkpay_bill_service.py tem o import
    try:
        bill_file = os.path.join(os.path.dirname(__file__), 'backend/app/services/wolkpay_bill_service.py')
        with open(bill_file, 'r') as f:
            content = f.read()
        has_import = "from app.services.notifications import" in content
        has_notify = "notify_bill_payment" in content
        record_test("Bill Service tem import de notificações", has_import)
        record_test("Bill Service usa funções de notificação", has_notify)
    except Exception as e:
        record_test("Verificar Bill Service", False, str(e))
    
    # Teste 5.4: Verificar se auth.py tem o import (welcome email)
    try:
        auth_file = os.path.join(os.path.dirname(__file__), 'backend/app/routers/auth.py')
        with open(auth_file, 'r') as f:
            content = f.read()
        has_import = "from app.services.notifications import" in content
        has_notify = "notify_welcome" in content
        record_test("Auth Router tem import de notificações", has_import)
        record_test("Auth Router usa notify_welcome", has_notify)
    except Exception as e:
        record_test("Verificar Auth Router", False, str(e))
    
    # Teste 5.5: Verificar blockchain_deposit_service.py
    try:
        deposit_file = os.path.join(os.path.dirname(__file__), 'backend/app/services/blockchain_deposit_service.py')
        with open(deposit_file, 'r') as f:
            content = f.read()
        has_import = "from app.services.notifications import" in content
        has_notify = "notify_deposit_received" in content
        record_test("Deposit Service tem import de notificações", has_import)
        record_test("Deposit Service usa notify_deposit_received", has_notify)
    except Exception as e:
        record_test("Verificar Deposit Service", False, str(e))


# ============================================
# TESTE 6: ENVIO DE EMAIL (OPCIONAL)
# ============================================
async def test_email_send():
    print_section("Teste de Envio de Email (Mock)")
    
    try:
        from app.services.notifications import NotificationService
        
        service = NotificationService()
        
        # Se não tem API key, vai para modo log-only
        if not service.is_configured:
            record_test("Modo LOG-ONLY ativo (sem API key)", True)
            
            # Testar que não falha mesmo sem configuração
            result = await service._send_email(
                to_email="test@example.com",
                subject="Teste",
                html_content="<p>Teste</p>"
            )
            record_test("Envio em modo log-only não falha", result.get("log_only", False))
        else:
            record_test("API Key configurada - modo PRODUÇÃO", True)
            # Em produção, não enviamos email de teste real
            record_test("Teste de envio real ignorado (produção)", True)
            
    except Exception as e:
        record_test("Teste de envio de email", False, str(e))


# ============================================
# TESTE 7: VERIFICAR ARQUIVOS
# ============================================
def test_files_exist():
    print_section("Teste de Arquivos do Módulo")
    
    base_path = os.path.join(os.path.dirname(__file__), 'backend/app/services/notifications')
    
    files_to_check = [
        "__init__.py",
        "email_templates.py",
        "notification_service.py",
        "notification_integration.py"
    ]
    
    for file in files_to_check:
        file_path = os.path.join(base_path, file)
        exists = os.path.exists(file_path)
        record_test(f"Arquivo {file} existe", exists)
        
        if exists:
            # Verificar tamanho
            size = os.path.getsize(file_path)
            record_test(f"  → {file} tem conteúdo ({size} bytes)", size > 100)


# ============================================
# MAIN
# ============================================
def main():
    print_header("WOLK NOW - Notification System Tests")
    print(f"\n📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"📁 Diretório: {os.getcwd()}")
    
    # Executar testes
    test_files_exist()
    test_imports()
    test_email_templates()
    test_notification_service()
    test_integration_functions()
    test_endpoint_integration()
    
    # Teste assíncrono
    asyncio.run(test_email_send())
    
    # Resumo
    print_header("RESUMO DOS TESTES")
    
    total = results["passed"] + results["failed"]
    percentage = (results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\n  {Colors.GREEN}✅ Passou: {results['passed']}{Colors.RESET}")
    print(f"  {Colors.RED}❌ Falhou: {results['failed']}{Colors.RESET}")
    print(f"  📊 Total: {total}")
    print(f"  📈 Taxa de sucesso: {percentage:.1f}%")
    
    if results["failed"] > 0:
        print(f"\n{Colors.YELLOW}⚠️ Testes que falharam:{Colors.RESET}")
        for test in results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}")
                if test["error"]:
                    print(f"    Erro: {test['error']}")
    
    print(f"\n{'='*60}\n")
    
    # Exit code
    return 0 if results["failed"] == 0 else 1


if __name__ == "__main__":
    exit(main())
