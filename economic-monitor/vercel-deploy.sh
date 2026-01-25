#!/bin/bash

# 🚀 一键部署到 Vercel
# 此脚本将帮助您完成最后的部署步骤

echo "🚀 正在准备一键部署到 Vercel..."

# 检查 Vercel CLI 状态
if ! command -v vercel &> /dev/null; then
    echo "❌ 未安装 Vercel CLI"
    echo ""
    echo "请先安装 Vercel CLI: npm install -g vercel"
    echo ""
    echo ""
    exit 1
else
    echo "✅ Vercel CLI 已准备就绪"
fi

# 检查环境文件
if [ ! -f "D:\fed\economic-monitor\.env.local" ]; then
    echo "⚠️ 未找到 .env.local 文件"
    echo "请先设置环境变量："
    echo "cp .env.example .env.local"
    echo "然后编辑 .env.local 文件"
    echo ""
    exit 1
fi

echo "📋 当前环境变量状态:"
if [ -f "D:\fed\economic-monitor\.env.local" ]; then
    echo "✅ .env.local 文件存在"
    echo "📝 显示关键变量："
    grep -E "FRED_API_KEY|NEXTAUTH_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local || echo "未设置"
    echo "🔧 检查加密存储密钥："
    grep -E "ENCRYPTION_KEY" .env.local || echo "未设置"
else
    echo "❌ 未找到 .env.local"
fi

echo ""
echo "=================================="

# 选项菜单
echo "请选择操作："
echo "1. 部署到 Vercel (推荐)"
echo "2. 手动配置环境变量"
echo "3. 查看部署状态"
echo "4. 退出"
echo "=================================="

read -p "请输入选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 开始部署到 Vercel..."
        
        # 设置生产环境变量
        export NODE_ENV=production
        
        # 执行部署
        if vercel --prod; then
            echo "✅ 部署成功！"
            echo "🌐 生产URL: https://economic-monitor-zen.vercel.app"
            echo "🎯 定时任务地址: https://economic-monitor-zen.vercel.app/api/cron/fetch-data"
            echo "📋 健康检查地址: https://economic-monitor-zen.vercel.app/api/cron/health-check"
            echo ""
        else
            echo "❌ 部署失败"
        fi
        ;;
        
    2)
        echo "📝 配置 FRED API 密钥..."
        echo "请输入您的 FRED API 密钥 (32字符):"
        read -s FRED_API_KEY
        if [ -n "$FRED_API_KEY" ] || [ ${#FRED_API_KEY} -lt 32 ]; then
            echo "⚠️ 密钥太短或为空"
            echo "请重新输入"
        else
            echo "✅ FRED API 密钥已设置"
            
            # 写入 .env.local
            echo "FRED_API_KEY=$FRED_API_KEY" > .env.local
            echo "CRON_SECRET=your_random_32_char_secret_here" >> .env.local
            echo "NEXTAUTH_SECRET=your_nextauth_secret_here" >> .env.local
            echo "NEXTAUTH_URL=https://economic-monitor-zen.vercel.app" >> .env.local
            echo "NEXT_PUBLIC_SUPABASE_URL=https://amwvaakquduxoahmisww.supabase.co" >> .env.local
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here" >> .env.local
            
            echo "✅ 环境变量已配置完成"
        fi
        ;;
        
    3)
        echo "📊 查看 Vercel 部署状态..."
        echo "请访问 Vercel Dashboard:"
        echo "1. https://vercel.com/panglihaoshuai/projects/economic-monitor"
        echo ""
        ;;
        
    4)
        echo "👋 退出部署"
        exit 0
        ;;
        
    *)
        echo "❌ 无效选择"
        ;;
esac

echo ""
echo "=================================="