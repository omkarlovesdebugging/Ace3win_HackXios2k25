#!/usr/bin/env python3
"""
LinkShield Backend Startup Script
Handles model training, validation, and server startup
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if all required packages are installed"""
    try:
        import fastapi, uvicorn, joblib, xgboost, sklearn, pandas, numpy
        print("✅ All dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def check_model():
    """Check if trained model exists"""
    model_path = Path("url_malicious_model.pkl")
    if model_path.exists():
        print("✅ Trained model found")
        return True
    else:
        print("❌ No trained model found")
        return False

def train_model():
    """Train the ML model"""
    print("🤖 Training ML model...")
    try:
        subprocess.run([sys.executable, "model.py"], check=True)
        print("✅ Model training completed")
        return True
    except subprocess.CalledProcessError:
        print("❌ Model training failed")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting LinkShield backend server...")
    print("📡 Server will be available at: http://127.0.0.1:8000")
    print("📊 Health check: http://127.0.0.1:8000/health")
    print("📈 Statistics: http://127.0.0.1:8000/stats")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "127.0.0.1", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

def main():
    print("🛡️  LinkShield Backend Setup")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check/train model
    if not check_model():
        print("🔄 Training model (this may take a few minutes)...")
        if not train_model():
            sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()