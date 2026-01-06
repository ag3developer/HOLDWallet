#!/usr/bin/env python3
"""Add BRL columns to instant_trades table"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("Adding BRL columns to instant_trades table...")

# Check if columns exist
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'instant_trades' 
    AND column_name IN ('brl_amount', 'brl_total_amount', 'usd_to_brl_rate')
""")
existing = [row[0] for row in cur.fetchall()]

if 'brl_amount' not in existing:
    cur.execute("ALTER TABLE instant_trades ADD COLUMN brl_amount NUMERIC(18, 2)")
    print("  ✓ Added brl_amount column")
else:
    print("  - brl_amount already exists")

if 'brl_total_amount' not in existing:
    cur.execute("ALTER TABLE instant_trades ADD COLUMN brl_total_amount NUMERIC(18, 2)")
    print("  ✓ Added brl_total_amount column")
else:
    print("  - brl_total_amount already exists")

if 'usd_to_brl_rate' not in existing:
    cur.execute("ALTER TABLE instant_trades ADD COLUMN usd_to_brl_rate NUMERIC(10, 4)")
    print("  ✓ Added usd_to_brl_rate column")
else:
    print("  - usd_to_brl_rate already exists")

conn.commit()
print("\n✅ Done! BRL columns are ready.")

conn.close()
