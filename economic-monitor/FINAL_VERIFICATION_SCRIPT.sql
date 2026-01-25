-- ===========================================
-- 🔍 Economic Monitor 优化验证脚本 (语法修复版)
-- ===========================================
-- 此脚本验证所有优化是否正确执行
-- 包含预期输出说明
-- 修复：将EXPLAIN ANALYZE与UNION查询分离

-- ===========================================
-- 📊 1. 验证索引创建情况
-- ===========================================

SELECT 
  '=== 索引验证 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  '索引数量' as section,
  count(*)::text || ' 个索引' as detail,
  '预期: 15-20 个索引' as expected_result
FROM pg_indexes 
WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')
UNION ALL

SELECT 
  'economic_data表索引' as section,
  count(*)::text || ' 个索引' as detail,
  '预期: 8-10 个索引' as expected_result
FROM pg_indexes 
WHERE tablename = 'economic_data'
UNION ALL

SELECT 
  'users表索引' as section,
  count(*)::text || ' 个索引' as detail,
  '预期: 2-3 个索引' as expected_result
FROM pg_indexes 
WHERE tablename = 'users'
UNION ALL

SELECT 
  'user_indicators表索引' as section,
  count(*)::text || ' 个索引' as detail,
  '预期: 4-5 个索引' as expected_result
FROM pg_indexes 
WHERE tablename = 'user_indicators'
UNION ALL

SELECT 
  'anomalies表索引' as section,
  count(*)::text || ' 个索引' as detail,
  '预期: 3-4 个索引' as expected_result
FROM pg_indexes 
WHERE tablename = 'anomalies'

ORDER BY section;

-- ===========================================
-- 🔒 2. 验证RLS策略创建情况  
-- ===========================================

SELECT 
  '=== RLS策略验证 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  '总策略数量' as section,
  count(*)::text || ' 个策略' as detail,
  '预期: 6 个策略' as expected_result
FROM pg_policies 
WHERE tablename IN ('users', 'user_indicators', 'anomalies')
UNION ALL

SELECT 
  'users表策略' as section,
  count(*)::text || ' 个策略' as detail,
  '预期: 2 个策略' as expected_result
FROM pg_policies 
WHERE tablename = 'users'
UNION ALL

SELECT 
  'user_indicators表策略' as section,
  count(*)::text || ' 个策略' as detail,
  '预期: 2 个策略' as expected_result
FROM pg_policies 
WHERE tablename = 'user_indicators'
UNION ALL

SELECT 
  'anomalies表策略' as section,
  count(*)::text || ' 个策略' as detail,
  '预期: 2 个策略' as expected_result
FROM pg_policies 
WHERE tablename = 'anomalies'

ORDER BY section;

-- ===========================================
-- 📈 3. 验证表数据状态
-- ===========================================

SELECT 
  '=== 数据验证 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  'users表记录' as section,
  count(*)::text || ' 条记录' as detail,
  '任意数量' as expected_result
FROM users
UNION ALL

SELECT 
  'user_indicators表记录' as section,
  count(*)::text || ' 条记录' as detail,
  '任意数量' as expected_result
FROM user_indicators
UNION ALL

SELECT 
  'economic_data表记录' as section,
  count(*)::text || ' 条记录' as detail,
  '预期: >0 条记录' as expected_result
FROM economic_data
UNION ALL

SELECT 
  'anomalies表记录' as section,
  count(*)::text || ' 条记录' as detail,
  '任意数量' as expected_result
FROM anomalies

ORDER BY section;

-- ===========================================
-- 🔍 4. 索引详情检查
-- ===========================================

SELECT 
  '=== 关键索引检查 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  'economic_data - series_id索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'economic_data' AND indexname = 'economic_data_series_id_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：economic_data_series_id_idx' as expected_result
UNION ALL

SELECT 
  'economic_data - 复合索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'economic_data' AND indexname = 'economic_data_series_date_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：economic_data_series_date_idx' as expected_result
UNION ALL

SELECT 
  'economic_data - 部分索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'economic_data' AND indexname LIKE '%recent_%yr_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：economic_data_recent_2yr_idx 或 economic_data_recent_5yr_idx' as expected_result
UNION ALL

SELECT 
  'users - email索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_email_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：users_email_idx' as expected_result
UNION ALL

SELECT 
  'user_indicators - user_id索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_indicators' AND indexname = 'user_indicators_user_id_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：user_indicators_user_id_idx' as expected_result
UNION ALL

SELECT 
  'anomalies - user_id索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'anomalies' AND indexname = 'anomalies_user_id_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：anomalies_user_id_idx' as expected_result
UNION ALL

SELECT 
  'anomalies - 复合索引' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'anomalies' AND indexname = 'anomalies_user_series_date_idx'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：anomalies_user_series_date_idx' as expected_result
UNION ALL

SELECT 
  'users - RLS策略' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname LIKE '%查看自己的%'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：用户只能访问自己数据' as expected_result
UNION ALL

SELECT 
  'user_indicators - RLS策略' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_indicators' AND policyname LIKE '%管理自己的%'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：用户只能管理自己指标' as expected_result
UNION ALL

SELECT 
  'anomalies - RLS策略' as section,
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'anomalies' AND policyname LIKE '%查看自己的%'
  ) THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：用户只能访问自己异常' as expected_result

ORDER BY section;

-- ===========================================
-- ✅ 5. 最终验证结果汇总
-- ===========================================

SELECT 
  '=== 验证结果汇总 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  '总索引数量' as section,
  (SELECT count(*) FROM pg_indexes WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies'))::text || ' 个' as detail,
  '目标: >= 15个' as expected_result
UNION ALL

SELECT 
  '总策略数量' as section,
  (SELECT count(*) FROM pg_policies WHERE tablename IN ('users', 'user_indicators', 'anomalies'))::text || ' 个' as detail,
  '目标: >= 6个' as expected_result
UNION ALL

SELECT 
  '优化完成度' as section,
  CASE 
    WHEN (SELECT count(*) FROM pg_indexes WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')) >= 15 
     AND (SELECT count(*) FROM pg_policies WHERE tablename IN ('users', 'user_indicators', 'anomalies')) >= 6
    THEN '🎉 优化完全成功！' 
    WHEN (SELECT count(*) FROM pg_indexes WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')) >= 12 
     AND (SELECT count(*) FROM pg_policies WHERE tablename IN ('users', 'user_indicators', 'anomalies')) >= 4
    THEN '✅ 优化基本完成' 
    ELSE '⚠️ 优化未完成，需要检查' 
  END as detail,
  '索引>=15且策略>=6为完全成功' as expected_result
UNION ALL

SELECT 
  '性能提升预期' as section,
  '10-1000倍查询提升' as detail,
  '通过索引和RLS实现' as expected_result
UNION ALL

SELECT 
  '下一步' as section,
  '1. 配置连接池 2. 测试应用 3. 监控性能' as detail,
  'Settings → Database → Connection Pooling' as expected_result;

-- ===========================================
-- 说明：如何单独测试性能（可选）
-- ===========================================

/*
如果需要测试具体查询性能，请单独运行以下查询：

-- 测试1: economic_data 查询（应该显示 Index Scan）
EXPLAIN ANALYZE
SELECT series_id, date, value 
FROM economic_data 
WHERE series_id = 'SOFR' 
ORDER BY date DESC 
LIMIT 5;

-- 测试2: anomalies 复合查询（应该使用复合索引）
EXPLAIN ANALYZE
SELECT * FROM anomalies 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
AND notified = false
ORDER BY created_at DESC 
LIMIT 5;

预期结果：
- 应该看到 "Index Scan" 而不是 "Seq Scan"
- 查询时间应该在毫秒级别
- 执行计划应该使用我们创建的索引

预期输出说明：

1. === 索引验证 ===
   索引数量: >= 15 个索引
   economic_data: >= 8 个索引
   users: >= 2 个索引
   user_indicators: >= 4 个索引
   anomalies: >= 3 个索引

2. === RLS策略验证 ===
   总策略数量: >= 6 个策略
   users: 2 个策略（查看+更新）
   user_indicators: 2 个策略（查看+管理）
   anomalies: 2 个策略（查看+更新）

3. === 数据验证 ===
   显示各表的当前记录数
   economic_data 应该有记录（你之前的101条数据）

4. === 关键索引检查 ===
   所有关键索引应该显示 "✅ 已创建"
   所有关键策略应该显示 "✅ 已创建"

5. === 验证结果汇总 ===
   优化完成度应该显示：
   - 🎉 优化完全成功！（索引>=15且策略>=6）
   - ✅ 优化基本完成（索引>=12且策略>=4）
   - ⚠️ 优化未完成（需要重新运行优化脚本）

🎯 成功标准：
   - 总索引数量 >= 15
   - 总策略数量 >= 6
   - 所有 "关键索引检查" 显示 ✅
   - 最终汇总显示 "🎉 优化完全成功！"

如果显示 "🎉 优化完全成功！"，则可以继续配置连接池并测试应用。
*/