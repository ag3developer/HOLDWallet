"""
🏢 HOLD Wallet - Trader Profile Service
=========================================

Service layer for trader profile business logic.
Handles creating, updating, and calculating trader statistics.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID

from app.models.trader_profile import TraderProfile, TraderStats
from app.models.p2p import P2PMatch
from app.core.exceptions import ValidationError


class TraderProfileService:
    """Service for managing trader profiles and statistics"""
    
    @staticmethod
    def calculate_success_rate(trader_id: UUID, db: Session) -> float:
        """Calculate trader's success rate based on completed trades"""
        total_trades = db.query(P2PMatch).filter(
            ((P2PMatch.buyer_id == trader_id) | (P2PMatch.seller_id == trader_id)),
            P2PMatch.status == "completed"
        ).count()
        
        if total_trades == 0:
            return 0.0
        
        return 100.0  # Will be updated based on reviews/disputes
    
    @staticmethod
    def update_trader_stats(trader_id: UUID, db: Session) -> TraderProfile:
        """Update trader's statistics based on completed trades"""
        profile = db.query(TraderProfile).filter(
            TraderProfile.id == trader_id
        ).first()
        
        if not profile:
            raise ValidationError("Trader profile not found")
        
        # Count trades where user is buyer or seller
        trades = db.query(P2PMatch).filter(
            ((P2PMatch.buyer_id == profile.user_id) | (P2PMatch.seller_id == profile.user_id)),
            P2PMatch.status == "completed"
        ).all()
        
        profile.total_trades = len(trades)
        profile.completed_trades = len([t for t in trades if t.status == "completed"])
        
        db.commit()
        db.refresh(profile)
        
        return profile
    
    @staticmethod
    def create_daily_stats(trader_id: UUID, db: Session) -> TraderStats:
        """Create or update daily statistics for a trader"""
        profile = db.query(TraderProfile).filter(
            TraderProfile.id == trader_id
        ).first()
        
        if not profile:
            raise ValidationError("Trader profile not found")
        
        # Check if stats for today already exist
        today = datetime.utcnow().date()
        existing_stats = db.query(TraderStats).filter(
            TraderStats.trader_id == trader_id,
            TraderStats.date.cast(type_=type(today)) == today
        ).first()
        
        if existing_stats:
            return existing_stats
        
        # Create new daily stats
        new_stats = TraderStats(
            trader_id=trader_id,
            trades_completed=profile.completed_trades,
            total_volume_brl=0.0,  # Will be calculated from trades
            success_rate=profile.success_rate,
            average_rating=profile.average_rating,
            new_reviews=0,
            disputes=0,
        )
        
        db.add(new_stats)
        db.commit()
        db.refresh(new_stats)
        
        return new_stats


trader_profile_service = TraderProfileService()
