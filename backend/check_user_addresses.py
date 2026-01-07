#!/usr/bin/env python3
"""
Script para verificar endereços de wallet de um usuário no banco PostgreSQL
"""

import os
import sys
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL")

def check_user_addresses(trade_id: str = None, user_id: str = None):
    """Verifica endereços de um usuário"""
    
    print("\n" + "="*60)
    print("🔍 VERIFICANDO ENDEREÇOS DE USUÁRIO")
    print("="*60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Se tiver trade_id, busca o user_id do trade
        if trade_id:
            print(f"\n📋 Trade ID: {trade_id}")
            cursor.execute("""
                SELECT id, user_id, reference_code, symbol, crypto_amount, status, 
                       wallet_address, network, operation_type
                FROM instant_trades 
                WHERE id = %s
            """, (trade_id,))
            trade = cursor.fetchone()
            
            if not trade:
                print(f"❌ Trade não encontrado: {trade_id}")
                return
            
            print(f"\n📊 DADOS DO TRADE:")
            print(f"   Reference: {trade['reference_code']}")
            print(f"   Status: {trade['status']}")
            print(f"   Tipo: {trade['operation_type']}")
            print(f"   Symbol: {trade['symbol']}")
            print(f"   Crypto Amount: {trade['crypto_amount']}")
            print(f"   Wallet Address: {trade['wallet_address'] or 'NÃO DEFINIDO'}")
            print(f"   Network: {trade['network'] or 'NÃO DEFINIDO'}")
            
            user_id = str(trade['user_id'])
        
        if not user_id:
            print("❌ Nenhum user_id fornecido")
            return
        
        print(f"\n👤 USER ID: {user_id}")
        
        # Buscar dados do usuário
        cursor.execute("""
            SELECT id, username, email, is_active 
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        if user:
            print(f"   Username: {user['username']}")
            print(f"   Email: {user['email']}")
            print(f"   Ativo: {user['is_active']}")
        else:
            print(f"❌ Usuário não encontrado!")
            return
        
        # Buscar wallets do usuário
        print(f"\n📁 WALLETS DO USUÁRIO:")
        cursor.execute("""
            SELECT id, name, network, is_active, created_at
            FROM wallets 
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        wallets = cursor.fetchall()
        
        if not wallets:
            print("   ⚠️ NENHUMA WALLET ENCONTRADA!")
        else:
            for w in wallets:
                status = "✅" if w['is_active'] else "❌"
                print(f"   {status} Wallet: {w['name']} | Network: {w['network']} | ID: {w['id']}")
        
        # Buscar endereços de todas as wallets do usuário
        print(f"\n📍 ENDEREÇOS DO USUÁRIO:")
        cursor.execute("""
            SELECT a.id, a.address, a.network, a.is_active, a.wallet_id, w.name as wallet_name
            FROM addresses a
            JOIN wallets w ON a.wallet_id = w.id
            WHERE w.user_id = %s
            ORDER BY a.network
        """, (user_id,))
        addresses = cursor.fetchall()
        
        if not addresses:
            print("   ⚠️ NENHUM ENDEREÇO ENCONTRADO!")
            print("\n   💡 O usuário precisa criar uma wallet primeiro para ter um endereço.")
        else:
            evm_networks = ['ethereum', 'polygon', 'base', 'bsc', 'arbitrum', 'optimism']
            evm_address = None
            
            for a in addresses:
                status = "✅" if a['is_active'] else "❌"
                print(f"   {status} {a['network'].upper():12} | {a['address']}")
                
                # Guarda o primeiro endereço EVM encontrado
                if a['is_active'] and a['network'].lower() in evm_networks:
                    evm_address = a['address']
            
            if evm_address:
                print(f"\n   💡 ENDEREÇO EVM COMPATÍVEL: {evm_address}")
                print(f"      Este endereço funciona em: Polygon, Ethereum, Base, BSC, Arbitrum, Optimism")
        
        # Resumo
        print("\n" + "="*60)
        print("📊 RESUMO:")
        print(f"   Total de Wallets: {len(wallets)}")
        print(f"   Total de Endereços: {len(addresses)}")
        
        active_addresses = [a for a in addresses if a['is_active']]
        print(f"   Endereços Ativos: {len(active_addresses)}")
        
        if not addresses:
            print("\n⚠️  PROBLEMA: Usuário não tem endereços cadastrados!")
            print("   SOLUÇÃO: O usuário precisa criar uma wallet no app.")
        
    finally:
        cursor.close()
        conn.close()


def list_recent_trades():
    """Lista trades recentes com problema de wallet"""
    
    print("\n" + "="*60)
    print("📋 TRADES RECENTES COM PAYMENT_CONFIRMED")
    print("="*60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT t.id, t.reference_code, t.status::text, t.symbol, t.crypto_amount, 
                   t.wallet_address, t.network, u.username
            FROM instant_trades t
            JOIN users u ON t.user_id::text = u.id::text
            WHERE t.status::text IN ('PAYMENT_CONFIRMED', 'FAILED', 'payment_confirmed', 'failed')
            ORDER BY t.created_at DESC
            LIMIT 10
        """)
        trades = cursor.fetchall()
        
        if not trades:
            print("Nenhum trade encontrado com status payment_confirmed ou failed")
            return
        
        for t in trades:
            wallet_status = "✅" if t['wallet_address'] else "❌"
            print(f"\n{wallet_status} {t['reference_code']} | {t['status']}")
            print(f"   User: {t['username']} | {t['crypto_amount']} {t['symbol']}")
            print(f"   Wallet: {t['wallet_address'] or 'NÃO DEFINIDO'}")
            print(f"   Trade ID: {t['id']}")
            
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Se passou um argumento, usa como trade_id
        trade_id = sys.argv[1]
        check_user_addresses(trade_id=trade_id)
    else:
        # Lista trades recentes
        list_recent_trades()
        print("\n" + "-"*60)
        print("💡 Para verificar um trade específico, execute:")
        print("   python check_user_addresses.py <TRADE_ID>")
