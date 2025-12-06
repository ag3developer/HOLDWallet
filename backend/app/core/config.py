from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "sqlite:///./holdwallet.db"
    
    # Encryption (HD Wallet Security)
    ENCRYPTION_KEY: str = "XFTBN_LoZLTcGlhj0MBKZl9uHkUvg4Xd2F6u4RfbBJU="
    
    # API Keys
    COINGECKO_API_KEY: Optional[str] = None
    POLYGONSCAN_API_KEY: Optional[str] = None
    ETHERSCAN_API_KEY: Optional[str] = None
    BSCSCAN_API_KEY: Optional[str] = None
    
    # RPC URLs
    POLYGON_RPC_URL: str = "https://polygon-rpc.com"
    ETHEREUM_RPC_URL: str = "https://eth-mainnet.alchemyapi.io/v2/your-key"
    BSC_RPC_URL: str = "https://bsc-dataseed.binance.org"
    
    # Bitcoin APIs
    BTC_API_URL: str = "https://blockstream.info/api"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    
    # Security
    BCRYPT_ROUNDS: int = 12
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Cache settings
    CACHE_TTL_PRICES: int = 60  # 1 minute
    CACHE_TTL_BALANCE: int = 30  # 30 seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
