@echo off
title SecureAI Control Plane Launcher
echo ===================================================
echo   Starting SecureAI Control Plane (Backend + Frontend)
echo ===================================================
echo.

set ROOT=%~dp0
set PATH=C:\Program Files\nodejs;C:\Users\USER\AppData\Local\Programs\Python\Python313;C:\Users\USER\AppData\Local\Programs\Python\Python313\Scripts;C:\tools\scanners;C:\WINDOWS\system32;C:\WINDOWS;%PATH%
if "%COMSPEC%"=="" set COMSPEC=C:\WINDOWS\system32\cmd.exe

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
pushd "%ROOT%backend"
start "SecureAI Backend (:8000)" cmd /k "py -3.13 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app"
popd

echo [2/2] Starting Next.js Frontend on http://localhost:3002 ...
pushd "%ROOT%frontend"
start "SecureAI Frontend (:3002)" cmd /k "npm run dev"
popd

echo.
echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo Opening browser at http://localhost:3002/login ...
start http://localhost:3002/login

echo.
echo ===================================================
echo   Services are running!
echo   - Frontend: http://localhost:3002/login
echo   - Backend:  http://localhost:8000/docs
echo ===================================================
echo Keep both terminal windows open.
