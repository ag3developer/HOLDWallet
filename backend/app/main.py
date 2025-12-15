from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
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

# Routers
from app.routers import auth, users, wallet, wallets, tx, prices, prices_batch, prices_batch_v2, health, blockchain, transactions, billing, portfolio, exchange, p2p, chat_enterprise, reputation, dashboard, two_factor, tokens, wallet_transactions, instant_trade, trader_profiles
from app.api.v1.endpoints import seed_verification

# Setup logging
setup_logging()
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("🚀 Starting Wolknow Backend API...")
    
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
# In production, Digital Ocean reverse proxy rewrites /v1/* to /api/v1/*
# The middleware handles path rewriting internally
# Do NOT set root_path - it causes issues with OpenAPI spec generation
app = FastAPI(
    title="Wolknow API",
    description="Peer-to-Peer Trading Platform - P2P Exchange",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para reescrever /v1/* para /api/v1/*
class PathRewriteMiddleware(BaseHTTPMiddleware):
    """Reescreve /v1/* para /api/v1/* para compatibilidade com frontend"""
    async def dispatch(self, request: StarletteRequest, call_next):
        if request.url.path.startswith("/v1/"):
            # Reescrever /v1/... para /api/v1/...
            request.scope["path"] = "/api" + request.url.path
        return await call_next(request)

app.add_middleware(PathRewriteMiddleware)

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
app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(two_factor.router, prefix="/api/v1", tags=["two-factor"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
app.include_router(wallet.router, prefix="/api/v1/wallet", tags=["wallets"]) 
app.include_router(wallets.router, prefix="/api/v1/wallets", tags=["hd-wallets"])
app.include_router(seed_verification.router, prefix="/api/v1/wallets", tags=["seed-verification"])
app.include_router(wallet_transactions.router, prefix="/api/v1", tags=["wallet-transactions"])
app.include_router(blockchain.router, prefix="/api/v1/blockchain", tags=["blockchain"])
app.include_router(transactions.router, prefix="/api/v1", tags=["transactions"])
app.include_router(tx.router, prefix="/api/v1/tx", tags=["transactions"])
app.include_router(prices.router, prefix="/api/v1/prices", tags=["prices"])
app.include_router(prices_batch_v2.router, prefix="/api/v1/prices", tags=["prices-batch"])
app.include_router(tokens.router, prefix="/api/v1", tags=["tokens"])

# New monetization routers
app.include_router(billing.router, prefix="/api/v1", tags=["billing"])
app.include_router(portfolio.router, prefix="/api/v1", tags=["portfolio"])
app.include_router(exchange.router, prefix="/api/v1", tags=["exchange"])
app.include_router(instant_trade.router, prefix="/api/v1", tags=["instant-trade"])
app.include_router(trader_profiles.router, prefix="/api/v1", tags=["trader-profiles"])
app.include_router(p2p.router, prefix="/api/v1/p2p", tags=["p2p"])
app.include_router(chat_enterprise.router, prefix="/api/v1", tags=["chat"])
app.include_router(reputation.router, prefix="/api/v1", tags=["reputation"])

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

# Also add a route for /v1 in production since root_path doesn't auto-redirect
@app.get("/v1")
async def root_v1():
    """Root endpoint for /v1 path in production."""
    return {
        "message": "Wolknow API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc"
    }

# Redirect /api/v1/openapi.json to /openapi.json for Swagger UI compatibility
@app.get("/api/v1/openapi.json", include_in_schema=False)
async def redirect_openapi():
    """Redirect to openapi.json for Swagger UI compatibility."""
    return RedirectResponse(url="/openapi.json")

# Serve openapi.json at /v1/openapi.json for Swagger UI in production
@app.get("/v1/openapi.json", include_in_schema=False)
async def v1_openapi():
    """Serve OpenAPI spec at /v1/openapi.json for Swagger UI in production."""
    from fastapi.openapi.utils import get_openapi
    if not app.openapi_schema:
        app.openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
    return app.openapi_schema

# Redirect /v1/docs to /docs
@app.get("/v1/docs", include_in_schema=False)
async def v1_docs():
    """Redirect to /docs for Swagger UI."""
    return RedirectResponse(url="/docs")

@app.get("/v1/redoc", include_in_schema=False)
async def v1_redoc():
    """Redirect to /redoc for ReDoc."""
    return RedirectResponse(url="/redoc")

# Main execution
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
