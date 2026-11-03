# ============================================================
# YC THING — SecureAI Control Plane — Setup & Run Script
# Run this from: c:\Users\USER\Desktop\YC THING\
# ============================================================

$ErrorActionPreference = "Continue"
$ROOT = "c:\Users\USER\Desktop\YC THING"
$BACKEND = "$ROOT\backend"
$TOOLS_DIR = "C:\tools\scanners"
$PYTHON_SCRIPTS = "C:\Users\USER\AppData\Local\Programs\Python\Python313\Scripts"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SecureAI Control Plane - Setup & Start   " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Add scanner tools to PATH ----
Write-Host "[1/5] Adding scanner tools to PATH..." -ForegroundColor Yellow
$env:PATH = "$TOOLS_DIR;$PYTHON_SCRIPTS;$env:PATH"

# Verify each scanner
$scanners = @("semgrep", "gitleaks", "checkov", "trivy", "osv-scanner")
foreach ($s in $scanners) {
    $found = Get-Command $s -ErrorAction SilentlyContinue
    if ($found) {
        $ver = & $s --version 2>&1 | Select-Object -First 1
        Write-Host "  [OK] $s -> $ver" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $s NOT FOUND in PATH" -ForegroundColor Red
    }
}

Write-Host ""

# ---- Step 2: Install backend Python dependencies ----
Write-Host "[2/5] Installing backend Python dependencies..." -ForegroundColor Yellow
Set-Location $BACKEND
py -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Some deps may have failed, continuing..." -ForegroundColor Yellow
}

Write-Host ""

# ---- Step 3: Check PostgreSQL ----
Write-Host "[3/5] Checking PostgreSQL on port 5432..." -ForegroundColor Yellow
$pg = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
if ($pg.TcpTestSucceeded) {
    Write-Host "  [OK] PostgreSQL is reachable on 5432" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] PostgreSQL NOT reachable on 5432" -ForegroundColor Red
    Write-Host "  -> Run: docker run -d --name pg-ycthing -e POSTGRES_PASSWORD=secure_dev_password -e POSTGRES_DB=secure_control_plane -p 5433:5432 postgres:16-alpine" -ForegroundColor Cyan
}

Write-Host ""

# ---- Step 4: Check port availability ----
Write-Host "[4/5] Checking port availability..." -ForegroundColor Yellow
$port8000 = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue
if ($port8000.TcpTestSucceeded) {
    Write-Host "  [WARN] Port 8000 is TAKEN (another project using it)" -ForegroundColor Yellow
    Write-Host "  -> Will start YC THING backend on port 8001" -ForegroundColor Cyan
    $BACKEND_PORT = 8001
} else {
    Write-Host "  [OK] Port 8000 is free" -ForegroundColor Green
    $BACKEND_PORT = 8000
}

Write-Host ""

# ---- Step 5: Start backend ----
Write-Host "[5/5] Starting FastAPI backend on port $BACKEND_PORT ..." -ForegroundColor Yellow
Write-Host "  Logs will stream below. Press Ctrl+C to stop." -ForegroundColor Cyan
Write-Host ""
Write-Host "  API Docs: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Magenta
Write-Host "  Health:   http://localhost:$BACKEND_PORT/api/v1/health/live" -ForegroundColor Magenta
Write-Host "  Scanners: http://localhost:$BACKEND_PORT/api/v1/scans/tools/health" -ForegroundColor Magenta
Write-Host ""

Set-Location $BACKEND
$env:APP_PORT = $BACKEND_PORT
py -m uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload --reload-dir app --log-level debug
