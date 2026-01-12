#!/usr/bin/env python3
"""Script para verificar dados KYC do usuário"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

db_url = os.environ.get('DATABASE_URL', '')
if not db_url:
    print("DATABASE_URL não encontrada")
    sys.exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    # Check KYC + Personal Data
    result = conn.execute(text('''
        SELECT kv.id as kyc_id, kv.status, kv.level,
               kpd.id as pd_id, kpd.full_name, kpd.phone, kpd.city
        FROM kyc_verifications kv
        LEFT JOIN kyc_personal_data kpd ON kv.id = kpd.kyc_verification_id
        WHERE kv.user_id = 'cc98ade4-7d50-48f0-95cd-ff69cb24c259'
    '''))
    rows = result.fetchall()
    
    print("=" * 60)
    print("KYC Verification + Personal Data para o usuário 'martins':")
    print("=" * 60)
    
    if not rows:
        print("Nenhum KYC encontrado!")
    else:
        for row in rows:
            print(f"KYC ID: {row[0]}")
            print(f"  Status: {row[1]}")
            print(f"  Level: {row[2]}")
            print(f"  Personal Data ID: {row[3]}")
            print(f"  Full Name: {row[4]}")
            print(f"  Phone: {row[5]}")
            print(f"  City: {row[6]}")
            print("-" * 40)
    
    # Count total personal data
    count = conn.execute(text('SELECT COUNT(*) FROM kyc_personal_data')).scalar()
    print(f"\nTotal de registros em kyc_personal_data: {count}")
    
    # Show some personal data records
    if count > 0:
        result2 = conn.execute(text('SELECT id, full_name, kyc_verification_id FROM kyc_personal_data LIMIT 5'))
        print("\nExemplos de personal_data:")
        for row in result2.fetchall():
            print(f"  ID: {row[0]}, Name: {row[1]}, KYC_ID: {row[2]}")
