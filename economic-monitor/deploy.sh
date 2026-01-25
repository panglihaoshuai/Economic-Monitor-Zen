#!/bin/bash

# Economic Monitor - 快速部署脚本
# 使用方法: ./deploy.sh

echo "🚀 Economic Monitor - 快速部署脚本"
echo "=================================="

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在 economic-monitor 目录下运行此脚本"
    exit 1
fi

# 1. 备份原有配置
echo "📦 备份原有配置..."
if [ -f "vercel.json" ]; then
    cp vercel.json vercel.json.backup
fi

# 2. 应用优化配置
echo "⚙️ 应用优化的定时任务配置..."
cp vercel.json.optimized vercel.json

# 3. 检查环境变量
echo "🔍 检查环境变量..."
if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local || grep -q "your_service_role_key_here" .env.local; then
    echo "⚠️  请配置 SUPABASE_SERVICE_ROLE_KEY 在 .env.local 文件中"
    echo "   获取地址: https://supabase.com/dashboard > 项目 > Settings > API"
fi

if ! grep -q "CRON_SECRET=" .env.local || grep -q "your_cron_secret" .env.local; then
    echo "⚠️  请配置 CRON_SECRET 在 .env.local 文件中"
    echo "   生成方式: openssl rand -base64 32"
fi

# 4. 运行连接测试
echo "🧪 运行连接测试..."
npx tsx test-connection.ts

echo ""
echo "✅ 准备工作完成！"
echo ""
echo "📋 下一步操作:"
echo "1. 配置 .env.local 中的缺失环境变量"
echo "2. 运行全量数据同步: npx tsx scripts/full-sync.ts"
echo "3. 部署到 Vercel: vercel --prod"
echo ""
echo "📖 详细说明请查看: DEPLOYMENT_GUIDE.md"