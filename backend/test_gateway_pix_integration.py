#!/usr/bin/env python3
"""
🧪 WolkPay Gateway - Teste COMPLETO de Integração PIX
======================================================

Teste end-to-end que:
1. Cria um Merchant no Gateway
2. Cria um Payment PIX
3. Integra com Banco do Brasil para gerar QR Code REAL
4. Gera imagem do QR Code
5. Simula webhook de confirmação

⚠️ ATENÇÃO: Este teste faz chamadas REAIS à API do Banco do Brasil!

Executar: python test_gateway_pix_integration.py
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import json
import base64

# Importar modelos
from app.core.db import SessionLocal
from app.models.gateway import (
    GatewayMerchant,
    GatewayApiKey,
    GatewayPayment,
    GatewayWebhook,
    GatewayAuditLog,
    MerchantStatus,
    GatewayPaymentStatus,
    GatewayPaymentMethod,
    GatewayWebhookEvent,
    GatewayWebhookStatus,
    GatewayAuditAction,
)

# Importar serviço do Banco do Brasil
from app.services.banco_brasil_service import BancoBrasilAPIService


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_success(msg: str):
    print(f"  ✅ {msg}")


def print_info(msg: str):
    print(f"  ℹ️  {msg}")


def print_error(msg: str):
    print(f"  ❌ {msg}")


def print_warning(msg: str):
    print(f"  ⚠️  {msg}")


async def test_bb_credentials():
    """Teste 0: Verificar credenciais do Banco do Brasil"""
    print_header("TESTE 0: Verificação de Credenciais BB")
    
    bb_service = BancoBrasilAPIService()
    
    print_info(f"Ambiente: {'PRODUÇÃO' if bb_service.is_production else 'SANDBOX'}")
    print_info(f"OAuth URL: {bb_service.oauth_url}")
    print_info(f"API URL: {bb_service.api_url}")
    print_info(f"PIX Key: {bb_service.pix_key[:10]}..." if bb_service.pix_key else "PIX Key: NÃO CONFIGURADA")
    print_info(f"Client ID: {bb_service.client_id[:10]}..." if bb_service.client_id else "Client ID: NÃO CONFIGURADO")
    
    # Tenta obter token
    try:
        token = await bb_service.get_access_token()
        print_success(f"Token obtido: {token[:30]}...")
        return bb_service, True
    except Exception as e:
        print_error(f"Erro ao obter token: {e}")
        print_warning("Verifique as variáveis de ambiente BB_CLIENT_ID, BB_CLIENT_SECRET, BB_GW_DEV_APP_KEY, BB_PIX_KEY")
        return bb_service, False


def create_test_merchant(db) -> GatewayMerchant:
    """Teste 1: Criar merchant de teste"""
    print_header("TESTE 1: Criação de Merchant")
    
    merchant_code = GatewayMerchant.generate_merchant_code()
    webhook_secret = GatewayMerchant.generate_webhook_secret()
    
    print_info(f"Merchant Code: {merchant_code}")
    
    merchant = GatewayMerchant(
        merchant_code=merchant_code,
        company_name="E-Commerce Teste PIX LTDA",
        trade_name="Loja Teste PIX",
        cnpj="12.345.678/0001-90",
        email="pix@lojateste.com.br",
        phone="11999998888",
        website="https://lojateste.com.br",
        owner_name="Teste PIX",
        owner_email="dono@lojateste.com.br",
        status=MerchantStatus.ACTIVE,
        daily_limit_brl=Decimal("100000"),
        monthly_limit_brl=Decimal("1000000"),
        webhook_url="https://lojateste.com.br/webhooks/gateway",
        webhook_secret=webhook_secret,
        hd_index=999,  # Índice de teste
    )
    
    db.add(merchant)
    db.flush()
    
    print_success(f"Merchant criado: {merchant.id}")
    print_success(f"Status: {merchant.status.value}")
    
    return merchant


async def create_pix_payment_with_bb(db, merchant, bb_service) -> GatewayPayment:
    """Teste 2: Criar pagamento PIX integrado com BB"""
    print_header("TESTE 2: Criação de Pagamento PIX com Banco do Brasil")
    
    # Gerar IDs
    payment_id = GatewayPayment.generate_payment_id()
    checkout_token = GatewayPayment.generate_checkout_token()
    
    # Valor do teste (R$ 1,00 para não gastar muito em testes)
    valor = Decimal("1.00")
    taxa_percent = Decimal("3.50")
    taxa_valor = valor * taxa_percent / 100
    valor_liquido = valor - taxa_valor
    
    print_info(f"Payment ID: {payment_id}")
    print_info(f"Valor: R$ {valor}")
    print_info(f"Taxa: {taxa_percent}% = R$ {taxa_valor:.2f}")
    print_info(f"Líquido: R$ {valor_liquido:.2f}")
    
    # Gerar TXID para o BB (formato: WKGW + código limpo)
    txid = f"WKGW{payment_id.replace('-', '')}"
    print_info(f"TXID para BB: {txid}")
    
    # ===== CHAMADA REAL AO BANCO DO BRASIL =====
    print_info("\n🏦 Chamando API do Banco do Brasil...")
    
    try:
        bb_response = await bb_service.criar_cobranca_pix(
            txid=txid,
            valor=valor,
            descricao=f"Gateway Test - {payment_id}",
            expiracao_segundos=1800,  # 30 minutos
            devedor_cpf="12345678901",  # CPF de teste (obrigatório pelo BB)
            devedor_nome="Cliente Teste Gateway",  # Nome (obrigatório junto com CPF)
            info_adicionais={
                "merchant": merchant.merchant_code,
                "payment": payment_id,
            }
        )
        
        print_success("Cobrança PIX criada no Banco do Brasil!")
        print_info(f"  TXID: {bb_response.get('txid')}")
        print_info(f"  Status: {bb_response.get('status')}")
        print_info(f"  Location: {bb_response.get('location', 'N/A')[:50]}...")
        
        pix_qrcode = bb_response.get('qrcode', '')
        pix_qrcode_image = bb_response.get('qrcode_base64', '')
        
        if pix_qrcode:
            print_success(f"  PIX Copia-e-Cola: {pix_qrcode[:50]}...")
        else:
            print_warning("  PIX Copia-e-Cola não retornado")
        
        if pix_qrcode_image:
            print_success(f"  QR Code Image: {len(pix_qrcode_image)} chars (base64)")
        else:
            print_warning("  QR Code Image não gerada")
            
    except Exception as e:
        print_error(f"Erro ao criar cobrança PIX: {e}")
        # Cria payment mesmo sem BB (para teste de fluxo)
        bb_response = {
            'txid': txid,
            'status': 'ERROR',
            'qrcode': '',
            'qrcode_base64': '',
        }
        pix_qrcode = ''
        pix_qrcode_image = ''
    
    # Criar registro no Gateway
    payment = GatewayPayment(
        payment_id=payment_id,
        external_id="order_test_12345",
        merchant_id=merchant.id,
        payment_method=GatewayPaymentMethod.PIX,
        
        # Valores
        amount_requested=valor,
        currency_requested="BRL",
        fee_percent=taxa_percent,
        fee_amount=taxa_valor,
        
        # PIX
        pix_key=bb_service.pix_key,
        pix_txid=bb_response.get('txid', txid),
        pix_qrcode=pix_qrcode,
        pix_qrcode_image=pix_qrcode_image,
        
        # Status
        status=GatewayPaymentStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        
        # Checkout
        checkout_token=checkout_token,
        checkout_url=f"https://gateway.wolknow.com/pay/{checkout_token}",
        
        # Cliente
        customer_name="Cliente Teste Gateway",
        customer_email="cliente@teste.com",
        
        # Descrição
        description="Pagamento de teste - Gateway PIX Integration",
        extra_data={
            "order_id": "test_12345",
            "product": "Teste de Integração",
            "bb_response": {
                "txid": bb_response.get('txid'),
                "status": bb_response.get('status'),
                "location": bb_response.get('location'),
            }
        },
    )
    
    db.add(payment)
    db.flush()
    
    print_success(f"\n📦 Payment criado no Gateway: {payment.id}")
    print_success(f"Payment ID: {payment.payment_id}")
    print_success(f"Checkout URL: {payment.checkout_url}")
    
    return payment


def save_qrcode_image(payment: GatewayPayment):
    """Teste 3: Salvar imagem do QR Code para verificação visual"""
    print_header("TESTE 3: Salvando QR Code para Verificação")
    
    if not payment.pix_qrcode_image:
        print_warning("QR Code image não disponível")
        return None
    
    # Remove prefixo data:image/png;base64, se existir
    base64_data = payment.pix_qrcode_image
    if base64_data.startswith('data:'):
        base64_data = base64_data.split(',')[1]
    
    try:
        # Decodifica e salva
        img_data = base64.b64decode(base64_data)
        filename = f"test_qrcode_{payment.payment_id}.png"
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        with open(filepath, 'wb') as f:
            f.write(img_data)
        
        print_success(f"QR Code salvo em: {filepath}")
        print_info(f"Tamanho: {len(img_data)} bytes")
        
        # Mostrar PIX copia-e-cola
        if payment.pix_qrcode:
            print_info("\n📋 PIX Copia-e-Cola (use para pagar):")
            print(f"\n{payment.pix_qrcode}\n")
        
        return filepath
        
    except Exception as e:
        print_error(f"Erro ao salvar QR Code: {e}")
        return None


async def simulate_payment_confirmation(db, payment: GatewayPayment, merchant: GatewayMerchant):
    """Teste 4: Simular confirmação de pagamento (webhook do BB)"""
    print_header("TESTE 4: Simulando Confirmação de Pagamento")
    
    print_info(f"Payment ID: {payment.payment_id}")
    print_info(f"Status atual: {payment.status.value}")
    
    # Simular dados que viriam do webhook do BB
    webhook_data = {
        "pix": [{
            "txid": payment.pix_txid,
            "valor": str(payment.amount_requested),
            "horario": datetime.now(timezone.utc).isoformat(),
            "pagador": {
                "cpf": "12345678901",
                "nome": "CLIENTE TESTE"
            },
            "endToEndId": "E123456782026030912345678901234"
        }]
    }
    
    print_info(f"Webhook simulado recebido: {json.dumps(webhook_data, indent=2)[:200]}...")
    
    # Atualizar status do pagamento
    payment.status = GatewayPaymentStatus.CONFIRMED
    payment.confirmed_at = datetime.now(timezone.utc)
    payment.amount_received = payment.amount_requested
    
    # Calcular settlement
    payment.settlement_amount = payment.amount_requested - payment.fee_amount
    payment.settlement_currency = "BRL"
    payment.settlement_status = "pending"
    
    db.flush()
    
    print_success(f"Status atualizado: {payment.status.value}")
    print_success(f"Valor recebido: R$ {payment.amount_received}")
    print_success(f"Valor líquido: R$ {payment.settlement_amount}")
    
    # Criar webhook para enviar ao merchant
    payload = {
        "event": GatewayWebhookEvent.PAYMENT_CONFIRMED.value,
        "payment_id": payment.payment_id,
        "external_id": payment.external_id,
        "amount": str(payment.amount_requested),
        "net_amount": str(payment.settlement_amount),
        "paid_at": payment.confirmed_at.isoformat(),
        "payment_method": "pix",
        "pix_details": {
            "txid": payment.pix_txid,
            "end_to_end_id": "E123456782026030912345678901234",
        }
    }
    
    payload_json = json.dumps(payload)
    signature = GatewayWebhook.generate_signature(payload_json, merchant.webhook_secret)
    
    webhook = GatewayWebhook(
        payment_id=payment.id,
        merchant_id=merchant.id,
        event=GatewayWebhookEvent.PAYMENT_CONFIRMED,
        payload=payload,
        signature=signature,
        url=merchant.webhook_url,
        status=GatewayWebhookStatus.PENDING,
    )
    
    db.add(webhook)
    db.flush()
    
    print_success(f"\n📤 Webhook criado: {webhook.id}")
    print_success(f"Evento: {webhook.event.value}")
    print_success(f"URL destino: {webhook.url}")
    print_info(f"Signature: {signature[:40]}...")
    
    # Simular envio bem-sucedido
    webhook.status = GatewayWebhookStatus.SENT
    webhook.sent_at = datetime.now(timezone.utc)
    webhook.last_response_code = 200
    webhook.attempts = 1
    
    # Completar pagamento
    payment.status = GatewayPaymentStatus.COMPLETED
    payment.completed_at = datetime.now(timezone.utc)
    payment.settlement_status = "completed"
    
    db.flush()
    
    print_success(f"\n🎉 Pagamento COMPLETO!")
    print_success(f"Status final: {payment.status.value}")
    
    return webhook


def create_audit_logs(db, merchant: GatewayMerchant, payment: GatewayPayment):
    """Teste 5: Criar logs de auditoria"""
    print_header("TESTE 5: Criando Logs de Auditoria")
    
    # Log de criação de pagamento
    audit1 = GatewayAuditLog(
        merchant_id=merchant.id,
        payment_id=payment.id,
        actor_type="api",
        action=GatewayAuditAction.PAYMENT_CREATED,
        description=f"Pagamento PIX {payment.payment_id} criado via API",
        new_data={
            "payment_id": payment.payment_id,
            "amount": str(payment.amount_requested),
            "method": "PIX",
            "pix_txid": payment.pix_txid,
        },
        ip_address="127.0.0.1",
    )
    
    # Log de confirmação
    audit2 = GatewayAuditLog(
        merchant_id=merchant.id,
        payment_id=payment.id,
        actor_type="system",
        action=GatewayAuditAction.PAYMENT_CONFIRMED,
        description=f"Pagamento {payment.payment_id} confirmado via webhook BB",
        new_data={
            "status": payment.status.value,
            "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
        },
    )
    
    # Log de conclusão
    audit3 = GatewayAuditLog(
        merchant_id=merchant.id,
        payment_id=payment.id,
        actor_type="system",
        action=GatewayAuditAction.PAYMENT_COMPLETED,
        description=f"Pagamento {payment.payment_id} completo, settlement processado",
        new_data={
            "settlement_amount": str(payment.settlement_amount),
            "settlement_currency": payment.settlement_currency,
        },
    )
    
    db.add_all([audit1, audit2, audit3])
    db.flush()
    
    print_success(f"3 logs de auditoria criados")
    print_info(f"  • {audit1.action.value}")
    print_info(f"  • {audit2.action.value}")
    print_info(f"  • {audit3.action.value}")
    
    return [audit1, audit2, audit3]


def cleanup(db, merchant):
    """Limpar dados de teste"""
    print_header("LIMPEZA")
    
    db.query(GatewayAuditLog).filter(GatewayAuditLog.merchant_id == merchant.id).delete()
    db.query(GatewayWebhook).filter(GatewayWebhook.merchant_id == merchant.id).delete()
    db.query(GatewayPayment).filter(GatewayPayment.merchant_id == merchant.id).delete()
    db.query(GatewayApiKey).filter(GatewayApiKey.merchant_id == merchant.id).delete()
    db.query(GatewayMerchant).filter(GatewayMerchant.id == merchant.id).delete()
    
    db.commit()
    
    print_success("Dados de teste removidos do banco!")


async def main():
    """Executa todos os testes de integração PIX"""
    print("\n" + "🏦" * 25)
    print("  WOLKPAY GATEWAY - TESTE DE INTEGRAÇÃO PIX + BANCO DO BRASIL")
    print("🏦" * 25)
    
    db = SessionLocal()
    merchant = None
    qrcode_file = None
    
    try:
        # Teste 0: Verificar credenciais BB
        bb_service, bb_ok = await test_bb_credentials()
        
        if not bb_ok:
            print_warning("\n⚠️ Credenciais do BB não configuradas. Continuando com teste parcial...")
        
        # Teste 1: Criar merchant
        merchant = create_test_merchant(db)
        
        # Teste 2: Criar pagamento PIX com BB
        payment = await create_pix_payment_with_bb(db, merchant, bb_service)
        
        # Teste 3: Salvar QR Code
        qrcode_file = save_qrcode_image(payment)
        
        # Teste 4: Simular confirmação
        webhook = await simulate_payment_confirmation(db, payment, merchant)
        
        # Teste 5: Logs de auditoria
        audit_logs = create_audit_logs(db, merchant, payment)
        
        # Resumo final
        print_header("📊 RESUMO DO TESTE DE INTEGRAÇÃO PIX")
        
        print_success("Todos os testes executados!")
        print_info(f"\n  📦 Merchant: {merchant.merchant_code}")
        print_info(f"  💳 Payment: {payment.payment_id}")
        print_info(f"  🏦 PIX TXID: {payment.pix_txid}")
        print_info(f"  💰 Valor: R$ {payment.amount_requested}")
        print_info(f"  📊 Status Final: {payment.status.value}")
        
        if payment.pix_qrcode:
            print_info(f"  📱 QR Code: ✅ Gerado ({len(payment.pix_qrcode)} chars)")
        else:
            print_warning(f"  📱 QR Code: ❌ Não gerado")
        
        if qrcode_file:
            print_info(f"  🖼️ Imagem: {qrcode_file}")
        
        print("\n" + "=" * 70)
        if bb_ok and payment.pix_qrcode:
            print("  ✅ INTEGRAÇÃO PIX + BANCO DO BRASIL FUNCIONANDO!")
            print("\n  📋 Use o QR Code acima para testar um pagamento real!")
            print("  ⚠️  Valor: R$ 1,00 (teste)")
        else:
            print("  ⚠️ TESTE PARCIAL - Configure credenciais do BB para teste completo")
        print("=" * 70 + "\n")
        
        # Perguntar se quer limpar
        response = input("Deseja remover os dados de teste? (s/N): ")
        if response.lower() == 's':
            cleanup(db, merchant)
            if qrcode_file and os.path.exists(qrcode_file):
                os.remove(qrcode_file)
                print_success(f"Arquivo {qrcode_file} removido")
        else:
            print_info("Dados de teste mantidos no banco.")
            db.commit()
            
    except Exception as e:
        print_error(f"Erro durante testes: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        
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
    exit(asyncio.run(main()))
