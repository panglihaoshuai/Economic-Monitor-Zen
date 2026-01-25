# Vercel 环境变量配置指南

## 📋 配置步骤

### 1. 登录 Vercel 并进入项目设置
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（economic-monitor）
3. 点击 **Settings**（设置）
4. 在左侧菜单选择 **Environment Variables**（环境变量）

### 2. 添加环境变量

在 Vercel 的环境变量页面，逐个添加以下环境变量：

---

## 🔑 必须配置的环境变量

### 核心 API 密钥

```
变量名: FRED_API_KEY
值: 6d03f382a06187128c3d72d6cb37ea85
环境: Production, Preview, Development (全部勾选)
```

```
变量名: NEXTAUTH_SECRET
值: nZceDxeKivMF45Xuu8DnV3g62YDg4gnh
环境: Production, Preview, Development (全部勾选)
```

```
变量名: CRON_SECRET
值: sEopP-AnmDKbR6zaAIlLTFcjAUY0UfVa
环境: Production, Preview, Development (全部勾选)
```

```
变量名: ENCRYPTION_KEY
值: mW7ISIFg_Tc3-hNEUqiJLT_PRHN34580
环境: Production, Preview, Development (全部勾选)
```

### Supabase 数据库配置

```
变量名: NEXT_PUBLIC_SUPABASE_URL
值: https://amwvaakquduxoahmisww.supabase.co
环境: Production, Preview, Development (全部勾选)
```

```
变量名: NEXT_PUBLIC_SUPABASE_ANON_KEY
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0
环境: Production, Preview, Development (全部勾选)
```

```
变量名: SUPABASE_SERVICE_ROLE_KEY
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0
环境: Production, Preview (⚠️ 不要勾选 Development，这是敏感密钥)
```

### 认证配置

```
变量名: NEXTAUTH_URL
值: https://your-project-name.vercel.app
环境: Production (⚠️ 请替换为你的实际 Vercel 域名)
```

```
变量名: NODE_ENV
值: production
环境: Production (通常 Vercel 会自动设置，但可以手动添加)
```

---

## 📝 可选配置（如果需要 AI 功能）

### DeepSeek API（可选）

```
变量名: DEEPSEEK_API_KEY
值: (留空或填写你的 DeepSeek API 密钥)
环境: Production, Preview, Development (根据需要勾选)
```

### Resend API（可选）

```
变量名: RESEND_API_KEY
值: (留空或填写你的 Resend API 密钥)
环境: Production, Preview, Development (根据需要勾选)
```

---

## ⚠️ 重要提醒

### 安全注意事项

1. **NEXT_PUBLIC_ 前缀的变量**：这些变量会暴露给浏览器，是设计如此，可以安全地在所有环境中使用
2. **SUPABASE_SERVICE_ROLE_KEY**：这是敏感密钥，**不要**在 Development 环境中勾选，只在 Production 和 Preview 中使用
3. **NEXTAUTH_URL**：生产环境必须设置为你的实际 Vercel 域名（例如：`https://economic-monitor.vercel.app`）

### 配置完成后

1. 保存所有环境变量
2. 重新部署项目（Vercel 会自动触发，或手动点击 **Redeploy**）
3. 检查部署日志，确保没有环境变量相关的错误

---

## 🔍 验证配置

部署后，可以通过以下方式验证：

1. 在 Vercel 的部署日志中检查是否有环境变量缺失的警告
2. 访问你的应用，检查功能是否正常
3. 检查浏览器控制台是否有相关错误

---

## 📌 快速复制清单

如果你需要快速复制所有变量名，这里是完整列表：

```
FRED_API_KEY
NEXTAUTH_SECRET
CRON_SECRET
ENCRYPTION_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL
NODE_ENV
DEEPSEEK_API_KEY (可选)
RESEND_API_KEY (可选)
```

---

## 🎯 预期结果

配置完成后，你的应用应该能够：
- ✅ 正常连接到 Supabase 数据库
- ✅ 调用 FRED API 获取经济数据
- ✅ 使用 NextAuth 进行身份验证
- ✅ 执行定时任务（如果配置了 CRON）
- ✅ 加密敏感数据（如果使用了加密功能）

如果遇到问题，请检查：
1. 所有变量名是否正确（注意大小写）
2. 所有值是否正确复制（没有多余空格）
3. 环境选择是否正确（Production/Preview/Development）
4. 是否已重新部署项目
