# ==============================================================================
# Kavach Security Control Plane — Unified Single-Service Production Container
# Deploys Next.js 15 Frontend + FastAPI Backend in one Render Web Service
# ==============================================================================

# ── Stage 1: Build Next.js Frontend ──────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build:clean

# ── Stage 2: Unified Production Runner ───────────────────────────────────────
FROM python:3.11-slim-bookworm AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONPATH=/app/backend \
    BACKEND_PORT=8000 \
    BACKEND_URL=http://127.0.0.1:8000

WORKDIR /app

# Install Node.js 20, curl, git, and libpq dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    libpq5 \
    gcc \
    libpq-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy Backend application code
COPY backend /app/backend

# Copy Built Next.js Frontend from builder stage
COPY --from=frontend-builder /app/frontend /app/frontend

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Render dynamically assigns PORT (defaults to 10000)
EXPOSE 10000

CMD ["/bin/bash", "/app/start.sh"]
