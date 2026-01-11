"""
Teste de cobrança PIX com mTLS - Banco do Brasil
"""
import os
import ssl
import base64
import httpx
import random
import string
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Credenciais
client_id = os.getenv("BB_CLIENT_ID")
client_secret = os.getenv("BB_CLIENT_SECRET")
app_key = os.getenv("BB_GW_DEV_APP_KEY")
pix_key = os.getenv("BB_PIX_KEY")
cert_path = os.getenv("BB_CERT_PATH")
key_path = os.getenv("BB_KEY_PATH")

print("=" * 60)
print("🏦 TESTE PIX COM mTLS - BANCO DO BRASIL")
print("=" * 60)
print(f"Certificado: {cert_path}")
print(f"Chave: {key_path}")
print(f"PIX Key: {pix_key}")
print()

# Verificar certificados
if not cert_path or not os.path.exists(cert_path):
    print(f"❌ Certificado não encontrado: {cert_path}")
    exit(1)
    
if not key_path or not os.path.exists(key_path):
    print(f"❌ Chave não encontrada: {key_path}")
    exit(1)

print("✅ Arquivos de certificado encontrados")

# Criar contexto SSL
try:
    ssl_context = ssl.create_default_context()
    ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
    print("✅ Contexto SSL criado com sucesso")
except Exception as e:
    print(f"❌ Erro ao criar contexto SSL: {e}")
    exit(1)

print()
print("🔐 Obtendo token OAuth...")

# Obter token
credentials = f"{client_id}:{client_secret}"
basic_auth = base64.b64encode(credentials.encode()).decode()

try:
    with httpx.Client(timeout=30.0, verify=ssl_context) as client:
        response = client.post(
            "https://oauth.bb.com.br/oauth/token",
            headers={
                "Authorization": f"Basic {basic_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "client_credentials",
                "scope": "cob.write cob.read pix.write pix.read"
            }
        )
    
    if response.status_code != 200:
        print(f"❌ Erro OAuth: {response.status_code}")
        print(f"   Response: {response.text}")
        exit(1)
        
    token = response.json()["access_token"]
    print("✅ Token obtido!")
    
except Exception as e:
    print(f"❌ Erro na autenticação: {e}")
    exit(1)

print()
print("📱 Criando cobrança PIX de teste (R$ 1,00)...")

# Gerar txid único
txid = f"WOLK{datetime.now().strftime('%Y%m%d%H%M%S')}{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

cobranca = {
    "calendario": {"expiracao": 900},
    "valor": {"original": "1.00"},
    "chave": pix_key,
    "solicitacaoPagador": "Teste WOLK NOW - Compra de Crypto"
}

try:
    with httpx.Client(timeout=30.0, verify=ssl_context) as client:
        response = client.put(
            f"https://api.bb.com.br/pix/v2/cob/{txid}?gw-dev-app-key={app_key}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "gw-dev-app-key": app_key
            },
            json=cobranca
        )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        print()
        print("✅ COBRANÇA PIX CRIADA COM SUCESSO!")
        print(f"   📋 TXID: {result.get('txid')}")
        print(f"   💰 Valor: R$ {result.get('valor', {}).get('original')}")
        print(f"   📍 Location: {result.get('location')}")
        print(f"   📊 Status: {result.get('status')}")
        
        if result.get('pixCopiaECola'):
            print()
            print("📱 QR CODE (Copia e Cola):")
            print("-" * 60)
            print(result['pixCopiaECola'][:100] + "...")
    else:
        print(f"❌ Erro: {response.text}")
        
except Exception as e:
    print(f"❌ Erro ao criar cobrança: {e}")

print()
print("=" * 60)
