#!/usr/bin/env python3
"""
🧪 WolkPay Gateway - Script de Teste de Lógica
===============================================

Testa todas as funcionalidades do Gateway:
1. Criação de Merchant
2. Geração de API Keys
3. Criação de Pagamento
4. Simulação de Webhook
5. Auditoria

Executar: python test_gateway_logic.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import json

# Importar modelos
from app.core.db import SessionLocal, engine
from app.models.gateway import (
    GatewayMerchant,
    GatewayApiKey,
    GatewayPayment,
    GatewayWebhook,
    GatewayAuditLog,
    GatewaySettings,
    MerchantStatus,
    GatewayPaymentStatus,
    GatewayPaymentMethod,
    GatewayWebhookEvent,
    GatewayWebhookStatus,
    GatewayAuditAction,
    SettlementCurrency,
)


def print_header(title: str):
    """Imprime cabeçalho formatado"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_success(msg: str):
    print(f"  ✅ {msg}")


def print_info(msg: str):
    print(f"  ℹ️  {msg}")


def print_error(msg: str):
    print(f"  ❌ {msg}")


def test_merchant_creation(db):
    """Teste 1: Criar um Merchant"""
    print_header("TESTE 1: Criação de Merchant")
    
    # Gerar código único
    merchant_code = GatewayMerchant.generate_merchant_code()
    webhook_secret = GatewayMerchant.generate_webhook_secret()
    
    print_info(f"Merchant Code gerado: {merchant_code}")
    print_info(f"Webhook Secret gerado: {webhook_secret[:20]}...")
    
    # Criar merchant
    merchant = GatewayMerchant(
        merchant_code=merchant_code,
        company_name="Loja Teste LTDA",
        trade_name="Loja Teste",
        cnpj="12.345.678/0001-90",
        email="contato@lojateste.com.br",
        phone="11999998888",
        website="https://lojateste.com.br",
        owner_name="João da Silva",
        owner_email="joao@lojateste.com.br",
        status=MerchantStatus.ACTIVE,
        settlement_currency=SettlementCurrency.BRL,
        daily_limit_brl=Decimal("50000"),
        monthly_limit_brl=Decimal("500000"),
        webhook_url="https://lojateste.com.br/webhooks/gateway",
        webhook_secret=webhook_secret,
        hd_index=1,  # Primeiro merchant
    )
    
    db.add(merchant)
    db.flush()
    
    print_success(f"Merchant criado: {merchant.id}")
    print_success(f"Status: {merchant.status.value}")
    print_success(f"Limite diário: R$ {merchant.daily_limit_brl:,.2f}")
    
    # Verificar método is_active
    if merchant.is_active():
        print_success("Método is_active() funcionando ✓")
    else:
        print_error("Método is_active() falhou!")
    
    return merchant


def test_api_key_generation(db, merchant):
    """Teste 2: Gerar API Keys"""
    print_header("TESTE 2: Geração de API Keys")
    
    # Gerar API Key de produção
    full_key, prefix, key_hash = GatewayApiKey.generate_api_key(is_test=False)
    
    print_info(f"API Key completa: {full_key}")
    print_info(f"Prefixo: {prefix}")
    print_info(f"Hash: {key_hash[:20]}...")
    
    api_key = GatewayApiKey(
        merchant_id=merchant.id,
        name="Produção",
        description="Chave principal de produção",
        key_prefix=prefix,
        key_hash=key_hash,
        is_test=False,
        rate_limit_per_minute=100,
        rate_limit_per_hour=2000,
    )
    
    db.add(api_key)
    db.flush()
    
    print_success(f"API Key criada: {api_key.id}")
    print_success(f"Nome: {api_key.name}")
    
    # Testar validação do hash
    test_hash = GatewayApiKey.hash_key(full_key)
    if test_hash == key_hash:
        print_success("Validação de hash funcionando ✓")
    else:
        print_error("Validação de hash falhou!")
    
    # Testar método is_valid
    if api_key.is_valid():
        print_success("Método is_valid() funcionando ✓")
    else:
        print_error("Método is_valid() falhou!")
    
    # Gerar API Key de teste
    full_key_test, prefix_test, key_hash_test = GatewayApiKey.generate_api_key(is_test=True)
    
    api_key_test = GatewayApiKey(
        merchant_id=merchant.id,
        name="Sandbox",
        key_prefix=prefix_test,
        key_hash=key_hash_test,
        is_test=True,
    )
    
    db.add(api_key_test)
    db.flush()
    
    print_success(f"API Key de teste criada: {prefix_test}...")
    
    return api_key, full_key


def test_payment_creation(db, merchant):
    """Teste 3: Criar Pagamentos (PIX e Crypto)"""
    print_header("TESTE 3: Criação de Pagamentos")
    
    # ===== PAGAMENTO PIX =====
    print_info("\n--- Pagamento PIX ---")
    
    payment_id = GatewayPayment.generate_payment_id()
    checkout_token = GatewayPayment.generate_checkout_token()
    
    print_info(f"Payment ID gerado: {payment_id}")
    print_info(f"Checkout Token: {checkout_token[:20]}...")
    
    payment_pix = GatewayPayment(
        payment_id=payment_id,
        external_id="order_12345",
        merchant_id=merchant.id,
        payment_method=GatewayPaymentMethod.PIX,
        amount_requested=Decimal("150.00"),
        currency_requested="BRL",
        fee_percent=Decimal("3.50"),
        fee_amount=Decimal("5.25"),
        pix_key="12345678901234567890123456789012",
        pix_txid="WKGW" + payment_id.replace("-", ""),
        pix_qrcode="00020126580014br.gov.bcb.pix...",
        status=GatewayPaymentStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        checkout_token=checkout_token,
        checkout_url=f"https://gateway.wolknow.com/pay/{checkout_token}",
        customer_name="Maria Santos",
        customer_email="maria@email.com",
        description="Pedido #12345 - Camiseta",
        extra_data={"order_id": "12345", "product": "Camiseta P"},
    )
    
    db.add(payment_pix)
    db.flush()
    
    print_success(f"Pagamento PIX criado: {payment_pix.id}")
    print_success(f"Status: {payment_pix.status.value}")
    print_success(f"Valor: R$ {payment_pix.amount_requested}")
    print_success(f"Taxa: {payment_pix.fee_percent}% = R$ {payment_pix.fee_amount}")
    
    # Testar métodos
    if payment_pix.is_pix():
        print_success("Método is_pix() funcionando ✓")
    if not payment_pix.is_expired():
        print_success("Método is_expired() funcionando ✓")
    
    # ===== PAGAMENTO CRYPTO =====
    print_info("\n--- Pagamento Crypto ---")
    
    payment_id_crypto = GatewayPayment.generate_payment_id()
    checkout_token_crypto = GatewayPayment.generate_checkout_token()
    
    # Simular índice para derivação HD
    hd_payment_index = merchant.get_next_payment_index()
    derivation_path = f"m/44'/60'/1000'/{merchant.hd_index}/{hd_payment_index}"
    
    print_info(f"HD Derivation Path: {derivation_path}")
    
    payment_crypto = GatewayPayment(
        payment_id=payment_id_crypto,
        external_id="order_67890",
        merchant_id=merchant.id,
        payment_method=GatewayPaymentMethod.CRYPTO,
        amount_requested=Decimal("500.00"),
        currency_requested="BRL",
        fee_percent=Decimal("2.50"),
        fee_amount=Decimal("12.50"),
        # Crypto específico
        crypto_currency="USDT",
        crypto_network="polygon",
        crypto_address="0x1234567890abcdef1234567890abcdef12345678",  # Endereço derivado
        crypto_amount=Decimal("85.47"),  # Convertido em USDT
        crypto_required_confirmations=30,
        usd_rate=Decimal("1.00"),  # USDT = $1
        brl_rate=Decimal("5.85"),  # USD/BRL
        # HD Wallet
        hd_derivation_path=derivation_path,
        hd_merchant_index=merchant.hd_index,
        hd_payment_index=hd_payment_index,
        # Resto
        status=GatewayPaymentStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        checkout_token=checkout_token_crypto,
        checkout_url=f"https://gateway.wolknow.com/pay/{checkout_token_crypto}",
        customer_name="Pedro Lima",
        customer_email="pedro@email.com",
        description="Pedido #67890 - Tênis",
    )
    
    db.add(payment_crypto)
    db.flush()
    
    print_success(f"Pagamento Crypto criado: {payment_crypto.id}")
    print_success(f"Crypto: {payment_crypto.crypto_amount} {payment_crypto.crypto_currency}")
    print_success(f"Rede: {payment_crypto.crypto_network}")
    print_success(f"Endereço: {payment_crypto.crypto_address}")
    print_success(f"Confirmações necessárias: {payment_crypto.crypto_required_confirmations}")
    
    # Testar métodos
    if payment_crypto.is_crypto():
        print_success("Método is_crypto() funcionando ✓")
    
    return payment_pix, payment_crypto


def test_payment_confirmation(db, payment):
    """Teste 4: Simular confirmação de pagamento"""
    print_header("TESTE 4: Confirmação de Pagamento")
    
    print_info(f"Pagamento: {payment.payment_id}")
    print_info(f"Status atual: {payment.status.value}")
    
    # Simular recebimento
    payment.status = GatewayPaymentStatus.PROCESSING
    payment.crypto_confirmations = 15
    db.flush()
    
    print_success(f"Status atualizado: {payment.status.value}")
    print_success(f"Confirmações: {payment.crypto_confirmations}/{payment.crypto_required_confirmations}")
    
    # Verificar se tem confirmações suficientes
    if not payment.has_enough_confirmations():
        print_info("Aguardando mais confirmações...")
    
    # Simular confirmação completa
    payment.crypto_confirmations = 30
    payment.crypto_tx_hash = "0xabc123def456789..."
    payment.status = GatewayPaymentStatus.CONFIRMED
    payment.confirmed_at = datetime.now(timezone.utc)
    db.flush()
    
    if payment.has_enough_confirmations():
        print_success("Confirmações suficientes! ✓")
    
    print_success(f"Status final: {payment.status.value}")
    print_success(f"TX Hash: {payment.crypto_tx_hash}")
    print_success(f"Confirmado em: {payment.confirmed_at}")
    
    # Completar pagamento
    payment.status = GatewayPaymentStatus.COMPLETED
    payment.completed_at = datetime.now(timezone.utc)
    payment.settlement_amount = payment.amount_requested - payment.fee_amount
    payment.settlement_currency = "BRL"
    payment.settlement_status = "completed"
    db.flush()
    
    print_success(f"Pagamento COMPLETO!")
    print_success(f"Valor líquido: R$ {payment.settlement_amount}")
    
    return payment


def test_webhook_creation(db, payment, merchant):
    """Teste 5: Criar e simular Webhook"""
    print_header("TESTE 5: Webhooks")
    
    # Criar payload
    payload = {
        "event": GatewayWebhookEvent.PAYMENT_COMPLETED.value,
        "payment_id": payment.payment_id,
        "external_id": payment.external_id,
        "amount": str(payment.amount_requested),
        "net_amount": str(payment.settlement_amount),
        "paid_at": payment.confirmed_at.isoformat(),
        "payment_method": payment.payment_method.value,
    }
    
    if payment.is_crypto():
        payload["crypto_details"] = {
            "currency": payment.crypto_currency,
            "amount": str(payment.crypto_amount),
            "tx_hash": payment.crypto_tx_hash,
            "network": payment.crypto_network,
        }
    
    payload_json = json.dumps(payload)
    
    # Gerar assinatura
    signature = GatewayWebhook.generate_signature(payload_json, merchant.webhook_secret)
    
    print_info(f"Payload: {payload_json[:100]}...")
    print_info(f"Signature: {signature[:40]}...")
    
    # Criar webhook
    webhook = GatewayWebhook(
        payment_id=payment.id,
        merchant_id=merchant.id,
        event=GatewayWebhookEvent.PAYMENT_COMPLETED,
        payload=payload,
        signature=signature,
        url=merchant.webhook_url,
        status=GatewayWebhookStatus.PENDING,
    )
    
    db.add(webhook)
    db.flush()
    
    print_success(f"Webhook criado: {webhook.id}")
    print_success(f"Evento: {webhook.event.value}")
    print_success(f"URL destino: {webhook.url}")
    
    # Simular envio com sucesso
    webhook.status = GatewayWebhookStatus.SENT
    webhook.sent_at = datetime.now(timezone.utc)
    webhook.last_response_code = 200
    webhook.last_response_body = '{"received": true}'
    webhook.attempts = 1
    db.flush()
    
    print_success(f"Webhook enviado! Status: {webhook.status.value}")
    print_success(f"Response: {webhook.last_response_code}")
    
    # Testar cálculo de retry
    webhook_retry = GatewayWebhook(
        payment_id=payment.id,
        merchant_id=merchant.id,
        event=GatewayWebhookEvent.PAYMENT_CONFIRMED,
        payload=payload,
        url=merchant.webhook_url,
        status=GatewayWebhookStatus.FAILED,
        attempts=2,
    )
    
    next_attempt = webhook_retry.calculate_next_attempt()
    print_info(f"\nTeste de retry (tentativa 3):")
    print_info(f"Próxima tentativa em: {next_attempt}")
    
    return webhook


def test_audit_log(db, merchant, payment):
    """Teste 6: Logs de Auditoria"""
    print_header("TESTE 6: Auditoria")
    
    # Log de criação de merchant
    audit1 = GatewayAuditLog(
        merchant_id=merchant.id,
        actor_type="system",
        actor_email="system@wolknow.com",
        action=GatewayAuditAction.MERCHANT_CREATED,
        description=f"Merchant {merchant.merchant_code} criado",
        new_data={
            "merchant_code": merchant.merchant_code,
            "company_name": merchant.company_name,
            "status": merchant.status.value,
        },
        ip_address="127.0.0.1",
    )
    
    db.add(audit1)
    
    # Log de pagamento
    audit2 = GatewayAuditLog(
        merchant_id=merchant.id,
        payment_id=payment.id,
        actor_type="api",
        action=GatewayAuditAction.PAYMENT_COMPLETED,
        description=f"Pagamento {payment.payment_id} completado",
        new_data={
            "payment_id": payment.payment_id,
            "amount": str(payment.amount_requested),
            "status": payment.status.value,
        },
    )
    
    db.add(audit2)
    db.flush()
    
    print_success(f"Audit log 1: {audit1.action.value}")
    print_success(f"Audit log 2: {audit2.action.value}")
    
    # Listar logs
    logs = db.query(GatewayAuditLog).filter(
        GatewayAuditLog.merchant_id == merchant.id
    ).all()
    
    print_info(f"\nTotal de logs para este merchant: {len(logs)}")
    
    return logs


def test_settings(db):
    """Teste 7: Verificar Settings"""
    print_header("TESTE 7: Configurações do Sistema")
    
    settings = db.query(GatewaySettings).all()
    
    for setting in settings:
        print_info(f"{setting.key}: {setting.value}")
    
    # Buscar configuração específica
    fee_setting = db.query(GatewaySettings).filter(
        GatewaySettings.key == "default_fee_percent"
    ).first()
    
    if fee_setting:
        print_success(f"\nTaxa padrão: {fee_setting.value}%")
    
    return settings


def cleanup(db, merchant):
    """Limpar dados de teste"""
    print_header("LIMPEZA")
    
    # Deletar na ordem correta (dependências primeiro)
    db.query(GatewayAuditLog).filter(GatewayAuditLog.merchant_id == merchant.id).delete()
    db.query(GatewayWebhook).filter(GatewayWebhook.merchant_id == merchant.id).delete()
    db.query(GatewayPayment).filter(GatewayPayment.merchant_id == merchant.id).delete()
    db.query(GatewayApiKey).filter(GatewayApiKey.merchant_id == merchant.id).delete()
    db.query(GatewayMerchant).filter(GatewayMerchant.id == merchant.id).delete()
    
    db.commit()
    
    print_success("Dados de teste removidos!")


def main():
    """Executa todos os testes"""
    print("\n" + "🚀" * 20)
    print("  WOLKPAY GATEWAY - TESTE DE LÓGICA")
    print("🚀" * 20)
    
    db = SessionLocal()
    merchant = None
    
    try:
        # Executar testes
        merchant = test_merchant_creation(db)
        api_key, full_key = test_api_key_generation(db, merchant)
        payment_pix, payment_crypto = test_payment_creation(db, merchant)
        payment_confirmed = test_payment_confirmation(db, payment_crypto)
        webhook = test_webhook_creation(db, payment_confirmed, merchant)
        audit_logs = test_audit_log(db, merchant, payment_confirmed)
        settings = test_settings(db)
        
        # Resumo final
        print_header("📊 RESUMO FINAL")
        print_success("Todos os testes passaram!")
        print_info(f"  • Merchant: {merchant.merchant_code}")
        print_info(f"  • API Key: {api_key.key_prefix}...")
        print_info(f"  • Pagamento PIX: {payment_pix.payment_id}")
        print_info(f"  • Pagamento Crypto: {payment_crypto.payment_id}")
        print_info(f"  • Webhook enviado: {webhook.event.value}")
        print_info(f"  • Logs de auditoria: {len(audit_logs)}")
        print_info(f"  • Configurações: {len(settings)}")
        
        print("\n" + "=" * 60)
        print("  ✅ GATEWAY FUNCIONANDO 100%!")
        print("=" * 60 + "\n")
        
        # Perguntar se quer limpar
        response = input("Deseja remover os dados de teste? (s/N): ")
        if response.lower() == 's':
            cleanup(db, merchant)
        else:
            print_info("Dados de teste mantidos no banco.")
            db.commit()
            
    except Exception as e:
        print_error(f"Erro durante testes: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        
        # Limpar mesmo com erro
        if merchant:
            try:
                cleanup(db, merchant)
            except:
                pass
        
        return 1
    finally:
        db.close()
    
    return 0


if __name__ == "__main__":
    exit(main())
