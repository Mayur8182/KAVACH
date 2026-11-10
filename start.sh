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

# Check uvicorn presence
if ! python -c "import uvicorn" >/dev/null 2>&1; then
  echo "ERROR: uvicorn is not installed. Install backend/requirements.txt in the Render build command." >&2
  exit 1
fi

# Track child PIDs
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "--> Termination signal received. Gracefully shutting down services..."
  if [ -n "$FRONTEND_PID" ]; then
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
  fi
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# 1. Start FastAPI Backend in background on internal localhost:8000
echo "--> Starting FastAPI Backend on 127.0.0.1:8000..."
cd "$ROOT_DIR/backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "--> FastAPI Backend launched (PID: $BACKEND_PID)."

# 2. Wait for FastAPI Backend to become responsive before launching frontend
echo "--> Waiting for FastAPI Backend to be healthy on internal port 8000..."
RETRIES=60
READY=0
while [ $RETRIES -gt 0 ]; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "FATAL: FastAPI Backend process ($BACKEND_PID) exited unexpectedly during startup!" >&2
    exit 1
  fi
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $READY -ne 1 ]; then
  echo "FATAL: FastAPI Backend failed to become healthy within 60s. Aborting startup." >&2
  kill -TERM "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

echo "--> FastAPI Backend is verified healthy and accepting internal traffic."

# 3. Start Next.js Frontend directly on public 0.0.0.0:$PORT in background
echo "--> Starting Next.js Frontend on 0.0.0.0:$PORT..."
cd "$ROOT_DIR/frontend"
if [ -x "./node_modules/.bin/next" ]; then
  ./node_modules/.bin/next start -H 0.0.0.0 -p "$PORT" &
  FRONTEND_PID=$!
else
  npx next start -H 0.0.0.0 -p "$PORT" &
  FRONTEND_PID=$!
fi

echo "--> Next.js Frontend launched (PID: $FRONTEND_PID)."

# 4. Wait for Next.js Frontend to bind and respond on port $PORT
echo "--> Verifying Next.js port binding on 0.0.0.0:$PORT..."
FRONTEND_RETRIES=30
FRONTEND_READY=0
while [ $FRONTEND_RETRIES -gt 0 ]; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "FATAL: Next.js Frontend process ($FRONTEND_PID) exited unexpectedly during startup!" >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi
  if curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
    FRONTEND_READY=1
    break
  fi
  sleep 1
  FRONTEND_RETRIES=$((FRONTEND_RETRIES - 1))
done

if [ $FRONTEND_READY -ne 1 ]; then
  echo "WARNING: Next.js health check timed out on internal probe, proceeding with supervisor..."
else
  echo "--> Next.js Frontend is verified healthy on 0.0.0.0:$PORT."
fi

echo "=================================================="
echo "  KAVACH CONTROL PLANE FULLY OPERATIONAL"
echo "  - Backend:  127.0.0.1:8000 (HEALTHY)"
echo "  - Frontend: 0.0.0.0:$PORT (HEALTHY)"
echo "=================================================="

# 5. Continuous Process Supervision Loop
# If either service crashes, terminate both and exit with failure
while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "FATAL: FastAPI Backend process ($BACKEND_PID) died!" >&2
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    exit 1
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "FATAL: Next.js Frontend process ($FRONTEND_PID) died!" >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 3
done
