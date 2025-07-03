#!/bin/bash

# BARABULA Frontend Development Server Start Script
# This script starts the React development server on port 3000

echo "🚀 Starting BARABULA Frontend Development Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to the frontend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Current directory: $(pwd)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the frontend directory."
    exit 1
fi

# Kill any existing process on port 3000
echo "🔍 Checking for existing processes on port 3000..."
EXISTING_PID=$(lsof -ti:3000)
if [ ! -z "$EXISTING_PID" ]; then
    echo "⚠️  Found existing process on port 3000 (PID: $EXISTING_PID)"
    echo "🛑 Stopping existing process..."
    kill -9 $EXISTING_PID
    sleep 2
    echo "✅ Existing process stopped."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed successfully."
fi

# Create .env file to force port 3000 if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file to set port 3000..."
    echo "PORT=3000" > .env
    echo "BROWSER=none" >> .env
    echo "✅ .env file created."
fi

# Ensure PORT is set to 3000 in .env
if ! grep -q "PORT=3000" .env; then
    echo "⚙️  Setting PORT=3000 in .env file..."
    # Remove existing PORT line if it exists
    sed -i '' '/^PORT=/d' .env 2>/dev/null || true
    echo "PORT=3000" >> .env
    echo "✅ Port set to 3000 in .env file."
fi

# Store the PID for the stop script
PID_FILE=".server.pid"

echo "🎯 Starting React development server on port 3000..."
echo "📝 Server logs will be saved to server.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start the server and capture its PID
npm start > server.log 2>&1 &
SERVER_PID=$!

# Save the PID to file
echo $SERVER_PID > $PID_FILE

echo "✅ Server started successfully!"
echo "🔗 Server URL: http://localhost:3000"
echo "📊 Process ID: $SERVER_PID"
echo "📄 PID saved to: $PID_FILE"
echo "📋 Logs: tail -f server.log"
echo ""
echo "🛑 To stop the server, run: ./stop-server.sh"
echo "📱 To view the app, open: http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait a moment for the server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "🎉 BARABULA frontend is now running at http://localhost:3000"
    echo "🔍 Check server.log for detailed output"
else
    echo "❌ Error: Server failed to start. Check server.log for details."
    cat server.log
    rm -f $PID_FILE
    exit 1
fi
