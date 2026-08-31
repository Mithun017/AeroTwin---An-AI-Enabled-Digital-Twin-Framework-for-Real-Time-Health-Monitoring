@echo off
setlocal EnableDelayedExpansion
title AeroTwin — Demo Launcher

echo.
echo  =====================================================
echo   AeroTwin ^| SIH 2026 ^| PS-26054 (DRDO)
echo   AI-Enabled Digital Twin for Piston Engine Health
echo  =====================================================
echo.

:: ── Resolve project root (this .bat lives in aerotwin/) ──────────────────
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

:: ── 1. Backend Python deps ────────────────────────────────────────────────
echo [1/4] Installing backend dependencies...
pip install -r "%BACKEND%\requirements.txt" --quiet
if errorlevel 1 (
    echo  ERROR: pip install failed. Make sure Python 3.10+ is on PATH.
    pause & exit /b 1
)
echo       ^> Done.

:: ── 2. Frontend Node deps ─────────────────────────────────────────────────
echo [2/4] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install --silent
if errorlevel 1 (
    echo  ERROR: npm install failed. Make sure Node 18+ is on PATH.
    pause & exit /b 1
)
echo       ^> Done.

:: ── 3. Start backend ──────────────────────────────────────────────────────
echo [3/4] Starting AeroTwin backend (port 8000)...
cd /d "%BACKEND%"
start "AeroTwin Backend" cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo       ^> Backend window opened.

:: ── 4. Start frontend ─────────────────────────────────────────────────────
echo [4/4] Starting AeroTwin frontend (port 5173)...
cd /d "%FRONTEND%"
start "AeroTwin Frontend" cmd /k "npm run dev"
echo       ^> Frontend window opened.

:: ── Summary ───────────────────────────────────────────────────────────────
echo.
echo  =====================================================
echo   AeroTwin is starting up. Check each window.
echo.
echo   Backend  health : http://localhost:8000/health
echo   Frontend        : http://localhost:5173
echo   API docs        : http://localhost:8000/docs
echo.
echo   NOTE: On first run, ML model training takes 30-60s.
echo         Subsequent restarts load from cache (^<2s).
echo  =====================================================
echo.

:: ── Docker note (future deployment only — not the demo path) ─────────────
echo  TIP: For containerised deployment see deploy\docker-compose.yml
echo       (not required for demo — start.bat is the live demo launcher)
echo.
pause
