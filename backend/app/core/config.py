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
    POLYGON_RPC_URL: str = "https://polygon.drpc.org"
    ETHEREUM_RPC_URL: str = "https://eth-mainnet.alchemyapi.io/v2/your-key"
    BSC_RPC_URL: str = "https://bsc-dataseed.binance.org"
    BASE_RPC_URL: str = "https://mainnet.base.org"
    
    # Platform Wallet (para enviar crypto aos usuários)
    PLATFORM_WALLET_PRIVATE_KEY: Optional[str] = None
    PLATFORM_WALLET_ADDRESS: Optional[str] = None  # Endereço da carteira da plataforma (destino de vendas)
    
    # Platform BTC Wallet (para enviar Bitcoin)
    PLATFORM_BTC_ADDRESS: Optional[str] = None
    PLATFORM_BTC_PRIVATE_KEY_WIF: Optional[str] = None  # Private key em formato WIF
    
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
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
    
    # Push Notifications (VAPID)
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_EMAIL: str = "contato@wolknow.com"
    
    # ===== BANCO DO BRASIL API =====
    # Ambiente: "sandbox" ou "production"
    BB_ENVIRONMENT: str = "sandbox"
    # Credenciais OAuth 2.0 (obtidas em developers.bb.com.br)
    BB_CLIENT_ID: Optional[str] = None
    BB_CLIENT_SECRET: Optional[str] = None
    # App Key (identificador da aplicação no portal BB)
    BB_GW_DEV_APP_KEY: Optional[str] = None
    # Chave PIX da empresa (CNPJ da HOLD DIGITAL ASSETS)
    BB_PIX_KEY: str = "24275355000151"
    # URL do webhook para receber notificações de pagamento
    BB_WEBHOOK_URL: Optional[str] = None
    # Secret para validação de assinatura dos webhooks
    BB_WEBHOOK_SECRET: Optional[str] = None
    # Certificado mTLS (obrigatório para produção)
    BB_CERT_PATH: Optional[str] = None  # Caminho para o certificado .crt
    BB_KEY_PATH: Optional[str] = None   # Caminho para a chave privada .key
    # Certificados em Base64 (alternativa para cloud - Digital Ocean, Heroku, etc)
    BB_CERT_CONTENT: Optional[str] = None  # Certificado em base64
    BB_KEY_CONTENT: Optional[str] = None   # Chave privada em base64
    
    class Config:
        # Carregar .env.production se existir, senão .env
        env_file = ".env.production" if os.path.exists(".env.production") else ".env"
        case_sensitive = True
        extra = "allow"  # Permitir campos extras do .env

settings = Settings()
