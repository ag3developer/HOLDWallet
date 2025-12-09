#!/bin/bash

# HOLD Wallet - Start Development Environment
# This script starts both Backend and Frontend services

echo "🚀 HOLD Wallet - Development Environment Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WORKSPACE="/Users/josecarlosmartins/Documents/HOLDWallet"

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Check if running from workspace
if [ ! -d "$WORKSPACE" ]; then
    print_error "Workspace directory not found: $WORKSPACE"
    exit 1
fi

# Step 1: Check Python environment
print_status "Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    print_error "Python3 not found. Please install Python 3.9+"
    exit 1
fi
print_success "Python3 found: $(python3 --version)"

# Step 2: Check Node environment
print_status "Checking Node.js environment..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Step 3: Check ports
print_status "Checking required ports..."
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Check if ports are available
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    print_warning "Port $BACKEND_PORT is already in use (Backend might be running)"
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    print_warning "Port $FRONTEND_PORT is already in use (Frontend might be running)"
fi

echo ""
echo "=============================================="
echo ""

# Step 4: Start Backend
print_status "Starting Backend (FastAPI)..."
print_status "Location: $WORKSPACE/backend"
print_status "Port: $BACKEND_PORT"

cd "$WORKSPACE/backend" || exit 1

# Check if requirements are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    print_warning "Dependencies not installed. Installing..."
    pip install -r requirements.txt > /dev/null 2>&1 || print_error "Failed to install dependencies"
fi

print_success "Backend starting on http://127.0.0.1:$BACKEND_PORT"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port $BACKEND_PORT --reload &
BACKEND_PID=$!

sleep 3

# Verify backend started
if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    print_error "Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
print_success "Backend is running (PID: $BACKEND_PID)"

echo ""

# Step 5: Start Frontend
print_status "Starting Frontend (React/Vite)..."
print_status "Location: $WORKSPACE/Frontend"
print_status "Port: $FRONTEND_PORT"

cd "$WORKSPACE/Frontend" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Installing..."
    npm install > /dev/null 2>&1 || print_error "Failed to install npm dependencies"
fi

print_success "Frontend starting on http://localhost:$FRONTEND_PORT"
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "=============================================="
echo ""
print_success "🎉 HOLD Wallet Development Environment Started!"
echo ""
echo "📍 Services running:"
echo "   Backend:  http://127.0.0.1:$BACKEND_PORT"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Docs:     http://127.0.0.1:$BACKEND_PORT/docs"
echo ""
echo "📊 Price Aggregator Endpoint:"
echo "   GET /api/v1/prices/batch?symbols=BTC,ETH,USDT&fiat=brl"
echo ""
echo "🛑 To stop the services:"
echo "   Press Ctrl+C in this terminal"
echo ""
echo "=============================================="
echo ""

# Function to handle cleanup
cleanup() {
    print_status "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    print_success "Services stopped"
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
