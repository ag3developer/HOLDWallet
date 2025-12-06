from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class PriceCache(Base):
    """Model for caching cryptocurrency prices."""
    __tablename__ = "price_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), index=True, nullable=False)  # BTC, ETH, etc.
    currency = Column(String(5), index=True, nullable=False)  # USD, BRL
    
    price = Column(Numeric(precision=18, scale=8), nullable=False)
    market_cap = Column(Numeric(precision=20, scale=2))
    volume_24h = Column(Numeric(precision=20, scale=2))
    price_change_24h = Column(Numeric(precision=8, scale=4))  # Percentage
    price_change_percentage_24h = Column(Numeric(precision=8, scale=4))
    
    # Cache metadata
    last_updated = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_valid = Column(Boolean, default=True)
    
    # Data source
    source = Column(String(20), default="coingecko")  # coingecko, binance, etc.
