@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   AeroTwin - MALE UAV Aero Engine Diagnostics
echo   Starting Backend + Frontend Servers
echo ============================================================
echo.

:: Define directory paths safely with quotes
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

:: Kill existing processes on ports 8000 and 5173 if running
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    if not "%%a"=="0" taskkill /f /pid %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    if not "%%a"=="0" taskkill /f /pid %%a 2>nul
)

:: Start Backend
echo [1/2] Starting Backend Server (FastAPI on port 8000)...
start "AeroTwin Backend" /D "%BACKEND_DIR%" cmd /k "python main.py"
timeout /t 5 /nobreak > nul

:: Start Frontend Dev Server
echo [2/2] Starting Frontend Dev Server (Vite on port 5173)...
start "AeroTwin Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo.
echo ============================================================
echo   AeroTwin is running!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ============================================================
echo.
echo Opening dashboard in browser...
start http://localhost:5173
