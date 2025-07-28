#!/bin/bash

# Virtual Assistant Attention Monitor Backend Startup Script

echo "🚀 Starting Virtual Assistant Attention Monitor Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the server"
    exit 1
fi

# Start the server
echo "🌟 Starting FastAPI server..."
echo "📊 API Documentation will be available at: http://localhost:8000/docs"
echo "🏥 Health check available at: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python run.py 