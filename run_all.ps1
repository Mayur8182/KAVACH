# ============================================================
# SecureAI Control Plane — Full Stack Runner (Root Entrypoint)
# ============================================================
$ROOT = $PSScriptRoot
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"

$PYTHON = "C:\Users\USER\AppData\Local\Programs\Python\Python313\python.exe"
$NODE_PATH = "C:\Program Files\nodejs"
$NPM = "C:\Program Files\nodejs\npm.cmd"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting SecureAI Control Plane (Full Stack)    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Start Backend in new PowerShell window
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = '$NODE_PATH;C:\Users\USER\AppData\Local\Programs\Python\Python313;C:\Users\USER\AppData\Local\Programs\Python\Python313\Scripts;C:\tools\scanners;`$env:PATH'; Set-Location '$BACKEND'; Write-Host 'FastAPI Backend running on http://localhost:8000' -ForegroundColor Green; & '$PYTHON' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app"

# Start Frontend in new PowerShell window
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3002 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = '$NODE_PATH;`$env:PATH'; Set-Location '$FRONTEND'; Write-Host 'Next.js Frontend running on http://localhost:3002' -ForegroundColor Green; & '$NPM' run dev"

Start-Sleep -Seconds 4
Write-Host ""
Write-Host "Opening http://localhost:3002/login in default browser..." -ForegroundColor Green
Start-Process "http://localhost:3002/login"

Write-Host ""
Write-Host "Both services are running in separate terminal windows." -ForegroundColor Cyan
Write-Host "Keep both terminal windows open while using the app." -ForegroundColor Gray
