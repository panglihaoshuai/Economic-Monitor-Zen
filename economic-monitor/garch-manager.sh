#!/bin/bash

# GARCH Service Manager
# 管理Python GARCH服务的启动、停止和状态检查

GARCH_DIR="services/garch"
GARCH_PORT=${GARCH_PORT:-8000}
GARCH_HOST=${GARCH_HOST:-0.0.0.0}

echo "🔧 GARCH Service Manager"
echo "======================="

# 检查目录是否存在
if [ ! -d "$GARCH_DIR" ]; then
    echo "❌ GARCH service directory not found: $GARCH_DIR"
    exit 1
fi

# 进入服务目录
cd "$GARCH_DIR"

case "$1" in
    "start")
        echo "🚀 Starting GARCH service..."
        
        # 检查是否已安装依赖
        if [ ! -d "venv" ]; then
            echo "📦 Creating virtual environment..."
            python3 -m venv venv
        fi
        
        # 激活虚拟环境并安装依赖
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
        
        echo "📚 Installing dependencies..."
        pip install -q -r requirements.txt
        
        # 启动服务
        echo "🌐 Starting FastAPI server on $GARCH_HOST:$GARCH_PORT..."
        uvicorn main:app --host $GARCH_HOST --port $GARCH_PORT --reload &
        
        # 等待服务启动
        sleep 3
        
        # 健康检查
        if curl -s http://localhost:$GARCH_PORT/ > /dev/null; then
            echo "✅ GARCH service started successfully!"
            echo "📊 API Docs: http://localhost:$GARCH_PORT/docs"
            echo "🔗 Health Check: http://localhost:$GARCH_PORT/"
        else
            echo "❌ Failed to start GARCH service"
            exit 1
        fi
        ;;
        
    "stop")
        echo "🛑 Stopping GARCH service..."
        
        # 查找并停止uvicorn进程
        if pgrep -f "uvicorn.*main:app" > /dev/null; then
            pkill -f "uvicorn.*main:app"
            sleep 2
            
            if pgrep -f "uvicorn.*main:app" > /dev/null; then
                echo "⚠️  Force killing GARCH service..."
                pkill -9 -f "uvicorn.*main:app"
            fi
            
            echo "✅ GARCH service stopped"
        else
            echo "ℹ️  GARCH service not running"
        fi
        ;;
        
    "status")
        echo "📊 Checking GARCH service status..."
        
        if curl -s http://localhost:$GARCH_PORT/ > /dev/null; then
            echo "✅ GARCH service is running"
            echo "🔗 Health Check: http://localhost:$GARCH_PORT/"
            
            # 获取服务信息
            echo ""
            curl -s http://localhost:$GARCH_PORT/ | head -10
        else
            echo "❌ GARCH service is not running"
            
            # 检查进程
            if pgrep -f "uvicorn.*main:app" > /dev/null; then
                echo "⚠️  Process exists but not responding"
            else
                echo "ℹ️  No process found"
            fi
        fi
        ;;
        
    "install")
        echo "📦 Installing GARCH service dependencies..."
        
        # 创建虚拟环境
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        
        # 激活虚拟环境
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
        
        # 升级pip
        pip install --upgrade pip
        
        # 安装依赖
        pip install -r requirements.txt
        
        echo "✅ Dependencies installed successfully"
        ;;
        
    "test")
        echo "🧪 Testing GARCH service..."
        
        # 检查服务是否运行
        if ! curl -s http://localhost:$GARCH_PORT/ > /dev/null; then
            echo "❌ GARCH service is not running. Start with: ./garch-manager.sh start"
            exit 1
        fi
        
        # 测试异常检测
        echo "Testing anomaly detection..."
        curl -X POST http://localhost:$GARCH_PORT/anomaly \
             -H "Content-Type: application/json" \
             -d '{
               "current_value": 5.5,
               "historical_values": [5.1, 5.15, 5.12, 5.08, 5.20, 5.18, 5.25, 5.22, 5.19, 5.16],
               "confidence_level": 0.95
             }' | jq .
        
        echo ""
        echo "✅ Test completed"
        ;;
        
    "logs")
        echo "📝 Showing GARCH service logs..."
        if command -v journalctl > /dev/null; then
            # 使用systemd日志
            journalctl -f -u garch-service 2>/dev/null || echo "No systemd logs found"
        else
            echo "ℹ️  Check the terminal where you started the service"
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|status|install|test|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the GARCH service"
        echo "  stop    - Stop the GARCH service"
        echo "  status  - Check service status"
        echo "  install - Install dependencies"
        echo "  test    - Test service endpoints"
        echo "  logs    - Show service logs"
        echo ""
        echo "Environment variables:"
        echo "  GARCH_PORT - Port number (default: 8000)"
        echo "  GARCH_HOST - Host address (default: 0.0.0.0)"
        exit 1
        ;;
esac