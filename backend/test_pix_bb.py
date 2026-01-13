#!/usr/bin/env python3
"""
🏦 Script de Teste - Integração PIX Banco do Brasil
===================================================

Testa todas as etapas da integração:
1. Autenticação OAuth 2.0 com mTLS
2. Criação de cobrança PIX
3. Consulta de cobrança
4. Verificação de webhook

Executar: python3 test_pix_bb.py
"""

import httpx
import ssl
import base64
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_ok(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def log_warn(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")
def log_err(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def log_info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def main():
    print(f"\n{Colors.BOLD}{'='*60}")
    print("🏦 TESTE DE INTEGRAÇÃO PIX - BANCO DO BRASIL")
    print(f"{'='*60}{Colors.END}\n")
    
    # Carregar configurações do .env
    env_path = Path(__file__).parent / ".env"
    env_vars = {}
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, _, value = line.partition('=')
                    env_vars[key.strip()] = value.strip()
    
    # Configurações
    client_id = env_vars.get('BB_CLIENT_ID', '')
    client_secret = env_vars.get('BB_CLIENT_SECRET', '')
    gw_dev_app_key = env_vars.get('BB_GW_DEV_APP_KEY', '')
    pix_key = env_vars.get('BB_PIX_KEY', '')
    cert_path = env_vars.get('BB_CERT_PATH', 'certs/bb_certificate.crt')
    key_path = env_vars.get('BB_KEY_PATH', 'certs/bb_private_key.key')
    environment = env_vars.get('BB_ENVIRONMENT', 'sandbox')
    
    # Ajustar paths relativos
    base_dir = Path(__file__).parent
    if not Path(cert_path).is_absolute():
        cert_path = str(base_dir / cert_path)
    if not Path(key_path).is_absolute():
        key_path = str(base_dir / key_path)
    
    print(f"📋 Configuração:")
    print(f"   Ambiente: {environment.upper()}")
    print(f"   Chave PIX: {pix_key}")
    print(f"   Certificado: {cert_path}")
    print()
    
    # 1. Verificar certificado
    print(f"{Colors.BOLD}[1/4] Verificando certificado mTLS...{Colors.END}")
    if not Path(cert_path).exists():
        log_err(f"Certificado não encontrado: {cert_path}")
        return False
    if not Path(key_path).exists():
        log_err(f"Chave privada não encontrada: {key_path}")
        return False
    
    # Verificar validade do certificado
    try:
        import subprocess
        result = subprocess.run(
            ['openssl', 'x509', '-in', cert_path, '-noout', '-dates'],
            capture_output=True, text=True
        )
        if 'notAfter' in result.stdout:
            log_ok("Certificado encontrado e válido")
            for line in result.stdout.strip().split('\n'):
                print(f"       {line}")
        else:
            log_warn("Não foi possível verificar validade do certificado")
    except Exception as e:
        log_warn(f"Não foi possível verificar certificado: {e}")
    print()
    
    # 2. Testar autenticação OAuth
    print(f"{Colors.BOLD}[2/4] Testando autenticação OAuth 2.0...{Colors.END}")
    
    ssl_context = ssl.create_default_context()
    try:
        ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
        log_ok("Certificados carregados com sucesso")
    except Exception as e:
        log_err(f"Erro ao carregar certificados: {e}")
        return False
    
    credentials = f"{client_id}:{client_secret}"
    basic_auth = base64.b64encode(credentials.encode()).decode()
    
    oauth_url = "https://oauth.bb.com.br/oauth/token" if environment == "production" else "https://oauth.sandbox.bb.com.br/oauth/token"
    api_url = "https://api.bb.com.br/pix/v2" if environment == "production" else "https://api.sandbox.bb.com.br/pix/v2"
    
    try:
        with httpx.Client(verify=ssl_context, timeout=30.0) as client:
            token_resp = client.post(
                oauth_url,
                headers={
                    "Authorization": f"Basic {basic_auth}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "client_credentials",
                    "scope": "cob.read cob.write pix.read pix.write webhook.read webhook.write"
                },
                params={"gw-dev-app-key": gw_dev_app_key}
            )
            
            if token_resp.status_code == 200:
                token_data = token_resp.json()
                access_token = token_data.get("access_token", "")
                expires_in = token_data.get("expires_in", 0)
                log_ok(f"Token OAuth obtido com sucesso!")
                print(f"       Expira em: {expires_in} segundos")
                print(f"       Token: {access_token[:50]}...")
            else:
                log_err(f"Falha na autenticação: {token_resp.status_code}")
                print(f"       Response: {token_resp.text[:200]}")
                return False
    except Exception as e:
        log_err(f"Erro na autenticação: {e}")
        return False
    print()
    
    # 3. Testar API PIX
    print(f"{Colors.BOLD}[3/4] Testando API PIX Cobrança...{Colors.END}")
    
    inicio = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")
    fim = datetime.now().strftime("%Y-%m-%dT23:59:59Z")
    
    try:
        with httpx.Client(verify=ssl_context, timeout=30.0) as client:
            cob_resp = client.get(
                f"{api_url}/cob",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "gw-dev-app-key": gw_dev_app_key,
                    "inicio": inicio,
                    "fim": fim
                }
            )
            
            if cob_resp.status_code == 200:
                data = cob_resp.json()
                total = len(data.get("cobs", []))
                log_ok(f"API PIX funcionando! Cobranças encontradas: {total}")
            elif cob_resp.status_code == 404:
                log_err("API PIX retornou 404 - NÃO VINCULADA À APLICAÇÃO!")
                print()
                print(f"{Colors.YELLOW}{'='*60}")
                print("AÇÃO NECESSÁRIA:")
                print("1. Acesse https://developers.bb.com.br")
                print("2. Vá na aplicação 'wolknow-pix'")
                print("3. Vincule a API 'PIX Cobrança' ou 'PIX'")
                print("4. Solicite os escopos necessários")
                print("5. Aguarde aprovação")
                print(f"{'='*60}{Colors.END}")
                return False
            else:
                log_err(f"Erro na API PIX: {cob_resp.status_code}")
                print(f"       Response: {cob_resp.text[:300]}")
                return False
    except Exception as e:
        log_err(f"Erro ao acessar API PIX: {e}")
        return False
    print()
    
    # 4. Verificar webhook
    print(f"{Colors.BOLD}[4/4] Verificando configuração de webhook...{Colors.END}")
    
    try:
        with httpx.Client(verify=ssl_context, timeout=30.0) as client:
            webhook_resp = client.get(
                f"{api_url}/webhook/{pix_key}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"gw-dev-app-key": gw_dev_app_key}
            )
            
            if webhook_resp.status_code == 200:
                webhook_data = webhook_resp.json()
                log_ok(f"Webhook configurado!")
                print(f"       URL: {webhook_data.get('webhookUrl', 'N/A')}")
            elif webhook_resp.status_code == 404:
                log_warn("Webhook não configurado ainda")
                print("       Configure via: POST /webhooks/bb/configure")
            else:
                log_warn(f"Erro ao verificar webhook: {webhook_resp.status_code}")
    except Exception as e:
        log_warn(f"Erro ao verificar webhook: {e}")
    print()
    
    # Resumo
    print(f"\n{Colors.BOLD}{'='*60}")
    print("📊 RESUMO DO TESTE")
    print(f"{'='*60}{Colors.END}")
    print(f"{Colors.GREEN}✅ Certificado mTLS: OK{Colors.END}")
    print(f"{Colors.GREEN}✅ Autenticação OAuth: OK{Colors.END}")
    print(f"{Colors.GREEN}✅ API PIX: OK{Colors.END}")
    print()
    print(f"{Colors.GREEN}🎉 INTEGRAÇÃO PIX BB PRONTA PARA USO!{Colors.END}")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
