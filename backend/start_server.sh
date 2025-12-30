#!/bin/bash
echo "Starting LinkShield Backend Server..."
echo ""
echo "Make sure you have installed the requirements:"
echo "  pip install -r requirements.txt"
echo ""
echo "Starting server on http://127.0.0.1:8000"
echo "Press Ctrl+C to stop the server"
echo ""
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000