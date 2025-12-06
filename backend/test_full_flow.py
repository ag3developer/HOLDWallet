"""Quick test to get token and fetch balances"""
import requests
import json

# Login
login_response = requests.post("http://localhost:8000/auth/login", json={
    "email": "app@holdwallet.com",
    "password": "12345678"
})

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"✅ Token: {token[:30]}...")
    
    # Get wallets
    headers = {"Authorization": f"Bearer {token}"}
    wallets_response = requests.get("http://localhost:8000/wallets", headers=headers)
    
    if wallets_response.status_code == 200:
        response_json = wallets_response.json()
        # API pode retornar direto uma lista ou {"data": [...]}
        wallets = response_json if isinstance(response_json, list) else response_json.get("data", [])
        print(f"\n✅ Found {len(wallets)} wallet(s)")
        
        for wallet in wallets:
            print(f"\n{'='*60}")
            print(f"Wallet: {wallet.get('name', 'N/A')} ({wallet.get('id', 'N/A')})")
            print(f"Type: {wallet.get('type', 'N/A')}")
            
            # Get balances
            balances_response = requests.get(
                f"http://localhost:8000/wallets/{wallet['id']}/balances",
                headers=headers
            )
            
            if balances_response.status_code == 200:
                data = balances_response.json()
                print(f"\n📊 Balances:")
                print(json.dumps(data, indent=2))
            else:
                print(f"❌ Error fetching balances: {balances_response.status_code}")
                print(balances_response.json())
    else:
        print(f"❌ Error fetching wallets: {wallets_response.status_code}")
        print(wallets_response.json())
else:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.json())
