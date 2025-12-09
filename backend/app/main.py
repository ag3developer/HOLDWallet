from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

# Core imports
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.db import create_tables, init_db
from app.core.exceptions import BaseCustomException
from app.services.cache_service import cache_service
from app.services.cache_service import cache_service

# Routers
from app.routers import auth, users, wallet, wallets, tx, prices, prices_batch, prices_batch_v2, health, blockchain, transactions, billing, portfolio, exchange, p2p, chat_enterprise, reputation, dashboard, two_factor, tokens, wallet_transactions, instant_trade
from app.api.v1.endpoints import seed_verification

# Setup logging
setup_logging()
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Starting HOLD Wallet Backend API...")
    
    try:
        # Initialize database
        if init_db():
            logger.info("✅ Database connection established")
            await create_tables()
            logger.info("✅ Database tables verified")
        else:
            logger.error("❌ Database connection failed")
            raise Exception("Database initialization failed")
        
        # Initialize cache service
        await cache_service.connect()
        
        logger.info("🎉 HOLD Wallet Backend started successfully")
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    finally:
        # Shutdown
        logger.info("👋 Shutting down HOLD Wallet Backend...")
        await cache_service.disconnect()

# Create FastAPI app
app = FastAPI(
    title="HOLD Wallet API",
    description="Non-custodial multi-chain digital wallet API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(BaseCustomException)
async def custom_exception_handler(request: Request, exc: BaseCustomException):
    """Handle custom exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "type": exc.__class__.__name__
        },
        headers=exc.headers
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "type": "HTTPException"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": str(exc),
                "type": type(exc).__name__
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "Internal server error",
                "type": "ServerError"
            }
        )

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(two_factor.router)
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
app.include_router(wallet.router, prefix="/wallet", tags=["wallets"]) 
app.include_router(wallets.router, prefix="/wallets", tags=["hd-wallets"])
app.include_router(seed_verification.router, prefix="/api/v1/wallets", tags=["seed-verification"])
app.include_router(wallet_transactions.router, prefix="/api/v1", tags=["wallet-transactions"])
app.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
app.include_router(transactions.router, prefix="/api/v1", tags=["transactions"])
app.include_router(tx.router, prefix="/tx", tags=["transactions"])
app.include_router(prices.router, prefix="/prices", tags=["prices"])
app.include_router(prices_batch_v2.router, prefix="/api/v1/prices", tags=["prices-batch"])
app.include_router(tokens.router, prefix="/api/v1", tags=["tokens"])

# New monetization routers
app.include_router(billing.router, prefix="/api/v1", tags=["billing"])
app.include_router(portfolio.router, prefix="/api/v1", tags=["portfolio"])
app.include_router(exchange.router, prefix="/api/v1", tags=["exchange"])
app.include_router(instant_trade.router, prefix="/api/v1", tags=["instant-trade"])
app.include_router(p2p.router, prefix="/p2p", tags=["p2p"])  # Changed to /p2p to match frontend
app.include_router(chat_enterprise.router, prefix="/api/v1", tags=["chat"])
app.include_router(reputation.router, tags=["reputation"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "HOLD Wallet API",
        "version": "0.1.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else "disabled"
    }

# Main execution
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
