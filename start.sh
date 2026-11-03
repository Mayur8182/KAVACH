#!/bin/bash
set -e

# Detect repository root
if [ -d "/app/backend" ]; then
  ROOT_DIR="/app"
else
  ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

export PYTHONPATH="$ROOT_DIR/backend"
export BACKEND_PORT=8000
export BACKEND_URL="http://127.0.0.1:8000"
export FRONTEND_PORT=3000
export PORT="${PORT:-10000}"

echo "=================================================="
echo "  KAVACH SECURITY — UNIFIED CONTROL PLANE"
echo "  Deploying Frontend + Backend on single port $PORT"
echo "=================================================="

# 1. Start FastAPI Backend in background on internal localhost:8000
echo "--> Starting FastAPI Backend on 127.0.0.1:8000..."
cd "$ROOT_DIR/backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "--> FastAPI Backend launched (PID: $BACKEND_PID)."

# 2. Start Next.js Frontend in background on internal localhost:3000
echo "--> Starting Next.js Frontend on 127.0.0.1:3000..."
cd "$ROOT_DIR/frontend"
npx next start -H 127.0.0.1 -p 3000 &
FRONTEND_PID=$!
echo "--> Next.js Frontend launched (PID: $FRONTEND_PID)."

# 3. Start Unified Gateway in foreground on public 0.0.0.0:$PORT (binds in <20ms)
echo "--> Starting Kavach Unified Gateway on 0.0.0.0:$PORT..."
cd "$ROOT_DIR"
exec node gateway.js
