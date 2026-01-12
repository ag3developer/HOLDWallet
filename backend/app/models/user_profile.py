"""
User Profile Model
==================

Database model for extended user profile information.
Stores personal details like full name, phone, bio, location, etc.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, date
import uuid

from app.core.db import Base
from app.core.uuid_type import UUID


class UserProfile(Base):
    """
    Extended user profile information.
    
    Stores personal details that are not part of the core User model:
    - Full name
    - Phone number
    - Bio/description
    - Location (city, state, country)
    - Birth date
    - Website
    - Avatar URL
    - Social links
    """
    __tablename__ = "user_profiles"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Personal Information
    full_name = Column(String(200), nullable=True)
    phone = Column(String(30), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Location
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Additional Info
    birth_date = Column(Date, nullable=True)
    website = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Social Links (JSON formatted)
    social_links = Column(Text, nullable=True)  # JSON string: {"twitter": "...", "linkedin": "..."}
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="profile", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<UserProfile(id={self.id}, user_id={self.user_id}, full_name='{self.full_name}')>"


class NotificationSettings(Base):
    """
    User notification preferences.
    
    Stores settings for different types of notifications:
    - Trade alerts
    - Price alerts
    - Security alerts
    - Marketing emails
    - Weekly reports
    """
    __tablename__ = "notification_settings"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Notification Preferences
    trade_alerts = Column(Boolean, default=True, nullable=False)
    price_alerts = Column(Boolean, default=True, nullable=False)
    security_alerts = Column(Boolean, default=True, nullable=False)
    marketing_emails = Column(Boolean, default=False, nullable=False)
    weekly_report = Column(Boolean, default=True, nullable=False)
    
    # Push Notification Preferences
    push_enabled = Column(Boolean, default=True, nullable=False)
    push_trade_alerts = Column(Boolean, default=True, nullable=False)
    push_price_alerts = Column(Boolean, default=False, nullable=False)
    push_security_alerts = Column(Boolean, default=True, nullable=False)
    
    # Email Preferences
    email_enabled = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="notification_settings", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<NotificationSettings(id={self.id}, user_id={self.user_id})>"
