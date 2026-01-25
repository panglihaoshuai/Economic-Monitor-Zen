#!/bin/bash

# 🚀 项目启动脚本
echo "🌸 禅意经济数据看板 - 启动中..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "📋 请访问: https://nodejs.org/"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "📋 请参考 QUICK_START_GUIDE.md 配置环境变量"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 选择启动模式
if [ "$1" = "dev" ]; then
    echo "🔧 启动开发服务器..."
    npm run dev
elif [ "$1" = "build" ]; then
    echo "🏗️ 构建生产版本..."
    npm run build
elif [ "$1" = "install" ]; then
    echo "📦 安装依赖..."
    npm install
else
    echo "🎯 使用方法:"
    echo "   ./start.sh dev    # 开发模式"
    echo "   ./start.sh build # 构建模式"
    echo "   ./start.sh install # 安装依赖"
    echo ""
    echo "🌐 开发地址: http://localhost:3000"
    echo "🌐 生产地址: https://economic-monitor-zen.vercel.app"
fi