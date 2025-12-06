import logging
import sys
from pathlib import Path
from app.core.config import settings

def setup_logging():
    """Configure logging for the application."""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO if not settings.DEBUG else logging.DEBUG,
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
        handlers=[
            # Console handler
            logging.StreamHandler(sys.stdout),
            # File handler
            logging.FileHandler(log_dir / "app.log", encoding="utf-8")
        ]
    )
    
    # Configure specific loggers
    loggers = {
        "uvicorn": logging.WARNING,
        "sqlalchemy.engine": logging.WARNING if not settings.DEBUG else logging.INFO,
        "httpx": logging.WARNING,
        "app": logging.INFO if not settings.DEBUG else logging.DEBUG,
    }
    
    for logger_name, level in loggers.items():
        logging.getLogger(logger_name).setLevel(level)
    
    # Create app logger
    logger = logging.getLogger("app")
    logger.info(f"Logging configured - Level: {'DEBUG' if settings.DEBUG else 'INFO'}")
    
    return logger

def get_logger(name: str = None) -> logging.Logger:
    """Get a logger instance."""
    if name:
        return logging.getLogger(f"app.{name}")
    return logging.getLogger("app")
