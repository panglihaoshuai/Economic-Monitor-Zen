# Economic Monitor - 定时任务配置和部署指南

## 📋 数据流程分析总结

根据我们的详细分析，你的经济监控系统**完全可行**，具备以下特点：

### ✅ 系统优势
1. **FRED API集成完善** - 支持14个经济指标，API连接正常
2. **数据架构健全** - Supabase + 完整的表结构和索引
3. **智能调度系统** - 支持全量/增量/断点续传
4. **异常检测完备** - Z-Score分析 + GARCH模型支持
5. **错误处理健全** - 重试机制 + 限速器 + 监控

### ⚠️ 需要注意的问题
1. **API限速** - FRED免费版120 requests/分钟限制
2. **环境配置** - 需要配置Supabase Service Role Key
3. **定时任务优化** - 当前配置过于频繁（每小时）

## 🚀 推荐的定时任务配置

### 当前 vs 推荐配置

```json
// 当前配置 (过于频繁)
{
  "crons": [
    { "path": "/api/cron/fetch-data", "schedule": "0 * * * *" },      // 每小时
    { "path": "/api/cron/check-anomalies", "schedule": "5 * * * *" }   // 每小时
  ]
}

// 推荐配置 (优化后)
{
  "crons": [
    { "path": "/api/cron/fetch-data", "schedule": "0 8 * * *" },           // 每天8点UTC (FED发布后)
    { "path": "/api/cron/check-anomalies", "schedule": "5 8 * * *" },      // 每天8点5分
    { "path": "/api/cron/health-check", "schedule": "0 12 * * *" },        // 每天12点
    { "path": "/api/cron/weekly-full-sync", "schedule": "0 2 * * 0" }       // 每周日凌晨2点
  ]
}
```

## 📊 FED数据发布时间分析

### 主要经济指标发布时间 (美东时间)
- **GDP数据**: 季度末发布，通常8:30 AM
- **就业数据**: 每月第一个周五，8:30 AM  
- **通胀数据 (CPI/PCE)**: 每月中，8:30 AM
- **利率数据**: 每日发布

### 推荐采集时间
- **UTC时间8:00** = 美东时间3:00/4:00 (考虑夏令时)
- 避开美股开盘时间 (9:30 AM ET)
- 给数据处理和异常检测留出时间

## 🔧 立即可执行的方案

### 1. 运行全量数据获取

```bash
# 配置环境变量 (如果还没有)
cp .env.example .env.local
# 编辑 .env.local，设置 SUPABASE_SERVICE_ROLE_KEY

# 运行全量同步 (约需要10-15分钟)
cd D:/fed/economic-monitor
npx tsx scripts/full-sync.ts
```

### 2. 验证数据质量

```bash
# 测试API连接 (已验证通过)
npx tsx test-connection.ts

# 检查数据库中的数据
# 在Supabase控制台查看 economic_data 表
```

### 3. 部署到Vercel

```bash
# 替换vercel.json配置
cp vercel.json.optimized vercel.json

# 部署到Vercel
vercel --prod

# 在Vercel Dashboard设置环境变量
# CRON_SECRET, FRED_API_KEY, SUPABASE_* 等
```

## 📈 监控和维护

### 数据质量监控
- 自动检测数据缺失和异常值
- 每日健康检查报告
- 错误率阈值告警

### 性能优化建议
1. **周度全量同步** - 确保数据完整性
2. **增量日常同步** - 快速获取最新数据
3. **智能限速** - 避免API限制
4. **缓存策略** - 减少重复请求

## 🎯 关键指标

### 数据采集目标
- **14个经济指标** 涵盖GDP、就业、通胀、利率等
- **5年历史数据** 约11,590个数据点
- **每日增量更新** 保持数据新鲜度

### 系统性能预期
- **全量同步**: 10-15分钟 (受API限制)
- **增量同步**: 1-2分钟
- **异常检测**: 30秒内
- **API使用率**: <80% 安全阈值

## 🛠️ 故障排除

### 常见问题
1. **FRED API限速** - 自动重试，增加延迟
2. **数据库连接** - 检查Service Role Key
3. **定时任务失败** - 查看Vercel Function Logs

### 监控端点
- `/api/cron/health-check` - 系统健康状态
- `/api/cron/fetch-data` - 手动触发数据同步

## ✅ 验证清单

在部署前确认：

- [ ] FRED API密钥有效 (✅ 已验证)
- [ ] Supabase Service Role Key配置
- [ ] 数据库表结构创建
- [ ] 环境变量设置完整
- [ ] vercel.json配置优化
- [ ] 本地测试通过

## 🎉 总结

你的系统设计非常完善，**完全可以按照计划实施**：

1. **立即运行全量数据获取** - 技术上完全可行
2. **配置定时任务** - 使用优化后的时间表
3. **部署到生产环境** - Vercel + Supabase架构成熟

只需要配置好Supabase Service Role Key，就可以开始运行了！