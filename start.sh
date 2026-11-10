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
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-10000}"

echo "=================================================="
echo "  KAVACH SECURITY — UNIFIED CONTROL PLANE"
echo "  Deploying Frontend + Backend on single port $PORT"
echo "=================================================="

# Do not let the frontend appear healthy when the API failed to start.
if ! python -c "import uvicorn" >/dev/null 2>&1; then
  echo "ERROR: uvicorn is not installed. Install backend/requirements.txt in the Render build command." >&2
  exit 1
fi

# 1. Start FastAPI Backend in background on internal localhost:8000
echo "--> Starting FastAPI Backend on 127.0.0.1:8000..."
cd "$ROOT_DIR/backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "--> FastAPI Backend launched (PID: $BACKEND_PID)."

# Handle shutdown cleanly
cleanup() {
  echo "--> Shutting down services..."
  kill -TERM "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# Wait for FastAPI Backend to become responsive before launching frontend
echo "--> Waiting for FastAPI Backend to be healthy..."
RETRIES=30
READY=0
while [ $RETRIES -gt 0 ]; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "ERROR: FastAPI Backend died unexpectedly during startup." >&2
    exit 1
  fi
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $READY -eq 1 ]; then
  echo "--> FastAPI Backend is healthy and accepting requests on internal port 8000."
else
  echo "WARNING: Backend health check timed out, proceeding to start frontend anyway..."
fi

# 2. Start Next.js Frontend directly on public 0.0.0.0:$PORT
cd "$ROOT_DIR/frontend"
if [ -x "./node_modules/.bin/next" ]; then
  exec ./node_modules/.bin/next start -H 0.0.0.0 -p "$PORT"
else
  exec npx next start -H 0.0.0.0 -p "$PORT"
fi
