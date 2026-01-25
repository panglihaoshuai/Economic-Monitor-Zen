#!/bin/bash

# 🎯 环境变量验证脚本
echo "🔍 验证环境变量配置..."
echo ""

# 检查.env.local文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    exit 1
fi

echo "✅ .env 文件存在"
echo ""

# 读取环境变量
source .env

# 验证必需字段
echo "🔑 检查必需字段:"
required_vars=(
    "FRED_API_KEY"
    "NEXTAUTH_SECRET" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "CRON_SECRET"
)

all_good=true
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ $var 未填写"
        all_good=false
    else
        echo "✅ $var 已填写"
    fi
done

echo ""

# 验证可选字段
echo "🎯 检查可选字段:"
optional_vars=(
    "DEEPSEEK_API_KEY"
    "RESEND_API_KEY"
)

for var in "${optional_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚪ $var 未填写 (可选)"
    else
        echo "✅ $var 已填写"
    fi
done

echo ""

# 总结
if [ "$all_good" = true ]; then
    echo "🎉 所有必要环境变量都已填写！"
    echo ""
    echo "🚀 现在可以运行:"
    echo "   npm run dev    # 启动开发服务器"
    echo "   npm run build  # 构建生产版本"
    echo ""
    echo "🌐 开发地址: http://localhost:3000"
    echo "🌐 生产地址: https://economic-monitor-zen.vercel.app"
else
    echo "⚠️  请填写未配置的必需字段"
    echo ""
    echo "📋 参考快速启动指南: QUICK_START_GUIDE.md"
fi

echo ""
echo "🔗 链接:"
echo "   FRED API: https://fred.stlouisfed.org/docs/api/api_key"
echo "   Supabase: https://supabase.com/dashboard/project/amwvaakquduxoahmisww"