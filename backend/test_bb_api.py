"""
🧪 Teste da API PIX do Banco do Brasil
======================================
Script para testar a conexão e endpoints da API PIX BB
"""

import httpx
import base64
import asyncio
import ssl
import os
from datetime import datetime

# Credenciais de PRODUÇÃO - API PIX (codigoSoftware: 142677)
BB_CLIENT_ID = "eyJpZCI6IiIsImNvZGlnb1B1YmxpY2Fkb3IiOjAsImNvZGlnb1NvZnR3YXJlIjoxNDI2NzcsInNlcXVlbmNpYWxJbnN0YWxhY2FvIjoxfQ"
BB_CLIENT_SECRET = "eyJpZCI6ImQzZmVjNDEtM2VmIiwiY29kaWdvUHVibGljYWRvciI6MCwiY29kaWdvU29mdHdhcmUiOjE0MjY3Nywic2VxdWVuY2lhbEluc3RhbGFjYW8iOjEsInNlcXVlbmNpYWxDcmVkZW5jaWFsIjoxLCJhbWJpZW50ZSI6InByb2R1Y2FvIiwiaWF0IjoxNzY4MDg0Mzg0OTU3fQ"
BB_GW_DEV_APP_KEY = "5bded2f7cc604b38be9681a1df3017f4"
BB_PIX_KEY = "24275355000151"  # Chave PIX (CNPJ)

# Certificados mTLS (não necessário em sandbox)
CERT_PATH = "/Users/josecarlosmartins/Documents/HOLDWallet/backend/certs/bb_certificate.crt"
KEY_PATH = "/Users/josecarlosmartins/Documents/HOLDWallet/backend/certs/bb_private_key.key"

# URLs - PRODUÇÃO (com mTLS)
OAUTH_URL_PROD = "https://oauth.bb.com.br/oauth/token"
API_URL_PIX = "https://api.bb.com.br/pix/v2"  # v2 é o correto!
API_URL_PIX_V2 = "https://api.bb.com.br/pix/v2"
API_URL_COBRANCAS = "https://api.bb.com.br/cobrancas/v2"

def check_certificates():
    """Verifica se os certificados existem"""
    print("\n📜 Verificando certificados mTLS...")
    
    cert_exists = os.path.exists(CERT_PATH)
    key_exists = os.path.exists(KEY_PATH)
    
    print(f"   Certificado: {CERT_PATH}")
    print(f"   Existe: {'✅' if cert_exists else '❌'}")
    
    print(f"   Chave privada: {KEY_PATH}")
    print(f"   Existe: {'✅' if key_exists else '❌'}")
    
    if cert_exists:
        with open(CERT_PATH, 'r') as f:
            content = f.read()
            print(f"   Tamanho certificado: {len(content)} bytes")
            if "BEGIN CERTIFICATE" in content:
                print("   Formato: ✅ PEM válido")
            else:
                print("   Formato: ❌ Não parece PEM")
    
    if key_exists:
        with open(KEY_PATH, 'r') as f:
            content = f.read()
            print(f"   Tamanho chave: {len(content)} bytes")
            if "BEGIN" in content and "PRIVATE KEY" in content:
                print("   Formato: ✅ PEM válido")
            else:
                print("   Formato: ❌ Não parece PEM")
    
    return cert_exists and key_exists


def get_ssl_context():
    """Cria contexto SSL com certificado mTLS"""
    if not os.path.exists(CERT_PATH) or not os.path.exists(KEY_PATH):
        print("⚠️ Certificados não encontrados, tentando sem mTLS...")
        return None
    
    try:
        ctx = ssl.create_default_context()
        ctx.load_cert_chain(certfile=CERT_PATH, keyfile=KEY_PATH)
        print("✅ Contexto SSL/mTLS configurado")
        return ctx
    except Exception as e:
        print(f"❌ Erro ao carregar certificados: {e}")
        return None


async def test_oauth():
    """Testa obtenção de token OAuth"""
    print("\n🔐 Testando OAuth 2.0...")
    
    credentials = f"{BB_CLIENT_ID}:{BB_CLIENT_SECRET}"
    credentials_b64 = base64.b64encode(credentials.encode()).decode()
    
    # Produção usa mTLS
    ssl_context = get_ssl_context()
    print("   ℹ️ PRODUÇÃO - com mTLS")
    
    # Tentar diferentes escopos
    scopes_to_try = [
        "cob.write cob.read pix.read pix.write",
        "cob.write cob.read",
        "pix.read pix.write",
        "",  # Sem scope específico
    ]
    
    for scope in scopes_to_try:
        print(f"\n   Tentando scope: '{scope or '(vazio)'}'")
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=ssl_context if ssl_context else True) as client:
                data_payload = {"grant_type": "client_credentials"}
                if scope:
                    data_payload["scope"] = scope
                    
                response = await client.post(
                    OAUTH_URL_PROD,
                    headers={
                        "Authorization": f"Basic {credentials_b64}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data=data_payload
                )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                token = data.get("access_token", "")[:50] + "..."
                expires = data.get("expires_in", "?")
                granted_scope = data.get("scope", "N/A")
                print("   ✅ Token obtido com sucesso!")
                print(f"   Token (parcial): {token}")
                print(f"   Expira em: {expires}s")
                print(f"   Scope concedido: {granted_scope}")
                return data.get("access_token")
            else:
                print(f"   ❌ Erro: {response.text[:200]}")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")
    
    return None


async def test_criar_cobranca(token: str):
    """Testa criação de cobrança PIX"""
    print("\n📱 Testando criar cobrança PIX...")
    
    if not token:
        print("   ❌ Token não disponível")
        return
    
    ssl_context = get_ssl_context()
    txid = f"WOLK{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    payload = {
        "calendario": {
            "expiracao": 3600  # 1 hora
        },
        "valor": {
            "original": "1.00"  # R$ 1,00 para teste
        },
        "chave": BB_PIX_KEY,
        "solicitacaoPagador": "Teste WOLK NOW"
    }
    
    # Tentar diferentes endpoints/métodos - v2 BACEN
    # Documentação: https://apoio.developers.bb.com.br/referency/post/5ffc0a29764df900127dd4ce
    endpoints_to_try = [
        # v2 padrão BACEN - PUT com txid
        ("PUT", f"https://api.bb.com.br/pix/v2/cob/{txid}"),
        # v2 padrão BACEN - POST sem txid (BB gera)
        ("POST", "https://api.bb.com.br/pix/v2/cob"),
    ]
    
    for method, url in endpoints_to_try:
        print(f"\n   Tentando: {method} {url}")
        print(f"   gw-dev-app-key: {BB_GW_DEV_APP_KEY}")
        print(f"   Payload: {payload}")
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=ssl_context if ssl_context else True) as client:
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "gw-dev-app-key": BB_GW_DEV_APP_KEY,
                }
                
                if method == "PUT":
                    response = await client.put(url, headers=headers, json=payload)
                else:
                    response = await client.post(url, headers=headers, json=payload)
            
            print(f"   Status: {response.status_code}")
            print(f"   Headers resposta: {dict(response.headers)}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print("   ✅ COBRANÇA PIX CRIADA COM SUCESSO!")
                print(f"   TXID: {data.get('txid')}")
                print(f"   Status: {data.get('status')}")
                print(f"   Location: {data.get('location', 'N/A')}")
                print(f"   QRCode: {data.get('pixCopiaECola', data.get('qrcode', 'N/A'))[:100]}...")
                return data
            else:
                resp_text = response.text
                print(f"   ❌ Erro completo: {resp_text}")
                
        except Exception as e:
            print(f"   ❌ Erro: {str(e)[:100]}")
    
    return None


async def test_api_cobrancas_boleto(token: str):
    """Testa a API de Cobranças (Boletos)"""
    print("\n🧾 Testando API de Cobranças/Boletos...")
    
    if not token:
        print("   ❌ Token não disponível")
        return
    
    ssl_context = get_ssl_context()
    
    # Teste 1: Listar convênios
    print("\n   📋 Listando convênios...")
    try:
        async with httpx.AsyncClient(timeout=30.0, verify=ssl_context if ssl_context else True) as client:
            response = await client.get(
                f"{API_URL_COBRANCAS}/convenios",
                headers={
                    "Authorization": f"Bearer {token}",
                    "gw-dev-app-key": BB_GW_DEV_APP_KEY
                }
            )
        
        print(f"   URL: {API_URL_COBRANCAS}/convenios")
        print(f"   Status: {response.status_code}")
        print(f"   Resposta: {response.text[:500]}")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")
    
    # Teste 2: Consultar boleto de teste
    print("\n   🔍 Consultando boleto de teste...")
    try:
        # ID de boleto de teste do BB sandbox
        boleto_id = "00031285570000030000"
        convenio = "3128557"
        
        async with httpx.AsyncClient(timeout=30.0, verify=ssl_context if ssl_context else True) as client:
            response = await client.get(
                f"{API_URL_COBRANCAS}/boletos/{boleto_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "gw-dev-app-key": BB_GW_DEV_APP_KEY
                },
                params={
                    "numeroConvenio": convenio
                }
            )
        
        print(f"   URL: {API_URL_COBRANCAS}/boletos/{boleto_id}")
        print(f"   Status: {response.status_code}")
        print(f"   Resposta: {response.text[:500]}")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")


async def test_consultar_pix(token: str):
    """Testa consulta de PIX recebidos"""
    print("\n🔍 Testando consultar PIX recebidos...")
    
    if not token:
        print("   ❌ Token não disponível")
        return
    
    ssl_context = get_ssl_context()
    
    # Consulta PIX dos últimos 7 dias
    from datetime import timedelta
    inicio = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")
    fim = datetime.now().strftime("%Y-%m-%dT23:59:59Z")
    
    # Testar diferentes endpoints de consulta
    endpoints = [
        f"{API_URL_PIX_V2}/pix?inicio={inicio}&fim={fim}",
        f"{API_URL_PIX}/pix?inicio={inicio}&fim={fim}",
        f"{API_URL_PIX_V2}/cob",  # Listar cobranças
    ]
    
    for url in endpoints:
        print(f"\n   GET {url[:70]}...")
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=ssl_context if ssl_context else True) as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": BB_GW_DEV_APP_KEY,
                        "developer-application-key": BB_GW_DEV_APP_KEY
                    }
                )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   ✅ Sucesso! Resposta: {str(data)[:200]}")
                except Exception:
                    print("   Resposta vazia ou inválida")
            else:
                print(f"   ❌ Erro: {response.text[:300]}")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")


async def main():
    print("=" * 60)
    print("🏦 TESTE API PIX BANCO DO BRASIL")
    print("=" * 60)
    print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("🌐 Ambiente: PRODUÇÃO (mTLS)")
    print(f"🔑 Client ID: {BB_CLIENT_ID[:30]}...")
    print(f"🔑 App Key: {BB_GW_DEV_APP_KEY}")
    print(f"📱 Chave PIX: {BB_PIX_KEY}")
    
    # 1. Verificar certificados
    certs_ok = check_certificates()
    
    # 2. Testar OAuth
    token = await test_oauth()
    
    if token:
        # 3. Testar API de Cobranças/Boletos (essa aplicação tem essa API)
        await test_api_cobrancas_boleto(token)
        
        # 4. Testar consulta PIX (provavelmente vai falhar - API diferente)
        await test_consultar_pix(token)
        
        # 5. Testar criação de cobrança PIX (provavelmente vai falhar - API diferente)
        await test_criar_cobranca(token)
    
    print("\n" + "=" * 60)
    print("🏁 TESTE FINALIZADO")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
