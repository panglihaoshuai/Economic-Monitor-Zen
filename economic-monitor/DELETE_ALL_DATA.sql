-- 🚨 危险：删除所有 Supabase 数据 SQL 脚本
-- ⚠️ 执行前请确认：此操作不可恢复！

-- 先查看删除前的数据统计
SELECT 
  'users' as table_name,
  (SELECT count(*) FROM users) as record_count
UNION ALL
SELECT 
  'user_indicators' as table_name,
  (SELECT count(*) FROM user_indicators) as record_count
UNION ALL
SELECT 
  'economic_data' as table_name,
  (SELECT count(*) FROM economic_data) as record_count
UNION ALL
SELECT 
  'anomalies' as table_name,
  (SELECT count(*) FROM anomalies) as record_count
ORDER BY table_name;

-- 按依赖关系顺序删除（避免外键约束问题）
-- 1. 删除异常记录
DELETE FROM anomalies;

-- 2. 删除用户指标
DELETE FROM user_indicators;

-- 3. 删除经济数据
DELETE FROM economic_data;

-- 4. 删除用户资料
DELETE FROM users;

-- 验证删除结果
SELECT 
  'users' as table_name,
  (SELECT count(*) FROM users) as record_count
UNION ALL
SELECT 
  'user_indicators' as table_name,
  (SELECT count(*) FROM user_indicators) as record_count
UNION ALL
SELECT 
  'economic_data' as table_name,
  (SELECT count(*) FROM economic_data) as record_count
UNION ALL
SELECT 
  'anomalies' as table_name,
  (SELECT count(*) FROM anomalies) as record_count
ORDER BY table_name;

-- 显示删除完成信息
SELECT '✅ 所有数据已删除，数据库现在是空的' as status;