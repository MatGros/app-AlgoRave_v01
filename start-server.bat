@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ====================================
    echo  ERROR: Node.js not found
    echo ====================================
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo.
    echo ====================================
    echo  Installing dependencies...
    echo ====================================
    echo.
    call npm install
)

REM Start the server
echo.
echo ====================================
echo  AlgoRave Server
echo ====================================
echo Starting on http://localhost:8000
echo Press Ctrl+C to stop
echo ====================================
echo.

node server.js
