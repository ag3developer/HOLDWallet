#!/usr/bin/env python3
"""Teste simples do WolkPay PIX BB"""
import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login
        print("1. Login...")
        r = await client.post(
            "http://localhost:8000/auth/login",
            json={"email": "contato@josecarlosmartins.com", "password": "Jcm15!@#"}
        )
        token = r.json()["access_token"]
        print(f"   OK - Token: {token[:40]}...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Criar fatura
        print("\n2. Criar fatura WolkPay...")
        r = await client.post(
            "http://localhost:8000/wolkpay/invoice",
            json={"crypto_currency": "USDT", "crypto_amount": 10, "crypto_network": "polygon", "fee_payer": "PAYER"},
            headers=headers
        )
        data = r.json()
        checkout_token = data["invoice"]["checkout_token"]
        print(f"   OK - Token: {checkout_token}")
        print(f"   Valor: R$ {data['invoice']['total_amount_brl']}")
        
        # 3. Salvar dados pagador
        print("\n3. Salvar dados do pagador...")
        r = await client.post(
            f"http://localhost:8000/wolkpay/checkout/{checkout_token}/payer",
            json={
                "person_type": "PF",
                "terms_version": "v1.0", 
                "terms_accepted": True,
                "pf_data": {
                    "full_name": "Jose Carlos Martins",
                    "cpf": "12345678909",
                    "birth_date": "1990-01-15",
                    "phone": "61999998888",
                    "email": "teste@email.com"
                },
                "address": {
                    "zip_code": "70000000",
                    "street": "Rua Teste",
                    "number": "123",
                    "complement": "",
                    "neighborhood": "Centro",
                    "city": "Brasilia",
                    "state": "DF"
                }
            }
        )
        if r.status_code == 200:
            print("   OK - Dados salvos!")
        else:
            print(f"   ERRO: {r.status_code} - {r.text}")
            return
        
        # 4. Gerar PIX
        print("\n4. Gerar PIX via Banco do Brasil...")
        r = await client.post(f"http://localhost:8000/wolkpay/checkout/{checkout_token}/pay")
        if r.status_code == 200:
            pix = r.json()
            print(f"   OK!")
            print(f"   TXID: {pix.get('pix_txid')}")
            print(f"   Automático: {pix.get('is_automatic')}")
            print(f"   Valor: R$ {pix.get('amount_brl')}")
            qrcode = pix.get('pix_qrcode', '')
            print(f"   PIX Copia e Cola: {qrcode[:100]}..." if len(qrcode) > 100 else f"   PIX: {qrcode}")
        else:
            print(f"   ERRO: {r.status_code} - {r.text}")

if __name__ == "__main__":
    asyncio.run(test())
