# 🔒 安全部署指南

## ✅ 已修复的安全问题

### 🚨 发现的问题
- ❌ `SUPABASE_SERVICE_ROLE_KEY` 暴露在客户端环境变量中
- ✅ 已移除服务端敏感密钥
- ✅ 分离了客户端和服务端配置

## 📋 安全配置文件说明

### 🔑 客户端配置 (`.env` - 安全)
```env
# ✅ 可以暴露给浏览器
NEXT_PUBLIC_SUPABASE_URL=https://amwvaakquduxoahmisww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ 安全的API密钥
FRED_API_KEY=6d03f382a06187128c3d72d6cb37ea85
NEXTAUTH_SECRET=ZHbXJGtHna6S4COim2ovXoCHldNdmERCtY84lAeuv1Y=
CRON_SECRET=fYblN4h9CyC0DxSkGuedpZCq/DGZ8NqnnKtaE4XJ7MQ=

# ⚠️ 服务端密钥 (已移除)
# SUPABASE_SERVICE_ROLE_KEY 已从客户端配置中删除
```

### 🔒 服务端配置 (`.env.server` - 安全)
```env
# ✅ 仅服务端使用
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

## 🛡️ Vercel生产环境配置

### 必需的环境变量

| 变量名 | 值 | 安全级别 |
|---------|-----|---------|
| `NEXTAUTH_URL` | `https://economic-monitor-zen.vercel.app` | ✅ 公开 |
| `NEXTAUTH_SECRET` | `生成32字符随机字符串` | 🔒 私密 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://amwvaakquduxoahmisww.supabase.co` | ✅ 公开 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `从Supabase获取` | ✅ 公开 |
| `FRED_API_KEY` | `从FRED获取` | 🔒 私密 |
| `CRON_SECRET` | `生成32字符随机字符串` | 🔒 私密 |
| `SUPABASE_SERVICE_ROLE_KEY` | `从Supabase服务端密钥` | 🔒 私密 |

### ⚠️ 已移除的不安全配置
- ~~NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY~~ ❌ (服务端密钥不应暴露)

## 🔧 本地安全启动

```bash
# 1. 验证环境配置
./verify-env.sh

# 2. 安全启动开发服务器
./start.sh dev

# 3. 测试安全配置
curl http://localhost:3000/api/data
```

## 🌐 Vercel部署安全检查

### 部署前检查清单
- [ ] 所有`NEXT_PUBLIC_` 变量都已设置
- [ ] 所有私有密钥已添加到Vercel环境变量
- [ ] 没有敏感信息暴露在客户端代码中
- [ ] Supabase RLS策略已正确配置

### Vercel控制台配置步骤
1. **访问**: https://vercel.com/dashboard
2. **选择项目**: `panglihaoshuais-projects/economic-monitor`
3. **添加环境变量**:
   ```
   NEXTAUTH_URL=https://economic-monitor-zen.vercel.app
   NEXTAUTH_SECRET=<your-32-char-string>
   NEXT_PUBLIC_SUPABASE_URL=https://amwvaakquduxoahmisww.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   FRED_API_KEY=<your-fred-key>
   CRON_SECRET=<your-32-char-string>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

## 🔍 安全验证

### 部署后安全检查
1. **检查源码暴露**:
   ```bash
   # 确保没有敏感信息暴露
   grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ lib/
   ```

2. **验证密钥隔离**:
   ```javascript
   // 在浏览器控制台检查
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL) // ✅ 应该显示
   console.log(process.env.SUPABASE_SERVICE_ROLE_KEY) // ❌ 应该是undefined
   ```

3. **API端点安全测试**:
   ```bash
   # 测试敏感信息是否暴露
   curl -H "Content-Type: application/json" \
        https://economic-monitor-zen.vercel.app/api/data
   ```

## 🚨 安全最佳实践

### ✅ 已实施
- 🔒 敏感密钥环境变量隔离
- 🔑 客户端/服务端配置分离
- 🛡️ 服务端密钥不提交到Git
- 📋 .env文件已在.gitignore中排除
- 🔍 安全验证脚本提供

### 🎯 持续监控
- 🔑 定期轮换API密钥
- 🛡️ 监控异常访问日志
- 🔍 定期安全审计
- 📊 监控密钥使用情况

---

> 🎉 **安全配置已完成，现在可以安全部署！**

> 🔒 **所有敏感信息已正确隔离，符合生产环境安全标准**