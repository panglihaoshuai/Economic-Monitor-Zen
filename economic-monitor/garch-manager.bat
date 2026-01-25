@echo off
REM GARCH Service Manager for Windows
REM 管理Python GARCH服务的启动、停止和状态检查

setlocal enabledelayedexpansion

set GARCH_DIR=services\garch
set GARCH_PORT=%GARCH_PORT%:8000
set GARCH_HOST=%GARCH_HOST%:0.0.0.0

echo 🔧 GARCH Service Manager
echo =======================

REM 检查目录是否存在
if not exist "%GARCH_DIR%" (
    echo ❌ GARCH service directory not found: %GARCH_DIR%
    exit /b 1
)

REM 进入服务目录
cd %GARCH_DIR%

if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="status" goto status
if "%1"=="install" goto install
if "%1"=="test" goto test
if "%1"=="logs" goto logs
goto usage

:start
echo 🚀 Starting GARCH service...

REM 检查是否已安装依赖
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM 激活虚拟环境并安装依赖
call venv\Scripts\activate

echo 📚 Installing dependencies...
pip install -q -r requirements.txt

REM 启动服务
echo 🌐 Starting FastAPI server on %GARCH_HOST%:%GARCH_PORT%...
start /B uvicorn main:app --host %GARCH_HOST% --port %GARCH_PORT% --reload

REM 等待服务启动
timeout /t 3 /nobreak > nul

REM 健康检查
curl -s http://localhost:%GARCH_PORT%/ > nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ GARCH service started successfully!
    echo 📊 API Docs: http://localhost:%GARCH_PORT%/docs
    echo 🔗 Health Check: http://localhost:%GARCH_PORT%/
) else (
    echo ❌ Failed to start GARCH service
    exit /b 1
)
goto end

:stop
echo 🛑 Stopping GARCH service...

REM 查找并停止uvicorn进程
tasklist /FI "IMAGENAME eq python.exe" /FO CSV | find "uvicorn" > nul
if !errorlevel! equ 0 (
    echo Stopping uvicorn processes...
    for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV ^| find "uvicorn"') do (
        taskkill /PID %%i /F > nul 2>&1
    )
    echo ✅ GARCH service stopped
) else (
    echo ℹ️  GARCH service not running
)
goto end

:status
echo 📊 Checking GARCH service status...

curl -s http://localhost:%GARCH_PORT%/ > nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ GARCH service is running
    echo 🔗 Health Check: http://localhost:%GARCH_PORT%/
    
    REM 获取服务信息
    echo.
    curl -s http://localhost:%GARCH_PORT%/
) else (
    echo ❌ GARCH service is not running
)
goto end

:install
echo 📦 Installing GARCH service dependencies...

REM 创建虚拟环境
if not exist "venv" (
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate

REM 升级pip
python -m pip install --upgrade pip

REM 安装依赖
pip install -r requirements.txt

echo ✅ Dependencies installed successfully
goto end

:test
echo 🧪 Testing GARCH service...

REM 检查服务是否运行
curl -s http://localhost:%GARCH_PORT%/ > nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ GARCH service is not running. Start with: garch-manager.bat start
    exit /b 1
)

REM 测试异常检测
echo Testing anomaly detection...
curl -X POST http://localhost:%GARCH_PORT%/anomaly ^
     -H "Content-Type: application/json" ^
     -d "{\"current_value\": 5.5, \"historical_values\": [5.1, 5.15, 5.12, 5.08, 5.20, 5.18, 5.25, 5.22, 5.19, 5.16], \"confidence_level\": 0.95}"

echo.
echo ✅ Test completed
goto end

:logs
echo 📝 Showing GARCH service logs...
echo ℹ️  Check the terminal where you started the service
goto end

:usage
echo Usage: %0 {start^|stop^|status^|install^|test^|logs}
echo.
echo Commands:
echo   start   - Start the GARCH service
echo   stop    - Stop the GARCH service
echo   status  - Check service status
echo   install - Install dependencies
echo   test    - Test service endpoints
echo   logs    - Show service logs
echo.
echo Environment variables:
echo   GARCH_PORT - Port number (default: 8000)
echo   GARCH_HOST - Host address (default: 0.0.0.0)
exit /b 1

:end
endlocal