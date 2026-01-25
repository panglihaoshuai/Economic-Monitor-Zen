# 🔧 Vercel 环境变量作用域配置指南

## 📋 概述

在 Vercel 中配置环境变量时，有些变量可以在所有环境中使用相同的值（全局），有些变量需要根据不同的环境（Production/Preview/Development）设置不同的值。

---

## 🌐 全局变量（所有环境使用相同值）

这些变量在所有环境中（Production、Preview、Development）使用**完全相同的值**，可以一次性配置，勾选所有环境。

### ✅ 核心 API 密钥

| 变量名 | 值 | 环境选择 | 说明 |
|--------|-----|---------|------|
| `FRED_API_KEY` | `6d03f382a06187128c3d72d6cb37ea85` | ✅ Production<br>✅ Preview<br>✅ Development | FRED API 密钥，所有环境共用 |
| `NEXTAUTH_SECRET` | `nZceDxeKivMF45Xuu8DnV3g62YDg4gnh` | ✅ Production<br>✅ Preview<br>✅ Development | NextAuth 签名密钥，所有环境共用 |
| `CRON_SECRET` | `sEopP-AnmDKbR6zaAIlLTFcjAUY0UfVa` | ✅ Production<br>✅ Preview<br>✅ Development | 定时任务安全密钥，所有环境共用 |
| `ENCRYPTION_KEY` | `mW7ISIFg_Tc3-hNEUqiJLT_PRHN34580` | ✅ Production<br>✅ Preview<br>✅ Development | 数据加密密钥，所有环境共用 |

### ✅ Supabase 数据库配置

| 变量名 | 值 | 环境选择 | 说明 |
|--------|-----|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://amwvaakquduxoahmisww.supabase.co` | ✅ Production<br>✅ Preview<br>✅ Development | Supabase 项目 URL，所有环境共用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | ✅ Production<br>✅ Preview<br>✅ Development | Supabase 匿名密钥，所有环境共用 |

**配置方式**：在 Vercel 中添加这些变量时，**同时勾选 Production、Preview、Development 三个环境**。

---

## 🎯 需要按环境区分的变量

这些变量在不同环境中需要设置**不同的值**，需要分别配置。

### 1. NEXTAUTH_URL（必须按环境区分）

| 环境 | 值 | 说明 |
|------|-----|------|
| **Production** | `https://your-project-name.vercel.app` | 必须设置为实际的生产域名 |
| **Preview** | `https://preview-url.vercel.app` | 可选，如果需要预览环境 OAuth 登录 |
| **Development** | `http://localhost:3000` | 可选，本地开发通常使用 `.env.local` |

**配置方式**：
- 在 Vercel 中**分别添加三次**，每次只勾选对应的环境
- 或者只配置 Production（推荐）

**示例配置**：

```
变量名: NEXTAUTH_URL
值: https://economic-monitor.vercel.app
环境: ✅ Production（只勾选这个）
```

### 2. NODE_ENV（通常自动设置）

| 环境 | 值 | 说明 |
|------|-----|------|
| **Production** | `production` | Vercel 通常会自动设置 |
| **Preview** | `production` | Vercel 通常会自动设置 |
| **Development** | `development` | 本地开发时使用 |

**配置方式**：
- 通常**不需要手动配置**，Vercel 会自动设置
- 如果需要，可以手动添加，只勾选 Production

### 3. SUPABASE_SERVICE_ROLE_KEY（安全考虑）

| 环境 | 值 | 环境选择 | 说明 |
|------|-----|---------|------|
| **Production** | `eyJhbGci...` | ✅ Production | 服务端密钥，生产环境使用 |
| **Preview** | `eyJhbGci...` | ✅ Preview | 服务端密钥，预览环境使用 |
| **Development** | - | ❌ **不要勾选** | 本地开发不应使用，避免安全风险 |

**配置方式**：
- 在 Vercel 中添加时，**只勾选 Production 和 Preview**
- **不要勾选 Development**（这是敏感密钥，不应在本地开发环境使用）

**示例配置**：

```
变量名: SUPABASE_SERVICE_ROLE_KEY
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
环境: ✅ Production
     ✅ Preview
     ❌ Development（不要勾选）
```

---

## 📊 配置对比表

### 全局变量配置（一次性配置）

| 变量名 | 所有环境使用相同值 | 配置方式 |
|--------|------------------|---------|
| `FRED_API_KEY` | ✅ 是 | 勾选所有环境 |
| `NEXTAUTH_SECRET` | ✅ 是 | 勾选所有环境 |
| `CRON_SECRET` | ✅ 是 | 勾选所有环境 |
| `ENCRYPTION_KEY` | ✅ 是 | 勾选所有环境 |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 是 | 勾选所有环境 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 是 | 勾选所有环境 |

### 需要按环境区分的变量

| 变量名 | 不同环境不同值 | 配置方式 |
|--------|--------------|---------|
| `NEXTAUTH_URL` | ✅ 是 | 分别配置，或只配置 Production |
| `NODE_ENV` | ✅ 是 | 通常自动设置，无需手动配置 |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ 部分环境 | 只配置 Production 和 Preview |

---

## 🎯 推荐配置方案

### 方案 A：最简单配置（推荐新手）

**全局变量**（勾选所有环境）：
- `FRED_API_KEY`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `ENCRYPTION_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**按环境配置**：
- `NEXTAUTH_URL` - 只配置 Production 环境
- `SUPABASE_SERVICE_ROLE_KEY` - 只配置 Production 和 Preview 环境

**优点**：
- ✅ 配置简单
- ✅ 生产环境正常工作
- ✅ 减少配置错误

### 方案 B：完整配置（推荐高级用户）

**全局变量**（勾选所有环境）：
- 同方案 A

**按环境配置**：
- `NEXTAUTH_URL` - 分别配置 Production、Preview、Development
- `SUPABASE_SERVICE_ROLE_KEY` - 配置 Production 和 Preview
- `NODE_ENV` - 手动配置（如果需要）

**优点**：
- ✅ 所有环境都能正常工作
- ✅ 预览环境也能测试 OAuth 登录

---

## 📝 在 Vercel 中的实际操作步骤

### 步骤 1：配置全局变量

1. 进入 Vercel Dashboard → 项目 → Settings → Environment Variables
2. 添加每个全局变量时：
   - 输入变量名和值
   - **同时勾选** ✅ Production、✅ Preview、✅ Development
   - 点击 Save

**示例**：
```
变量名: FRED_API_KEY
值: 6d03f382a06187128c3d72d6cb37ea85
环境: ✅ Production
     ✅ Preview
     ✅ Development
```

### 步骤 2：配置需要区分的变量

#### 配置 NEXTAUTH_URL（只配置 Production）

```
变量名: NEXTAUTH_URL
值: https://your-project-name.vercel.app
环境: ✅ Production（只勾选这个）
     ❌ Preview（不勾选）
     ❌ Development（不勾选）
```

#### 配置 SUPABASE_SERVICE_ROLE_KEY（Production 和 Preview）

```
变量名: SUPABASE_SERVICE_ROLE_KEY
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
环境: ✅ Production
     ✅ Preview
     ❌ Development（不要勾选）
```

---

## ⚠️ 重要提醒

### 1. 全局变量的优势

- ✅ **方便管理**：只需配置一次，所有环境都能使用
- ✅ **减少错误**：避免在不同环境中配置不同的值导致的问题
- ✅ **统一性**：确保所有环境使用相同的配置

### 2. 需要区分的原因

- **NEXTAUTH_URL**：不同环境有不同的域名
- **SUPABASE_SERVICE_ROLE_KEY**：安全考虑，不应在本地开发环境使用
- **NODE_ENV**：不同环境有不同的运行模式

### 3. 安全注意事项

- ⚠️ **SUPABASE_SERVICE_ROLE_KEY** 是敏感密钥，**永远不要**在 Development 环境中勾选
- ⚠️ **NEXTAUTH_URL** 在生产环境必须使用 `https://`，不能使用 `http://`
- ✅ 所有密钥都应该通过环境变量管理，不要硬编码在代码中

---

## 🔍 验证配置

### 检查全局变量

在 Vercel Dashboard 中，确认这些变量都勾选了所有三个环境：
- ✅ FRED_API_KEY
- ✅ NEXTAUTH_SECRET
- ✅ CRON_SECRET
- ✅ ENCRYPTION_KEY
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY

### 检查区分变量

- ✅ `NEXTAUTH_URL` 只配置了 Production（或根据需要配置其他环境）
- ✅ `SUPABASE_SERVICE_ROLE_KEY` 只配置了 Production 和 Preview（没有 Development）

---

## 📌 快速参考

### 全局变量清单（勾选所有环境）

```
FRED_API_KEY
NEXTAUTH_SECRET
CRON_SECRET
ENCRYPTION_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 需要区分的变量清单

```
NEXTAUTH_URL          → 只配置 Production（或根据需要）
SUPABASE_SERVICE_ROLE_KEY → 只配置 Production 和 Preview
NODE_ENV              → 通常自动设置，无需手动配置
```

---

## 🎯 总结

**关键要点**：

1. ✅ **大部分变量是全局的**：可以在所有环境中使用相同的值
2. ✅ **少数变量需要区分**：主要是 `NEXTAUTH_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ **安全第一**：敏感密钥不应在 Development 环境使用
4. ✅ **简单优先**：如果不需要预览环境测试，只配置 Production 即可

按照这个指南配置，你的 Vercel 环境变量就能正确工作了！🎉
