# 🚀 Vercel 部署完整指南

## 📋 概述

本指南将帮助你：
1. ✅ 将项目部署到 Vercel
2. ✅ 配置所有必需的环境变量
3. ✅ 设置定时任务每天自动获取数据
4. ✅ 验证部署是否成功

---

## 🔧 第一步：准备环境变量

### 必需的环境变量

在部署到 Vercel 之前，你需要准备以下环境变量：

#### 1. **FRED API Key** (必需)
- **用途**: 获取美国经济数据
- **获取地址**: https://fred.stlouisfed.org/docs/api/api_key.html
- **说明**: 免费注册即可获得，支持 120 requests/分钟

#### 2. **Supabase 配置** (必需)
- **NEXT_PUBLIC_SUPABASE_URL**: Supabase 项目 URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase 匿名密钥
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase 服务角色密钥（重要！）
- **获取地址**: https://supabase.com/dashboard > 你的项目 > Settings > API

#### 3. **CRON_SECRET** (必需)
- **用途**: 保护定时任务端点，防止未授权访问
- **生成方式**: 
  ```bash
  openssl rand -base64 32
  ```
  或者在 PowerShell 中：
  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
  ```

#### 4. **NextAuth 配置** (必需)
- **NEXTAUTH_SECRET**: 用于加密会话
- **生成方式**: 同 CRON_SECRET
- **NEXTAUTH_URL**: 你的 Vercel 应用 URL（部署后会自动设置）

#### 5. **应用 URL** (必需)
- **NEXT_PUBLIC_APP_URL**: 你的 Vercel 应用 URL
- **示例**: `https://economic-monitor-zen.vercel.app`

#### 6. **可选配置**
- **DEEPSEEK_API_KEY**: AI 异常分析（可选）
- **RESEND_API_KEY**: 邮件通知服务（可选）
- **GOOGLE_CLIENT_ID/SECRET**: Google 登录（可选）
- **ENCRYPTION_KEY**: 数据加密（可选）

---

## 📤 第二步：部署到 Vercel

### 方法 1: 通过 GitHub 自动部署（推荐）

1. **推送代码到 GitHub**（已完成 ✅）
   ```bash
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 https://vercel.com
   - 点击 "Add New Project"
   - 选择你的 GitHub 仓库 `panglihaoshuai/Economic-Monitor-Zen`
   - 选择项目根目录：**economic-monitor**（重要！）
   - 框架预设：**Next.js**（会自动检测）

3. **配置环境变量**
   - 在部署配置页面，找到 "Environment Variables" 部分
   - 添加以下环境变量：

   ```
   FRED_API_KEY = 你的FRED_API_KEY
   NEXT_PUBLIC_SUPABASE_URL = 你的Supabase URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY = 你的Supabase匿名密钥
   SUPABASE_SERVICE_ROLE_KEY = 你的Supabase服务角色密钥
   CRON_SECRET = 你生成的CRON_SECRET
   NEXTAUTH_SECRET = 你生成的NEXTAUTH_SECRET
   NEXTAUTH_URL = https://你的应用名.vercel.app
   NEXT_PUBLIC_APP_URL = https://你的应用名.vercel.app
   ```

4. **部署**
   - 点击 "Deploy"
   - 等待部署完成（约 2-5 分钟）

### 方法 2: 使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 进入项目目录
cd economic-monitor

# 部署（首次会引导配置）
vercel

# 生产环境部署
vercel --prod
```

---

## ⏰ 第三步：配置定时任务

### 当前定时任务配置

项目已配置以下定时任务（在 `vercel.json` 中）：

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-data",
      "schedule": "0 8 * * *"  // 每天 UTC 8:00 (北京时间 16:00)
    },
    {
      "path": "/api/cron/check-anomalies",
      "schedule": "5 8 * * *"  // 每天 UTC 8:05 (数据获取后5分钟)
    },
    {
      "path": "/api/cron/weekly-full-sync",
      "schedule": "0 2 * * 0"  // 每周日凌晨 2:00 UTC
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "0 12 * * *" // 每天 UTC 12:00
    }
  ]
}
```

### 时间说明

- **UTC 8:00** = 北京时间 16:00（标准时间）或 17:00（夏令时）
- **为什么选择这个时间？**
  - 美国经济数据通常在美东时间 8:30 AM 发布
  - UTC 8:00 相当于美东时间 3:00/4:00 AM
  - 给数据处理留出充足时间

### 验证定时任务

部署后，在 Vercel Dashboard 中：
1. 进入你的项目
2. 点击 "Cron Jobs" 标签
3. 查看定时任务状态
4. 等待第一次执行后查看日志

---

## 🔍 第四步：验证部署

### 1. 检查应用是否正常运行

访问你的 Vercel 应用 URL：
```
https://你的应用名.vercel.app
```

### 2. 测试定时任务端点

```bash
# 手动触发数据获取（需要 CRON_SECRET）
curl -X GET "https://你的应用名.vercel.app/api/cron/fetch-data" \
  -H "Authorization: Bearer 你的CRON_SECRET"
```

### 3. 检查 Vercel 函数日志

在 Vercel Dashboard 中：
1. 进入项目 > "Functions" 标签
2. 查看函数执行日志
3. 确认没有错误

### 4. 验证数据获取

1. 等待定时任务执行（或手动触发）
2. 在 Supabase Dashboard 中查看 `economic_data` 表
3. 确认有新数据插入

---

## 🛠️ 常见问题排查

### 问题 1: 定时任务不执行

**可能原因：**
- CRON_SECRET 未配置或配置错误
- 路径配置错误（应该是 `/api/cron/...`）

**解决方法：**
1. 检查 Vercel Dashboard 中的环境变量
2. 确认 `vercel.json` 中的路径以 `/` 开头
3. 查看 Vercel 函数日志

### 问题 2: 数据获取失败

**可能原因：**
- FRED_API_KEY 未配置或无效
- SUPABASE_SERVICE_ROLE_KEY 未配置
- API 限速

**解决方法：**
1. 验证 FRED API Key 是否有效
2. 检查 Supabase 服务角色密钥
3. 查看函数日志中的错误信息

### 问题 3: 环境变量未生效

**可能原因：**
- 环境变量名称错误
- 需要重新部署

**解决方法：**
1. 在 Vercel Dashboard 中检查环境变量
2. 修改后需要重新部署才能生效
3. 确保变量名称与代码中一致

---

## 📊 监控和维护

### 查看定时任务执行记录

在 Vercel Dashboard 中：
1. 项目 > "Cron Jobs" 标签
2. 查看每个任务的执行历史
3. 检查成功率和执行时间

### 查看函数日志

1. 项目 > "Functions" 标签
2. 选择对应的函数
3. 查看实时日志和错误信息

### 数据质量监控

访问应用的健康检查端点：
```
https://你的应用名.vercel.app/api/cron/health-check
```

---

## ✅ 部署检查清单

在部署前确认：

- [ ] 所有必需的环境变量已配置
- [ ] FRED API Key 已获取并配置
- [ ] Supabase 配置完整（包括 Service Role Key）
- [ ] CRON_SECRET 已生成并配置
- [ ] NEXTAUTH_SECRET 已生成并配置
- [ ] `vercel.json` 配置正确
- [ ] 项目根目录设置为 `economic-monitor`
- [ ] 代码已推送到 GitHub

部署后验证：

- [ ] 应用可以正常访问
- [ ] 定时任务已创建
- [ ] 手动触发数据获取成功
- [ ] Supabase 中有新数据
- [ ] 函数日志无错误

---

## 🎉 完成！

部署成功后，你的应用将：
- ✅ 每天自动获取最新的经济数据
- ✅ 自动检测数据异常
- ✅ 每周进行全量数据同步
- ✅ 定期进行健康检查

**下一步：**
1. 在 Supabase 中初始化数据库表结构
2. 运行一次全量数据同步
3. 配置用户通知设置（如果使用邮件服务）

---

## 📚 相关文档

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 详细部署指南
- [VERCEL_GARCH_GUIDE.md](./VERCEL_GARCH_GUIDE.md) - GARCH 配置指南
- [README.md](./README.md) - 项目说明

---

## 💡 提示

1. **环境变量安全**: 不要在代码中硬编码 API 密钥
2. **定期检查**: 定期查看定时任务执行情况
3. **备份数据**: 定期备份 Supabase 数据
4. **监控成本**: 注意 Vercel 和 Supabase 的使用量

如有问题，请查看 Vercel 函数日志或联系支持。
