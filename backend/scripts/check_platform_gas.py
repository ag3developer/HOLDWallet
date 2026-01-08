#!/usr/bin/env python3
"""
🔍 Script para verificar saldo de gas da carteira da plataforma

Uso:
    python check_platform_gas.py

Este script verifica se a carteira da plataforma tem MATIC suficiente
para patrocinar transações de usuários.
"""

import os
import sys
from decimal import Decimal
from web3 import Web3

# Configurações
PLATFORM_ADDRESS = os.environ.get('PLATFORM_WALLET_ADDRESS', '0xf35180d70920361426b5c3db222DEb450aA19979')
POLYGON_RPC = os.environ.get('POLYGON_RPC_URL', 'https://polygon-rpc.com')

# Limites
MIN_BALANCE_WARNING = Decimal("0.1")  # Alerta se < 0.1 MATIC
MIN_BALANCE_CRITICAL = Decimal("0.01")  # Crítico se < 0.01 MATIC


def check_balance():
    """Verifica saldo de MATIC na carteira da plataforma"""
    print("=" * 60)
    print("🔍 VERIFICAÇÃO DE GAS - CARTEIRA DA PLATAFORMA")
    print("=" * 60)
    
    try:
        # Conecta na Polygon
        w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
        
        if not w3.is_connected():
            print("❌ Erro: Não foi possível conectar à rede Polygon")
            return False
        
        print(f"✅ Conectado à rede Polygon")
        print(f"📍 Endereço: {PLATFORM_ADDRESS}")
        
        # Verifica saldo
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(PLATFORM_ADDRESS))
        balance = Decimal(str(w3.from_wei(balance_wei, 'ether')))
        
        print(f"\n💰 Saldo atual: {balance:.6f} MATIC")
        
        # Analisa status
        if balance < MIN_BALANCE_CRITICAL:
            print("\n🚨 CRÍTICO: Saldo MUITO BAIXO!")
            print("   As transações de VENDA vão FALHAR!")
            print(f"\n   ➡️  Deposite pelo menos 0.5 MATIC no endereço:")
            print(f"      {PLATFORM_ADDRESS}")
            return False
        
        elif balance < MIN_BALANCE_WARNING:
            print("\n⚠️  ALERTA: Saldo baixo!")
            print("   Considere depositar mais MATIC em breve.")
            print(f"\n   ➡️  Endereço para depósito:")
            print(f"      {PLATFORM_ADDRESS}")
            return True
        
        else:
            print("\n✅ Saldo OK!")
            
            # Estima quantas transações pode patrocinar
            gas_per_tx = Decimal("0.01")  # ~0.01 MATIC por transação
            estimated_txs = int(balance / gas_per_tx)
            print(f"   Pode patrocinar aproximadamente {estimated_txs} transações")
            return True
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False


def main():
    success = check_balance()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Verificação concluída - Sistema operacional")
    else:
        print("❌ Verificação concluída - AÇÃO NECESSÁRIA")
    print("=" * 60)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
