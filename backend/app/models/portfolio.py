"""
User Portfolio Model
Stores user's crypto holdings with cost basis for P&L tracking
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.core.db import Base


class UserPortfolioAsset(Base):
    """
    Tracks user's crypto holdings with cost basis for AI analysis.
    The cost_basis is calculated as weighted average of all purchases.
    """
    __tablename__ = "user_portfolio_assets"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign keys - user_id is UUID to match users table
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Asset data
    symbol = Column(String(20), nullable=False, index=True)  # BTC, ETH, SOL, etc.
    network = Column(String(50), nullable=True)  # bitcoin, ethereum, polygon, etc.
    
    # Holdings and cost tracking
    total_amount = Column(Float, default=0.0, nullable=False)  # Total amount held
    cost_basis = Column(Float, default=0.0, nullable=False)  # Weighted average cost per unit
    total_invested = Column(Float, default=0.0, nullable=False)  # Total USD invested
    
    # Tracking data
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="portfolio_assets")

    # Composite index for user + symbol lookups
    __table_args__ = (
        Index('ix_user_portfolio_user_symbol', 'user_id', 'symbol'),
    )

    def __repr__(self):
        return f"<UserPortfolioAsset(user_id={self.user_id}, symbol='{self.symbol}', amount={self.total_amount})>"

    def update_cost_basis(self, new_amount: float, new_price: float):
        """
        Update cost basis using weighted average when user acquires more of the asset.
        
        Formula: new_cost_basis = (old_total_invested + new_investment) / (old_amount + new_amount)
        """
        if new_amount <= 0:
            return
            
        new_investment = new_amount * new_price
        old_total_value = self.total_amount * self.cost_basis
        
        new_total_amount = self.total_amount + new_amount
        new_total_invested = old_total_value + new_investment
        
        if new_total_amount > 0:
            self.cost_basis = new_total_invested / new_total_amount
            self.total_amount = new_total_amount
            self.total_invested = new_total_invested
        
        self.last_updated = datetime.now(timezone.utc)

    def remove_from_holdings(self, amount: float):
        """
        Remove amount from holdings (sell/send).
        Cost basis remains the same (FIFO would be more complex).
        """
        if amount <= 0:
            return
            
        self.total_amount = max(0, self.total_amount - amount)
        
        # Update total invested proportionally
        if self.total_amount > 0:
            self.total_invested = self.total_amount * self.cost_basis
        else:
            self.total_invested = 0
            self.cost_basis = 0
            
        self.last_updated = datetime.now(timezone.utc)

    @property
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "symbol": self.symbol,
            "network": self.network,
            "total_amount": self.total_amount,
            "cost_basis": self.cost_basis,
            "total_invested": self.total_invested,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "is_active": self.is_active,
        }
