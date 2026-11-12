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
echo "  Python: $(python --version 2>&1)"
echo "  Node:   $(node --version 2>&1 || echo 'not found')"
echo "=================================================="

# Resolve python binary reliably
PYTHON_BIN="python"
if ! command -v python >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  else
    echo "ERROR: No python or python3 found on PATH!" >&2
    exit 1
  fi
fi
echo "--> Using Python binary: $PYTHON_BIN"

# Verify uvicorn is installed
if ! $PYTHON_BIN -c "import uvicorn" >/dev/null 2>&1; then
  echo "ERROR: uvicorn not found. Run: pip install -r backend/requirements.txt" >&2
  exit 1
fi

# Track child PIDs
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "--> Termination signal received. Gracefully shutting down services..."
  [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ]  && kill -TERM "$BACKEND_PID"  2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID"  2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# ─── Helper: start backend (output piped directly to Render logs via stderr) ──
start_backend() {
  cd "$ROOT_DIR/backend"
  echo "--> Launching FastAPI on 127.0.0.1:8000 ..."
  # Use exec-style pipe so ALL backend output (stdout + stderr) streams live to
  # Render's log. The backend process is backgrounded so we keep the PID.
  $PYTHON_BIN -u -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --loop asyncio \
    --log-level info 2>&1 &
  BACKEND_PID=$!
  echo "--> FastAPI Backend launched (PID: $BACKEND_PID)."
}

# ─── Helper: start backend on PUBLIC port (fallback when frontend is absent) ──
start_backend_public() {
  cd "$ROOT_DIR/backend"
  echo "--> Launching FastAPI on 0.0.0.0:$PORT (standalone mode)..."
  exec $PYTHON_BIN -u -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --loop asyncio \
    --log-level info
}

# ─── Detect if Next.js Frontend is built ─────────────────────────────────────
CAN_RUN_FRONTEND=0
if [ -d "$ROOT_DIR/frontend/.next" ] && command -v node >/dev/null 2>&1; then
  CAN_RUN_FRONTEND=1
fi

if [ $CAN_RUN_FRONTEND -eq 0 ]; then
  echo "--> .next build not found — STANDALONE BACKEND MODE"
  start_backend_public
  # exec above never returns
fi

echo "--> UNIFIED MODE: Next.js on 0.0.0.0:$PORT  |  FastAPI on 127.0.0.1:8000"

# ─── 1. Start FastAPI FIRST so it warms up while Next.js builds ──────────────
start_backend

# ─── 2. Start Next.js ─────────────────────────────────────────────────────────
echo "--> Starting Next.js Frontend on 0.0.0.0:$PORT..."
cd "$ROOT_DIR/frontend"
if [ -x "./node_modules/.bin/next" ]; then
  ./node_modules/.bin/next start -H 0.0.0.0 -p "$PORT" &
else
  npx next start -H 0.0.0.0 -p "$PORT" &
fi
FRONTEND_PID=$!
echo "--> Next.js Frontend launched (PID: $FRONTEND_PID)."

# ─── 3. Wait for Next.js to bind the public port ─────────────────────────────
echo "--> Waiting for Next.js on 0.0.0.0:$PORT..."
FE_RETRIES=40
FE_READY=0
while [ $FE_RETRIES -gt 0 ]; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "ERROR: Next.js exited unexpectedly — promoting FastAPI to 0.0.0.0:$PORT" >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    start_backend_public
  fi
  if curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1 \
  || curl -sf "http://127.0.0.1:$PORT/_next/static/" >/dev/null 2>&1 \
  || curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    FE_READY=1
    break
  fi
  sleep 1
  FE_RETRIES=$((FE_RETRIES - 1))
done

if [ $FE_READY -ne 1 ]; then
  echo "WARNING: Next.js health probe timed out — checking liveness..."
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    start_backend_public
  fi
  echo "--> Next.js process still alive — continuing..."
else
  echo "--> Next.js Frontend is healthy on 0.0.0.0:$PORT."
fi

# ─── 4. Wait for FastAPI to be healthy on 127.0.0.1:8000 ─────────────────────
echo "--> Waiting for FastAPI Backend on 127.0.0.1:8000..."
BE_RETRIES=120
BE_READY=0
BE_CRASH_COUNT=0
while [ $BE_RETRIES -gt 0 ]; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    BE_CRASH_COUNT=$((BE_CRASH_COUNT + 1))
    echo "WARNING: FastAPI crashed (attempt $BE_CRASH_COUNT). Restarting..." >&2
    if [ $BE_CRASH_COUNT -ge 3 ]; then
      echo "FATAL: FastAPI crashed 3 times. Giving up — Next.js still serves UI." >&2
      BE_RETRIES=0
      break
    fi
    sleep 2
    start_backend
  fi
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    BE_READY=1
    break
  fi
  sleep 1
  BE_RETRIES=$((BE_RETRIES - 1))
done

if [ $BE_READY -ne 1 ]; then
  echo "WARNING: FastAPI Backend did not become healthy within timeout."
  echo "         The Frontend will continue to serve; API calls via /api/* may fail."
else
  echo "--> FastAPI Backend is healthy on 127.0.0.1:8000."
fi

echo "=================================================="
echo "  KAVACH CONTROL PLANE OPERATIONAL"
echo "  Frontend: 0.0.0.0:$PORT"
echo "  Backend:  127.0.0.1:8000  (healthy=$BE_READY)"
echo "=================================================="

# ─── 5. Supervision loop ──────────────────────────────────────────────────────
while true; do
  # If Next.js dies, promote backend to public port
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "FATAL: Next.js exited — promoting FastAPI to 0.0.0.0:$PORT" >&2
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    start_backend_public
  fi
  # If FastAPI dies, restart it silently
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "WARNING: FastAPI exited — restarting..." >&2
    start_backend
  fi
  sleep 5
done
