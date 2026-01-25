# 🔐 Vercel 环境变量配置指南

## 📋 必需的环境变量

在部署之前，你需要在 Vercel Dashboard 中配置以下环境变量。

### 方法 1: 使用 Vercel CLI（推荐）

```powershell
# 设置代理（如果需要）
$env:HTTP_PROXY="socks5://127.0.0.1:7898"
$env:HTTPS_PROXY="socks5://127.0.0.1:7898"

# 进入项目目录
cd economic-monitor

# 添加环境变量（生产环境）
npx vercel env add FRED_API_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add CRON_SECRET production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add NEXTAUTH_SECRET production
npx vercel env add NEXTAUTH_URL production
npx vercel env add NEXT_PUBLIC_APP_URL production

# 添加环境变量（预览环境）
npx vercel env add FRED_API_KEY preview
npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview
# ... 重复其他变量
```

### 方法 2: 使用 Vercel Dashboard

1. 访问 https://vercel.com/dashboard
2. 选择你的项目 `economic-monitor`
3. 进入 **Settings** > **Environment Variables**
4. 添加以下变量：

#### 必需变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `FRED_API_KEY` | FRED API 密钥 | https://fred.stlouisfed.org/docs/api/api_key.html |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | Supabase Dashboard > Settings > API |
| `CRON_SECRET` | 定时任务安全密钥 | 使用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Supabase Dashboard > Settings > API |
| `NEXTAUTH_SECRET` | NextAuth 加密密钥 | 使用 `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | NextAuth URL | 你的 Vercel 应用 URL |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | 你的 Vercel 应用 URL |

#### 可选变量

| 变量名 | 说明 |
|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek AI API 密钥（可选） |
| `RESEND_API_KEY` | Resend 邮件服务密钥（可选） |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID（可选） |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端密钥（可选） |
| `ENCRYPTION_KEY` | 数据加密密钥（可选） |

### 生成密钥命令

```powershell
# 生成 CRON_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# 生成 NEXTAUTH_SECRET（同上）
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## ⚠️ 重要提示

1. **环境变量作用域**：
   - `Production`: 生产环境
   - `Preview`: 预览环境（Git 分支部署）
   - `Development`: 本地开发环境

2. **部署后生效**：添加环境变量后，需要重新部署才能生效

3. **敏感信息**：不要将 API 密钥提交到 Git 仓库

## ✅ 配置完成后

运行以下命令重新部署：

```powershell
npx vercel --prod
```
