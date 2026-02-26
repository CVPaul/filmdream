@echo off
chcp 65001 >nul 2>nul
REM FilmDream Studio - Windows Startup Script

echo.
echo ========================================
echo   FilmDream Studio - Starting...
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found!
    echo         Please install from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "SERVER_DIR=%ROOT_DIR%\server"

REM Check if server directory exists
if not exist "%SERVER_DIR%" (
    echo [ERROR] Server directory not found: %SERVER_DIR%
    echo         Please make sure you are running from the correct location.
    pause
    exit /b 1
)

REM Check and install dependencies
if not exist "%SERVER_DIR%\node_modules" (
    echo [INFO] First run - installing server dependencies...
    cd /d "%SERVER_DIR%"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

REM Start server
cd /d "%SERVER_DIR%"
echo.
echo [INFO] Starting server...
echo        Frontend: http://localhost:3001
echo        API:      http://localhost:3001/api
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Open browser after short delay
timeout /t 2 /nobreak >nul
start "" "http://localhost:3001"

REM Run server
node server.js

pause
