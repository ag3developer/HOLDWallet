#!/usr/bin/env python3
"""
🧪 Test Script for Hybrid Wallet System
========================================

Tests both CUSTODIAL and NON-CUSTODIAL transaction modes.
"""

import requests
import json
from typing import Dict, Optional

# API Configuration
BASE_URL = "http://localhost:8000"

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    """Print colored header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text: str):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_json(data: Dict):
    """Print formatted JSON"""
    print(json.dumps(data, indent=2, ensure_ascii=False))

class HybridWalletTester:
    """Test class for hybrid wallet functionality"""
    
    def __init__(self):
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.wallet_id: Optional[str] = None
        self.wallet_address: Optional[str] = None
        self.network: str = "polygon"  # Using Polygon for lower fees
    
    def login(self, email: str = "test@holdwallet.com", password: str = "Test123!@#") -> bool:
        """Step 1: Login to get JWT token"""
        print_header("STEP 1: Authentication")
        
        try:
            print_info(f"Logging in as {email}...")
            
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                print_success(f"Login successful!")
                print_info(f"User ID: {self.user_id}")
                print_info(f"Token: {self.token[:20]}...")
                return True
            else:
                print_error(f"Login failed: {response.status_code}")
                print_json(response.json())
                return False
                
        except Exception as e:
            print_error(f"Login error: {e}")
            return False
    
    def get_wallets(self) -> bool:
        """Step 2: Get user's wallets"""
        print_header("STEP 2: Get Wallets")
        
        try:
            print_info("Fetching user wallets...")
            
            response = requests.get(
                f"{BASE_URL}/wallets",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            
            if response.status_code == 200:
                wallets = response.json()
                
                if wallets:
                    # Find a wallet on the test network
                    for wallet in wallets:
                        if wallet.get("network") == self.network:
                            self.wallet_id = str(wallet.get("id"))
                            self.wallet_address = wallet.get("first_address")
                            break
                    
                    if self.wallet_id:
                        print_success(f"Found {len(wallets)} wallet(s)")
                        print_info(f"Using Wallet ID: {self.wallet_id}")
                        print_info(f"Address: {self.wallet_address}")
                        print_info(f"Network: {self.network}")
                        return True
                    else:
                        print_warning(f"No {self.network} wallet found. Please create one first.")
                        return False
                else:
                    print_warning("No wallets found. Please create a wallet first.")
                    return False
            else:
                print_error(f"Failed to get wallets: {response.status_code}")
                print_json(response.json())
                return False
                
        except Exception as e:
            print_error(f"Error getting wallets: {e}")
            return False
    
    def test_validate_address(self, test_address: str) -> bool:
        """Step 3: Test address validation"""
        print_header("STEP 3: Validate Address")
        
        try:
            print_info(f"Validating address: {test_address}")
            
            response = requests.post(
                f"{BASE_URL}/wallets/validate-address",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "address": test_address,
                    "network": self.network
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("valid"):
                    print_success("Address is valid! ✓")
                else:
                    print_warning("Address is invalid! ✗")
                
                print_json(result)
                return result.get("valid", False)
            else:
                print_error(f"Validation failed: {response.status_code}")
                print_json(response.json())
                return False
                
        except Exception as e:
            print_error(f"Error validating address: {e}")
            return False
    
    def test_estimate_fee(self, to_address: str, amount: str) -> Optional[Dict]:
        """Step 4: Test fee estimation"""
        print_header("STEP 4: Estimate Transaction Fees")
        
        try:
            print_info(f"Estimating fees for {amount} {self.network.upper()}...")
            
            response = requests.post(
                f"{BASE_URL}/wallets/estimate-fee",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "wallet_id": self.wallet_id,
                    "to_address": to_address,
                    "amount": amount,
                    "network": self.network
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                fee_estimates = result.get("fee_estimates", {})
                
                print_success("Fee estimation successful!")
                print_info(f"🐌 Slow:     {fee_estimates.get('slow_fee')} {result.get('currency')} - 10-30 min")
                print_info(f"⚡ Standard: {fee_estimates.get('standard_fee')} {result.get('currency')} - 2-10 min")
                print_info(f"🚀 Fast:     {fee_estimates.get('fast_fee')} {result.get('currency')} - <2 min")
                
                return result
            else:
                print_error(f"Fee estimation failed: {response.status_code}")
                print_json(response.json())
                return None
                
        except Exception as e:
            print_error(f"Error estimating fee: {e}")
            return None
    
    def test_custodial_send(self, to_address: str, amount: str, fee_level: str = "standard") -> Optional[Dict]:
        """Step 5A: Test CUSTODIAL transaction (backend signs)"""
        print_header("STEP 5A: CUSTODIAL Transaction (Backend Signs)")
        
        print_warning("⚠️  This will create a REAL transaction!")
        print_warning("⚠️  Make sure you have test funds!")
        
        user_confirm = input(f"\n{Colors.BOLD}Continue with CUSTODIAL send? (yes/no): {Colors.ENDC}").lower()
        
        if user_confirm != 'yes':
            print_info("Custodial test skipped by user.")
            return None
        
        try:
            print_info(f"Sending {amount} {self.network.upper()} (CUSTODIAL MODE)...")
            
            response = requests.post(
                f"{BASE_URL}/wallets/send",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "wallet_id": self.wallet_id,
                    "to_address": to_address,
                    "amount": amount,
                    "network": self.network,
                    "fee_level": fee_level,
                    "mode": "custodial",  # ← CUSTODIAL MODE
                    "note": "Test transaction from hybrid wallet system"
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                print_success("🎉 CUSTODIAL Transaction Successful!")
                print_info(f"Mode: {result.get('mode')}")
                print_info(f"TX Hash: {result.get('tx_hash')}")
                print_info(f"Explorer: {result.get('explorer_url')}")
                print_info(f"Status: {result.get('status')}")
                print_info(f"Fee: {result.get('fee')} {self.network.upper()}")
                print_info(f"ETA: {result.get('estimated_confirmation_time')}")
                
                print(f"\n{Colors.OKGREEN}{Colors.BOLD}✅ Backend signed and broadcasted the transaction!{Colors.ENDC}\n")
                
                return result
            else:
                print_error(f"Transaction failed: {response.status_code}")
                print_json(response.json())
                return None
                
        except Exception as e:
            print_error(f"Error sending transaction: {e}")
            return None
    
    def test_non_custodial_send(self, to_address: str, amount: str, fee_level: str = "fast") -> Optional[Dict]:
        """Step 5B: Test NON-CUSTODIAL transaction (prepare for external signing)"""
        print_header("STEP 5B: NON-CUSTODIAL Transaction (External Signing)")
        
        try:
            print_info(f"Preparing transaction for external signing...")
            print_info(f"Amount: {amount} {self.network.upper()}")
            print_info(f"Fee Level: {fee_level}")
            
            response = requests.post(
                f"{BASE_URL}/wallets/send",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "wallet_id": self.wallet_id,
                    "to_address": to_address,
                    "amount": amount,
                    "network": self.network,
                    "fee_level": fee_level,
                    "mode": "non-custodial",  # ← NON-CUSTODIAL MODE
                    "note": "Test transaction - external signing"
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                print_success("🎉 Transaction Prepared for External Signing!")
                print_info(f"Mode: {result.get('mode')}")
                print_info(f"Message: {result.get('message')}")
                
                tx_data = result.get('transaction_data', {})
                print_info(f"\nTransaction Data for MetaMask/WalletConnect:")
                print_json(tx_data.get('transaction', {}))
                
                print_info(f"\nChain ID: {tx_data.get('chain_id')}")
                print_info(f"Estimated Gas: {tx_data.get('estimated_gas')}")
                print_info(f"Gas Price: {tx_data.get('gas_price_gwei')} Gwei")
                
                print(f"\n{Colors.OKCYAN}{Colors.BOLD}📱 Instructions:{Colors.ENDC}")
                for key, instruction in result.get('instructions', {}).items():
                    print(f"   • {key.title()}: {instruction}")
                
                print(f"\n{Colors.OKGREEN}{Colors.BOLD}✅ Transaction ready for external wallet signing!{Colors.ENDC}\n")
                
                return result
            else:
                print_error(f"Transaction preparation failed: {response.status_code}")
                print_json(response.json())
                return None
                
        except Exception as e:
            print_error(f"Error preparing transaction: {e}")
            return None
    
    def run_full_test(self):
        """Run complete test suite"""
        print(f"{Colors.BOLD}{Colors.HEADER}")
        print("╔════════════════════════════════════════════════════════════╗")
        print("║       🧪 HYBRID WALLET SYSTEM TEST SUITE 🧪               ║")
        print("║                                                            ║")
        print("║  Testing both CUSTODIAL and NON-CUSTODIAL modes          ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print(f"{Colors.ENDC}\n")
        
        # Test configuration
        test_recipient = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Replace with your test address
        test_amount = "0.001"  # Small amount for testing
        
        # Step 1: Login
        if not self.login():
            print_error("Authentication failed. Exiting.")
            return
        
        # Step 2: Get wallets
        if not self.get_wallets():
            print_error("No wallets available. Exiting.")
            return
        
        # Step 3: Validate address
        if not self.test_validate_address(test_recipient):
            print_error("Address validation failed. Exiting.")
            return
        
        # Step 4: Estimate fees
        if not self.test_estimate_fee(test_recipient, test_amount):
            print_error("Fee estimation failed. Exiting.")
            return
        
        # Step 5A: Test CUSTODIAL mode (optional - user confirms)
        custodial_result = self.test_custodial_send(test_recipient, test_amount, "standard")
        
        # Step 5B: Test NON-CUSTODIAL mode (always safe - doesn't broadcast)
        non_custodial_result = self.test_non_custodial_send(test_recipient, test_amount, "fast")
        
        # Summary
        print_header("TEST SUMMARY")
        
        if custodial_result:
            print_success("✅ CUSTODIAL MODE: Transaction broadcasted successfully")
            print_info(f"   TX Hash: {custodial_result.get('tx_hash')}")
        else:
            print_warning("⊘  CUSTODIAL MODE: Skipped or failed")
        
        if non_custodial_result:
            print_success("✅ NON-CUSTODIAL MODE: Transaction prepared successfully")
            print_info(f"   Ready for external signing with MetaMask/WalletConnect")
        else:
            print_error("❌ NON-CUSTODIAL MODE: Failed")
        
        print(f"\n{Colors.BOLD}{Colors.OKGREEN}{'='*60}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.OKGREEN}🎉 Test suite completed!{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.OKGREEN}{'='*60}{Colors.ENDC}\n")

if __name__ == "__main__":
    # Create tester instance
    tester = HybridWalletTester()
    
    # Run full test suite
    tester.run_full_test()
