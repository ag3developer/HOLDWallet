#!/usr/bin/env python3

"""
Debug script to test wallet insertion directly.
"""

import asyncio
from app.core.db import SessionLocal
from app.services.wallet_service import WalletService

async def test_wallet_creation():
    """Test wallet creation directly."""
    
    db = SessionLocal()
    service = WalletService()
    
    try:
        print("Testing wallet creation...")
        
        result = await service.create_wallet_with_mnemonic(
            db=db,
            user_id='6fd1d1c2-03d9-4f8e-8c14-0ba597ba6fb9',
            name='Debug Test Wallet',
            network='multi',
            passphrase='test123'
        )
        
        print(f"✅ Success! Wallet created:")
        print(f"  - ID: {result['wallet'].id}")
        print(f"  - Name: {result['wallet'].name}")
        print(f"  - Network: {result['wallet'].network}")
        print(f"  - First Address: {result['first_address']}")
        
        if result.get('mnemonic'):
            print(f"  - Mnemonic: {result['mnemonic'][:20]}...")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_wallet_creation())
