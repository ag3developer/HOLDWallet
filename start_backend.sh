#!/bin/bash

# HOLD Wallet Backend Startup Script

echo "================================================"
echo "🚀 Starting HOLD Wallet Backend"
echo "================================================"

cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found, creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt 2>/dev/null || echo "⚠️  requirements.txt not found, assuming dependencies are installed"

# Start the backend
echo ""
echo "🎯 Starting FastAPI server..."
echo "📍 URL: http://127.0.0.1:8000"
echo "📚 Docs: http://127.0.0.1:8000/docs"
echo "❌ Press Ctrl+C to stop"
echo ""

python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
