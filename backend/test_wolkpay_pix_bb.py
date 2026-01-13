#!/usr/bin/env python3
"""
🧪 Teste WolkPay PIX Automático BB
==================================

Simula o fluxo completo do WolkPay:
1. Login do usuário
2. Criar fatura
3. Preencher dados do pagador
4. Gerar PIX via API Banco do Brasil
5. Verificar se cobrança foi criada

Execute: python test_wolkpay_pix_bb.py
"""

import asyncio
import httpx
import json
from datetime import datetime
from decimal import Decimal

# Configurações
BASE_URL = "http://localhost:8000/api/v1"
USER_EMAIL = "contato@josecarlosmartins.com"
USER_PASSWORD = "Jcm15!@#"

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_step(step: int, message: str):
    print(f"\n{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}📍 PASSO {step}: {message}{Colors.END}")
    print(f"{Colors.CYAN}{'='*60}{Colors.END}")

def log_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def log_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def log_info(message: str):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def log_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")


async def main():
    print(f"\n{Colors.BOLD}🚀 TESTE WOLKPAY - PIX AUTOMÁTICO BANCO DO BRASIL{Colors.END}")
    print(f"{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"🌐 URL Base: {BASE_URL}")
    print(f"👤 Usuário: {USER_EMAIL}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # ============================================================
        # PASSO 1: LOGIN
        # ============================================================
        log_step(1, "LOGIN DO USUÁRIO")
        
        login_data = {
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        }
        
        try:
            # Login está em /auth/login (sem /api/v1)
            response = await client.post(
                "http://localhost:8000/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                access_token = auth_data.get("access_token")
                log_success(f"Login realizado!")
                log_info(f"Token: {access_token[:50]}...")
            else:
                log_error(f"Falha no login: {response.status_code}")
                log_error(f"Resposta: {response.text}")
                return
        except Exception as e:
            log_error(f"Erro no login: {e}")
            return
        
        # Headers autenticados
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # ============================================================
        # PASSO 2: CRIAR FATURA WOLKPAY
        # ============================================================
        log_step(2, "CRIAR FATURA WOLKPAY")
        
        invoice_data = {
            "crypto_currency": "USDT",
            "crypto_amount": 10.0,  # 10 USDT = ~R$ 60
            "crypto_network": "polygon",
            "fee_payer": "PAYER"  # Pagador paga as taxas
        }
        
        log_info(f"Criando fatura: {invoice_data['crypto_amount']} {invoice_data['crypto_currency']}")
        
        try:
            # WolkPay rotas estão em /wolkpay (sem /api/v1)
            response = await client.post(
                "http://localhost:8000/wolkpay/invoice",
                json=invoice_data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                invoice_response = response.json()
                invoice_id = invoice_response.get("invoice_id")
                invoice_number = invoice_response.get("invoice_number")
                checkout_url = invoice_response.get("checkout_url")
                checkout_token = checkout_url.split("/")[-1] if checkout_url else None
                total_brl = invoice_response.get("total_amount_brl")
                
                log_success(f"Fatura criada!")
                log_info(f"Invoice ID: {invoice_id}")
                log_info(f"Número: {invoice_number}")
                log_info(f"Checkout URL: {checkout_url}")
                log_info(f"Checkout Token: {checkout_token}")
                log_info(f"Total BRL: R$ {total_brl}")
            else:
                log_error(f"Falha ao criar fatura: {response.status_code}")
                log_error(f"Resposta: {response.text}")
                return
        except Exception as e:
            log_error(f"Erro ao criar fatura: {e}")
            return
        
        # ============================================================
        # PASSO 3: OBTER DADOS DO CHECKOUT (COMO PAGADOR)
        # ============================================================
        log_step(3, "OBTER DADOS DO CHECKOUT")
        
        try:
            # WolkPay rotas estão em /wolkpay (sem /api/v1)
            response = await client.get(
                f"http://localhost:8000/wolkpay/checkout/{checkout_token}"
            )
            
            if response.status_code == 200:
                checkout_data = response.json()
                log_success(f"Dados do checkout obtidos!")
                log_info(f"Status: {checkout_data.get('status')}")
                log_info(f"Beneficiário: {checkout_data.get('beneficiary_name')}")
                log_info(f"Valor: R$ {checkout_data.get('total_amount_brl')}")
                log_info(f"Crypto: {checkout_data.get('crypto_amount')} {checkout_data.get('crypto_currency')}")
                log_info(f"Expira em: {checkout_data.get('expires_in_seconds')}s")
            else:
                log_error(f"Falha ao obter checkout: {response.status_code}")
                log_error(f"Resposta: {response.text}")
                return
        except Exception as e:
            log_error(f"Erro ao obter checkout: {e}")
            return
        
        # ============================================================
        # PASSO 4: PREENCHER DADOS DO PAGADOR
        # ============================================================
        log_step(4, "PREENCHER DADOS DO PAGADOR")
        
        payer_data = {
            "person_type": "PF",
            "terms_version": "v1.0",
            "pf_data": {
                "full_name": "José Carlos Martins Teste",
                "cpf": "123.456.789-09",  # CPF de teste
                "birth_date": "1990-01-15",
                "phone": "(61) 99999-8888",
                "email": "teste.pagador@email.com"
            },
            "address": {
                "zip_code": "70000-000",
                "street": "Rua Teste",
                "number": "123",
                "complement": "Apto 456",
                "neighborhood": "Centro",
                "city": "Brasília",
                "state": "DF"
            }
        }
        
        log_info(f"Pagador: {payer_data['pf_data']['full_name']}")
        log_info(f"CPF: {payer_data['pf_data']['cpf']}")
        
        try:
            # WolkPay rotas estão em /wolkpay (sem /api/v1)
            response = await client.post(
                f"http://localhost:8000/wolkpay/checkout/{checkout_token}/payer",
                json=payer_data,
                headers={
                    "Content-Type": "application/json",
                    "X-Forwarded-For": "177.66.123.45"  # IP simulado
                }
            )
            
            if response.status_code in [200, 201]:
                log_success(f"Dados do pagador salvos!")
            else:
                log_error(f"Falha ao salvar pagador: {response.status_code}")
                log_error(f"Resposta: {response.text}")
                return
        except Exception as e:
            log_error(f"Erro ao salvar pagador: {e}")
            return
        
        # ============================================================
        # PASSO 5: GERAR PIX (API BANCO DO BRASIL)
        # ============================================================
        log_step(5, "GERAR PIX VIA API BANCO DO BRASIL")
        
        log_info("Chamando API BB para criar cobrança PIX...")
        
        try:
            # WolkPay rotas estão em /wolkpay (sem /api/v1)
            response = await client.post(
                f"http://localhost:8000/wolkpay/checkout/{checkout_token}/pay"
            )
            
            if response.status_code == 200:
                pix_data = response.json()
                
                pix_txid = pix_data.get("pix_txid")
                pix_qrcode = pix_data.get("pix_qrcode", "")
                is_automatic = pix_data.get("is_automatic", False)
                amount_brl = pix_data.get("amount_brl")
                expires_in = pix_data.get("expires_in_seconds")
                
                log_success(f"PIX gerado com sucesso!")
                print()
                
                if is_automatic:
                    print(f"  {Colors.GREEN}🏦 TIPO: PIX Automático (API Banco do Brasil){Colors.END}")
                else:
                    print(f"  {Colors.YELLOW}📋 TIPO: PIX Estático (Fallback){Colors.END}")
                
                print(f"  {Colors.BOLD}📝 TXID:{Colors.END} {pix_txid}")
                print(f"  {Colors.BOLD}💰 Valor:{Colors.END} R$ {amount_brl}")
                print(f"  {Colors.BOLD}⏰ Expira em:{Colors.END} {expires_in}s")
                print()
                print(f"  {Colors.BOLD}📱 PIX Copia e Cola:{Colors.END}")
                print(f"  {Colors.CYAN}{pix_qrcode[:100]}...{Colors.END}" if len(pix_qrcode) > 100 else f"  {Colors.CYAN}{pix_qrcode}{Colors.END}")
                print()
                
                if is_automatic:
                    log_success("✨ Cobrança criada via API BB!")
                    log_info("Quando o pagamento for feito, o webhook receberá a confirmação")
                    log_info("e o sistema enviará a crypto automaticamente!")
                else:
                    log_warning("PIX estático gerado (BB indisponível)")
                    log_info("Pagamento requer confirmação manual do admin")
                
            else:
                log_error(f"Falha ao gerar PIX: {response.status_code}")
                log_error(f"Resposta: {response.text}")
                return
        except Exception as e:
            log_error(f"Erro ao gerar PIX: {e}")
            import traceback
            traceback.print_exc()
            return
        
        # ============================================================
        # RESUMO FINAL
        # ============================================================
        print(f"\n{Colors.CYAN}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}📊 RESUMO DO TESTE{Colors.END}")
        print(f"{Colors.CYAN}{'='*60}{Colors.END}")
        print(f"  ✅ Login: OK")
        print(f"  ✅ Criar Fatura: {invoice_number}")
        print(f"  ✅ Dados Pagador: Salvos")
        print(f"  ✅ PIX Gerado: {'BB Auto' if is_automatic else 'Estático'}")
        print(f"  📝 TXID: {pix_txid}")
        print()
        
        if is_automatic:
            print(f"{Colors.GREEN}🎉 TESTE CONCLUÍDO COM SUCESSO!{Colors.END}")
            print(f"{Colors.GREEN}   O sistema está usando PIX automático do Banco do Brasil.{Colors.END}")
            print()
            print(f"{Colors.YELLOW}📋 PRÓXIMOS PASSOS PARA TESTE COMPLETO:{Colors.END}")
            print(f"   1. Pague o PIX usando o código acima")
            print(f"   2. O webhook /api/v1/webhooks/bb/pix receberá a confirmação")
            print(f"   3. O sistema aprovará automaticamente e enviará a crypto")
            print(f"   4. Verifique os logs do backend para acompanhar")
        else:
            print(f"{Colors.YELLOW}⚠️  TESTE CONCLUÍDO (Modo Fallback){Colors.END}")
            print(f"   API BB não disponível - usando PIX estático")
            print(f"   Verificar conexão com API Banco do Brasil")


if __name__ == "__main__":
    asyncio.run(main())
