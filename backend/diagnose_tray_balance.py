"""
Script de diagnóstico para verificar saldo do token TRAY na carteira
"""
import asyncio
import json
import os
import sys
from decimal import Decimal
from web3 import Web3

# Configurações do TRAY
TRAY_CONTRACT = "0x6b62514E925099643abA13B322A62ff6298f8E8A"
POLYGON_RPC = "https://polygon-rpc.com"
TRAY_DECIMALS = 18

# ERC20 ABI mínimo para balanceOf
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]

def get_tray_balance(address: str) -> dict:
    """Consulta saldo TRAY diretamente via RPC"""
    try:
        if not address or not address.startswith("0x"):
            return {"error": "Endereço inválido", "address": address}
        
        w3 = Web3(Web3.HTTPProvider(POLYGON_RPC))
        
        if not w3.is_connected():
            return {"error": "Não foi possível conectar ao RPC Polygon"}
        
        checksum_address = w3.to_checksum_address(address)
        
        contract = w3.eth.contract(
            address=w3.to_checksum_address(TRAY_CONTRACT),
            abi=ERC20_ABI
        )
        
        balance_raw = contract.functions.balanceOf(checksum_address).call()
        balance = Decimal(balance_raw) / Decimal(10 ** TRAY_DECIMALS)
        
        return {
            "success": True,
            "address": checksum_address,
            "contract": TRAY_CONTRACT,
            "balance_raw": balance_raw,
            "balance": float(balance),
            "decimals": TRAY_DECIMALS,
            "network": "polygon",
            "rpc": POLYGON_RPC
        }
        
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}


async def get_user_polygon_address():
    """Busca o endereço Polygon do usuário do banco de dados"""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app.core.db import get_async_session
        from app.models.user import User
        from app.models.address import Address
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        
        async for session in get_async_session():
            user_email = "contato@josecarlosmartins.com"
            
            result = await session.execute(
                select(User)
                .where(User.email == user_email)
                .options(selectinload(User.wallets))
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return None, f"Usuário {user_email} não encontrado"
            
            print(f"\n👤 Usuário: {user.email}")
            print(f"   ID: {user.id}")
            
            wallets = user.wallets
            print(f"\n📂 Wallets encontradas: {len(wallets)}")
            
            polygon_address = None
            for wallet in wallets:
                print(f"\n   Wallet: {wallet.name}")
                print(f"   Network: {wallet.network}")
                print(f"   ID: {wallet.id}")
                
                addr_result = await session.execute(
                    select(Address)
                    .where(Address.wallet_id == wallet.id)
                )
                addresses = addr_result.scalars().all()
                
                for addr in addresses:
                    print(f"      Address ({addr.network}): {addr.address}")
                    if addr.network in ['polygon', 'ethereum', 'evm']:
                        polygon_address = addr.address
            
            return polygon_address, None
            
    except Exception as e:
        import traceback
        return None, f"Erro ao buscar endereço: {str(e)}\n{traceback.format_exc()}"


async def main():
    print("=" * 60)
    print("DIAGNÓSTICO DE SALDO TRAY")
    print("=" * 60)
    
    polygon_address, error = await get_user_polygon_address()
    
    if error:
        print(f"\nErro ao buscar endereço do banco: {error}")
        polygon_address = input("\nDigite um endereço Polygon para testar: ").strip()
    
    if not polygon_address:
        print("Nenhum endereço Polygon encontrado")
        return
    
    print(f"\nEndereço Polygon: {polygon_address}")
    print("\nConsultando saldo TRAY na blockchain...")
    
    result = get_tray_balance(polygon_address)
    
    print("\n" + "=" * 60)
    print("RESULTADO")
    print("=" * 60)
    print(json.dumps(result, indent=2, default=str))
    
    if result.get("success"):
        balance = result.get("balance", 0)
        if balance > 0:
            print(f"\nSALDO TRAY ENCONTRADO: {balance:.8f} TRAY")
        else:
            print("\nSaldo TRAY é ZERO")
    else:
        print(f"\nErro: {result.get('error')}")


if __name__ == "__main__":
    asyncio.run(main())
