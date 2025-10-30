@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

REM Find a free port starting from 8000
set PORT=8000
set FOUND=0

for /L %%i in (0,1,100) do (
    set /a CURRENT_PORT=8000+%%i
    netstat -ano | find "LISTENING" | find ":!CURRENT_PORT! " >nul
    if errorlevel 1 (
        set PORT=!CURRENT_PORT!
        set FOUND=1
        goto :found_port
    )
)

:found_port
if %FOUND%==1 (
    echo.
    echo ====================================
    echo  AlgoRave Server
    echo ====================================
    echo Starting on http://localhost:%PORT%
    echo Press Ctrl+C to stop
    echo ====================================
    echo.
    python -m http.server %PORT%
) else (
    echo Error: Could not find a free port between 8000-8100
    pause
)
