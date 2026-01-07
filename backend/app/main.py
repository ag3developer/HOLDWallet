from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from contextlib import asynccontextmanager
import uvicorn
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

# Core imports
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.db import create_tables, init_db
from app.core.exceptions import BaseCustomException
from app.services.cache_service import cache_service
from app.services.cache_service import cache_service
from app.services.platform_settings_service import platform_settings_service

# Security middleware
from app.middleware.security import SecurityMiddleware, RateLimitMiddleware

# Routers
from app.routers import auth, users, wallet, wallets, tx, prices, prices_batch, prices_batch_v2, health, blockchain, transactions, billing, portfolio, exchange, p2p, chat, chat_enterprise, reputation, dashboard, two_factor, tokens, wallet_transactions, instant_trade, trader_profiles, admin_instant_trades, webauthn, public_settings
from app.routers.admin import admin_router
from app.api.v1.endpoints import seed_verification

# Setup logging
setup_logging()
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Starting Wolknow Backend API...")
    
    db_connected = False
    try:
        # Initialize database (non-blocking for health checks)
        try:
            if init_db():
                logger.info("✅ Database connection established")
                await create_tables()
                logger.info("✅ Database tables verified")
                db_connected = True
                
                # Initialize platform settings defaults
                try:
                    from app.core.db import SessionLocal
                    db_session = SessionLocal()
                    try:
                        platform_settings_service.initialize_defaults(db_session)
                        logger.info("✅ Platform settings initialized")
                    finally:
                        db_session.close()
                except Exception as settings_error:
                    logger.warning(f"⚠️ Platform settings init failed: {settings_error}")
            else:
                logger.warning("⚠️ Database connection failed - app will start but some features may not work")
        except Exception as db_error:
            logger.warning(f"⚠️ Database initialization failed: {db_error} - app will start but some features may not work")
        
        # Store db status in app state
        app.state.db_connected = db_connected
        
        # Initialize cache service
        try:
            await cache_service.connect()
        except Exception as cache_error:
            logger.warning(f"⚠️ Cache service failed to connect: {cache_error}")
        
        logger.info("🎉 Wolknow Backend started successfully")
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    finally:
        # Shutdown
        logger.info("👋 Shutting down Wolknow Backend...")
        await cache_service.disconnect()

# Create FastAPI app
# Use root_path to handle reverse proxy prefix /v1
# This prevents 307 redirects that break CORS
import os
app = FastAPI(
    title="Wolknow API",
    description="Peer-to-Peer Trading Platform - P2P Exchange",
    version="1.0.0",
    lifespan=lifespan,
    root_path=os.getenv("ROOT_PATH", ""),  # Set to /v1 in production
    docs_url="/docs",       # Swagger UI em /v1/docs
    redoc_url="/redoc",     # ReDoc em /v1/redoc
    openapi_url="/openapi.json",  # OpenAPI spec em /v1/openapi.json
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware (IP blocking and rate limiting)
app.add_middleware(SecurityMiddleware)
app.add_middleware(RateLimitMiddleware)

# NÃO precisa mais de middleware de reescrita - rotas diretas agora!

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

# Include routers - SEM prefixos /api/v1
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(webauthn.router, prefix="", tags=["webauthn"])
app.include_router(two_factor.router, prefix="", tags=["two-factor"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(dashboard.router, prefix="", tags=["dashboard"])
app.include_router(wallet.router, prefix="/wallet", tags=["wallets"]) 
app.include_router(wallets.router, prefix="/wallets", tags=["hd-wallets"])
app.include_router(seed_verification.router, prefix="/wallets", tags=["seed-verification"])
app.include_router(wallet_transactions.router, prefix="", tags=["wallet-transactions"])
app.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
app.include_router(transactions.router, prefix="", tags=["transactions"])
app.include_router(tx.router, prefix="/tx", tags=["transactions"])
app.include_router(prices.router, prefix="/prices", tags=["prices"])
app.include_router(prices_batch_v2.router, prefix="/prices", tags=["prices-batch"])
app.include_router(tokens.router, prefix="", tags=["tokens"])

# New monetization routers - SEM prefixos /api/v1
app.include_router(billing.router, prefix="", tags=["billing"])
app.include_router(portfolio.router, prefix="", tags=["portfolio"])
app.include_router(exchange.router, prefix="", tags=["exchange"])
app.include_router(instant_trade.router, prefix="", tags=["instant-trade"])
app.include_router(admin_instant_trades.router, prefix="", tags=["admin"])
app.include_router(admin_router, tags=["admin-module"])  # Novo módulo admin completo
app.include_router(trader_profiles.router, prefix="", tags=["trader-profiles"])
app.include_router(p2p.router, prefix="/p2p", tags=["p2p"])
app.include_router(chat.router, prefix="", tags=["chat-p2p"])  # Router de chat P2P
app.include_router(chat_enterprise.router, prefix="", tags=["chat"])
app.include_router(reputation.router, prefix="", tags=["reputation"])
app.include_router(public_settings.router, prefix="/public", tags=["public-settings"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Wolknow API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc"
    }

# Serve openapi.json
@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_spec():
    """Serve OpenAPI spec"""
    from fastapi.openapi.utils import get_openapi
    if not app.openapi_schema:
        app.openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
    return app.openapi_schema

# Main execution
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
