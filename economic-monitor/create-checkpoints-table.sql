-- ===========================================
-- 检查点表创建脚本
-- 为增强版数据同步器提供断点恢复功能

-- 创建检查点表
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  id VARCHAR(255) PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  series_id VARCHAR(50) NOT NULL,
  last_processed_date TIMESTAMP WITH TIME ZONE NULL,
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS sync_checkpoints_run_id_idx ON sync_checkpoints(run_id);
CREATE INDEX IF NOT EXISTS sync_checkpoints_series_id_idx ON sync_checkpoints(series_id);
CREATE INDEX IF NOT EXISTS sync_checkpoints_status_idx ON sync_checkpoints(status);
CREATE INDEX IF NOT EXISTS sync_checkpoints_updated_at_idx ON sync_checkpoints(updated_at DESC);

-- 创建RLS策略
ALTER TABLE sync_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户查看自己的检查点" ON sync_checkpoints
FOR SELECT USING (auth.uid()::text = run_id);

CREATE POLICY "用户管理自己的检查点" ON sync_checkpoints
FOR ALL USING (auth.uid()::text = run_id);

-- 验证表创建
SELECT 
  '✅ 检查点表创建成功' as status,
  '支持断点恢复和进度跟踪' as description;

-- 显示表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sync_checkpoints' 
  AND table_schema = 'public'
ORDER BY ordinal_position;