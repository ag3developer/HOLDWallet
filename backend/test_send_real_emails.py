#!/usr/bin/env python3
"""
🔔 WOLK NOW - Teste de Envio Real de Emails
============================================

Este script simula cenários reais de uso e envia emails de verdade.
Use com cuidado em produção!

Uso:
    python test_send_real_emails.py

Author: WOLK NOW Team
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Carregar variáveis do .env
from dotenv import load_dotenv
load_dotenv()

# Configurar ambiente
os.environ.setdefault("DATABASE_URL", "postgresql://localhost/wolknow_test")


async def test_email_notifications():
    """Testa envio real de emails usando o NotificationService diretamente"""
    
    print("\n" + "=" * 60)
    print("🔔 WOLK NOW - Teste de Envio Real de Emails")
    print("=" * 60)
    
    # Email de destino
    TEST_EMAIL = "contato@josecarlosmartins.com"
    TEST_NAME = "José Carlos"
    TEST_USER_ID = str(uuid.uuid4())
    
    print(f"\n📧 Email de destino: {TEST_EMAIL}")
    print(f"👤 Nome: {TEST_NAME}")
    print(f"🆔 User ID (simulado): {TEST_USER_ID}")
    
    # Importar NotificationService
    try:
        from app.services.notifications import NotificationService
        notifier = NotificationService()
        
        print(f"\n✅ NotificationService inicializado")
        print(f"   API Key configurada: {'Sim' if notifier.api_key else 'Não (modo log-only)'}")
        print(f"   Frontend URL: {notifier.frontend_url}")
        
        if not notifier.api_key:
            print("\n⚠️  ATENÇÃO: API Key não configurada!")
            print("   Os emails serão apenas logados, não enviados.")
            print("   Para enviar de verdade, configure RESEND_API_KEY no ambiente.")
            
            # Perguntar se quer continuar mesmo assim
            response = input("\n   Deseja continuar mesmo assim? (s/n): ")
            if response.lower() != 's':
                print("   Teste cancelado.")
                return
        
    except Exception as e:
        print(f"❌ Erro ao importar NotificationService: {e}")
        return
    
    # Criar mock do db (não vamos usar banco real)
    class MockDB:
        def execute(self, *args, **kwargs):
            class MockResult:
                def fetchone(self):
                    return None
            return MockResult()
    
    mock_db = MockDB()
    
    # Menu de opções
    print("\n" + "-" * 60)
    print("Escolha qual email de teste enviar:")
    print("-" * 60)
    print("1. 📨 Email de Boas-vindas")
    print("2. 📈 Trade P2P Criado (Compra)")
    print("3. ✅ Trade P2P Concluído")
    print("4. 💳 Compra Instantânea (OTC) Concluída")
    print("5. 💰 Depósito Recebido")
    print("6. 📄 Invoice WolkPay Criada")
    print("7. 🎉 Invoice WolkPay Paga")
    print("8. 📑 Boleto em Processamento")
    print("9. ✅ Boleto Pago")
    print("10. 🔐 KYC Aprovado")
    print("11. ⚡ Enviar TODOS os emails de teste")
    print("0. ❌ Cancelar")
    print("-" * 60)
    
    choice = input("\nDigite o número da opção: ")
    
    results = []
    
    async def send_welcome():
        """Envia email de boas-vindas"""
        print("\n📨 Enviando email de boas-vindas...")
        result = await notifier.send_welcome(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME
        )
        return ("Boas-vindas", result)
    
    async def send_trade_created():
        """Envia email de trade criado"""
        print("\n📈 Enviando email de trade P2P criado...")
        result = await notifier.send_trade_created(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            trade_type="buy",
            crypto_amount=0.5,
            crypto_symbol="BTC",
            fiat_amount=15000.00,
            fiat_currency="BRL",
            price_per_unit=30000.00,
            payment_method="PIX",
            order_id=f"P2P-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            expires_hours=24
        )
        return ("Trade Criado", result)
    
    async def send_trade_completed():
        """Envia email de trade concluído"""
        print("\n✅ Enviando email de trade P2P concluído...")
        result = await notifier.send_trade_completed(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            trade_type="buy",
            crypto_amount=0.5,
            crypto_symbol="BTC",
            fiat_amount=15000.00,
            fiat_currency="BRL",
            trade_id=f"P2P-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        return ("Trade Concluído", result)
    
    async def send_instant_buy():
        """Envia email de compra instantânea"""
        print("\n💳 Enviando email de compra instantânea (OTC)...")
        result = await notifier.send_instant_buy_completed(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            crypto_amount=500.00,
            crypto_symbol="USDT",
            fiat_amount=2750.00,
            fiat_currency="BRL",
            transaction_id=f"OTC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        return ("Compra Instantânea", result)
    
    async def send_deposit():
        """Envia email de depósito recebido"""
        print("\n💰 Enviando email de depósito recebido...")
        result = await notifier.send_deposit_received(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            amount=1000.00,
            symbol="USDT",
            network="TRC20",
            tx_hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            confirmations=12,
            new_balance=5500.00
        )
        return ("Depósito Recebido", result)
    
    async def send_invoice_created():
        """Envia email de invoice criada"""
        print("\n📄 Enviando email de invoice WolkPay criada...")
        result = await notifier.send_invoice_created(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            invoice_id=f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            amount=500.00,
            currency="BRL",
            description="Serviço de consultoria",
            payment_link="https://wolknow.com/wolkpay/pay/test-invoice",
            expires_hours=24
        )
        return ("Invoice Criada", result)
    
    async def send_invoice_paid():
        """Envia email de invoice paga"""
        print("\n🎉 Enviando email de invoice WolkPay paga...")
        result = await notifier.send_invoice_paid(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            invoice_id=f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            amount=500.00,
            currency="BRL",
            crypto_amount=91.50,
            crypto_symbol="USDT",
            payer_email="cliente@email.com"
        )
        return ("Invoice Paga", result)
    
    async def send_bill_processing():
        """Envia email de boleto em processamento"""
        print("\n📑 Enviando email de boleto em processamento...")
        result = await notifier.send_bill_processing(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            barcode="23793.38128 60000.000003 00000.000400 1 94120000012500",
            beneficiary="Companhia de Energia Elétrica",
            amount=125.00,
            due_date="15/03/2026",
            crypto_amount=23.50,
            crypto_symbol="USDT",
            transaction_id=f"BILL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        return ("Boleto Processando", result)
    
    async def send_bill_paid():
        """Envia email de boleto pago"""
        print("\n✅ Enviando email de boleto pago...")
        result = await notifier.send_bill_paid(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            beneficiary="Companhia de Energia Elétrica",
            amount=125.00,
            authentication_code="A1B2C3D4E5F6",
            crypto_amount=23.50,
            crypto_symbol="USDT",
            transaction_id=f"BILL-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        return ("Boleto Pago", result)
    
    async def send_kyc_approved():
        """Envia email de KYC aprovado"""
        print("\n🔐 Enviando email de KYC aprovado...")
        result = await notifier.send_kyc_approved(
            db=mock_db,
            user_id=TEST_USER_ID,
            to_email=TEST_EMAIL,
            username=TEST_NAME,
            level="premium"
        )
        return ("KYC Aprovado", result)
    
    # Executar baseado na escolha
    if choice == "1":
        results.append(await send_welcome())
    elif choice == "2":
        results.append(await send_trade_created())
    elif choice == "3":
        results.append(await send_trade_completed())
    elif choice == "4":
        results.append(await send_instant_buy())
    elif choice == "5":
        results.append(await send_deposit())
    elif choice == "6":
        results.append(await send_invoice_created())
    elif choice == "7":
        results.append(await send_invoice_paid())
    elif choice == "8":
        results.append(await send_bill_processing())
    elif choice == "9":
        results.append(await send_bill_paid())
    elif choice == "10":
        results.append(await send_kyc_approved())
    elif choice == "11":
        print("\n⚡ Enviando TODOS os emails de teste...")
        results.append(await send_welcome())
        await asyncio.sleep(1)  # Pequeno delay entre emails
        results.append(await send_trade_created())
        await asyncio.sleep(1)
        results.append(await send_trade_completed())
        await asyncio.sleep(1)
        results.append(await send_instant_buy())
        await asyncio.sleep(1)
        results.append(await send_deposit())
        await asyncio.sleep(1)
        results.append(await send_invoice_created())
        await asyncio.sleep(1)
        results.append(await send_invoice_paid())
        await asyncio.sleep(1)
        results.append(await send_bill_processing())
        await asyncio.sleep(1)
        results.append(await send_bill_paid())
        await asyncio.sleep(1)
        results.append(await send_kyc_approved())
    elif choice == "0":
        print("\n❌ Teste cancelado.")
        return
    else:
        print("\n❌ Opção inválida.")
        return
    
    # Mostrar resultados
    print("\n" + "=" * 60)
    print("📊 RESULTADOS")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    for name, result in results:
        if result.get("success"):
            print(f"✅ {name}: Enviado com sucesso!")
            if result.get("id"):
                print(f"   ID: {result.get('id')}")
            success_count += 1
        else:
            print(f"❌ {name}: Falhou - {result.get('message', result.get('error', 'Erro desconhecido'))}")
            fail_count += 1
    
    print("\n" + "-" * 60)
    print(f"✅ Sucesso: {success_count}")
    print(f"❌ Falha: {fail_count}")
    print(f"📊 Total: {len(results)}")
    print("=" * 60)
    
    if success_count > 0:
        print(f"\n📬 Verifique sua caixa de entrada em: {TEST_EMAIL}")
        print("   (Pode demorar alguns segundos para chegar)")


if __name__ == "__main__":
    asyncio.run(test_email_notifications())
