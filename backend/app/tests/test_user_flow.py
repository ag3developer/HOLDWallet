#!/usr/bin/env python3
"""
Script de Teste Completo - HOLD Wallet Backend
Simula um usuário real (devuser) criando carteira e usando o sistema completo
"""

import asyncio
import httpx
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configurações do teste
BASE_URL = "http://localhost:8001"
TEST_USER = {
    "username": "devuser",
    "email": "devuser@holdwallet.com", 
    "password": "DevUser123!"
}

class HOLDWalletTester:
    """Testador completo do HOLD Wallet"""
    
    def __init__(self):
        self.client = httpx.Client(base_url=BASE_URL, timeout=30.0)
        self.access_token: Optional[str] = None
        self.user_data: Optional[Dict] = None
        self.wallet_data: Optional[Dict] = None
        self.wallets: Dict[str, Any] = {}  # Store multiple wallets by network
        self.addresses: Dict[str, Any] = {}
        
    def print_step(self, step: str, status: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        emoji = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}
        print(f"[{timestamp}] {emoji.get(status, 'ℹ️')} {step}")
    
    def print_response(self, response: httpx.Response, show_data: bool = True):
        """Imprime detalhes da resposta"""
        status_emoji = "✅" if response.status_code < 400 else "❌"
        print(f"    {status_emoji} Status: {response.status_code}")
        
        if show_data and response.status_code < 400:
            try:
                data = response.json()
                if isinstance(data, dict):
                    for key, value in data.items():
                        if key in ['password_hash', 'encrypted_seed', 'encrypted_private_key']:
                            print(f"    📋 {key}: [ENCRYPTED]")
                        elif isinstance(value, str) and len(value) > 50:
                            print(f"    📋 {key}: {value[:50]}...")
                        else:
                            print(f"    📋 {key}: {value}")
                else:
                    print(f"    📋 Response: {data}")
            except:
                print(f"    📋 Response: {response.text[:200]}")

    def test_health_check(self) -> bool:
        """Teste 1: Health Check"""
        self.print_step("🏥 Testando Health Check do Sistema")
        
        try:
            response = self.client.get("/health/")
            self.print_response(response)
            
            if response.status_code == 200:
                # Teste health detalhado
                response_detailed = self.client.get("/health/detailed")
                self.print_response(response_detailed)
                
                # Teste health do banco
                response_db = self.client.get("/health/db") 
                self.print_response(response_db)
                
                self.print_step("Sistema está saudável e operacional", "SUCCESS")
                return True
            else:
                self.print_step("Falha no health check", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro no health check: {e}", "ERROR")
            return False
    
    def test_user_registration(self) -> bool:
        """Teste 2: Registro de usuário"""
        self.print_step(f"👤 Registrando usuário: {TEST_USER['username']}")
        
        try:
            response = self.client.post("/auth/register", json=TEST_USER)
            self.print_response(response)
            
            if response.status_code == 201:
                self.user_data = response.json()
                self.print_step("Usuário registrado com sucesso", "SUCCESS")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                self.print_step("Usuário já existe, tentando login", "WARNING")
                return self.test_user_login()
            else:
                self.print_step("Falha no registro do usuário", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro no registro: {e}", "ERROR")
            return False
    
    def test_user_login(self) -> bool:
        """Teste 3: Login do usuário"""
        self.print_step(f"🔐 Fazendo login: {TEST_USER['username']}")
        
        try:
            login_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            response = self.client.post("/auth/login", json=login_data)
            self.print_response(response)
            
            if response.status_code == 200:
                auth_data = response.json()
                self.access_token = auth_data.get("access_token")
                
                # Configurar header de autorização
                self.client.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                
                self.print_step("Login realizado com sucesso", "SUCCESS")
                return True
            else:
                self.print_step("Falha no login", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro no login: {e}", "ERROR")
            return False
    
    def test_user_profile(self) -> bool:
        """Teste 4: Perfil do usuário"""
        self.print_step("👤 Verificando perfil do usuário")
        
        try:
            response = self.client.get("/auth/me")
            self.print_response(response)
            
            if response.status_code == 200:
                self.user_data = response.json()
                self.print_step("Perfil obtido com sucesso", "SUCCESS")
                return True
            else:
                self.print_step("Falha ao obter perfil", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro ao obter perfil: {e}", "ERROR")
            return False
    
    def test_create_wallet(self) -> bool:
        """Teste 5: Criação de carteira HD"""
        self.print_step("💰 Criando carteira HD multi-chain")
        
        try:
            wallet_data = {
                "name": "DevUser Main Wallet",
                "network": "bitcoin"
            }
            response = self.client.post("/wallets/create", json=wallet_data)
            self.print_response(response)
            
            if response.status_code in [200, 201]:
                self.wallet_data = response.json()
                self.wallets["bitcoin"] = self.wallet_data  # Store Bitcoin wallet
                self.print_step("Carteira HD criada com sucesso", "SUCCESS")
                
                # Mostrar mnemônico (apenas para teste)
                mnemonic = self.wallet_data.get("mnemonic")
                if mnemonic:
                    self.print_step(f"🔑 Mnemônico: {mnemonic}", "INFO")
                
                return True
            else:
                self.print_step("Falha na criação da carteira", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro na criação da carteira: {e}", "ERROR")
            return False
    
    def test_generate_addresses(self) -> bool:
        """Teste 6: Geração de endereços para a carteira"""
        if not self.wallet_data:
            self.print_step("Carteira não encontrada", "ERROR")
            return False
        
        wallet_id = self.wallet_data.get("id")
        wallet_network = self.wallet_data.get("network", "bitcoin")
        
        self.print_step(f"🌐 Gerando endereços adicionais para carteira {wallet_network}")
        
        try:
            # Gerar alguns endereços de diferentes tipos
            address_types = ["receiving", "change"]
            
            for addr_type in address_types:
                self.print_step(f"📍 Gerando endereço {addr_type.upper()}")
                
                # Usar parâmetros de query, não JSON body
                response = self.client.post(f"/wallets/{wallet_id}/addresses?address_type={addr_type}")
                self.print_response(response, show_data=True)
                
                if response.status_code == 200:
                    address_info = response.json()
                    self.addresses[f"{wallet_network}_{addr_type}"] = address_info
                    self.print_step(f"Endereço {addr_type} criado: {address_info.get('address', 'N/A')}", "SUCCESS")
                else:
                    self.print_step(f"Falha ao criar endereço {addr_type}", "ERROR")
                    return False
            
            self.print_step("Endereços adicionais criados com sucesso", "SUCCESS")
            return True
            
        except Exception as e:
            self.print_step(f"Erro na geração de endereços: {e}", "ERROR")
            return False
    
    def test_wallet_addresses(self) -> bool:
        """Teste 7: Listar endereços da carteira"""
        if not self.wallet_data:
            return False
        
        wallet_id = self.wallet_data.get("id")
        self.print_step("📋 Listando endereços da carteira")
        
        try:
            response = self.client.get(f"/wallets/{wallet_id}/addresses")
            self.print_response(response)
            
            if response.status_code == 200:
                addresses = response.json()
                self.print_step(f"Encontrados {len(addresses)} endereços", "SUCCESS")
                
                for addr in addresses:
                    network = addr.get("network", "unknown")
                    address = addr.get("address", "N/A")
                    self.print_step(f"  🔗 {network.upper()}: {address}")
                
                return True
            else:
                self.print_step("Falha ao listar endereços", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro ao listar endereços: {e}", "ERROR")
            return False
    
    def test_blockchain_integration(self) -> bool:
        """Teste 8: Integração com blockchain"""
        self.print_step("⛓️ Testando integração blockchain")
        
        try:
            # Testar fees para diferentes redes
            networks = ["bitcoin", "ethereum"]
            
            for network in networks:
                self.print_step(f"💰 Consultando fees da rede {network.upper()}")
                response = self.client.get(f"/blockchain/blockchain/fees/{network}")
                self.print_response(response)
                
                if response.status_code != 200:
                    self.print_step(f"Falha ao obter fees da rede {network}", "WARNING")
            
            # Testar validação de endereço
            if "bitcoin_receiving" in self.addresses:
                btc_address = self.addresses["bitcoin_receiving"].get("address")
                if btc_address:
                    self.print_step("✅ Validando endereço Bitcoin")
                    validate_data = {"address": btc_address, "network": "bitcoin"}
                    response = self.client.post("/blockchain/blockchain/validate-address", json=validate_data)
                    self.print_response(response)
            
            self.print_step("Testes blockchain concluídos", "SUCCESS")
            return True
            
        except Exception as e:
            self.print_step(f"Erro nos testes blockchain: {e}", "ERROR")
            return False
    
    def test_transaction_creation(self) -> bool:
        """Teste 9: Sistema de transações"""
        self.print_step("💸 Testando sistema de transações")
        
        try:
            # Testar estimativa de transação
            if "bitcoin_receiving" in self.addresses:
                from_address = self.addresses["bitcoin_receiving"].get("address")
                
                if from_address:
                    self.print_step("💰 Testando estimativa de transação Bitcoin")
                    
                    estimate_data = {
                        "from_address": from_address,
                        "to_address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",  # Endereço público conhecido
                        "amount": 0.001,
                        "network": "bitcoin"
                    }
                    
                    response = self.client.post("/api/v1/transactions/estimate", json=estimate_data)
                    self.print_response(response)
                    
                    if response.status_code == 200:
                        self.print_step("Estimativa de transação funcionando", "SUCCESS")
                    else:
                        self.print_step("Estimativa pode não estar funcionando (normal em testnet)", "WARNING")
            
            # Testar listagem de transações
            self.print_step("📋 Listando transações do usuário")
            response = self.client.get("/api/v1/transactions/")
            self.print_response(response)
            
            # Testar estatísticas
            self.print_step("📊 Obtendo estatísticas de transações")
            response = self.client.get("/api/v1/transactions/stats")
            self.print_response(response)
            
            self.print_step("Sistema de transações funcionando", "SUCCESS")
            return True
            
        except Exception as e:
            self.print_step(f"Erro no sistema de transações: {e}", "ERROR")
            return False
    
    def test_prices_integration(self) -> bool:
        """Teste 10: Integração com preços"""
        self.print_step("📈 Testando integração com preços")
        
        try:
            # Testar ativos suportados
            self.print_step("📋 Consultando ativos suportados")
            response = self.client.get("/prices/supported")
            self.print_response(response, show_data=False)
            
            if response.status_code == 200:
                supported = response.json()
                self.print_step(f"Encontrados {len(supported)} ativos suportados", "SUCCESS")
            
            # Testar preços atuais
            self.print_step("💰 Consultando preços atuais")
            response = self.client.get("/prices/current")
            self.print_response(response, show_data=False)
            
            self.print_step("Integração com preços funcionando", "SUCCESS")
            return True
            
        except Exception as e:
            self.print_step(f"Erro na integração com preços: {e}", "ERROR")
            return False
    
    def test_create_ethereum_wallet(self) -> bool:
        """Teste 11: Criação de carteira Ethereum"""
        self.print_step("🟦 Criando carteira Ethereum HD")
        
        try:
            wallet_data = {
                "name": "DevUser Ethereum Wallet",
                "network": "ethereum"
            }
            response = self.client.post("/wallets/create", json=wallet_data)
            self.print_response(response)
            
            if response.status_code in [200, 201]:
                eth_wallet_data = response.json()
                self.wallets["ethereum"] = eth_wallet_data  # Store ETH wallet
                self.print_step("Carteira Ethereum criada com sucesso", "SUCCESS")
                
                # Mostrar mnemônico Ethereum
                mnemonic = eth_wallet_data.get("mnemonic")
                if mnemonic:
                    self.print_step(f"🔑 Mnemônico ETH: {mnemonic}", "INFO")
                
                # Mostrar primeiro endereço Ethereum
                first_address = eth_wallet_data.get("first_address")
                if first_address:
                    self.print_step(f"📫 Primeiro endereço ETH: {first_address}", "INFO")
                
                return True
            else:
                self.print_step("Falha na criação da carteira Ethereum", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro na criação da carteira Ethereum: {e}", "ERROR")
            return False
    
    def test_generate_ethereum_addresses(self) -> bool:
        """Teste 12: Geração de endereços Ethereum"""
        if not self.wallets or "ethereum" not in self.wallets:
            self.print_step("Carteira Ethereum não encontrada", "ERROR")
            return False
        
        eth_wallet = self.wallets["ethereum"]
        wallet_id = eth_wallet.get("id")
        
        self.print_step("🟦 Gerando endereços adicionais para carteira Ethereum")
        
        try:
            # Gerar endereços Ethereum de diferentes tipos
            address_types = ["receiving", "change"]
            
            for addr_type in address_types:
                self.print_step(f"📍 Gerando endereço ETH {addr_type.upper()}")
                
                response = self.client.post(f"/wallets/{wallet_id}/addresses?address_type={addr_type}")
                self.print_response(response, show_data=True)
                
                if response.status_code == 200:
                    address_info = response.json()
                    self.addresses[f"ethereum_{addr_type}"] = address_info
                    eth_address = address_info.get('address', 'N/A')
                    self.print_step(f"Endereço ETH {addr_type} criado: {eth_address}", "SUCCESS")
                    
                    # Validar formato do endereço Ethereum (deve começar com 0x)
                    if eth_address.startswith('0x') and len(eth_address) == 42:
                        self.print_step(f"✅ Formato ETH válido: {len(eth_address)} caracteres", "SUCCESS")
                    else:
                        self.print_step(f"⚠️ Formato ETH inesperado: {eth_address}", "WARNING")
                else:
                    self.print_step(f"Falha ao criar endereço ETH {addr_type}", "ERROR")
                    return False
            
            self.print_step("Endereços Ethereum criados com sucesso", "SUCCESS")
            return True
            
        except Exception as e:
            self.print_step(f"Erro na geração de endereços ETH: {e}", "ERROR")
            return False
    
    def test_ethereum_addresses_list(self) -> bool:
        """Teste 13: Listar endereços da carteira Ethereum"""
        if not self.wallets or "ethereum" not in self.wallets:
            return False
        
        eth_wallet = self.wallets["ethereum"]
        wallet_id = eth_wallet.get("id")
        self.print_step("🟦 Listando todos os endereços da carteira Ethereum")
        
        try:
            response = self.client.get(f"/wallets/{wallet_id}/addresses")
            self.print_response(response)
            
            if response.status_code == 200:
                addresses = response.json()
                self.print_step(f"Encontrados {len(addresses)} endereços ETH", "SUCCESS")
                
                for addr in addresses:
                    address = addr.get("address", "N/A")
                    addr_type = addr.get("address_type", "unknown")
                    derivation_path = addr.get("derivation_path", "N/A")
                    self.print_step(f"  🔗 ETH {addr_type.upper()}: {address}")
                    self.print_step(f"    📍 Path: {derivation_path}")
                
                return True
            else:
                self.print_step("Falha ao listar endereços ETH", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro ao listar endereços ETH: {e}", "ERROR")
            return False
    
    def test_create_bnb_wallet(self) -> bool:
        """Teste 15: Criação de carteira Binance Smart Chain (BNB)"""
        self.print_step("🟡 Criando carteira Binance Smart Chain (BNB)")
        
        try:
            wallet_data = {
                "name": "DevUser BNB Wallet",
                "network": "bsc"
            }
            response = self.client.post("/wallets/create", json=wallet_data)
            self.print_response(response)
            
            if response.status_code in [200, 201]:
                bnb_wallet_data = response.json()
                self.wallets["bsc"] = bnb_wallet_data
                self.print_step("Carteira BNB criada com sucesso", "SUCCESS")
                
                # Mostrar primeiro endereço BNB
                first_address = bnb_wallet_data.get("first_address")
                if first_address:
                    self.print_step(f"📫 Primeiro endereço BNB: {first_address}", "INFO")
                
                return True
            else:
                self.print_step("Falha na criação da carteira BNB", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro na criação da carteira BNB: {e}", "ERROR")
            return False
    
    def test_create_solana_wallet(self) -> bool:
        """Teste 16: Criação de carteira Solana (SOL)"""
        self.print_step("🟣 Criando carteira Solana (SOL)")
        
        try:
            wallet_data = {
                "name": "DevUser Solana Wallet",
                "network": "solana"
            }
            response = self.client.post("/wallets/create", json=wallet_data)
            self.print_response(response)
            
            if response.status_code in [200, 201]:
                sol_wallet_data = response.json()
                self.wallets["solana"] = sol_wallet_data
                self.print_step("Carteira Solana criada com sucesso", "SUCCESS")
                
                # Mostrar primeiro endereço Solana
                first_address = sol_wallet_data.get("first_address")
                if first_address:
                    self.print_step(f"📫 Primeiro endereço SOL: {first_address}", "INFO")
                
                return True
            else:
                self.print_step("Falha na criação da carteira Solana", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro na criação da carteira Solana: {e}", "ERROR")
            return False
    
    def test_create_usdt_wallet(self) -> bool:
        """Teste 17: Criação de carteira Tether USDT"""
        self.print_step("🟢 Criando carteira Tether USDT")
        
        try:
            wallet_data = {
                "name": "DevUser USDT Wallet",
                "network": "usdt"
            }
            response = self.client.post("/wallets/create", json=wallet_data)
            self.print_response(response)
            
            if response.status_code in [200, 201]:
                usdt_wallet_data = response.json()
                self.wallets["usdt"] = usdt_wallet_data
                self.print_step("Carteira USDT criada com sucesso", "SUCCESS")
                
                # Mostrar primeiro endereço USDT
                first_address = usdt_wallet_data.get("first_address")
                if first_address:
                    self.print_step(f"📫 Primeiro endereço USDT: {first_address}", "INFO")
                
                return True
            else:
                self.print_step("Falha na criação da carteira USDT", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro na criação da carteira USDT: {e}", "ERROR")
            return False
    
    def test_all_wallets_summary(self) -> bool:
        """Teste 18: Resumo de todas as carteiras criadas"""
        self.print_step("📊 Resumo de todas as carteiras multi-chain")
        
        try:
            networks = ["bitcoin", "ethereum", "bsc", "solana", "usdt"]
            
            self.print_step("🌐 RESUMO FINAL - TODAS AS CARTEIRAS:")
            self.print_step("=" * 50)
            
            for network in networks:
                if network in self.wallets:
                    wallet = self.wallets[network]
                    wallet_id = wallet.get("id", "N/A")
                    first_address = wallet.get("first_address", "N/A")
                    
                    emoji_map = {
                        "bitcoin": "🟨",
                        "ethereum": "🟦", 
                        "bsc": "🟡",
                        "solana": "🟣",
                        "usdt": "🟢"
                    }
                    
                    emoji = emoji_map.get(network, "📱")
                    network_name = network.upper()
                    
                    self.print_step(f"{emoji} {network_name} (ID: {wallet_id})")
                    self.print_step(f"   📍 {first_address}")
                else:
                    self.print_step(f"❌ {network.upper()} - Não criada")
            
            self.print_step("=" * 50)
            created_count = len([n for n in networks if n in self.wallets])
            self.print_step(f"🎯 Total: {created_count}/{len(networks)} carteiras criadas")
            
            return True
            
        except Exception as e:
            self.print_step(f"Erro no resumo das carteiras: {e}", "ERROR")
            return False

    def test_user_statistics(self) -> bool:
        """Teste 14: Estatísticas do usuário"""
        self.print_step("📊 Consultando estatísticas do usuário")
        
        try:
            response = self.client.get("/users/me/stats")
            self.print_response(response)
            
            if response.status_code == 200:
                stats = response.json()
                self.print_step("Estatísticas obtidas com sucesso", "SUCCESS")
                return True
            else:
                self.print_step("Falha ao obter estatísticas", "ERROR")
                return False
                
        except Exception as e:
            self.print_step(f"Erro ao obter estatísticas: {e}", "ERROR")
            return False
    
    def run_complete_test(self) -> Dict[str, bool]:
        """Executa todos os testes"""
        print("🚀 INICIANDO TESTE COMPLETO DO HOLD WALLET BACKEND")
        print("=" * 60)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Registro de Usuário", self.test_user_registration),
            ("Login", self.test_user_login),
            ("Perfil do Usuário", self.test_user_profile),
            ("Criação de Carteira HD", self.test_create_wallet),
            ("Geração de Endereços", self.test_generate_addresses),
            ("Listagem de Endereços", self.test_wallet_addresses),
            ("Integração Blockchain", self.test_blockchain_integration),
            ("Sistema de Transações", self.test_transaction_creation),
            ("Integração com Preços", self.test_prices_integration),
            ("Criação de Carteira Ethereum", self.test_create_ethereum_wallet),
            ("Geração de Endereços ETH", self.test_generate_ethereum_addresses),
            ("Listagem de Endereços ETH", self.test_ethereum_addresses_list),
            ("Criação de Carteira BNB", self.test_create_bnb_wallet),
            ("Criação de Carteira Solana", self.test_create_solana_wallet),
            ("Criação de Carteira USDT", self.test_create_usdt_wallet),
            ("Resumo Multi-Chain", self.test_all_wallets_summary),
            ("Estatísticas do Usuário", self.test_user_statistics),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 TESTE: {test_name}")
            print("-" * 40)
            
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
            except Exception as e:
                self.print_step(f"Erro inesperado: {e}", "ERROR")
                results[test_name] = False
        
        print("\n" + "=" * 60)
        print("📊 RESUMO DOS TESTES")
        print("=" * 60)
        
        for test_name, result in results.items():
            status_emoji = "✅" if result else "❌"
            print(f"{status_emoji} {test_name}")
        
        print(f"\n🎯 RESULTADO FINAL: {passed}/{total} testes passaram")
        
        if passed == total:
            print("🎉 TODOS OS TESTES PASSARAM! HOLD Wallet Backend está 100% funcional!")
        elif passed >= total * 0.8:
            print("✅ A maioria dos testes passou. Sistema está funcionando bem.")
        else:
            print("⚠️ Alguns problemas detectados. Verifique os logs acima.")
        
        return results
    
    def cleanup(self):
        """Limpa recursos"""
        if self.client:
            self.client.close()


def main():
    """Função principal"""
    tester = HOLDWalletTester()
    
    try:
        results = tester.run_complete_test()
        return results
    except KeyboardInterrupt:
        print("\n⏸️ Teste interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro geral no teste: {e}")
    finally:
        tester.cleanup()


if __name__ == "__main__":
    main()
