from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from app.db.database import Base

class UserSettings(Base):
    """Model for user settings and preferences."""
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), unique=True, index=True, nullable=False)  # UUID
    
    # Display preferences
    default_currency = Column(String(5), default="USD")  # USD, BRL, EUR
    theme = Column(String(10), default="light")  # light, dark
    language = Column(String(5), default="en")  # en, pt, es
    
    # Security preferences
    auto_lock_timeout = Column(Integer, default=300)  # seconds
    require_pin_for_transactions = Column(Boolean, default=True)
    biometric_enabled = Column(Boolean, default=False)
    
    # Network preferences
    preferred_networks = Column(JSON)  # ["ethereum", "polygon", "bitcoin"]
    gas_preference = Column(String(10), default="standard")  # slow, standard, fast
    
    # Notification preferences
    transaction_notifications = Column(Boolean, default=True)
    price_alerts = Column(Boolean, default=False)
    security_notifications = Column(Boolean, default=True)
    
    # Advanced settings
    developer_mode = Column(Boolean, default=False)
    custom_rpc_urls = Column(JSON)  # Custom RPC endpoints
    address_book = Column(JSON)  # Saved addresses
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Backup settings
    backup_reminder_enabled = Column(Boolean, default=True)
    last_backup_reminder = Column(DateTime(timezone=True))
    backup_frequency_days = Column(Integer, default=30)
