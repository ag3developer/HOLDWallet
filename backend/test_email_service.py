#!/usr/bin/env python3
"""
🧪 Teste do Serviço de Email
============================

Testa o envio de emails usando o EmailService.

Uso:
    python test_email_service.py <email_destino>
    
Exemplo:
    python test_email_service.py contato16171716@gmail.com
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Adicionar o diretório app ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Carregar variáveis de ambiente
load_dotenv()

from app.services.email_service import email_service


async def test_email_service(to_email: str):
    """Testa o envio de emails."""
    
    print("=" * 60)
    print("🧪 TESTE DO SERVIÇO DE EMAIL")
    print("=" * 60)
    
    # Verificar configuração
    print(f"\n📧 Email de destino: {to_email}")
    print(f"🔑 API Key configurada: {'✅ Sim' if email_service.is_configured else '❌ Não'}")
    print(f"🌐 Frontend URL: {email_service.frontend_url}")
    
    if not email_service.is_configured:
        print("\n⚠️  RESEND_API_KEY não configurada no .env")
        print("   Os emails serão apenas logados, não enviados.")
        print("\n   Para configurar:")
        print("   1. Crie conta em https://resend.com")
        print("   2. Adicione RESEND_API_KEY=re_xxxxx no .env")
    
    # Teste 1: Email de reset de senha
    print("\n" + "-" * 40)
    print("📧 Teste 1: Email de Reset de Senha")
    print("-" * 40)
    
    result = await email_service.send_password_reset(
        to_email=to_email,
        username="Usuário Teste",
        reset_token="test_token_123456789",
        expires_in_hours=1
    )
    
    print(f"   Resultado: {result}")
    
    # Teste 2: Email de verificação
    print("\n" + "-" * 40)
    print("📧 Teste 2: Email de Verificação")
    print("-" * 40)
    
    result = await email_service.send_email_verification(
        to_email=to_email,
        username="Usuário Teste",
        verification_token="verify_token_987654321"
    )
    
    print(f"   Resultado: {result}")
    
    # Teste 3: Email de senha resetada pelo admin
    print("\n" + "-" * 40)
    print("📧 Teste 3: Senha Resetada pelo Admin")
    print("-" * 40)
    
    result = await email_service.send_password_reset_admin(
        to_email=to_email,
        username="Usuário Teste",
        temp_password="TempPass123!"
    )
    
    print(f"   Resultado: {result}")
    
    # Teste 4: Alerta de login
    print("\n" + "-" * 40)
    print("📧 Teste 4: Alerta de Login")
    print("-" * 40)
    
    result = await email_service.send_login_alert(
        to_email=to_email,
        username="Usuário Teste",
        ip_address="192.168.1.100",
        device="Chrome no Windows 10",
        location="São Paulo, Brasil"
    )
    
    print(f"   Resultado: {result}")
    
    # Teste 5: Senha alterada
    print("\n" + "-" * 40)
    print("📧 Teste 5: Notificação de Senha Alterada")
    print("-" * 40)
    
    result = await email_service.send_password_changed(
        to_email=to_email,
        username="Usuário Teste",
        ip_address="192.168.1.100"
    )
    
    print(f"   Resultado: {result}")
    
    # Teste 6: 2FA Ativado
    print("\n" + "-" * 40)
    print("📧 Teste 6: 2FA Ativado")
    print("-" * 40)
    
    result = await email_service.send_2fa_enabled(
        to_email=to_email,
        username="Usuário Teste"
    )
    
    print(f"   Resultado: {result}")
    
    print("\n" + "=" * 60)
    print("✅ TESTES CONCLUÍDOS!")
    print("=" * 60)
    
    if email_service.is_configured:
        print(f"\n📬 Verifique sua caixa de entrada: {to_email}")
    else:
        print("\n⚠️  Emails apenas logados (modo de desenvolvimento)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Uso: python test_email_service.py <email_destino>")
        print("   Exemplo: python test_email_service.py seu@email.com")
        sys.exit(1)
    
    target_email = sys.argv[1]
    asyncio.run(test_email_service(target_email))
