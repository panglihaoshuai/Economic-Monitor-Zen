# 🔒 安全配置指南

## 🚨 重要提醒

本项目的所有敏感API密钥已从代码库中移除，并替换为占位符值。**请勿将真实的API密钥提交到Git仓库**。

## 📋 环境变量配置清单

### 必需的API密钥

| 环境变量 | 获取方式 | 用途 | 最小长度 |
|---------|----------|------|----------|
| `FRED_API_KEY` | [FRED API](https://fred.stlouisfed.org/docs/api/api_key) | 获取美国经济数据 | 32字符 |
| `NEXTAUTH_SECRET` | 生成: `openssl rand -base64 32` | NextAuth认证签名 | 32字符 |
| `ENCRYPTION_KEY` | 生成: `openssl rand -base64 32` | 加密敏感数据 | 32字符 |
| `CRON_SECRET` | 生成: `openssl rand -base64 32` | 定时任务安全验证 | 32字符 |

### 可选的API密钥

| 环境变量 | 获取方式 | 用途 |
|---------|----------|------|
| `RESEND_API_KEY` | [Resend](https://resend.com/) | 邮件发送功能 |
| `DEEPSEEK_API_KEY` | [DeepSeek](https://platform.deepseek.com/) | AI分析功能 |

### 数据库配置

| 环境变量 | 获取方式 | 用途 |
|---------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase项目设置](https://supabase.com/dashboard) | 前端数据库连接 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase项目设置 | 前端匿名访问 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase项目设置 | 后端管理权限 |
| `DATABASE_URL` | Supabase项目设置 | 数据库连接字符串 |

## 🚀 Vercel部署配置

### 步骤1: 设置环境变量

1. 进入 [Vercel项目设置](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings → Environment Variables**
4. 添加以下必需的环境变量：

```bash
# 认证相关
NEXTAUTH_SECRET=your_generated_nextauth_secret_32chars
ENCRYPTION_KEY=your_generated_encryption_key_32chars
CRON_SECRET=your_generated_cron_secret_32chars

# API密钥
FRED_API_KEY=your_fred_api_key
RESEND_API_KEY=your_resend_api_key  # 可选

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### 步骤2: 配置域名

1. 在 **Settings → Domains** 中添加你的自定义域名
2. 配置DNS记录指向Vercel

### 步骤3: 测试部署

1. 推送代码到GitHub后，Vercel会自动触发部署
2. 检查部署日志确保无错误
3. 验证网站功能正常

## 🔧 本地开发配置

### 1. 复制环境变量模板

```bash
# 复制环境变量文件
cp .env.example .env.local
```

### 2. 填写本地开发配置

编辑 `.env.local` 文件，添加你的API密钥：

```env
# API密钥
FRED_API_KEY=your_fred_api_key
NEXTAUTH_SECRET=your_nextauth_secret_here_32chars
ENCRYPTION_KEY=your_encryption_key_32_characters_long
CRON_SECRET=your_cron_secret_here_minimum_32_chars

# 数据库配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# 可选功能
RESEND_API_KEY=your_resend_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 3. 启动开发服务器

```bash
npm install
npm run dev
```

## 🛡️ 安全最佳实践

### ✅ 已实施的安全措施

1. **API密钥分离**: 敏感密钥存储在环境变量中
2. **Git忽略**: `.env` 文件已添加到 `.gitignore`
3. **客户端/服务端分离**: 客户端仅暴露必要的公开密钥
4. **加密存储**: 敏感数据使用AES加密
5. **定时任务保护**: CRON操作需要安全验证

### 🔄 密钥轮换

建议每3-6个月轮换一次API密钥：

```bash
# 生成新的密钥
openssl rand -base64 32

# 更新环境变量
# 在Vercel控制台中更新
# 本地开发更新 .env.local
```

### 🔍 故障排除

#### 构建错误：ENCRYPTION_KEY

如果遇到 "ENCRYPTION_KEY must be set" 错误：

1. 检查Vercel环境变量中是否设置了ENCRYPTION_KEY
2. 确保密钥长度至少32字符
3. 重新触发部署

#### 认证错误

1. 确认NEXTAUTH_SECRET已正确设置
2. 检查NextAuth配置中的URL设置
3. 清除浏览器cookie重新测试

## 📞 支持

如果遇到配置问题：

1. 检查 [Vercel部署日志](https://vercel.com/docs/concepts/deployments/overview)
2. 验证所有必需环境变量已设置
3. 确认API密钥权限和配额

---

> 🎯 **安全提醒**: 永远不要在代码中硬编码API密钥。始终使用环境变量或安全的密钥管理服务。