-- 🗑️ 清理所有数据并验证清理结果
-- 为重新采集完整数据做准备

-- 显示清理前的数据状态
SELECT 
  '=== 清理前数据状态 ===' as status,
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

-- 按依赖关系顺序删除（避免外键约束）
-- 1. 删除异常记录
DELETE FROM anomalies;
SELECT '✅ 异常记录已删除' as status;

-- 2. 删除用户指标
DELETE FROM user_indicators;
SELECT '✅ 用户指标已删除' as status;

-- 3. 删除经济数据（包含TEST和SOFR）
DELETE FROM economic_data;
SELECT '✅ 经济数据已删除（包含TEST和SOFR）' as status;

-- 4. 删除用户资料
DELETE FROM users;
SELECT '✅ 用户资料已删除' as status;

-- 验证清理结果
SELECT 
  '=== 清理后验证 ===' as status,
  table_name,
  record_count,
  CASE WHEN record_count = 0 THEN '✅ 已清空' ELSE '❌ 仍有数据' END as result
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

-- 最终状态汇总
SELECT 
  '=== 清理完成 ===' as final_status,
  '数据库已完全清空，准备重新采集完整FRED数据' as next_step,
  '建议运行完整数据采集而不是增量更新' as recommendation;