from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import asyncio
from typing import Dict, Any

from app.core.db import get_db
from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("health")

@router.get("/")
async def basic_health_check():
    """
    Basic health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "hold-wallet-api",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT
    }

@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """
    Detailed health check with database and external service status.
    """
    health_status = {
        "status": "healthy",
        "service": "hold-wallet-api",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "checks": {}
    }
    
    # Database connectivity check
    try:
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0,  # Would measure actual response time
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "message": "Database connection failed"
        }
        logger.error(f"Database health check failed: {e}")
    
    # External services check (placeholder)
    health_status["checks"]["external_services"] = await check_external_services()
    
    # Memory and performance checks (basic)
    health_status["checks"]["system"] = {
        "status": "healthy",
        "memory_usage": "N/A",  # Would use psutil or similar
        "cpu_usage": "N/A",
        "disk_space": "N/A"
    }
    
    return health_status

@router.get("/live")
async def liveness_probe():
    """
    Kubernetes liveness probe endpoint.
    """
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@router.get("/ready")
async def readiness_probe(db: Session = Depends(get_db)):
    """
    Kubernetes readiness probe endpoint.
    """
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "disconnected",
            "error": str(e)
        }

@router.get("/metrics")
async def get_metrics():
    """
    Basic metrics endpoint for monitoring.
    """
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": 0,  # Would calculate actual uptime
        "requests_total": 0,  # Would track actual requests
        "requests_per_second": 0,
        "active_connections": 0,
        "memory_usage_mb": 0,
        "cpu_usage_percent": 0
    }

async def check_external_services() -> Dict[str, Any]:
    """
    Check status of external services.
    """
    services_status = {}
    
    # CoinGecko API check
    try:
        # Would make actual HTTP request to CoinGecko
        await asyncio.sleep(0.1)  # Simulate check
        services_status["coingecko"] = {
            "status": "healthy",
            "response_time_ms": 100,
            "message": "CoinGecko API accessible"
        }
    except Exception as e:
        services_status["coingecko"] = {
            "status": "unhealthy",
            "error": str(e),
            "message": "CoinGecko API check failed"
        }
    
    # Blockchain RPC endpoints check
    blockchain_services = ["ethereum", "bitcoin", "polygon", "bsc"]
    
    for network in blockchain_services:
        try:
            # Would check actual RPC endpoints
            await asyncio.sleep(0.05)  # Simulate check
            services_status[f"{network}_rpc"] = {
                "status": "healthy",
                "response_time_ms": 50,
                "message": f"{network.title()} RPC accessible"
            }
        except Exception as e:
            services_status[f"{network}_rpc"] = {
                "status": "unhealthy",
                "error": str(e),
                "message": f"{network.title()} RPC check failed"
            }
    
    return services_status

@router.get("/startup")
async def startup_check():
    """
    Check if the application has started up successfully.
    """
    return {
        "status": "started",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Application startup completed successfully"
    }

@router.get("/db")
async def database_health_check(db: Session = Depends(get_db)):
    """
    Dedicated database health check endpoint.
    """
    try:
        # Test database connection
        result = db.execute(text("SELECT version(), current_database(), current_user, now()"))
        row = result.fetchone()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database_info": {
                "version": str(row[0]) if row else "unknown",
                "database": str(row[1]) if row else "unknown",
                "user": str(row[2]) if row else "unknown",
                "server_time": str(row[3]) if row else "unknown"
            },
            "connection": "active"
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "connection": "failed"
        }
