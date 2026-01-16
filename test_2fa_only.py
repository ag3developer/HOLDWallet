#!/usr/bin/env python3
"""
Teste APENAS da validação 2FA
Para verificar se o código 2FA está funcionando
"""
import requests
import json

# Configurações
API_BASE = "https://api.wolknow.com/v1"
EMAIL = "contato@josecarlosmartins.com"
PASSWORD = "sua_senha_aqui"  # Você precisa digitar

def main():
    print("="*60)
    print("🔐 TESTE DE VALIDAÇÃO 2FA")
    print("="*60)
    
    # Passo 1: Login
    password = input("Digite sua senha: ")
    
    print("\n📝 Fazendo login...")
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": EMAIL, "password": password}
    )
    
    if response.status_code != 200:
        print(f"❌ Falha no login: {response.status_code}")
        print(response.text)
        return
    
    token = response.json().get("access_token")
    print("✅ Login OK!")
    
    # Passo 2: Verificar status do 2FA
    print("\n📋 Verificando status do 2FA...")
    response = requests.get(
        f"{API_BASE}/auth/2fa/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2)}")
    
    # Passo 3: Testar código 2FA
    print("\n" + "="*50)
    print("🔐 TESTE DO CÓDIGO 2FA")
    print("="*50)
    print("Digite o código do seu autenticador quando estiver começando")
    print("(no início do ciclo de 30 segundos para ter mais tempo)")
    
    code = input("\n🔑 Código 2FA: ").strip()
    
    # Testar o código fazendo uma request que requer 2FA
    # Vamos usar o endpoint /2fa/verify que aceita token para verificação
    print("\n🧪 Testando código...")
    
    # Primeiro vamos tentar o endpoint de verificar
    response = requests.post(
        f"{API_BASE}/auth/2fa/verify",
        json={"token": code},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"\nResultado:")
    print(f"  Status: {response.status_code}")
    print(f"  Resposta: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print("\n✅ CÓDIGO 2FA VÁLIDO!")
        else:
            print("\n❌ Código inválido ou outro erro")
    else:
        print("\n❌ Erro na verificação")
        
        # Tentar entender o erro
        print("\nDicas:")
        print("- O código pode ter expirado (muda a cada 30s)")
        print("- Verifique se está usando o app correto")
        print("- Tente usar um código de backup se tiver")

if __name__ == "__main__":
    main()
