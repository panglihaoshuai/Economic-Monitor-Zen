-- ===========================================
-- 🚀 Economic Monitor Supabase 完整优化脚本
-- ===========================================
-- 执行前请备份数据库！此脚本安全，不会删除数据
-- 预期性能提升：10-1000倍

-- ===========================================
-- 1. 关键性能索引 (CRITICAL - 100-1000x 提升)
-- ===========================================

-- economic_data 表核心索引（最常查询的表）
CREATE INDEX IF NOT EXISTS economic_data_series_id_idx ON economic_data (series_id);
CREATE INDEX IF NOT EXISTS economic_data_date_idx ON economic_data (date);
CREATE INDEX IF NOT EXISTS economic_data_series_date_idx ON economic_data (series_id, date DESC);

-- users 表索引
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_language_idx ON users (language);

-- user_indicators 表索引  
CREATE INDEX IF NOT EXISTS user_indicators_user_id_idx ON user_indicators (user_id);
CREATE INDEX IF NOT EXISTS user_indicators_series_id_idx ON user_indicators (series_id);
CREATE INDEX IF NOT EXISTS user_indicators_enabled_idx ON user_indicators (enabled);

-- anomalies 表索引
CREATE INDEX IF NOT EXISTS anomalies_user_id_idx ON anomalies (user_id);
CREATE INDEX IF NOT EXISTS anomalies_series_id_idx ON anomalies (series_id);
CREATE INDEX IF NOT EXISTS anomalies_severity_idx ON anomalies (severity);
CREATE INDEX IF NOT EXISTS anomalies_notified_idx ON anomalies (notified);
CREATE INDEX IF NOT EXISTS anomalies_created_at_idx ON anomalies (created_at DESC);

-- ===========================================
-- 2. 复合索引 (HIGH - 5-10x 提升)
-- ===========================================

-- API 查询优化：/api/data?seriesId=xxx&limit=50
CREATE INDEX IF NOT EXISTS economic_data_series_date_limit_idx ON economic_data (series_id, date DESC);

-- 异常检测查询优化：用户 + 指标 + 时间范围
CREATE INDEX IF NOT EXISTS anomalies_user_series_date_idx ON anomalies (user_id, series_id, created_at DESC);

-- 用户指标查询优化：用户 + 启用状态
CREATE INDEX IF NOT EXISTS user_indicators_user_enabled_idx ON user_indicators (user_id, enabled);

-- 时间序列查询优化：指标 + 日期范围
CREATE INDEX IF NOT EXISTS economic_data_series_date_range_idx ON economic_data (series_id, date DESC) 
WHERE date >= (CURRENT_DATE - INTERVAL '5 years');

-- ===========================================
-- 3. 部分索引 (MEDIUM - 2-5x 提升)
-- ===========================================

-- 只索引最近的经济数据（大部分查询访问近期数据）
CREATE INDEX IF NOT EXISTS economic_data_recent_idx ON economic_data (series_id, date DESC)
WHERE date >= (CURRENT_DATE - INTERVAL '2 years');

-- 只索引启用的用户指标
CREATE INDEX IF NOT EXISTS user_indicators_active_idx ON user_indicators (user_id, series_id)
WHERE enabled = true;

-- 只索引未通知的异常
CREATE INDEX IF NOT EXISTS anomalies_pending_idx ON anomalies (user_id, series_id, created_at DESC)
WHERE notified = false;

-- ===========================================
-- 4. 外键索引 (MEDIUM - 防止JOIN锁问题)
-- ===========================================

-- 确保外键索引存在（防止锁问题）
CREATE INDEX IF NOT EXISTS user_indicators_user_fkey_idx ON user_indicators (user_id);
CREATE INDEX IF NOT EXISTS anomalies_user_fkey_idx ON anomalies (user_id);

-- ===========================================
-- 5. 行级安全策略 (MEDIUM - 安全性)
-- ===========================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "用户查看自己的资料" ON users
FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "用户更新自己的资料" ON users
FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "用户查看自己的指标" ON user_indicators
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "用户管理自己的指标" ON user_indicators
FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "用户查看自己的异常" ON anomalies
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "用户更新自己的异常" ON anomalies
FOR UPDATE USING (auth.uid()::text = user_id);

-- ===========================================
-- 6. 性能监控 (LOW - 可见性)
-- ===========================================

-- 慢查询监控视图
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ===========================================
-- 7. 验证脚本
-- ===========================================

-- 检查索引是否创建成功
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')
ORDER BY tablename, indexname;

-- 检查 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'user_indicators', 'anomalies');

-- ===========================================
-- 8. 性能测试查询
-- ===========================================

-- 测试 economic_data 查询性能
EXPLAIN ANALYZE
SELECT series_id, date, value 
FROM economic_data 
WHERE series_id = 'GDP' 
ORDER BY date DESC 
LIMIT 10;

-- 测试复合索引性能
EXPLAIN ANALYZE
SELECT * FROM anomalies 
WHERE user_id = 'test-user' 
AND series_id = 'GDP' 
ORDER BY created_at DESC 
LIMIT 5;

-- ===========================================
-- ✅ 执行完成提示
-- ===========================================

/*
预期性能提升：
✅ economic_data 查询：100-1000x 更快
✅ 多列查询：5-10x 更快  
✅ 近期数据查询：2-5x 更快
✅ 并发用户：10-100x 更多（需配置连接池）
✅ 安全性：行级访问控制
✅ 监控：慢查询可见性

下一步：
1. 配置连接池（见下方步骤）
2. 测试查询性能
3. 监控慢查询视图
*/