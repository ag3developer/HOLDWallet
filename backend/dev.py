#!/usr/bin/env python3
"""
HOLD Wallet Backend - Development Server
Run this script to start the development server
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Main function to start the development server"""
    
    # Get the project root directory
    project_root = Path(__file__).parent
    
    # Change to project directory
    os.chdir(project_root)
    
    # Check if virtual environment exists
    venv_path = project_root / "venv"
    if not venv_path.exists():
        print("❌ Virtual environment not found.")
        print("Run './setup.sh' first to set up the project.")
        sys.exit(1)
    
    # Check if .env exists
    env_path = project_root / ".env"
    if not env_path.exists():
        print("❌ .env file not found.")
        print("Copy .env.example to .env and configure your settings.")
        sys.exit(1)
    
    # Start the server
    print("🚀 Starting HOLD Wallet Backend...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API docs available at: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("")
    print("Press Ctrl+C to stop the server")
    print("")
    
    try:
        # Run the server
        if sys.platform.startswith('win'):
            # Windows
            subprocess.run([
                str(venv_path / "Scripts" / "python.exe"), 
                "run.py"
            ])
        else:
            # Unix/Linux/MacOS
            subprocess.run([
                str(venv_path / "bin" / "python"), 
                "run.py"
            ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped!")

if __name__ == "__main__":
    main()
