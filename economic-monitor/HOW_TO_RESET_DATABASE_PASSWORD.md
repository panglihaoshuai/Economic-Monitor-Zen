# 🔑 Supabase 数据库密码找回/重置指南

## 📋 重要说明

根据你的项目代码分析，**你的项目主要通过 Supabase API 访问数据库**，而不是直接使用 PostgreSQL 连接字符串。这意味着：

✅ **好消息**：你可能不需要 `DATABASE_URL` 就能让项目正常运行  
⚠️ **注意**：只有在需要直接连接数据库（如运行迁移脚本）时才需要 `DATABASE_URL`

---

## 🔍 方法一：在 Supabase Dashboard 中查找密码

### 步骤 1：登录 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 使用你的账号登录
3. 选择项目：`amwvaakquduxoahmisww`

### 步骤 2：查看数据库设置

1. 在左侧菜单中，点击 **Settings**（设置）
2. 选择 **Database**（数据库）
3. 向下滚动找到 **Connection string**（连接字符串）部分
4. 你会看到类似这样的连接字符串：

```
postgresql://postgres:[YOUR-PASSWORD]@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

⚠️ **注意**：Supabase 出于安全考虑，**不会显示完整密码**，只会显示连接字符串格式。

---

## 🔄 方法二：重置数据库密码

如果找不到密码，可以重置它：

### 步骤 1：进入数据库设置

1. 在 Supabase Dashboard 中，进入你的项目
2. 点击左侧菜单的 **Settings**（设置）
3. 选择 **Database**（数据库）

### 步骤 2：重置密码

1. 找到 **Database password**（数据库密码）部分
2. 点击 **Reset database password**（重置数据库密码）按钮
3. 系统会生成一个新密码
4. **重要**：立即复制新密码并保存到安全的地方

### 步骤 3：更新环境变量

重置密码后，更新你的 `DATABASE_URL`：

```
postgresql://postgres:[新密码]@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

将 `[新密码]` 替换为刚刚重置的密码。

---

## 🎯 方法三：检查是否真的需要 DATABASE_URL

### 检查项目是否使用 DATABASE_URL

你的项目主要通过以下方式访问数据库：

1. **Supabase API**（使用 `SUPABASE_SERVICE_ROLE_KEY`）- ✅ 已配置
2. **直接 PostgreSQL 连接**（使用 `DATABASE_URL`）- ❓ 可能不需要

### 如果不需要直接连接

如果你的项目**只通过 Supabase API 访问数据库**，你可以：

1. **暂时不配置 `DATABASE_URL`**
2. 项目仍然可以正常运行
3. 只有在需要运行数据库迁移或直接 SQL 操作时才需要它

---

## 📝 更新 .env.unified.template 文件

重置密码后，更新模板文件：

### 选项 A：如果你找到了/重置了密码

在 `.env.unified.template` 中，将：

```
DATABASE_URL=postgresql://postgres:[password]@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

替换为：

```
DATABASE_URL=postgresql://postgres:你的实际密码@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

### 选项 B：如果暂时不需要

可以保留占位符，或者添加注释说明：

```
# DATABASE_URL - 仅在需要直接数据库连接时使用（如迁移脚本）
# 项目主要通过 Supabase API 访问，此变量可选
# DATABASE_URL=postgresql://postgres:[password]@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
```

---

## 🚀 在 Vercel 中配置

### 如果找到了密码

在 Vercel Dashboard 中添加：

```
变量名: DATABASE_URL
值: postgresql://postgres:你的密码@db.amwvaakquduxoahmisww.supabase.co:5432/postgres
环境: Production, Preview (根据需要选择)
```

### 如果暂时不需要

可以**不配置** `DATABASE_URL`，项目仍然可以正常运行。

---

## ✅ 验证配置

### 测试 Supabase API 连接（推荐）

你的项目已经配置了 Supabase API 访问，可以通过以下方式验证：

1. 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确配置
2. 访问你的应用，看是否能正常读取数据
3. 如果数据能正常显示，说明 API 连接正常

### 测试直接数据库连接（可选）

只有在需要时才测试：

```bash
# 使用 psql 连接（需要安装 PostgreSQL 客户端）
psql "postgresql://postgres:你的密码@db.amwvaakquduxoahmisww.supabase.co:5432/postgres"
```

---

## 🎯 推荐方案

基于你的项目结构，**推荐方案**：

1. ✅ **必须配置**：`SUPABASE_SERVICE_ROLE_KEY`（已配置）
2. ✅ **必须配置**：`NEXT_PUBLIC_SUPABASE_URL`（已配置）
3. ✅ **必须配置**：`NEXT_PUBLIC_SUPABASE_ANON_KEY`（已配置）
4. ⚠️ **可选配置**：`DATABASE_URL`（仅在需要直接连接时配置）

---

## 📞 需要帮助？

如果以上方法都无法解决问题：

1. 访问 [Supabase 支持文档](https://supabase.com/docs/guides/database)
2. 查看 [Supabase 社区论坛](https://github.com/supabase/supabase/discussions)
3. 联系 Supabase 支持

---

## 🔒 安全提醒

- ⚠️ **永远不要**将数据库密码提交到 Git 仓库
- ⚠️ **永远不要**在代码中硬编码密码
- ✅ 使用环境变量管理所有敏感信息
- ✅ 定期轮换密码以提高安全性
