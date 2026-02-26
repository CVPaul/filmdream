@echo off
chcp 65001 >nul 2>nul

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

REM Get current directory (where this script is located)
set "ROOT_DIR=%~dp0"
set "SERVER_DIR=%ROOT_DIR%server"

echo [INFO] Root directory: %ROOT_DIR%
echo [INFO] Server directory: %SERVER_DIR%

REM Check if server directory exists
if not exist "%SERVER_DIR%\server.js" (
    echo [ERROR] server.js not found in: %SERVER_DIR%
    pause
    exit /b 1
)

REM Check and install dependencies
if not exist "%SERVER_DIR%\node_modules" (
    echo.
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
start "" "http://localhost:3001"

REM Run server
node server.js

pause
