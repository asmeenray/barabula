#!/bin/bash

# BARABULA Frontend Development Server Stop Script
# This script stops the React development server

echo "🛑 Stopping BARABULA Frontend Development Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to the frontend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Current directory: $(pwd)"

PID_FILE=".server.pid"

# Function to kill process by PID
kill_process() {
    local pid=$1
    if ps -p $pid > /dev/null; then
        echo "🔄 Attempting graceful shutdown (SIGTERM)..."
        kill $pid
        sleep 3
        
        # Check if process is still running
        if ps -p $pid > /dev/null; then
            echo "⚡ Force killing process (SIGKILL)..."
            kill -9 $pid
            sleep 1
        fi
        
        # Verify process is stopped
        if ps -p $pid > /dev/null; then
            echo "❌ Error: Failed to stop process $pid"
            return 1
        else
            echo "✅ Process $pid stopped successfully"
            return 0
        fi
    else
        echo "ℹ️  Process $pid is not running"
        return 0
    fi
}

# Stop server using PID file
if [ -f "$PID_FILE" ]; then
    SERVER_PID=$(cat $PID_FILE)
    echo "📋 Found PID file with process ID: $SERVER_PID"
    
    kill_process $SERVER_PID
    rm -f $PID_FILE
    echo "🗑️  Removed PID file"
else
    echo "⚠️  PID file not found, searching for React processes..."
fi

# Additional cleanup: Find and stop any React development server processes
echo "🔍 Searching for any remaining React development server processes..."

# Kill any process running on port 3000
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "🎯 Found process on port 3000 (PID: $PORT_PID)"
    kill_process $PORT_PID
fi

# Kill any react-scripts processes
REACT_PIDS=$(pgrep -f "react-scripts start" 2>/dev/null)
if [ ! -z "$REACT_PIDS" ]; then
    echo "⚛️  Found React scripts processes: $REACT_PIDS"
    for pid in $REACT_PIDS; do
        kill_process $pid
    done
fi

# Kill any node processes running from this directory
NODE_PIDS=$(pgrep -f "$(pwd)" 2>/dev/null)
if [ ! -z "$NODE_PIDS" ]; then
    echo "🟢 Found Node.js processes in current directory: $NODE_PIDS"
    for pid in $NODE_PIDS; do
        # Check if it's a React development server
        if ps -p $pid -o command= | grep -q "react-scripts\|webpack\|start"; then
            kill_process $pid
        fi
    done
fi

# Clean up log file
if [ -f "server.log" ]; then
    echo "📄 Archiving server log..."
    mv server.log "server-$(date +%Y%m%d-%H%M%S).log"
    echo "✅ Log archived"
fi

# Final verification
echo "🔍 Final verification..."
REMAINING_PORT=$(lsof -ti:3000 2>/dev/null)
if [ -z "$REMAINING_PORT" ]; then
    echo "✅ Port 3000 is now free"
else
    echo "⚠️  Warning: Port 3000 still occupied by PID: $REMAINING_PORT"
    echo "🔧 You may need to manually kill: kill -9 $REMAINING_PORT"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 BARABULA frontend server shutdown complete!"
echo "🚀 To start again, run: ./start-server.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
