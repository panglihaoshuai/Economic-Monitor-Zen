# 🚀 快速启动指南

## 📋 必填字段检查清单

请确认以下字段已在 `.env.local` 文件中正确填写：

### 🔑 核心API密钥 (必须填写)

- [ ] `FRED_API_KEY` - 从 https://fred.stlouisfed.org/docs/api/api_key 获取
- [ ] `NEXTAUTH_SECRET` - 32字符随机字符串，运行: `openssl rand -base64 32`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - 从 Supabase 控制台获取
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 从 Supabase 控制台获取
- [ ] `CRON_SECRET` - 32字符随机字符串

### 🎯 开发环境配置 (已预填)

- [x] `NEXTAUTH_URL` - http://localhost:3000 (本地开发)
- [x] `NEXT_PUBLIC_SUPABASE_URL` - https://amwvaakquduxoahmisww.supabase.co

### 🤖 可选AI功能

- [ ] `DEEPSEEK_API_KEY` - 如需AI分析功能，从 https://platform.deepseek.com/ 获取
- [ ] `RESEND_API_KEY` - 如需邮件通知功能，从 https://resend.com/ 获取

## 🏃‍♂️ 快速启动步骤

### 1. 获取FRED API密钥
```
🌐 访问: https://fred.stlouisfed.org/docs/api/api_key
📧 点击 "Request API Key"
📧 填写表单并提交
📧 复制生成的API密钥
📧 粘贴到 .env.local 文件的 FRED_API_KEY 字段
```

### 2. 获取Supabase密钥
```
🌐 访问: https://supabase.com/dashboard
📧 选择项目: amwvaakquduxoahmisww
📧 点击 Settings → API
📧 复制以下密钥:
   - Project URL (已预填)
   - anon public (填入 NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - service_role (填入 SUPABASE_SERVICE_ROLE_KEY)
```

### 3. 生成随机密钥
```bash
# 生成NextAuth密钥 (32字符)
openssl rand -base64 32

# 生成Cron密钥 (32字符)  
openssl rand -base64 32

# 复制生成的字符串到对应字段
```

### 4. 启动开发服务器
```bash
cd /d/fed/economic-monitor
npm install
npm run dev
```

## 🎯 验证配置

配置完成后，访问以下地址验证：

### 🌐 本地地址
- **主页**: http://localhost:3000
- **API测试**: http://localhost:3000/api/data
- **认证**: http://localhost:3000/api/auth/signin

### 📊 预期功能
1. ✅ 经济数据看板显示
2. ✅ 数据获取和更新功能
3. ✅ 异常检测系统
4. ✅ 交易记录管理
5. ✅ 响应式设计

## 🚨 常见问题

### Q: FRED API密钥无效
**A**: 确保从官方FRED网站申请，密钥通常是 `abcdefghijklmnopqrstuvwx123456` 格式

### Q: Supabase连接失败  
**A**: 检查密钥是否正确复制，确保没有多余空格

### Q: 页面加载空白
**A**: 检查浏览器控制台错误，通常是环境变量未正确加载

### Q: 数据显示为空
**A**: 检查网络连接和API密钥有效性，查看终端日志

## 📞 获取帮助

如遇到问题：
1. 📧 检查 `.env.local` 文件格式 (不要有多余空格)
2. 📧 确保所有必填字段都已填写
3. 📧 查看终端错误日志
4. 📧 检查浏览器开发者工具控制台

---

> 🎉 **配置完成后，您的禅意经济数据看板将立即运行！** 

> 📁 **项目文件**: `/d/fed/economic-monitor`
> 🌐 **GitHub**: https://github.com/panglihaoshuai/Economic-Monitor-Zen