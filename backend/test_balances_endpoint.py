"""Test balances endpoint with authentication"""
import requests
import json

# Your wallet ID
WALLET_ID = "cdfd5281-483a-4f4b-ad70-290d65d2216d"

# First, login to get a token
login_data = {
    "email": "app@holdwallet.com",
    "password": "12345678"
}

print("1. Logging in...")
login_response = requests.post("http://localhost:8000/auth/login", json=login_data)
print(f"Login status: {login_response.status_code}")

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"Token obtained: {token[:20]}...")
    
    # Now test the balances endpoint
    print(f"\n2. Testing balances endpoint for wallet {WALLET_ID}...")
    headers = {"Authorization": f"Bearer {token}"}
    balances_response = requests.get(
        f"http://localhost:8000/wallets/{WALLET_ID}/balances",
        headers=headers
    )
    
    print(f"Balances status: {balances_response.status_code}")
    print(f"Response:\n{json.dumps(balances_response.json(), indent=2)}")
else:
    print(f"Login failed: {login_response.json()}")
