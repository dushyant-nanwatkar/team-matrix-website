#!/usr/bin/env bash

# Team Matrix Website - Startup Script
set -e

# Navigate to the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "    Starting Team Matrix Website"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js (v18+ recommended) to run this application."
    exit 1
fi

# Check if npm is installed
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed or not in PATH."
    echo "Please install npm to run this application."
    exit 1
fi

echo "Node version: $(node -v)"
echo "npm version:  $(npm -v)"
echo "------------------------------------------"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies with npm install..."
    npm install
else
    echo "Dependencies verified (node_modules present)."
fi

# Check if port 3000 is occupied (e.g. by a stale Next.js dev process)
EXISTING_PIDS=$(lsof -ti :3000 2>/dev/null || fuser 3000/tcp 2>/dev/null || true)
if [ -n "$EXISTING_PIDS" ]; then
    echo "Notice: Port 3000 is currently in use."
    echo "Stopping existing process(es) on port 3000..."
    for pid in $EXISTING_PIDS; do
        kill -15 "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
fi

# Support production or development mode
# Usage:
#   ./start.sh             -> runs development server (npm run dev)
#   ./start.sh --prod      -> builds (if needed) and runs production server (npm run build && npm run start)
#   ./start.sh -p 3001     -> passes arguments to next dev
if [ "$1" = "--prod" ] || [ "$1" = "prod" ]; then
    shift
    echo "Running in PRODUCTION mode..."
    echo "Building application..."
    npm run build
    echo "Starting production server at http://localhost:3000..."
    exec npm run start -- "$@"
else
    echo "Starting DEVELOPMENT server (Turbopack)..."
    echo "Open http://localhost:3000 in your browser."
    echo "Press Ctrl+C to stop."
    echo "=========================================="
    exec npm run dev -- "$@"
fi
