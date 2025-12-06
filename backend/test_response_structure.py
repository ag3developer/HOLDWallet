"""Test exact API response structure"""
import requests
import json

# Login
login_response = requests.post("http://localhost:8000/auth/login", json={
    "email": "app@holdwallet.com",
    "password": "12345678"
})

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get exact response structure
response = requests.get(
    "http://localhost:8000/wallets/cdfd5281-483a-4f4b-ad70-290d65d2216d/balances",
    headers=headers
)

print("📦 RAW RESPONSE:")
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"\n📄 JSON BODY:")
print(json.dumps(response.json(), indent=2))

# Test what frontend would extract
data = response.json()
print(f"\n🔍 FRONTEND EXTRACTION TEST:")
print(f"Has 'data' key: {'data' in data}")
print(f"Has 'error' key: {'error' in data}")
print(f"Has 'balances' key: {'balances' in data}")

if 'data' in data:
    print(f"data.data: {data.get('data')}")
    if data.get('data') and 'balances' in data['data']:
        print(f"data.data.balances: {data['data']['balances']}")
elif 'balances' in data:
    print(f"Direct balances: {data['balances']}")
