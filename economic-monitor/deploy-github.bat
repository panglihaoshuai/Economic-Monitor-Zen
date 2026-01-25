@echo off
echo 🚀 推送到 GitHub...
echo.

:: 检查 Git 状态
git status
echo.

:: 添加所有更改
git add .
echo.

:: 提交更改
git commit -m "deploy: add Vercel deployment and daily data fetching

- Add Vercel configuration with cron jobs
- Create daily/weekly data fetch endpoints  
- Add health check for monitoring
- Support hourly economic data updates
- Include critical indicators tracking
- Add authentication for cron jobs
- Configure environment variables for deployment"
echo.

:: 推送到远程仓库
git push -u origin main
echo.

echo ✅ 完成！
echo 📋 下一步操作：
echo 1. 访问 https://vercel.com/new 导入仓库
echo 2. 配置环境变量（需要 API 密钥）
echo 3. 部署到 Vercel
echo.
pause