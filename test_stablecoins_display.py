#!/usr/bin/env python3
"""
Script de teste para validar se USDT/USDC aparecem na página de wallet
Usa as credenciais fornecidas: app@holdwallet.com / Abc123@@
"""

import asyncio
import httpx
import json
from typing import Dict, Any
from decimal import Decimal

# Configuração
API_URL = "http://localhost:8000"
USER_EMAIL = "app@holdwallet.com"
USER_PASSWORD = "Abc123@@"

class TestStablecoins:
    def __init__(self):
        # Aumentar timeout para 60 segundos (blockchain pode ser lenta)
        self.client = httpx.AsyncClient(base_url=API_URL, timeout=60.0)
        self.token = None
        self.user = None
        self.wallet = None
    
    async def login(self):
        """🔐 Fazer login e obter token"""
        print("\n" + "="*60)
        print("🔐 PASSO 1: Fazendo login...")
        print("="*60)
        
        try:
            response = await self.client.post(
                "/auth/login",
                json={
                    "email": USER_EMAIL,
                    "password": USER_PASSWORD
                }
            )
            
            if response.status_code != 200:
                print(f"❌ Erro ao fazer login: {response.status_code}")
                print(f"Resposta: {response.text}")
                return False
            
            data = response.json()
            self.token = data.get("access_token")
            print("✅ Login bem-sucedido!")
            print(f"📌 Token obtido: {self.token[:20]}...")
            
            # Adicionar token aos headers
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            
            return True
        except Exception as e:
            print(f"❌ Erro ao fazer login: {str(e)}")
            return False
    
    async def get_current_user(self):
        """👤 Obter dados do usuário atual"""
        print("\n" + "="*60)
        print("👤 PASSO 2: Obtendo dados do usuário...")
        print("="*60)
        
        try:
            response = await self.client.get("/users/me")
            
            if response.status_code != 200:
                print(f"❌ Erro ao obter usuário: {response.status_code}")
                return False
            
            self.user = response.json()
            print("✅ Usuário obtido!")
            print(f"📌 ID: {self.user.get('id')}")
            print(f"📌 Username: {self.user.get('username')}")
            print(f"📌 Email: {self.user.get('email')}")
            
            return True
        except Exception as e:
            print(f"❌ Erro ao obter usuário: {str(e)}")
            return False
    
    async def get_wallets(self):
        """🏦 Listar carteiras"""
        print("\n" + "="*60)
        print("🏦 PASSO 3: Listando carteiras...")
        print("="*60)
        
        try:
            response = await self.client.get("/wallets/")
            
            if response.status_code != 200:
                print(f"❌ Erro ao listar carteiras: {response.status_code}")
                return False
            
            wallets = response.json()
            print(f"✅ {len(wallets)} carteira(s) encontrada(s)!")
            
            for i, wallet in enumerate(wallets):
                print(f"\n📌 Carteira {i+1}:")
                print(f"   ID: {wallet.get('id')}")
                print(f"   Nome: {wallet.get('name')}")
                print(f"   Rede: {wallet.get('network')}")
                print(f"   Criada em: {wallet.get('created_at')}")
            
            if wallets:
                self.wallet = wallets[0]  # Usar primeira carteira
                print(f"\n✅ Usando carteira: {self.wallet.get('name')} (ID: {self.wallet.get('id')})")
                return True
            else:
                print("❌ Nenhuma carteira encontrada!")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao listar carteiras: {str(e)}")
            return False
    
    async def get_balances(self):
        """💰 Obter saldos por rede (COM TOKENS!)"""
        print("\n" + "="*60)
        print("💰 PASSO 4: Obtendo saldos (COM TOKENS)...")
        print("="*60)
        
        if not self.wallet:
            print("❌ Nenhuma carteira selecionada!")
            return False
        
        wallet_id = self.wallet.get('id')
        
        try:
            # 🔑 IMPORTANTE: Usando include_tokens=true
            response = await self.client.get(
                f"/wallets/{wallet_id}/balances",
                params={"include_tokens": "true"}
            )
            
            if response.status_code != 200:
                print(f"❌ Erro ao obter saldos: {response.status_code}")
                print(f"Resposta: {response.text}")
                return False
            
            data = response.json()
            
            print("✅ Saldos obtidos com sucesso!")
            print(f"\n📊 Wallet: {data.get('wallet_name')}")
            print(f"📊 Total USD: ${data.get('total_usd')}")
            print(f"📊 Total BRL: R$ {data.get('total_brl')}")
            
            balances = data.get('balances', {})
            
            if not balances:
                print("⚠️  Nenhum saldo encontrado!")
                return False
            
            print(f"\n🔍 Detalhamento dos saldos ({len(balances)} rede(s)/token(s)):")
            print("-" * 60)
            
            has_stablecoins = False
            
            for network_key, balance_detail in balances.items():
                is_token = '_usdt' in network_key.lower() or '_usdc' in network_key.lower()
                
                if is_token:
                    has_stablecoins = True
                    print(f"\n💎 {network_key.upper()} (STABLECOIN)")
                else:
                    print(f"\n🔷 {network_key.upper()}")
                
                print(f"   Endereço: {balance_detail.get('address')}")
                print(f"   Saldo: {balance_detail.get('balance')} unidade(s)")
                print(f"   Preço USD: ${balance_detail.get('price_usd')}")
                print(f"   Saldo USD: ${balance_detail.get('balance_usd')}")
                print(f"   Atualizado em: {balance_detail.get('last_updated')}")
                
                if is_token and float(balance_detail.get('balance', 0)) > 0:
                    print("   ✅ STABLECOIN COM SALDO!")
            
            print("\n" + "="*60)
            if has_stablecoins:
                print("✅ SUCESSO! Stablecoins (USDT/USDC) aparecem na resposta!")
                return True
            else:
                print("⚠️  Nenhuma stablecoin encontrada nos saldos")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao obter saldos: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    async def run_all_tests(self):
        """🚀 Executar todos os testes"""
        print("\n" + "="*70)
        print("🚀 INICIANDO TESTE DE STABLECOINS")
        print("="*70)
        
        tests = [
            ("Login", self.login()),
            ("Dados do Usuário", self.get_current_user()),
            ("Listar Carteiras", self.get_wallets()),
            ("Obter Saldos com Tokens", self.get_balances()),
        ]
        
        results = []
        for test_name, test_coro in tests:
            try:
                result = await test_coro
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ Erro ao executar {test_name}: {str(e)}")
                results.append((test_name, False))
        
        # Resumo final
        print("\n" + "="*70)
        print("📋 RESUMO DOS TESTES")
        print("="*70)
        
        for test_name, result in results:
            status = "✅ PASSOU" if result else "❌ FALHOU"
            print(f"{test_name:.<40} {status}")
        
        all_passed = all(result for _, result in results)
        
        print("\n" + "="*70)
        if all_passed:
            print("🎉 TODOS OS TESTES PASSARAM!")
            print("✅ As stablecoins devem aparecer no frontend!")
        else:
            print("❌ Alguns testes falharam. Verifique os logs acima.")
        print("="*70 + "\n")
        
        return all_passed
    
    async def close(self):
        """Fechar conexão"""
        await self.client.aclose()


async def main():
    tester = TestStablecoins()
    try:
        await tester.run_all_tests()
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())
