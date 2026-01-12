import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URL)

columns_to_add = [
    ("require_pin_for_transactions", "BOOLEAN DEFAULT TRUE"),
    ("biometric_enabled", "BOOLEAN DEFAULT FALSE"),
    ("auto_lock_timeout", "INTEGER DEFAULT 300"),
    ("preferred_networks", "JSONB"),
    ("gas_preference", "VARCHAR(10) DEFAULT 'standard'"),
    ("transaction_notifications", "BOOLEAN DEFAULT TRUE"),
    ("price_alerts", "BOOLEAN DEFAULT FALSE"),
    ("security_notifications", "BOOLEAN DEFAULT TRUE"),
    ("developer_mode", "BOOLEAN DEFAULT FALSE"),
    ("custom_rpc_urls", "JSONB"),
    ("address_book", "JSONB"),
    ("backup_reminder_enabled", "BOOLEAN DEFAULT TRUE"),
    ("last_backup_reminder", "TIMESTAMP WITH TIME ZONE"),
    ("backup_frequency_days", "INTEGER DEFAULT 30"),
]

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'user_settings'
    """))
    existing = [row[0] for row in result.fetchall()]
    print(f"Colunas existentes: {existing}")
    
    for col_name, col_def in columns_to_add:
        if col_name not in existing:
            try:
                conn.execute(text(f"ALTER TABLE user_settings ADD COLUMN {col_name} {col_def}"))
                print(f"Adicionada: {col_name}")
            except Exception as e:
                print(f"Erro {col_name}: {e}")
        else:
            print(f"Ja existe: {col_name}")
    
    conn.commit()
    print("Migration concluida!")
