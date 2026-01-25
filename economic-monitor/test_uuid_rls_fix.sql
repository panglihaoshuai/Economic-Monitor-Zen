-- ===========================================
-- 🧪 UUID RLS 修复验证脚本
-- ===========================================
-- 此脚本用于验证 UUID 比较修复是否正确
-- 注意：需要在有认证上下文的环境中运行

-- ===========================================
-- 1. 检查当前 RLS 策略状态
-- ===========================================

-- 查看所有表的 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  roles,
  qual  -- 策略表达式
FROM pg_policies 
WHERE tablename IN ('users', 'user_indicators', 'anomalies')
ORDER BY tablename, policyname;

-- ===========================================
-- 2. 验证策略中是否包含错误的 ::text 铸造
-- ===========================================

-- 检查策略表达式中的错误模式
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%auth.uid()::text=%' THEN '❌ 包含错误的 ::text 铸造'
    WHEN qual LIKE '%auth.uid()=%' THEN '✅ 正确的 UUID 比较'
    ELSE '⚠️  其他模式'
  END AS status,
  qual
FROM pg_policies 
WHERE tablename IN ('users', 'user_indicators', 'anomalies')
ORDER BY tablename, policyname;

-- ===========================================
-- 3. 测试查询（需要认证上下文）
-- ===========================================

/*
-- 以下查询需要在有认证上下文中运行
-- 例如：使用 supabase client 或设置 RLS 变量

-- 测试用户表访问
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, email, created_at 
FROM users 
WHERE id = auth.uid();

-- 测试 user_indicators 表访问
EXPLAIN (ANALYZE, BUFFERS)
SELECT series_id, enabled, created_at
FROM user_indicators 
WHERE user_id = auth.uid();

-- 测试 anomalies 表访问
EXPLAIN (ANALYZE, BUFFERS)
SELECT series_id, severity, notified, created_at
FROM anomalies 
WHERE user_id = auth.uid();

-- 测试复合查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  ui.series_id,
  a.severity,
  a.created_at
FROM user_indicators ui
LEFT JOIN anomalies a ON ui.user_id = a.user_id AND ui.series_id = a.series_id
WHERE ui.user_id = auth.uid() 
  AND ui.enabled = true;
*/

-- ===========================================
-- 4. 验证 UUID 索引使用情况
-- ===========================================

-- 检查 UUID 列的索引
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('users', 'user_indicators', 'anomalies')
  AND (
    indexdef LIKE '%user_id%' OR 
    indexdef LIKE '% id %' OR
    indexname LIKE '%user%' OR
    indexname LIKE '%id%'
  )
ORDER BY tablename, indexname;

-- ===========================================
-- 5. 性能基准测试模拟
-- ===========================================

-- 模拟 UUID 比较性能测试
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM users 
WHERE id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM user_indicators 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) 
FROM anomalies 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

-- ===========================================
-- ✅ 验证完成检查清单
-- ===========================================

/*
验证完成后的检查清单：

□ 所有 RLS 策略都显示 "✅ 正确的 UUID 比较"
□ 没有 "❌ 包含错误的 ::text 铸造" 的策略
□ 测试查询能够正常执行（需要认证上下文）
□ UUID 索引在查询执行计划中被使用
□ 没有 "operator does not exist" 错误
□ 查询性能符合预期

如果所有检查都通过，说明 UUID 比较修复成功！
*/
