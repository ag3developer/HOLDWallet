#!/usr/bin/env python3
"""
🧪 Complete P2P Trading Flow Test with Real Balance
====================================================

Este script testa o fluxo completo:
1. Cria depósitos para 2 usuários
2. Cria uma ordem de venda
3. Inicia um trade
4. Completa o trade
5. Verifica saldos finais

Run: python test_complete_p2p_flow.py
"""

import sys
import os
import sqlite3
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database
DB_PATH = "/Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db"
engine = create_engine(f"sqlite:///{DB_PATH}")
SessionLocal = sessionmaker(bind=engine)

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_subsection(title):
    print(f"\n{title}")
    print("-" * 80)

def get_balance(user_id, cryptocurrency="USDT"):
    """Get user balance from database"""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT available_balance, locked_balance, total_balance 
            FROM wallet_balances 
            WHERE user_id = :user_id AND cryptocurrency = :crypto
        """), {"user_id": user_id, "crypto": cryptocurrency}).fetchone()
        
        if result:
            return {
                "available": float(result[0]),
                "locked": float(result[1]),
                "total": float(result[2])
            }
        return {"available": 0, "locked": 0, "total": 0}
    finally:
        db.close()

def print_balance(user_id, crypto="USDT"):
    """Print user balance"""
    bal = get_balance(user_id, crypto)
    print(f"  💰 User {user_id} - {crypto}:")
    print(f"     Available: {bal['available']:.2f}")
    print(f"     Locked:    {bal['locked']:.2f}")
    print(f"     Total:     {bal['total']:.2f}")
    return bal

def run_test():
    """Run complete P2P test"""
    db = SessionLocal()
    
    try:
        print_section("🧪 COMPLETE P2P TRADING FLOW TEST")
        
        # ============================================
        # STEP 1: Clear existing data
        # ============================================
        print_subsection("STEP 1: Clearing existing data")
        
        db.execute(text("DELETE FROM p2p_trades"))
        db.execute(text("DELETE FROM p2p_orders"))
        db.execute(text("DELETE FROM wallet_balances"))
        db.execute(text("DELETE FROM balance_history"))
        db.commit()
        print("✅ Tables cleared")
        
        # ============================================
        # STEP 2: Create initial deposits
        # ============================================
        print_subsection("STEP 2: Creating initial deposits")
        
        # User 1 (Seller): Deposit 100 USDT
        print("\n📥 User 1 deposits 100 USDT...")
        db.execute(text("""
            INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
            VALUES (lower(hex(randomblob(8))), 1, 'USDT', 100.0, 0, 100.0, 'Initial deposit')
        """))
        db.commit()
        print_balance(1, "USDT")
        
        # User 2 (Buyer): Deposit 1000 BRL
        print("\n📥 User 2 deposits 1000 BRL...")
        db.execute(text("""
            INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
            VALUES (lower(hex(randomblob(8))), 2, 'BRL', 1000.0, 0, 1000.0, 'Initial deposit')
        """))
        db.commit()
        print_balance(2, "BRL")
        
        # ============================================
        # STEP 3: Create payment method (skipped for now)
        # ============================================
        print_subsection("STEP 3: Skipping payment method creation")
        print("✅ Using NULL payment_method_id for this test")
        payment_method_id = None
        
        # ============================================
        # STEP 4: Create SELL order (User 1 selling USDT for BRL)
        # ============================================
        print_subsection("STEP 4: Creating SELL order")
        
        print("\n📋 User 1 creates a SELL order:")
        print("   - Selling: 100 USDT")
        print("   - Price: 5 BRL per USDT")
        print("   - Total value: 500 BRL")
        
        db.execute(text("""
            INSERT INTO p2p_orders (
                id, user_id, order_type, cryptocurrency, fiat_currency,
                price, total_amount, available_amount, min_order_limit, max_order_limit,
                payment_methods, status, created_at, updated_at
            ) VALUES (
                1, 1, 'sell', 'USDT', 'BRL',
                5.0, 100.0, 100.0, 50.0, 500.0,
                '[1]', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """))
        db.commit()
        print("✅ Order created (ID: 1)")
        
        # ============================================
        # STEP 5: Start trade (User 2 buys 100 USDT)
        # ============================================
        print_subsection("STEP 5: Starting trade")
        
        print("\n🤝 User 2 initiates purchase of 100 USDT")
        print("   - Amount: 100 USDT")
        print("   - Price per unit: 5 BRL")
        print("   - Total BRL needed: 500 BRL")
        
        # Check User 2 balance before
        print("\n✓ Validating User 2 balance:")
        bal_before = print_balance(2, "BRL")
        
        # Create the trade
        from datetime import datetime, timedelta
        expires_at = (datetime.now() + timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S")
        
        db.execute(text("""
            INSERT INTO p2p_trades (
                id, order_id, buyer_id, seller_id, cryptocurrency, fiat_currency,
                amount, price, total_fiat, payment_method_id, expires_at,
                status, created_at, updated_at
            ) VALUES (
                1, 1, 2, 1, 'USDT', 'BRL',
                100.0, 5.0, 500.0, :pm_id, :expires_at,
                'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """), {"expires_at": expires_at, "pm_id": payment_method_id})
        db.commit()
        print("\n✅ Trade created (ID: 1)")
        
        # Freeze balances
        print("\n❄️  Freezing balances...")
        
        # Freeze USDT for seller (User 1)
        db.execute(text("""
            UPDATE wallet_balances
            SET locked_balance = locked_balance + 100.0,
                available_balance = available_balance - 100.0
            WHERE user_id = 1 AND cryptocurrency = 'USDT'
        """))
        
        # Freeze BRL for buyer (User 2)
        db.execute(text("""
            UPDATE wallet_balances
            SET locked_balance = locked_balance + 500.0,
                available_balance = available_balance - 500.0
            WHERE user_id = 2 AND cryptocurrency = 'BRL'
        """))
        db.commit()
        
        print("\n✓ User 1 (Seller) after freeze:")
        print_balance(1, "USDT")
        
        print("\n✓ User 2 (Buyer) after freeze:")
        print_balance(2, "BRL")
        
        # ============================================
        # STEP 6: Complete trade
        # ============================================
        print_subsection("STEP 6: Completing trade")
        
        print("\n✅ Trade completion initiated...")
        
        # Get trade and order details
        trade = db.execute(text("SELECT * FROM p2p_trades WHERE id = 1")).fetchone()
        order = db.execute(text("SELECT * FROM p2p_orders WHERE id = 1")).fetchone()
        
        # SELL ORDER logic
        if order.order_type == 'sell':
            print("\n📌 This is a SELL order, so:")
            print("   - Seller receives BRL")
            print("   - Buyer receives USDT")
            
            # Seller receives BRL
            seller_brl = db.execute(text(
                "SELECT * FROM wallet_balances WHERE user_id = 1 AND cryptocurrency = 'BRL'"
            )).fetchone()
            
            if seller_brl:
                db.execute(text("""
                    UPDATE wallet_balances
                    SET available_balance = available_balance + 500.0,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = 1 AND cryptocurrency = 'BRL'
                """))
            else:
                db.execute(text("""
                    INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                    VALUES (lower(hex(randomblob(8))), 1, 'BRL', 500.0, 0, 500.0, 'Trade completed - received payment')
                """))
            
            # Buyer receives USDT
            buyer_usdt = db.execute(text(
                "SELECT * FROM wallet_balances WHERE user_id = 2 AND cryptocurrency = 'USDT'"
            )).fetchone()
            
            if buyer_usdt:
                db.execute(text("""
                    UPDATE wallet_balances
                    SET available_balance = available_balance + 100.0,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = 2 AND cryptocurrency = 'USDT'
                """))
            else:
                db.execute(text("""
                    INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                    VALUES (lower(hex(randomblob(8))), 2, 'USDT', 100.0, 0, 100.0, 'Trade completed - received crypto')
                """))
            
            # Release locked balances
            db.execute(text("""
                UPDATE wallet_balances
                SET locked_balance = locked_balance - 100.0
                WHERE user_id = 1 AND cryptocurrency = 'USDT'
            """))
            
            db.execute(text("""
                UPDATE wallet_balances
                SET locked_balance = locked_balance - 500.0
                WHERE user_id = 2 AND cryptocurrency = 'BRL'
            """))
        
        # Mark trade as completed
        db.execute(text("""
            UPDATE p2p_trades
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        """))
        
        db.commit()
        print("✅ Trade completed!")
        
        # ============================================
        # STEP 7: Display final balances
        # ============================================
        print_subsection("STEP 7: Final balances")
        
        print("\n🎯 USER 1 (Seller):")
        print_balance(1, "USDT")
        print_balance(1, "BRL")
        
        print("\n🎯 USER 2 (Buyer):")
        print_balance(2, "USDT")
        print_balance(2, "BRL")
        
        # ============================================
        # STEP 8: Verification
        # ============================================
        print_subsection("STEP 8: Trade verification")
        
        user1_usdt = get_balance(1, "USDT")
        user1_brl = get_balance(1, "BRL")
        user2_usdt = get_balance(2, "USDT")
        user2_brl = get_balance(2, "BRL")
        
        checks = [
            ("User 1 USDT available = 0", user1_usdt["available"] == 0),
            ("User 1 USDT locked = 0", user1_usdt["locked"] == 0),
            ("User 1 BRL available = 500", user1_brl["available"] == 500),
            ("User 2 USDT available = 100", user2_usdt["available"] == 100),
            ("User 2 BRL available = 500", user2_brl["available"] == 500),
            ("User 2 BRL locked = 0", user2_brl["locked"] == 0),
        ]
        
        print("\n✓ Verification Results:")
        all_passed = True
        for check_name, result in checks:
            status = "✅" if result else "❌"
            print(f"  {status} {check_name}")
            if not result:
                all_passed = False
        
        print_section("🎉 TEST COMPLETE" if all_passed else "⚠️  SOME CHECKS FAILED")
        
        if all_passed:
            print("✅ All balance transfers completed correctly!")
        else:
            print("❌ Some balances are incorrect. Check the logic.")
        
        return all_passed
        
    except Exception as e:
        print(f"\n❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
