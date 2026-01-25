-- 🚨 完全重置：删除所有数据 SQL 脚本
-- ⚠️ 执行前请确认：此操作不可恢复！

-- 显示删除前的数据统计
SELECT '删除前数据统计' as status,
       table_name,
       record_count
FROM (
  SELECT 'users' as table_name, count(*) as record_count FROM users
  UNION ALL
  SELECT 'user_indicators', count(*) FROM user_indicators  
  UNION ALL
  SELECT 'economic_data', count(*) FROM economic_data
  UNION ALL
  SELECT 'anomalies', count(*) FROM anomalies
) t
ORDER BY table_name;

-- 按依赖关系顺序删除（避免外键约束问题）
DELETE FROM anomalies;
DELETE FROM user_indicators;  
DELETE FROM economic_data;
DELETE FROM users;

-- 验证删除结果
SELECT '删除后数据统计' as status,
       table_name,
       record_count
FROM (
  SELECT 'users' as table_name, count(*) as record_count FROM users
  UNION ALL
  SELECT 'user_indicators', count(*) FROM user_indicators
  UNION ALL  
  SELECT 'economic_data', count(*) FROM economic_data
  UNION ALL
  SELECT 'anomalies', count(*) FROM anomalies
) t
ORDER BY table_name;

-- 完成提示
SELECT '✅ 所有数据已删除，数据库现在是空的' as completion_message,
       '现在可以重新采集 FRED 数据' as next_step;