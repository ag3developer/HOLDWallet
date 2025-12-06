from fastapi import APIRouter
from app.api.v1.endpoints import wallets, prices, blockchain, transactions

api_router = APIRouter()

api_router.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
api_router.include_router(prices.router, prefix="/prices", tags=["prices"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
