-- ===========================================
-- 🔍 Economic Monitor 优化验证脚本
-- ===========================================
-- 此脚本验证所有优化是否正确执行
-- 包含预期输出说明

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
-- ⚡ 4. 性能测试查询
-- ===========================================

SELECT 
  '=== 性能测试 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

-- 测试economic_data查询性能（应该使用索引）
SELECT 
  'economic_data查询测试' as section,
  '执行EXPLAIN ANALYZE查询' as detail,
  '应该显示 "Index Scan" 而不是 "Seq Scan"' as expected_result

-- 执行实际的性能测试
EXPLAIN ANALYZE
SELECT series_id, date, value 
FROM economic_data 
WHERE series_id = 'SOFR' 
ORDER BY date DESC 
LIMIT 5;

SELECT 
  'anomalies查询测试' as section,
  '执行复合索引测试' as detail,
  '应该使用复合索引扫描' as expected_result

-- 测试复合索引性能
EXPLAIN ANALYZE
SELECT * FROM anomalies 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
AND notified = false
ORDER BY created_at DESC 
LIMIT 5;

-- ===========================================
-- 🔍 5. 索引详情检查
-- ===========================================

SELECT 
  '=== 关键索引检查 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  'series_id主索引' as section,
  CASE WHEN indexname LIKE '%series_id%' THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：economic_data_series_id_idx' as expected_result
FROM pg_indexes 
WHERE tablename = 'economic_data' AND indexname LIKE '%series_id_idx'
LIMIT 1
UNION ALL

SELECT 
  '复合索引' as section,
  CASE WHEN indexname LIKE '%series_date_idx%' THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：economic_data_series_date_idx' as expected_result
FROM pg_indexes 
WHERE tablename = 'economic_data' AND indexname LIKE '%series_date_idx%'
LIMIT 1
UNION ALL

SELECT 
  '用户外键索引' as section,
  CASE WHEN indexname LIKE '%user_id_idx%' THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：user_indicators_user_id_idx' as expected_result
FROM pg_indexes 
WHERE tablename = 'user_indicators' AND indexname LIKE '%user_id_idx%'
LIMIT 1
UNION ALL

SELECT 
  'RLS用户策略' as section,
  CASE WHEN policyname LIKE '%查看自己的%' THEN '✅ 已创建' ELSE '❌ 缺失' END as detail,
  '必需：用户只能访问自己数据' as expected_result
FROM pg_policies 
WHERE tablename = 'users' AND policyname LIKE '%查看自己的%'
LIMIT 1

ORDER BY section;

-- ===========================================
-- ✅ 6. 最终验证结果汇总
-- ===========================================

SELECT 
  '=== 验证结果汇总 ===' as section,
  '' as detail,
  '' as expected_result
UNION ALL

SELECT 
  '优化完成度' as section,
  CASE 
    WHEN (SELECT count(*) FROM pg_indexes WHERE tablename IN ('economic_data', 'users', 'user_indicators', 'anomalies')) >= 15 
     AND (SELECT count(*) FROM pg_policies WHERE tablename IN ('users', 'user_indicators', 'anomalies')) >= 6
    THEN '🎉 优化完成！' 
    ELSE '⚠️ 部分完成，需要检查' 
  END as detail,
  '索引>=15且策略>=6' as expected_result
UNION ALL

SELECT 
  '性能提升预期' as section,
  '10-1000倍查询提升' as detail,
  '通过索引和RLS实现' as expected_result
UNION ALL

SELECT 
  '下一步' as section,
  '配置连接池并测试应用' as detail,
  'Settings → Database → Connection Pooling' as expected_result;

-- ===========================================
-- 📝 说明
-- ===========================================

/*
预期输出说明：

1. === 索引验证 ===
   总共应该显示 15-20 个索引
   economic_data: 8-10个索引
   users: 2-3个索引  
   user_indicators: 4-5个索引
   anomalies: 3-4个索引

2. === RLS策略验证 ===
   总共应该显示 6 个策略
   users: 2个策略（查看+更新）
   user_indicators: 2个策略（查看+管理）
   anomalies: 2个策略（查看+更新）

3. === 数据验证 ===
   显示各表的当前记录数
   economic_data应该有记录（你的101条数据）

4. === 性能测试 ===
   EXPLAIN ANALYZE结果应该显示：
   - "Index Scan" 而不是 "Seq Scan"
   - 执行时间在毫秒级

5. === 关键索引检查 ===
   所有关键索引应该显示 "✅ 已创建"
   所有关键策略应该显示 "✅ 已创建"

6. === 验证结果汇总 ===
   如果优化完成度显示 "🎉 优化完成！" 则表示一切正常
   否则需要检查缺失的索引或策略

🎯 成功标志：
   - 索引总数 >= 15
   - 策略总数 >= 6  
   - 所有显示 "✅ 已创建"
   - 最终汇总显示 "🎉 优化完成！"
*/