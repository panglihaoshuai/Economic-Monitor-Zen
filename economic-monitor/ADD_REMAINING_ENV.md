# 🔐 添加剩余环境变量

## ✅ 已自动添加的变量

以下变量已自动生成并添加到 Vercel：

- ✅ `CRON_SECRET` - 定时任务安全密钥
- ✅ `NEXTAUTH_SECRET` - NextAuth 加密密钥  
- ✅ `NEXTAUTH_URL` - NextAuth URL
- ✅ `NEXT_PUBLIC_APP_URL` - 应用 URL

## ⚠️ 需要手动添加的变量

以下变量需要你提供实际值。请准备好这些信息后，运行相应的命令：

### 1. FRED_API_KEY

```powershell
# 设置代理
$env:HTTP_PROXY="socks5://127.0.0.1:7898"
$env:HTTPS_PROXY="socks5://127.0.0.1:7898"

cd economic-monitor

# 添加 FRED_API_KEY（会提示输入值）
echo "你的FRED_API_KEY" | npx vercel env add FRED_API_KEY production
echo "你的FRED_API_KEY" | npx vercel env add FRED_API_KEY preview
```

**获取方式：** https://fred.stlouisfed.org/docs/api/api_key.html

### 2. SUPABASE_SERVICE_ROLE_KEY

```powershell
echo "你的SUPABASE_SERVICE_ROLE_KEY" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "你的SUPABASE_SERVICE_ROLE_KEY" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview
```

**获取方式：** Supabase Dashboard > 你的项目 > Settings > API > Service Role Key

### 3. NEXT_PUBLIC_SUPABASE_URL

```powershell
echo "你的SUPABASE_URL" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "你的SUPABASE_URL" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
```

**获取方式：** Supabase Dashboard > 你的项目 > Settings > API > Project URL

### 4. NEXT_PUBLIC_SUPABASE_ANON_KEY

```powershell
echo "你的SUPABASE_ANON_KEY" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "你的SUPABASE_ANON_KEY" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
```

**获取方式：** Supabase Dashboard > 你的项目 > Settings > API > Anon/Public Key

## 🚀 快速添加脚本

你也可以创建一个简单的脚本，替换下面的值后运行：

```powershell
# 设置代理
$env:HTTP_PROXY="socks5://127.0.0.1:7898"
$env:HTTPS_PROXY="socks5://127.0.0.1:7898"

cd economic-monitor

# 替换下面的值为你的实际值
$FRED_API_KEY = "你的FRED_API_KEY"
$SUPABASE_SERVICE_ROLE_KEY = "你的SUPABASE_SERVICE_ROLE_KEY"
$SUPABASE_URL = "你的SUPABASE_URL"
$SUPABASE_ANON_KEY = "你的SUPABASE_ANON_KEY"

# 添加到生产环境
echo $FRED_API_KEY | npx vercel env add FRED_API_KEY production
echo $SUPABASE_SERVICE_ROLE_KEY | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo $SUPABASE_URL | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo $SUPABASE_ANON_KEY | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# 添加到预览环境
echo $FRED_API_KEY | npx vercel env add FRED_API_KEY preview
echo $SUPABASE_SERVICE_ROLE_KEY | npx vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo $SUPABASE_URL | npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview
echo $SUPABASE_ANON_KEY | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
```

## ✅ 验证环境变量

添加完成后，验证所有环境变量：

```powershell
npx vercel env ls
```

## 🚀 重新部署

配置完所有环境变量后，重新部署应用：

```powershell
npx vercel --prod
```

## 💡 提示

- 所有密钥都会被加密存储
- 建议同时添加到 Production 和 Preview 环境
- 添加环境变量后需要重新部署才能生效
