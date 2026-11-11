#!/bin/bash
set -e

# Detect repository root
if [ -d "/app/backend" ]; then
  ROOT_DIR="/app"
else
  ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

export PYTHONPATH="$ROOT_DIR/backend"
export PYTHONUNBUFFERED=1
export BACKEND_PORT=8000
export BACKEND_URL="http://127.0.0.1:8000"
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-10000}"

echo "=================================================="
echo "  KAVACH SECURITY — CONTROL PLANE STARTUP"
echo "  Target Port: $PORT"
echo "=================================================="

# Check uvicorn presence
if ! python -c "import uvicorn" >/dev/null 2>&1; then
  echo "ERROR: uvicorn is not installed. Install backend/requirements.txt in the Render build command." >&2
  exit 1
fi

# Track child PIDs
BACKEND_PID=""
FRONTEND_PID=""
TAIL_PID=""

cleanup() {
  echo "--> Termination signal received. Gracefully shutting down services..."
  if [ -n "$TAIL_PID" ]; then
    kill "$TAIL_PID" 2>/dev/null || true
  fi
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

# Detect if Next.js Frontend is built and runnable
CAN_RUN_FRONTEND=0
if [ -d "$ROOT_DIR/frontend/.next" ] && command -v node >/dev/null 2>&1; then
  CAN_RUN_FRONTEND=1
fi

if [ $CAN_RUN_FRONTEND -eq 0 ]; then
  echo "--> Notice: Frontend build (.next) or node not found in runtime."
  echo "--> Running in STANDALONE BACKEND MODE: FastAPI on 0.0.0.0:$PORT"
  cd "$ROOT_DIR/backend"
  exec python -u -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --loop asyncio
fi

# UNIFIED MODE: Next.js on 0.0.0.0:$PORT, FastAPI on 127.0.0.1:8000
echo "--> Running in UNIFIED MODE (Next.js on 0.0.0.0:$PORT, FastAPI on 127.0.0.1:8000)..."

# 1. Start Next.js Frontend immediately on public 0.0.0.0:$PORT
cd "$ROOT_DIR/frontend"
if [ -x "./node_modules/.bin/next" ]; then
  ./node_modules/.bin/next start -H 0.0.0.0 -p "$PORT" &
  FRONTEND_PID=$!
else
  npx next start -H 0.0.0.0 -p "$PORT" &
  FRONTEND_PID=$!
fi
echo "--> Next.js Frontend launched (PID: $FRONTEND_PID)."

# 2. Start FastAPI Backend in parallel on internal localhost:8000
echo "--> Starting FastAPI Backend on 127.0.0.1:8000..."
cd "$ROOT_DIR/backend"
touch /tmp/backend.log
tail -n 0 -f /tmp/backend.log &
TAIL_PID=$!
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --loop asyncio > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "--> FastAPI Backend launched (PID: $BACKEND_PID)."

# 3. Wait for Next.js to bind public port $PORT
echo "--> Verifying Next.js port binding on 0.0.0.0:$PORT..."
FRONTEND_RETRIES=40
FRONTEND_READY=0
while [ $FRONTEND_RETRIES -gt 0 ]; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "WARNING: Next.js process ($FRONTEND_PID) exited during startup." >&2
    echo "--> Automatically falling back: Promoting FastAPI to public 0.0.0.0:$PORT to avoid 502..." >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    cd "$ROOT_DIR/backend"
    exec python -u -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --loop asyncio
  fi
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
    FRONTEND_READY=1
    break
  fi
  sleep 1
  FRONTEND_RETRIES=$((FRONTEND_RETRIES - 1))
done

if [ $FRONTEND_READY -ne 1 ]; then
  echo "WARNING: Next.js internal health probe timed out; verifying liveness..."
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "--> Promoting FastAPI to 0.0.0.0:$PORT..." >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    cd "$ROOT_DIR/backend"
    exec python -u -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --loop asyncio
  fi
else
  echo "--> Next.js Frontend is verified healthy on 0.0.0.0:$PORT."
fi

# 4. Wait for FastAPI Backend to be healthy on internal port 8000
echo "--> Waiting for FastAPI Backend to be healthy on internal port 8000..."
BACKEND_RETRIES=150
BACKEND_READY=0
while [ $BACKEND_RETRIES -gt 0 ]; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "WARNING: FastAPI Backend process ($BACKEND_PID) exited during startup! Restarting..." >&2
    tail -n 60 /tmp/backend.log >&2 || true
    cd "$ROOT_DIR/backend"
    python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --loop asyncio >> /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "--> Backend restarted (New PID: $BACKEND_PID)."
  fi
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 1
  BACKEND_RETRIES=$((BACKEND_RETRIES - 1))
done

if [ $BACKEND_READY -ne 1 ]; then
  echo "WARNING: FastAPI Backend still initializing in background. Next.js remains active on port $PORT."
else
  echo "--> FastAPI Backend is verified healthy and accepting internal traffic."
fi

echo "=================================================="
echo "  KAVACH CONTROL PLANE FULLY OPERATIONAL"
echo "  - Backend:  127.0.0.1:8000"
echo "  - Frontend: 0.0.0.0:$PORT (ACTIVE)"
echo "=================================================="

# 5. Continuous Process Supervision Loop
while true; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "FATAL: Next.js Frontend exited. Promoting FastAPI to 0.0.0.0:$PORT..." >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    cd "$ROOT_DIR/backend"
    exec python -u -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --loop asyncio
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "WARNING: FastAPI Backend process ($BACKEND_PID) exited. Auto-restarting backend..." >&2
    tail -n 40 /tmp/backend.log >&2 || true
    cd "$ROOT_DIR/backend"
    python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --loop asyncio >> /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "--> Backend restarted (PID: $BACKEND_PID)."
  fi
  sleep 5
done
