# ============================================================
# SecureAI Control Plane — Full Stack Runner (Root Entrypoint)
# ============================================================
$ROOT = $PSScriptRoot
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"

$NODE_PATH = "C:\Program Files\nodejs"
$PYTHON_DIR = "C:\Users\USER\AppData\Local\Programs\Python\Python313"
$PYTHON_SCRIPTS = "C:\Users\USER\AppData\Local\Programs\Python\Python313\Scripts"
$SCANNERS = "C:\tools\scanners"
$SYS32 = "C:\WINDOWS\system32"
$WIN = "C:\WINDOWS"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting SecureAI Control Plane (Full Stack)    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Start Backend in new PowerShell window
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
$backendCmd = "`$env:COMSPEC = '$SYS32\cmd.exe'; `$env:PATH = '$NODE_PATH;$PYTHON_DIR;$PYTHON_SCRIPTS;$SCANNERS;$SYS32;$WIN;' + `$env:PATH; Set-Location '$BACKEND'; Write-Host 'FastAPI Backend running on http://localhost:8000' -ForegroundColor Green; if (Get-Command py -ErrorAction SilentlyContinue) { py -3.13 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app } else { python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app }"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Start Frontend in new PowerShell window
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3002 ..." -ForegroundColor Yellow
$frontendCmd = "`$env:COMSPEC = '$SYS32\cmd.exe'; `$env:PATH = '$NODE_PATH;$SYS32;$WIN;' + `$env:PATH; Set-Location '$FRONTEND'; Write-Host 'Next.js Frontend running on http://localhost:3002' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Start-Sleep -Seconds 4
Write-Host ""
Write-Host "Opening http://localhost:3002/login in default browser..." -ForegroundColor Green
Start-Process "http://localhost:3002/login"

Write-Host ""
Write-Host "Both services are running in separate terminal windows." -ForegroundColor Cyan
Write-Host "Keep both terminal windows open while using the app." -ForegroundColor Gray
