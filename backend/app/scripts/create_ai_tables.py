"""
Create AI Prediction Tables
============================

Migration script to create AI prediction tables in the database.
Run this script to set up the AI module database schema.

Usage:
    python -m app.scripts.create_ai_tables

Author: WolkNow AI Team
Created: January 2026
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import inspect
from app.core.db import engine, Base, SessionLocal
from app.models.ai_prediction import (
    AIPrediction,
    AIIndicatorSnapshot,
    AIModelPerformance,
    AICorrelationMatrix,
    AIATHMonitor,
    AISwapRecommendation,
    AIUserPredictionAccess
)


def get_existing_tables():
    """Get list of existing tables in database"""
    inspector = inspect(engine)
    return inspector.get_table_names()


def create_ai_tables():
    """Create AI prediction tables"""
    print("\n" + "="*60)
    print("WolkNow AI Module - Database Setup")
    print("="*60 + "\n")
    
    # List of AI tables to create
    ai_tables = [
        ('ai_predictions', AIPrediction),
        ('ai_indicator_snapshots', AIIndicatorSnapshot),
        ('ai_model_performance', AIModelPerformance),
        ('ai_correlation_matrices', AICorrelationMatrix),
        ('ai_ath_monitor', AIATHMonitor),
        ('ai_swap_recommendations', AISwapRecommendation),
        ('ai_user_prediction_access', AIUserPredictionAccess)
    ]
    
    existing = get_existing_tables()
    print(f"📊 Existing tables: {len(existing)}")
    
    created = []
    skipped = []
    
    for table_name, model in ai_tables:
        if table_name in existing:
            print(f"  ⏭️  {table_name} - already exists")
            skipped.append(table_name)
        else:
            print(f"  ✅ Creating {table_name}...")
            model.__table__.create(engine, checkfirst=True)
            created.append(table_name)
    
    print("\n" + "-"*60)
    print(f"✅ Created: {len(created)} tables")
    print(f"⏭️  Skipped: {len(skipped)} tables (already exist)")
    
    if created:
        print("\nNew tables created:")
        for t in created:
            print(f"  • {t}")
    
    print("\n" + "="*60)
    print("AI Module database setup complete!")
    print("="*60 + "\n")
    
    return created, skipped


def verify_tables():
    """Verify AI tables were created correctly"""
    print("\n📋 Verifying AI tables...")
    
    expected_tables = [
        'ai_predictions',
        'ai_indicator_snapshots',
        'ai_model_performance',
        'ai_correlation_matrices',
        'ai_ath_monitor',
        'ai_swap_recommendations',
        'ai_user_prediction_access'
    ]
    
    existing = get_existing_tables()
    
    all_ok = True
    for table in expected_tables:
        if table in existing:
            print(f"  ✅ {table}")
        else:
            print(f"  ❌ {table} - NOT FOUND")
            all_ok = False
    
    return all_ok


def seed_initial_data():
    """Seed initial data for AI module (optional)"""
    print("\n🌱 Seeding initial data...")
    
    db = SessionLocal()
    try:
        # Add initial model performance record
        from datetime import datetime, timedelta
        import uuid
        
        # Check if we already have performance records
        existing = db.query(AIModelPerformance).first()
        
        if not existing:
            initial_performance = AIModelPerformance(
                id=str(uuid.uuid4()),
                model_version="v1.0",
                period="7d",
                analysis_start=datetime.utcnow() - timedelta(days=30),
                analysis_end=datetime.utcnow(),
                total_predictions=0,
                validated_predictions=0,
                notes="Initial setup - no predictions yet"
            )
            db.add(initial_performance)
            db.commit()
            print("  ✅ Initial model performance record created")
        else:
            print("  ⏭️  Model performance records already exist")
        
    except Exception as e:
        print(f"  ⚠️  Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    try:
        # Create tables
        created, skipped = create_ai_tables()
        
        # Verify
        if verify_tables():
            print("\n✅ All AI tables verified successfully!")
        else:
            print("\n⚠️  Some tables are missing. Please check the logs.")
            sys.exit(1)
        
        # Seed initial data
        seed_initial_data()
        
        print("\n🎉 AI Module setup complete! Ready to use.")
        
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        sys.exit(1)
