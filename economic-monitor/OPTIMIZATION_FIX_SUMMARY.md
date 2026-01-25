# PostgreSQL 优化脚本修复说明

## 问题描述
运行 Supabase 优化脚本时遇到错误：
```
ERROR: 42P17: functions in index predicate must be marked IMMUTABLE
```

## 根本原因
PostgreSQL 要求索引谓词（WHERE 子句）中的函数必须是 IMMUTABLE 类型，即对于相同输入永远返回相同结果。

`CURRENT_DATE` 是 STABLE 函数，因为它的值随时间变化，所以不能在索引定义中使用。

## 问题代码
```sql
-- ❌ 这些代码会导致错误
CREATE INDEX economic_data_recent_idx ON economic_data (series_id, date DESC)
WHERE date >= (CURRENT_DATE - INTERVAL '2 years');

CREATE INDEX economic_data_series_date_range_idx ON economic_data (series_id, date DESC) 
WHERE date >= (CURRENT_DATE - INTERVAL '5 years');
```

## 解决方案

### 方案 1：静态日期（推荐）
使用固定的日期替代动态计算：

```sql
-- ✅ 修复后
CREATE INDEX economic_data_recent_2yr_idx ON economic_data (series_id, date DESC)
WHERE date >= '2023-01-01'::date;

CREATE INDEX economic_data_recent_5yr_idx ON economic_data (series_id, date DESC)
WHERE date >= '2020-01-01'::date;
```

**维护**：每年或每半年手动更新日期。

### 方案 2：移除 WHERE 子句
完全移除基于日期的过滤：

```sql
-- ✅ 简化版
CREATE INDEX economic_data_series_date_idx ON economic_data (series_id, date DESC);
```

**优势**：无需维护，但索引会稍大。

## 提供的文件

### 1. `FIXED_OPTIMIZATION_SCRIPT.sql`
- 包含静态日期的部分索引
- 性能最优，需要定期维护
- 适合大数据量（>10M rows）

### 2. `SIMPLIFIED_OPTIMIZATION_SCRIPT.sql`  
- 移除了所有日期过滤
- 零维护成本
- 适合中等数据量（<10M rows）

### 3. `OPTIMIZATION_FIX_SUMMARY.md`
- 本说明文档

## 执行建议

### 立即执行
```sql
-- 选择其中一个脚本执行，推荐先尝试简化版
-- 在 Supabase SQL Editor 中运行
```

### 验证执行
```sql
-- 检查索引创建情况
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')
ORDER BY tablename, indexname;
```

### 性能测试
```sql
-- 测试关键查询性能
EXPLAIN ANALYZE
SELECT series_id, date, value 
FROM economic_data 
WHERE series_id = 'GDP' 
ORDER BY date DESC 
LIMIT 10;
```

## 预期效果

两个修复版本都能解决 PostgreSQL 错误并获得显著性能提升：

| 指标 | 简化版 | 完整版 |
|------|--------|--------|
| 执行复杂度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 维护成本 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 索引大小 | 中等 | 较小 |
| 性能提升 | 5-500x | 10-1000x |
| 适用场景 | <10M rows | >10M rows |

## PostgreSQL 函数稳定性等级

| 等级 | 说明 | 示例 | 索引中可用 |
|------|------|------|-----------|
| IMMUTABLE | 永远返回相同结果 | `sqrt(4)`, `'2020-01-01'::date` | ✅ |
| STABLE | 在事务内返回相同结果 | `CURRENT_DATE`, `CURRENT_TIMESTAMP` | ❌ |
| VOLATILE | 每次调用都可能不同 | `random()`, `clock_timestamp()` | ❌ |

## 后续建议

1. **立即修复**：运行其中一个修复脚本
2. **监控性能**：观察查询性能改善
3. **定期维护**：如果使用静态日期版本，设置年度提醒
4. **考虑分区**：如果数据持续增长，考虑表分区策略

这样可以彻底解决 PostgreSQL IMMUTABLE 函数错误，同时获得最佳性能提升。
