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
PORT="${PORT:-10000}"

echo "=================================================="
echo "  KAVACH SECURITY — UNIFIED CONTROL PLANE"
echo "  Deploying Frontend + Backend on single port $PORT"
echo "=================================================="

# 1. Start FastAPI Backend in background on internal localhost:8000
echo "--> Starting FastAPI Backend on 127.0.0.1:8000..."
cd "$ROOT_DIR/backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# 2. Poll until backend is responsive (max 30 seconds)
echo "--> Waiting for backend service readiness..."
for i in $(seq 1 30); do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "--> WARNING: Backend process exited prematurely."
    break
  fi
  if curl -s http://127.0.0.1:8000/api/v1/health/live > /dev/null 2>&1 || curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
    echo "--> Backend is online (PID: $BACKEND_PID)."
    break
  fi
  sleep 1
done

# 3. Start Next.js Frontend in foreground on Render's assigned $PORT
echo "--> Starting Next.js Frontend on 0.0.0.0:$PORT..."
cd "$ROOT_DIR/frontend"
exec npm start -- -p "$PORT"
