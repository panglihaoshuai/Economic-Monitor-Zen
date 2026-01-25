-- Economic Monitor Database Schema
-- Run this SQL in Supabase SQL Editor
-- Version: 2.0 - Added data quality monitoring and collection logs

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core Tables (Users & Config)
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  deepseek_api_key_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User indicators configuration table
CREATE TABLE user_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  series_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  z_threshold_warning DECIMAL DEFAULT 2.0,
  z_threshold_critical DECIMAL DEFAULT 3.0,
  analysis_mode TEXT DEFAULT 'both',
  notify_frequency TEXT DEFAULT 'realtime',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, series_id)
);

-- ============================================
-- Economic Data Tables
-- ============================================

-- Economic data table (supports TimescaleDB)
CREATE TABLE economic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  date DATE NOT NULL,
  value DECIMAL NOT NULL,
  vintage_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, date)
);

-- Anomalies table
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  series_id TEXT NOT NULL,
  date DATE NOT NULL,
  value DECIMAL NOT NULL,
  z_score DECIMAL NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  analysis_simple TEXT,
  analysis_deep TEXT,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Data Quality Monitoring Tables (NEW)
-- ============================================

-- Data quality issues tracking
CREATE TABLE data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('missing', 'outlier', 'stale', 'revision', 'gap')),
  date_or_range TEXT NOT NULL,  -- 具体日期或日期范围
  expected_value DECIMAL,
  actual_value DECIMAL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expected release schedule (for detecting stale data)
CREATE TABLE data_release_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  expected_release_day INTEGER,  -- 周几 (1-7) 或 每月第几天 (1-31)
  expected_release_time TIME,    -- 预期发布时间 (UTC)
  timezone TEXT DEFAULT 'America/New_York',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id)
);

-- ============================================
-- Collection Logs Table (NEW)
-- ============================================

-- Data collection run history
CREATE TABLE collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE NOT NULL,  -- 唯一运行ID (UUID)
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'manual', 'backfill', 'recovery')),
  mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental', 'daily', 'weekly', 'monthly', 'quarterly')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  duration_ms INTEGER,
  total_indicators INTEGER DEFAULT 0,
  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_summary JSONB,  -- {"SERIES_ID": ["error1", "error2"]}
  triggered_by TEXT,    -- 'cron' or user_id for manual
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-indicator collection details
CREATE TABLE collection_run_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES collection_runs(run_id) ON DELETE CASCADE,
  series_id TEXT NOT NULL,
  frequency TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  duration_ms INTEGER,
  observations_fetched INTEGER DEFAULT 0,
  observations_inserted INTEGER DEFAULT 0,
  observations_skipped INTEGER DEFAULT 0,
  missing_dates JSONB,  -- 需要填补的日期列表
  errors TEXT[],
  UNIQUE(run_id, series_id)
);

-- ============================================
-- Indexes
-- ============================================

-- Economic data indexes
CREATE INDEX idx_economic_data_series_date ON economic_data(series_id, date DESC);
CREATE INDEX idx_economic_data_date ON economic_data(date DESC);
CREATE INDEX idx_economic_data_series_vintage ON economic_data(series_id, vintage_date DESC);

-- Anomalies indexes
CREATE INDEX idx_anomalies_user_created ON anomalies(user_id, created_at DESC);
CREATE INDEX idx_anomalies_series_user ON anomalies(series_id, user_id);
CREATE INDEX idx_anomalies_series_date ON anomalies(series_id, date DESC);
CREATE INDEX idx_anomalies_unread ON anomalies(user_id, notified) WHERE notified = FALSE;

-- Data quality indexes
CREATE INDEX idx_data_quality_series ON data_quality_issues(series_id, created_at DESC);
CREATE INDEX idx_data_quality_unresolved ON data_quality_issues(resolved, severity) WHERE resolved = FALSE;
CREATE INDEX idx_data_quality_type ON data_quality_issues(issue_type, created_at DESC);

-- Release schedule indexes
CREATE INDEX idx_release_schedule_active ON data_release_schedule(series_id) WHERE active = TRUE;

-- Collection logs indexes
CREATE INDEX idx_collection_runs_status ON collection_runs(status, started_at DESC);
CREATE INDEX idx_collection_runs_type ON collection_runs(run_type, started_at DESC);
CREATE INDEX idx_collection_run_details_run ON collection_run_details(run_id, series_id);
CREATE INDEX idx_collection_run_details_status ON collection_run_details(status, started_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_release_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_run_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can only access their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User_indicators: Users can only access their own indicators
CREATE POLICY "Users can view own indicators" ON user_indicators
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own indicators" ON user_indicators
  FOR ALL USING (auth.uid() = user_id);

-- Economic_data: Public read access for viewing data
CREATE POLICY "Anyone can view economic data" ON economic_data
  FOR SELECT USING (true);

-- Anomalies: Users can only view their own anomalies
CREATE POLICY "Users can view own anomalies" ON anomalies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own anomalies" ON anomalies
  FOR ALL USING (auth.uid() = user_id);

-- Data quality: Admin only
CREATE POLICY "Admin can manage data quality" ON data_quality_issues
  FOR ALL USING (true);  -- Change to auth check in production

-- Release schedule: Public read, admin write
CREATE POLICY "Anyone can view release schedule" ON data_release_schedule
  FOR SELECT USING (true);

-- Collection logs: Admin only
CREATE POLICY "Admin can view collection logs" ON collection_runs
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage collection logs" ON collection_run_details
  FOR ALL USING (true);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for release schedule
CREATE TRIGGER update_release_schedule_updated_at
  BEFORE UPDATE ON data_release_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Data Quality Functions
-- ============================================

-- Function to check data freshness
CREATE OR REPLACE FUNCTION check_data_freshness(max_days INTEGER DEFAULT 7)
RETURNS TABLE (
  series_id TEXT,
  days_since_last_update INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.series_id,
    (CURRENT_DATE - MAX(e.date)::DATE)::INTEGER AS days_since_last_update,
    CASE 
      WHEN (CURRENT_DATE - MAX(e.date)::DATE)::INTEGER > max_days THEN 'stale'
      WHEN (CURRENT_DATE - MAX(e.date)::DATE)::INTEGER > max_days / 2 THEN 'warning'
      ELSE 'fresh'
    END AS status
  FROM economic_data e
  GROUP BY e.series_id
  HAVING MAX(e.date)::DATE < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect gaps in data
CREATE OR REPLACE FUNCTION detect_data_gaps(
  series_id_input TEXT,
  start_date DATE,
  end_date DATE,
  frequency TEXT DEFAULT 'daily'
)
RETURNS TABLE (
  missing_date DATE,
  days_gap INTEGER
) AS $$
DECLARE
  expected_interval INTEGER;
BEGIN
  -- Set expected interval based on frequency
  expected_interval := CASE frequency
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 7
    WHEN 'monthly' THEN 30
    WHEN 'quarterly' THEN 90
    ELSE 1
  END;

  -- Return gaps
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, 
      CASE frequency
        WHEN 'daily' THEN '1 day'::INTERVAL
        WHEN 'weekly' THEN '7 days'::INTERVAL
        WHEN 'monthly' THEN '1 month'::INTERVAL
        WHEN 'quarterly' THEN '3 months'::INTERVAL
        ELSE '1 day'::INTERVAL
      END
    )::DATE AS expected_date
  )
  SELECT 
    d.expected_date AS missing_date,
    d.expected_date - COALESCE(e.max_date, start_date - expected_interval) AS days_gap
  FROM date_series d
  LEFT JOIN LATERAL (
    SELECT MAX(date)::DATE as max_date
    FROM economic_data
    WHERE series_id = series_id_input AND date <= d.expected_date
  ) e ON true
  WHERE e.max_date IS NULL OR d.expected_date > e.max_date + expected_interval
  ORDER BY d.expected_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Initialize User Indicators Function
-- ============================================

-- Insert default indicator configurations for a new user
CREATE OR REPLACE FUNCTION initialize_user_indicators(user_id UUID)
RETURNS VOID AS $$
DECLARE
  indicator RECORD;
BEGIN
  -- Core indicators (enabled by default)
  FOR indicator IN
    SELECT series_id FROM (VALUES 
      ('GDPC1'), ('UNRATE'), ('PCEPI'), ('DGS10')
    ) AS t(series_id)
  LOOP
    INSERT INTO user_indicators (user_id, series_id, enabled, analysis_mode)
    VALUES (user_id, indicator.series_id, TRUE, 'both')
    ON CONFLICT (user_id, series_id) DO NOTHING;
  END LOOP;

  -- Secondary indicators (disabled by default)
  FOR indicator IN
    SELECT series_id FROM (VALUES 
      ('DGS2'), ('MORTGAGE30US'), ('HOUST'), ('CSUSHPISA'),
      ('PCE'), ('RSAFS'), ('BOPGSTB'), ('IMPGS')
    ) AS t(series_id)
  LOOP
    INSERT INTO user_indicators (user_id, series_id, enabled, analysis_mode)
    VALUES (user_id, indicator.series_id, FALSE, 'both')
    ON CONFLICT (user_id, series_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION initialize_user_indicators(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_freshness(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_data_gaps(TEXT, DATE, DATE, TEXT) TO authenticated;

-- ============================================
-- Insert Default Release Schedule (NEW)
-- ============================================

INSERT INTO data_release_schedule (series_id, frequency, expected_release_day, expected_release_time, timezone) VALUES
  -- Daily releases (typically 8:30 AM EST)
  ('SOFR', 'daily', 1, '08:30', 'America/New_York'),
  ('DGS2', 'daily', 1, '08:30', 'America/New_York'),
  ('DGS10', 'daily', 1, '08:30', 'America/New_York'),
  ('TEDRATE', 'daily', 1, '09:00', 'America/New_York'),
  
  -- Weekly releases (Thursday mornings)
  ('MORTGAGE30US', 'weekly', 4, '10:00', 'America/New_York'),
  
  -- Monthly releases (typically first Friday)
  ('UNRATE', 'monthly', 5, '08:30', 'America/New_York'),
  ('PCEPI', 'monthly', 5, '08:30', 'America/New_York'),
  ('PCE', 'monthly', 5, '08:30', 'America/New_York'),
  ('RSAFS', 'monthly', 5, '08:30', 'America/New_York'),
  ('HOUST', 'monthly', 5, '08:30', 'America/New_York'),
  ('CSUSHPISA', 'monthly', 25, '09:00', 'America/New_York'),
  ('BOPGSTB', 'monthly', 5, '08:30', 'America/New_York'),
  ('IMPGS', 'monthly', 5, '08:30', 'America/New_York'),
  
  -- Quarterly releases (last week of month)
  ('GDPC1', 'quarterly', 28, '08:30', 'America/New_York')
ON CONFLICT (series_id) DO NOTHING;

-- ============================================
-- Optional: TimescaleDB Hypertable (UNCOMMENT if using TimescaleDB)
-- ============================================

-- SELECT create_hypertable('economic_data', 'date');
-- ALTER TABLE economic_data SET (timescaledb.enable_automatic_migration = true);
-- CREATE INDEX ON economic_data (series_id, date DESC, value);
