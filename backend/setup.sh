#!/bin/bash

# HOLD Wallet Backend Setup Script

echo "🚀 Setting up HOLD Wallet Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

echo "✅ Python 3 found"

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip is required but not installed."
    exit 1
fi

echo "✅ pip found"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    echo "⚙️ Creating .env file..."
    cp .env.example .env
    echo "📝 Please update .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Check if PostgreSQL is available
echo "🔍 Checking database connection..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
    echo "📝 Make sure to create the database and update DATABASE_URL in .env"
else
    echo "⚠️ PostgreSQL client not found. Install PostgreSQL or update DATABASE_URL for remote database"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Make sure PostgreSQL database is created"
echo "3. Run migrations: alembic upgrade head"
echo "4. Start the server: python run.py"
echo ""
echo "To activate the virtual environment later:"
echo "source venv/bin/activate"
