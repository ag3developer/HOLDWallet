from app.core.db import SessionLocal, engine
from app.models.kyc import KYCVerification, KYCPersonalData
from app.models.user import User
from sqlalchemy import inspect

# First check if user_settings table exists
inspector = inspect(engine)
tables = inspector.get_table_names()
print("=== Database Tables ===")
for t in sorted(tables):
    print(f"  - {t}")

if 'user_settings' in tables:
    print("\n✅ user_settings table EXISTS")
else:
    print("\n❌ user_settings table NOT FOUND - Need to create it!")

print("\n=== User KYC Data ===")
db = SessionLocal()

user = db.query(User).filter(User.username == 'martins').first()
if user:
    print(f"User ID: {user.id}")
    print(f"Email: {user.email}")
    
    kyc = db.query(KYCVerification).filter(KYCVerification.user_id == user.id).first()
    if kyc:
        print(f"KYC ID: {kyc.id}")
        print(f"KYC Status: {kyc.status}")
        print(f"KYC Level: {kyc.level}")
        
        personal = db.query(KYCPersonalData).filter(KYCPersonalData.verification_id == kyc.id).first()
        if personal:
            print(f"Full Name: {personal.full_name}")
            print(f"Phone: {personal.phone}")
            print(f"City: {personal.city}")
            print(f"State: {personal.state}")
            print(f"Country: {personal.country}")
            print(f"Birth Date: {personal.birth_date}")
            print(f"Occupation: {personal.occupation}")
        else:
            print("No personal data found")
    else:
        print("No KYC verification found")
else:
    print("User not found")
db.close()
