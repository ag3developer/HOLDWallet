#!/usr/bin/env python3
"""
Test script to verify wallet balance calculations
"""
import requests
import json
from decimal import Decimal

# Configure your API endpoint and wallet ID
API_BASE = "http://localhost:8000/api/v1"
WALLET_ID = "2b95a1d3-e4b4-4047-8027-297b6a01c183"  # From the logs
TOKEN = ""  # Add your token here

def test_wallet_balances():
    """Test wallet balance calculation"""
    print("=" * 80)
    print("Testing Wallet Balance Calculation")
    print("=" * 80)
    
    # Get token from localStorage (you need to pass it or set it here)
    # For now, this is just a structural test
    
    endpoint = API_BASE + "/wallets/" + WALLET_ID + "/balances?include_tokens=true"
    
    print("\nEndpoint: " + endpoint)
    
    headers = {
        "Authorization": "Bearer " + TOKEN if TOKEN else None,
    }
    
    try:
        response = requests.get(endpoint, headers={k: v for k, v in headers.items() if v})
        print("Status Code: " + str(response.status_code))
        
        if response.status_code == 200:
            data = response.json()
            print("\nResponse received:")
            print(json.dumps(data, indent=2))
            
            # Verify calculation
            balances = data.get('balances', {})
            total_brl_api = Decimal(str(data.get('total_brl', '0')))
            
            print("\nBalance Verification:")
            print("Total BRL from API: R$ " + str(total_brl_api))
            
            # Calculate sum manually
            manual_total_brl = Decimal('0')
            for network, balance_detail in balances.items():
                balance_brl = Decimal(str(balance_detail.get('balance_brl', '0')))
                balance = balance_detail.get('balance', '0')
                print("  " + network + ": R$ " + str(balance_brl) + " (amount: " + str(balance) + ")")
                manual_total_brl += balance_brl
            
            print("\nManual calculation total: R$ " + str(manual_total_brl))
            print("API total: R$ " + str(total_brl_api))
            
            if manual_total_brl == total_brl_api:
                print("OK: Totals match!")
            else:
                print("ERROR: Totals DO NOT match! Difference: R$ " + str(abs(manual_total_brl - total_brl_api)))
        else:
            print("Error: " + response.text)
            
    except Exception as e:
        print("Exception: " + str(e))

if __name__ == "__main__":
    test_wallet_balances()
