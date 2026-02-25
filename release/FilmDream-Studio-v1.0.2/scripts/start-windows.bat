@echo off
REM FilmDream Studio - Windows 启动脚本
REM 使用方法: 双击运行

echo 🎬 FilmDream Studio 启动中...

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 未找到 Node.js，请先安装：
    echo    https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

REM 检查服务器依赖
if not exist "%~dp0..\server\node_modules" (
    echo 📦 首次运行，安装服务器依赖...
    cd /d "%~dp0..\server"
    call npm install
)

REM 启动服务器
cd /d "%~dp0..\server"
echo 🚀 启动服务器...
echo    前端: http://localhost:3001
echo    API:  http://localhost:3001/api
echo.
echo 按 Ctrl+C 停止服务
echo ================================

REM 启动后打开浏览器
start "" "http://localhost:3001"

node server.js
