from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Basic settings
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # JWT Settings (aliases para compatibilidade)
    JWT_ALGORITHM: Optional[str] = None
    JWT_EXPIRATION_HOURS: Optional[int] = None
    
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
    BASE_RPC_URL: str = "https://mainnet.base.org"
    
    # Platform Wallet (para enviar crypto aos usuários)
    PLATFORM_WALLET_PRIVATE_KEY: Optional[str] = None
    PLATFORM_WALLET_ADDRESS: Optional[str] = None  # Endereço da carteira da plataforma (destino de vendas)
    
    # System Blockchain Wallet (para receber taxas e comissões)
    SYSTEM_BLOCKCHAIN_WALLET_ID: str = "545473df-0dd4-4bfa-a43f-06721a43af63"
    
    # Bitcoin APIs
    BTC_API_URL: str = "https://blockstream.info/api"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "info"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:5173",
        "https://wolknow.com",
        "https://www.wolknow.com",
        "https://api.wolknow.com",
        "https://hold-wallet-deaj.vercel.app",
        "https://hold-wallet-deaj-70tg82tju-ag-3-developer.vercel.app"
    ]
    ALLOWED_ORIGINS: Optional[str] = None  # String com vírgulas, será convertido para lista
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # API Root Path (para deploy com prefixo /v1)
    ROOT_PATH: str = ""
    
    # Security
    BCRYPT_ROUNDS: int = 12
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Cache settings
    CACHE_TTL_PRICES: int = 60  # 1 minute
    CACHE_TTL_BALANCE: int = 30  # 30 seconds
    
    # WebAuthn/Biometria Configuration
    WEBAUTHN_RP_ID: str = "localhost"
    WEBAUTHN_RP_NAME: str = "WolkNow"
    WEBAUTHN_ORIGIN: str = "http://localhost:3000"
    
    class Config:
        # Carregar .env.production se existir, senão .env
        env_file = ".env.production" if os.path.exists(".env.production") else ".env"
        case_sensitive = True
        extra = "allow"  # Permitir campos extras do .env

settings = Settings()
