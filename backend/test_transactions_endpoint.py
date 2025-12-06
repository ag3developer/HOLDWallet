"""Test transactions endpoint"""
import requests
import json

# Login
login_response = requests.post("http://localhost:8000/auth/login", json={
    "email": "app@holdwallet.com",
    "password": "12345678"
})

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get wallet ID
wallets_response = requests.get("http://localhost:8000/wallets", headers=headers)
wallets = wallets_response.json() if isinstance(wallets_response.json(), list) else wallets_response.json().get("data", [])

if wallets:
    wallet_id = wallets[0].get('id')
    print(f"✅ Testing transactions for wallet: {wallet_id}")
    
    # Get transactions
    tx_response = requests.get(
        f"http://localhost:8000/wallets/{wallet_id}/transactions?network=polygon&limit=10",
        headers=headers
    )
    
    print(f"\n📊 Transactions Response (Status {tx_response.status_code}):")
    print(json.dumps(tx_response.json(), indent=2, default=str))
else:
    print("❌ No wallets found")
