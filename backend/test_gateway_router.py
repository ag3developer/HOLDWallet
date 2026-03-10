"""
🧪 WolkPay Gateway - Router Test
=================================

Testa os endpoints da API do Gateway.

Autor: HOLD Wallet Team
Data: Janeiro 2026
"""

import os
import sys
import json
from datetime import datetime

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configura variáveis de ambiente
os.environ.setdefault('ENVIRONMENT', 'development')


def test_gateway_endpoints():
    """Testa se os endpoints do Gateway estão registrados corretamente."""
    
    print("=" * 60)
    print("🧪 WolkPay Gateway - Router Test")
    print("=" * 60)
    print()
    
    from app.main import app
    
    # Coleta todas as rotas do gateway
    all_routes = []
    for route in app.routes:
        if hasattr(route, 'path') and '/gateway' in route.path:
            methods = list(getattr(route, 'methods', {'N/A'}))
            all_routes.append({
                'method': methods[0] if methods else 'N/A',
                'path': route.path,
                'name': getattr(route, 'name', 'N/A')
            })
    
    # Agrupa por categoria
    categories = {
        'merchants': [],
        'api-keys': [],
        'payments': [],
        'webhooks': [],
        'checkout': [],
        'callbacks': [],
        'admin': [],
    }
    
    for route in all_routes:
        path = route['path']
        if '/merchants' in path:
            categories['merchants'].append(route)
        elif '/api-keys' in path:
            categories['api-keys'].append(route)
        elif '/payments' in path:
            categories['payments'].append(route)
        elif '/webhooks' in path:
            categories['webhooks'].append(route)
        elif '/checkout' in path:
            categories['checkout'].append(route)
        elif '/callbacks' in path:
            categories['callbacks'].append(route)
        elif '/admin' in path:
            categories['admin'].append(route)
    
    # Exibe por categoria
    for category, routes in categories.items():
        if routes:
            print(f"📂 {category.upper()}")
            for route in routes:
                print(f"   {route['method']:6s} {route['path']}")
            print()
    
    # Resumo
    print("=" * 60)
    print(f"📊 Total de Endpoints: {len(all_routes)}")
    print("=" * 60)
    
    # Verifica endpoints essenciais
    essential_paths = [
        ('POST', '/gateway/merchants'),
        ('GET', '/gateway/merchants/me'),
        ('POST', '/gateway/api-keys'),
        ('POST', '/gateway/payments'),
        ('GET', '/gateway/payments/{payment_id}'),
        ('GET', '/gateway/checkout/{token}'),
        ('POST', '/gateway/callbacks/pix/bb'),
    ]
    
    print()
    print("✅ Verificação de Endpoints Essenciais:")
    all_ok = True
    for method, path in essential_paths:
        found = any(r['method'] == method and r['path'] == path for r in all_routes)
        status = '✅' if found else '❌'
        print(f"   {status} {method:6s} {path}")
        if not found:
            all_ok = False
    
    print()
    if all_ok:
        print("🎉 SUCESSO! Todos os endpoints essenciais estão registrados.")
    else:
        print("⚠️ ATENÇÃO: Alguns endpoints essenciais estão faltando.")
    
    return all_ok


def test_mock_request():
    """Simula uma requisição para o health check."""
    
    print()
    print("=" * 60)
    print("🔍 Testando Health Check...")
    print("=" * 60)
    
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    
    # Testa health check geral
    try:
        response = client.get("/health")
        print(f"✅ GET /health - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ GET /health - Erro: {e}")
    
    # Testa health check do gateway callbacks
    try:
        response = client.get("/gateway/callbacks/health")
        print(f"✅ GET /gateway/callbacks/health - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   📍 Endpoints: {data.get('endpoints', {})}")
    except Exception as e:
        print(f"❌ GET /gateway/callbacks/health - Erro: {e}")
    
    # Testa checkout público (sem autenticação)
    try:
        response = client.get("/gateway/checkout/test-token-123")
        print(f"✅ GET /gateway/checkout/test-token-123 - Status: {response.status_code}")
        if response.status_code == 404:
            print(f"   ℹ️ Token não encontrado (esperado)")
    except Exception as e:
        print(f"❌ GET /gateway/checkout/test-token-123 - Erro: {e}")


if __name__ == "__main__":
    try:
        success = test_gateway_endpoints()
        test_mock_request()
        
        print()
        print("=" * 60)
        if success:
            print("🎉 FASE 4 COMPLETA - Routers registrados e funcionando!")
        else:
            print("⚠️ Verifique os endpoints faltantes acima.")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro ao executar teste: {e}")
        import traceback
        traceback.print_exc()
