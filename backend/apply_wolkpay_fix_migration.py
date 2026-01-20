#!/usr/bin/env python3
"""
🔧 Script para aplicar a correção do WolkPay - Adicionar coluna beneficiary_receives_crypto

Este script:
1. Lê as credenciais do .env
2. Conecta no banco PostgreSQL de produção
3. Adiciona a coluna beneficiary_receives_crypto
4. Atualiza faturas existentes com o valor calculado

Uso:
    python apply_wolkpay_fix_migration.py

Author: GitHub Copilot
Date: 2026-01-20
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis do .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("❌ DATABASE_URL não encontrada no .env")
    sys.exit(1)

print(f"📦 Conectando ao banco de dados...")
print(f"   URL: {DATABASE_URL[:50]}...")

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("❌ psycopg2 não instalado. Instalando...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2
    from psycopg2 import sql

def run_migration():
    """Executa a migration para adicionar beneficiary_receives_crypto"""
    
    conn = None
    cursor = None
    
    try:
        # Conectar ao banco
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("✅ Conectado ao banco de dados!")
        
        # 1. Verificar se a coluna já existe
        print("\n🔍 Verificando se a coluna já existe...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'wolkpay_invoices' 
            AND column_name = 'beneficiary_receives_crypto'
        """)
        
        if cursor.fetchone():
            print("ℹ️  Coluna beneficiary_receives_crypto já existe!")
        else:
            # 2. Adicionar a coluna
            print("📝 Adicionando coluna beneficiary_receives_crypto...")
            cursor.execute("""
                ALTER TABLE wolkpay_invoices 
                ADD COLUMN beneficiary_receives_crypto NUMERIC(28, 18)
            """)
            print("✅ Coluna adicionada com sucesso!")
        
        # 3. Verificar quantas faturas precisam ser atualizadas
        print("\n🔍 Verificando faturas existentes...")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM wolkpay_invoices 
            WHERE beneficiary_receives_crypto IS NULL
        """)
        count = cursor.fetchone()[0]
        print(f"   Faturas para atualizar: {count}")
        
        if count > 0:
            # 4. Atualizar faturas existentes
            print("\n📝 Atualizando faturas existentes...")
            cursor.execute("""
                UPDATE wolkpay_invoices 
                SET beneficiary_receives_crypto = CASE 
                    WHEN fee_payer = 'PAYER' THEN crypto_amount
                    ELSE crypto_amount * (1 - (COALESCE(service_fee_percent, 3.65) + COALESCE(network_fee_percent, 0.15)) / 100)
                END
                WHERE beneficiary_receives_crypto IS NULL
            """)
            updated = cursor.rowcount
            print(f"✅ {updated} faturas atualizadas!")
        
        # 5. Commit das alterações
        conn.commit()
        print("\n✅ Migration aplicada com sucesso!")
        
        # 6. Mostrar algumas faturas de exemplo
        print("\n📊 Amostra de faturas atualizadas:")
        cursor.execute("""
            SELECT 
                invoice_number,
                fee_payer,
                crypto_amount as bruto,
                beneficiary_receives_crypto as liquido,
                ROUND((crypto_amount - beneficiary_receives_crypto)::numeric, 6) as taxa_crypto,
                status
            FROM wolkpay_invoices
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        rows = cursor.fetchall()
        if rows:
            print(f"\n{'Invoice':<20} {'Fee Payer':<12} {'Bruto':<15} {'Líquido':<15} {'Taxa':<12} {'Status'}")
            print("-" * 90)
            for row in rows:
                invoice, fee_payer, bruto, liquido, taxa, status = row
                bruto_str = f"{float(bruto):.6f}" if bruto else "N/A"
                liquido_str = f"{float(liquido):.6f}" if liquido else "N/A"
                taxa_str = f"{float(taxa):.6f}" if taxa else "0"
                print(f"{invoice:<20} {fee_payer or 'BENEFICIARY':<12} {bruto_str:<15} {liquido_str:<15} {taxa_str:<12} {status}")
        else:
            print("   Nenhuma fatura encontrada")
        
        # 7. Verificar se há faturas PAID ou AWAITING_PAYMENT que serão afetadas
        print("\n⚠️  Faturas pendentes que usarão o novo cálculo:")
        cursor.execute("""
            SELECT 
                invoice_number,
                crypto_amount as bruto,
                beneficiary_receives_crypto as liquido,
                status
            FROM wolkpay_invoices
            WHERE status IN ('PAID', 'AWAITING_PAYMENT')
            ORDER BY created_at DESC
        """)
        
        pending = cursor.fetchall()
        if pending:
            for row in pending:
                invoice, bruto, liquido, status = row
                print(f"   📋 {invoice}: {float(bruto):.4f} bruto → {float(liquido):.4f} líquido ({status})")
        else:
            print("   Nenhuma fatura pendente")
            
    except psycopg2.Error as e:
        print(f"\n❌ Erro no banco de dados: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("\n🔌 Conexão fechada")


def verify_fix():
    """Verifica se a correção foi aplicada corretamente"""
    
    conn = None
    cursor = None
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("\n" + "=" * 60)
        print("🔍 VERIFICAÇÃO DA CORREÇÃO")
        print("=" * 60)
        
        # Verificar coluna
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'wolkpay_invoices' 
            AND column_name = 'beneficiary_receives_crypto'
        """)
        col = cursor.fetchone()
        
        if col:
            print(f"\n✅ Coluna existe: {col[0]} ({col[1]})")
        else:
            print("\n❌ Coluna NÃO existe!")
            return False
        
        # Verificar se há NULL
        cursor.execute("""
            SELECT COUNT(*) 
            FROM wolkpay_invoices 
            WHERE beneficiary_receives_crypto IS NULL
        """)
        nulls = cursor.fetchone()[0]
        
        if nulls == 0:
            print(f"✅ Todas as faturas têm valor calculado")
        else:
            print(f"⚠️  {nulls} faturas ainda com valor NULL")
        
        # Verificar cálculo
        cursor.execute("""
            SELECT 
                invoice_number,
                fee_payer,
                crypto_amount,
                beneficiary_receives_crypto,
                service_fee_percent,
                network_fee_percent
            FROM wolkpay_invoices
            WHERE fee_payer = 'BENEFICIARY' OR fee_payer IS NULL
            LIMIT 3
        """)
        
        print("\n📊 Verificação de cálculo (fee_payer = BENEFICIARY):")
        for row in cursor.fetchall():
            invoice, fee_payer, bruto, liquido, srv_fee, net_fee = row
            total_fee = float(srv_fee or 3.65) + float(net_fee or 0.15)
            expected = float(bruto) * (1 - total_fee / 100)
            actual = float(liquido)
            diff = abs(expected - actual)
            
            status = "✅" if diff < 0.0001 else "❌"
            print(f"   {invoice}: {float(bruto):.6f} × {100-total_fee:.2f}% = {expected:.6f} (atual: {actual:.6f}) {status}")
        
        print("\n✅ Verificação concluída!")
        return True
        
    except Exception as e:
        print(f"\n❌ Erro na verificação: {e}")
        return False
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 WOLKPAY FIX - Adicionar beneficiary_receives_crypto")
    print("=" * 60)
    print(f"📅 Data: 2026-01-20")
    print(f"📁 Env: {env_path}")
    print("=" * 60)
    
    # Confirmar execução
    print("\n⚠️  ATENÇÃO: Este script vai modificar o banco de PRODUÇÃO!")
    confirm = input("Digite 'SIM' para continuar: ")
    
    if confirm.upper() != 'SIM':
        print("❌ Operação cancelada")
        sys.exit(0)
    
    # Executar migration
    run_migration()
    
    # Verificar
    verify_fix()
    
    print("\n" + "=" * 60)
    print("🎉 PROCESSO CONCLUÍDO!")
    print("=" * 60)
