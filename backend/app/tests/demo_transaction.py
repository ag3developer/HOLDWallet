#!/usr/bin/env python3
"""
Demo de Transação Completa - HOLD Wallet Backend
Demonstra o fluxo completo de criação, assinatura e broadcast de transação
"""

import httpx
import json
import asyncio
import time
from typing import Dict, Optional

class TransactionDemo:
    """Demo completo de transação"""
    
    def __init__(self):
        self.client = httpx.Client(base_url="http://localhost:8001", timeout=30.0)
        self.access_token: Optional[str] = None
        self.wallet_id: Optional[int] = None
        self.bitcoin_address: Optional[str] = None
    
    def authenticate(self) -> bool:
        """Autentica com usuário de teste"""
        print("🔐 Autenticando...")
        
        # Tenta fazer login com o usuário de teste
        login_data = {
            "username": "devuser",
            "password": "DevUser123!"
        }
        
        try:
            response = self.client.post("/auth/login", data=login_data)
            
            if response.status_code == 200:
                auth_data = response.json()
                self.access_token = auth_data.get("access_token")
                
                self.client.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                print("✅ Autenticado com sucesso")
                return True
            else:
                print("❌ Falha na autenticação - Execute o test_user_flow.py primeiro")
                return False
                
        except Exception as e:
            print(f"❌ Erro na autenticação: {e}")
            return False
    
    def get_user_wallet(self) -> bool:
        """Obtém a carteira do usuário"""
        print("💰 Buscando carteira do usuário...")
        
        try:
            response = self.client.get("/wallets/")
            
            if response.status_code == 200:
                wallets = response.json()
                
                if wallets:
                    self.wallet_id = wallets[0].get("id")
                    print(f"✅ Carteira encontrada: ID {self.wallet_id}")
                    return True
                else:
                    print("❌ Nenhuma carteira encontrada - Execute o test_user_flow.py primeiro")
                    return False
            else:
                print("❌ Erro ao buscar carteiras")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao buscar carteira: {e}")
            return False
    
    def get_bitcoin_address(self) -> bool:
        """Obtém endereço Bitcoin da carteira"""
        print("🪙 Buscando endereço Bitcoin...")
        
        try:
            response = self.client.get(f"/wallets/{self.wallet_id}/addresses")
            
            if response.status_code == 200:
                addresses = response.json()
                
                for addr in addresses:
                    if addr.get("network") == "bitcoin":
                        self.bitcoin_address = addr.get("address")
                        print(f"✅ Endereço Bitcoin: {self.bitcoin_address}")
                        return True
                
                print("❌ Endereço Bitcoin não encontrado")
                return False
            else:
                print("❌ Erro ao buscar endereços")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao buscar endereços: {e}")
            return False
    
    def demo_transaction_flow(self):
        """Demonstra o fluxo completo de transação"""
        print("\n💸 DEMO: FLUXO COMPLETO DE TRANSAÇÃO")
        print("=" * 50)
        
        if not self.bitcoin_address:
            print("❌ Endereço Bitcoin necessário")
            return
        
        # Endereço de destino público (testnet)
        to_address = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"  # Endereço testnet conhecido
        amount = 0.001  # 0.001 BTC
        
        print(f"📍 From: {self.bitcoin_address}")
        print(f"📍 To: {to_address}")
        print(f"💰 Amount: {amount} BTC")
        print()
        
        # Passo 1: Estimar taxa
        print("1️⃣ Estimando taxa de transação...")
        estimate_data = {
            "from_address": self.bitcoin_address,
            "to_address": to_address,
            "amount": amount,
            "network": "bitcoin",
            "fee_preference": "standard"
        }
        
        try:
            response = self.client.post("/api/v1/transactions/estimate", json=estimate_data)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                estimate = response.json()
                print(f"   ✅ Taxa estimada: {estimate.get('estimated_fee', 'N/A')} BTC")
                print(f"   ✅ Taxa válida: {estimate.get('valid', False)}")
            else:
                print(f"   ⚠️ Estimativa pode falhar (normal sem fundos reais)")
                # Continua mesmo se estimativa falhar
            
        except Exception as e:
            print(f"   ❌ Erro na estimativa: {e}")
        
        print()
        
        # Passo 2: Criar transação
        print("2️⃣ Criando transação...")
        create_data = {
            "from_address": self.bitcoin_address,
            "to_address": to_address,
            "amount": amount,
            "network": "bitcoin",
            "fee_preference": "standard",
            "memo": "Transação de teste - HOLD Wallet Demo"
        }
        
        try:
            response = self.client.post("/api/v1/transactions/create", json=create_data)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 201:
                transaction = response.json()
                transaction_id = transaction.get("id")
                print(f"   ✅ Transação criada: ID {transaction_id}")
                print(f"   📋 Status: {transaction.get('status')}")
                
                self.demo_transaction_lifecycle(transaction_id)
                
            else:
                print(f"   ❌ Falha ao criar transação")
                print(f"   📋 Erro: {response.text}")
            
        except Exception as e:
            print(f"   ❌ Erro ao criar transação: {e}")
    
    def demo_transaction_lifecycle(self, transaction_id: int):
        """Demonstra o ciclo de vida da transação"""
        print(f"\n3️⃣ Demonstrando ciclo de vida da transação {transaction_id}...")
        
        # Verificar status inicial
        print("   📊 Status inicial...")
        self.check_transaction_status(transaction_id)
        
        # Simular assinatura (normalmente precisaria de senha)
        print("\n   🔏 Tentando assinar transação...")
        sign_data = {
            "transaction_id": transaction_id,
            "password": "WalletPass123!"  # Senha da carteira usada no teste
        }
        
        try:
            response = self.client.post("/api/v1/transactions/sign", json=sign_data)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Transação assinada com sucesso")
                self.check_transaction_status(transaction_id)
                
                # Demonstrar broadcast (sem realmente enviar)
                self.demo_broadcast_simulation(transaction_id)
                
            else:
                print(f"   ⚠️ Assinatura pode falhar (normal sem fundos reais)")
                print(f"   📋 Response: {response.text}")
            
        except Exception as e:
            print(f"   ❌ Erro na assinatura: {e}")
        
        # Demonstrar outras funcionalidades
        self.demo_transaction_management(transaction_id)
    
    def demo_broadcast_simulation(self, transaction_id: int):
        """Simula broadcast (sem realmente enviar)"""
        print("\n   📡 Simulando broadcast...")
        print("   ⚠️ NOTA: Broadcast não será executado para evitar transações reais")
        print("   💡 Em produção, usaria: POST /api/v1/transactions/broadcast")
        
        broadcast_data = {
            "transaction_id": transaction_id
        }
        
        print(f"   📋 Payload: {broadcast_data}")
        print("   ✅ Broadcast simulado com sucesso")
    
    def demo_transaction_management(self, transaction_id: int):
        """Demonstra gerenciamento de transações"""
        print(f"\n4️⃣ Demonstrando gerenciamento de transações...")
        
        # Listar transações do usuário
        print("   📋 Listando transações do usuário...")
        try:
            response = self.client.get("/api/v1/transactions/")
            
            if response.status_code == 200:
                transactions = response.json()
                print(f"   ✅ Encontradas {len(transactions)} transações")
                
                for tx in transactions[-3:]:  # Mostra últimas 3
                    print(f"   📄 ID: {tx.get('id')}, Status: {tx.get('status')}, Amount: {tx.get('amount')}")
            
        except Exception as e:
            print(f"   ❌ Erro ao listar transações: {e}")
        
        # Obter estatísticas
        print("\n   📊 Obtendo estatísticas...")
        try:
            response = self.client.get("/api/v1/transactions/stats")
            
            if response.status_code == 200:
                stats = response.json()
                print(f"   ✅ Total transações: {stats.get('total_transactions', 0)}")
                print(f"   📊 Pending: {stats.get('pending_transactions', 0)}")
                print(f"   📊 Confirmed: {stats.get('confirmed_transactions', 0)}")
                print(f"   💰 Total enviado: {stats.get('total_sent', '0')} BTC")
            
        except Exception as e:
            print(f"   ❌ Erro ao obter estatísticas: {e}")
        
        # Demonstrar cancelamento
        print(f"\n   🚫 Demonstrando cancelamento da transação {transaction_id}...")
        try:
            response = self.client.delete(f"/api/v1/transactions/{transaction_id}")
            
            if response.status_code == 200:
                print("   ✅ Transação cancelada com sucesso")
                self.check_transaction_status(transaction_id)
            else:
                print(f"   ⚠️ Cancelamento: {response.status_code}")
            
        except Exception as e:
            print(f"   ❌ Erro ao cancelar: {e}")
    
    def check_transaction_status(self, transaction_id: int):
        """Verifica status da transação"""
        try:
            response = self.client.get(f"/api/v1/transactions/status/{transaction_id}")
            
            if response.status_code == 200:
                status_data = response.json()
                print(f"   📊 Status: {status_data.get('status')}")
                print(f"   🏗️ Block: {status_data.get('block_number', 'N/A')}")
                print(f"   ✅ Confirmations: {status_data.get('confirmations', 0)}")
            else:
                print(f"   ❌ Erro ao verificar status: {response.status_code}")
            
        except Exception as e:
            print(f"   ❌ Erro ao verificar status: {e}")
    
    def run_demo(self):
        """Executa a demo completa"""
        print("🚀 HOLD WALLET - DEMO DE TRANSAÇÃO")
        print("=" * 50)
        print("📝 Esta demo mostra o fluxo completo de transação")
        print("⚠️  Não executará broadcast real para evitar gastos")
        print()
        
        if not self.authenticate():
            return False
        
        if not self.get_user_wallet():
            return False
        
        if not self.get_bitcoin_address():
            return False
        
        self.demo_transaction_flow()
        
        print("\n" + "=" * 50)
        print("🎉 DEMO COMPLETA!")
        print("💡 Para usar em produção:")
        print("   1. Configure RPCs reais")
        print("   2. Use endereços com fundos reais")
        print("   3. Execute broadcast apenas quando necessário")
        print("   4. Monitore confirmações na blockchain")
        
        return True
    
    def cleanup(self):
        """Limpa recursos"""
        if self.client:
            self.client.close()


def main():
    """Função principal"""
    demo = TransactionDemo()
    
    try:
        demo.run_demo()
    except KeyboardInterrupt:
        print("\n⏸️ Demo interrompida pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro na demo: {e}")
    finally:
        demo.cleanup()


if __name__ == "__main__":
    main()
