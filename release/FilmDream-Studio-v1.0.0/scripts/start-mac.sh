#!/bin/bash
# FilmDream Studio - Mac 启动脚本
# 使用方法: 双击运行或在终端执行 ./start-mac.sh

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🎬 FilmDream Studio 启动中..."
echo "📁 项目目录: $PROJECT_DIR"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装："
    echo "   brew install node"
    echo "   或访问 https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查依赖是否已安装
if [ ! -d "$PROJECT_DIR/server/node_modules" ]; then
    echo "📦 首次运行，安装依赖..."
    cd "$PROJECT_DIR"
    npm run install:all
fi

# 启动服务器
cd "$PROJECT_DIR/server"
echo "🚀 启动服务器..."
echo "   前端: http://localhost:3001"
echo "   API:  http://localhost:3001/api"
echo ""
echo "按 Ctrl+C 停止服务"
echo "================================"

# 启动后自动打开浏览器
(sleep 2 && open "http://localhost:3001") &

node server.js
