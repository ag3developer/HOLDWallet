#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print("Conectando ao banco...")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cursor = conn.cursor()

cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings');")
exists = cursor.fetchone()[0]

if exists:
    print("Tabela user_settings JA EXISTE!")
else:
    print("Criando tabela user_settings...")
    cursor.execute("""
        CREATE TABLE user_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            default_currency VARCHAR(10) DEFAULT 'BRL',
            theme VARCHAR(20) DEFAULT 'light',
            language VARCHAR(10) DEFAULT 'pt-BR',
            notifications_enabled BOOLEAN DEFAULT TRUE,
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            sms_notifications BOOLEAN DEFAULT FALSE,
            marketing_emails BOOLEAN DEFAULT FALSE,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            two_factor_method VARCHAR(20) DEFAULT NULL,
            auto_lock_timeout INTEGER DEFAULT 5,
            show_balance BOOLEAN DEFAULT TRUE,
            hide_small_balances BOOLEAN DEFAULT FALSE,
            default_network VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    print("Tabela user_settings CRIADA COM SUCESSO!")

cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_settings' ORDER BY ordinal_position;")
cols = cursor.fetchall()
print("Colunas:", [c[0] for c in cols])

cursor.close()
conn.close()
print("CONCLUIDO!")
