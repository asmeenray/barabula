#!/bin/bash

# BARABULA Wireframe Auto-Update Script
# This script monitors the project for changes and updates the wireframe timestamp

echo "🎨 BARABULA Wireframe Monitor Started"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to the frontend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

WIREFRAME_FILE="wireframe.html"
WATCH_FILES=("src/App.tsx" "src/App.css" "src/index.tsx" "src/index.css")

echo "📁 Monitoring directory: $(pwd)"
echo "📄 Wireframe file: $WIREFRAME_FILE"
echo "👀 Watching files: ${WATCH_FILES[*]}"
echo ""

# Function to update wireframe timestamp
update_wireframe() {
    if [ -f "$WIREFRAME_FILE" ]; then
        # Get current timestamp
        CURRENT_TIME=$(date)
        
        # Update the wireframe file timestamp using sed
        # This updates the JavaScript that sets the timestamp
        sed -i '' "s/new Date().toLocaleString()/'Last updated: $CURRENT_TIME'/g" "$WIREFRAME_FILE" 2>/dev/null
        
        echo "✅ $(date): Wireframe updated"
    else
        echo "❌ Wireframe file not found: $WIREFRAME_FILE"
    fi
}

# Function to check if any watched files changed
check_files() {
    for file in "${WATCH_FILES[@]}"; do
        if [ -f "$file" ]; then
            # Get file modification time
            if [ "$(uname)" = "Darwin" ]; then
                # macOS
                CURRENT_MTIME=$(stat -f %m "$file" 2>/dev/null)
            else
                # Linux
                CURRENT_MTIME=$(stat -c %Y "$file" 2>/dev/null)
            fi
            
            # Store previous modification time in a temp file
            TEMP_FILE=".${file//\//_}_mtime"
            
            if [ -f "$TEMP_FILE" ]; then
                PREV_MTIME=$(cat "$TEMP_FILE")
                if [ "$CURRENT_MTIME" != "$PREV_MTIME" ]; then
                    echo "📝 Change detected in: $file"
                    update_wireframe
                    echo "$CURRENT_MTIME" > "$TEMP_FILE"
                    return 0
                fi
            else
                echo "$CURRENT_MTIME" > "$TEMP_FILE"
            fi
        fi
    done
    return 1
}

# Initial update
update_wireframe

echo "🚀 Monitor is running. Press Ctrl+C to stop."
echo "🌐 View wireframe at: http://localhost:3000/wireframe.html"
echo ""

# Monitor loop
while true; do
    check_files
    sleep 2
done
