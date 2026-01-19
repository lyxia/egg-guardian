#!/bin/bash

echo "🚀 Starting Egg Guardian Development Servers..."

# Function to kill process using a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pids" ]; then
        echo "⚠️  Port $port is already in use by PID(s): $pids"
        echo "🔪 Killing process(es)..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        echo "✅ Port $port is now free"
    else
        echo "✓ Port $port is available"
    fi
}

# Kill any existing processes on ports 8787 and 3000
echo "🔍 Checking ports..."
kill_port 8787
kill_port 3000

echo ""

# Start backend (Cloudflare Workers)
echo "📦 Starting Backend API (port 8787)..."
cd api
wrangler dev --port 8787 --local --env development > /tmp/egg-guardian-api.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Start frontend (Vite) with API URL pointing to local Worker
cd ..
echo "🎨 Starting Frontend (port 3000)..."
VITE_API_URL=https://childrenlearn.activing.fun npm run dev > /tmp/egg-guardian-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Services started!"
echo "   Backend API: http://localhost:8787"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/egg-guardian-api.log"
echo "   Frontend: tail -f /tmp/egg-guardian-frontend.log"
echo ""
echo "⏹️  To stop: pkill -f 'wrangler dev' && pkill -f 'vite'"
