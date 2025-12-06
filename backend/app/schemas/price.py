from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Response schemas
class PriceResponse(BaseModel):
    """Response schema for cryptocurrency price information."""
    symbol: str
    name: str
    current_price: float
    market_cap: Optional[float] = None
    market_cap_rank: Optional[int] = None
    volume_24h: Optional[float] = None
    price_change_24h: Optional[float] = None
    price_change_percentage_24h: Optional[float] = None
    price_change_percentage_7d: Optional[float] = None
    price_change_percentage_30d: Optional[float] = None
    last_updated: Optional[datetime] = None
    vs_currency: str = "usd"

class PriceHistoryResponse(BaseModel):
    """Response schema for price history data."""
    symbol: str
    vs_currency: str
    days: int
    interval: str
    prices: List[List[Any]]  # [[timestamp, price], ...]
    market_caps: List[List[Any]] = []  # [[timestamp, market_cap], ...]
    total_volumes: List[List[Any]] = []  # [[timestamp, volume], ...]

class SupportedAssetsResponse(BaseModel):
    """Response schema for supported cryptocurrencies."""
    assets: List[Dict[str, Any]]
    total_count: int
    page: int
    per_page: int

# Request schemas
class PriceAlertRequest(BaseModel):
    """Request schema for creating price alerts."""
    symbol: str = Field(..., min_length=1)
    target_price: float = Field(..., gt=0)
    condition: str = Field(..., description="above or below")
    
    @validator('condition')
    def validate_condition(cls, v):
        if v.lower() not in ['above', 'below']:
            raise ValueError('Condition must be "above" or "below"')
        return v.lower()

class PriceAlertResponse(BaseModel):
    """Response schema for price alert information."""
    id: str
    symbol: str
    target_price: float
    condition: str
    is_active: bool
    created_at: datetime
    message: Optional[str] = None
