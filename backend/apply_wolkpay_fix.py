#!/usr/bin/env python3
"""
🔧 Aplicar correção WolkPay - Adicionar coluna beneficiary_receives_crypto
Database: holdwallet-db (PRODUÇÃO)
"""
import psycopg2

DB_CONFIG = {
    "host": "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com",
    "port": 25060,
    "user": "holdwallet-db",
    "password": "AVNS_nUUIAsF6R5bJR3GvmRH",
    "database": "holdwallet-db",  # ← CORRIGIDO: era defaultdb
    "sslmode": "require"
}

try:
    print("📦 Conectando ao banco holdwallet-db...")
    conn = psycopg2.connect(**DB_CONFIG, connect_timeout=60)
    cursor = conn.cursor()
    print("✅ Conectado!")

    # 1. Verificar se a tabela wolkpay_invoices existe
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'wolkpay_invoices'
        )
    """)
    if not cursor.fetchone()[0]:
        print("❌ Tabela wolkpay_invoices não existe!")
        exit(1)
    print("✅ Tabela wolkpay_invoices encontrada")

    # 2. Verificar se coluna já existe
    cursor.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'wolkpay_invoices' 
        AND column_name = 'beneficiary_receives_crypto'
    """)
    
    if cursor.fetchone():
        print("ℹ️  Coluna beneficiary_receives_crypto já existe!")
    else:
        print("📝 Adicionando coluna beneficiary_receives_crypto...")
        cursor.execute("""
            ALTER TABLE wolkpay_invoices 
            ADD COLUMN beneficiary_receives_crypto NUMERIC(28, 18)
        """)
        conn.commit()
        print("✅ Coluna adicionada!")

    # 3. Contar faturas que precisam ser atualizadas
    cursor.execute("""
        SELECT COUNT(*) FROM wolkpay_invoices 
        WHERE beneficiary_receives_crypto IS NULL
    """)
    count = cursor.fetchone()[0]
    print(f"📊 Faturas para atualizar: {count}")

    if count > 0:
        # 4. Atualizar faturas existentes
        print("📝 Atualizando faturas existentes...")
        cursor.execute("""
            UPDATE wolkpay_invoices 
            SET beneficiary_receives_crypto = CASE 
                WHEN fee_payer = 'PAYER' THEN crypto_amount
                ELSE crypto_amount * (1 - (COALESCE(service_fee_percent, 3.65) + COALESCE(network_fee_percent, 0.15)) / 100)
            END
            WHERE beneficiary_receives_crypto IS NULL
        """)
        conn.commit()
        print(f"✅ {cursor.rowcount} faturas atualizadas!")

    # 5. Mostrar amostra de faturas
    print("\n📊 Amostra de faturas (últimas 5):")
    print("-" * 100)
    cursor.execute("""
        SELECT 
            invoice_number,
            fee_payer,
            crypto_amount as bruto,
            beneficiary_receives_crypto as liquido,
            ROUND((crypto_amount - COALESCE(beneficiary_receives_crypto, 0))::numeric, 6) as taxa,
            status
        FROM wolkpay_invoices
        ORDER BY created_at DESC
        LIMIT 5
    """)
    
    rows = cursor.fetchall()
    if rows:
        print(f"{'Invoice':<20} {'FeePayer':<12} {'Bruto':<15} {'Líquido':<15} {'Taxa':<12} {'Status'}")
        print("-" * 100)
        for row in rows:
            inv, fp, bruto, liq, taxa, st = row
            bruto_f = f"{float(bruto):.6f}" if bruto else "N/A"
            liq_f = f"{float(liq):.6f}" if liq else "N/A"
            taxa_f = f"{float(taxa):.6f}" if taxa else "0"
            print(f"{inv:<20} {fp or 'BENEFICIARY':<12} {bruto_f:<15} {liq_f:<15} {taxa_f:<12} {st}")
    else:
        print("   Nenhuma fatura encontrada")

    # 6. Verificar faturas pendentes
    print("\n⚠️  Faturas PENDENTES (PAID/AWAITING) que usarão o fix:")
    cursor.execute("""
        SELECT invoice_number, crypto_amount, beneficiary_receives_crypto, status
        FROM wolkpay_invoices
        WHERE status IN ('PAID', 'AWAITING_PAYMENT')
        ORDER BY created_at DESC
    """)
    pending = cursor.fetchall()
    if pending:
        for row in pending:
            print(f"   📋 {row[0]}: {float(row[1]):.4f} bruto → {float(row[2]):.4f} líquido ({row[3]})")
    else:
        print("   ✅ Nenhuma fatura pendente")

    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 MIGRATION APLICADA COM SUCESSO!")
    print("=" * 60)
    print("Agora o WolkPay vai enviar o valor LÍQUIDO (com taxa descontada)")

except Exception as e:
    print(f"❌ Erro: {e}")
