-- ===========================================
-- Economic Monitor Database Migration
-- Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/amwvaakquduxoahmisww/sql/new
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Core Tables
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  deepseek_api_key_encrypted TEXT,
  language TEXT DEFAULT 'zh',
  risk_tolerance TEXT DEFAULT 'moderate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE economic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  date DATE NOT NULL,
  value DECIMAL NOT NULL,
  vintage_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, date)
);

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

CREATE TABLE data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('missing', 'outlier', 'stale', 'revision', 'gap')),
  date_or_range TEXT NOT NULL,
  expected_value DECIMAL,
  actual_value DECIMAL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_release_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  expected_release_day INTEGER,
  expected_release_time TIME,
  timezone TEXT DEFAULT 'America/New_York',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id)
);

CREATE TABLE collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE NOT NULL,
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
  error_summary JSONB,
  triggered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  missing_dates JSONB,
  errors TEXT[],
  UNIQUE(run_id, series_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_economic_data_series_date ON economic_data(series_id, date DESC);
CREATE INDEX idx_economic_data_date ON economic_data(date DESC);
CREATE INDEX idx_anomalies_user_created ON anomalies(user_id, created_at DESC);
CREATE INDEX idx_anomalies_series_date ON anomalies(series_id, date DESC);
CREATE INDEX idx_data_quality_series ON data_quality_issues(series_id, created_at DESC);
CREATE INDEX idx_collection_runs_status ON collection_runs(status, started_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own indicators" ON user_indicators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own indicators" ON user_indicators FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view economic data" ON economic_data FOR SELECT USING (true);
CREATE POLICY "Users can view own anomalies" ON anomalies FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Functions
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Release Schedule Data
-- ============================================

INSERT INTO data_release_schedule (series_id, frequency, expected_release_day, expected_release_time, timezone) VALUES
  ('SOFR', 'daily', 1, '08:30', 'America/New_York'),
  ('DGS2', 'daily', 1, '08:30', 'America/New_York'),
  ('DGS10', 'daily', 1, '08:30', 'America/New_York'),
  ('TEDRATE', 'daily', 1, '09:00', 'America/New_York'),
  ('MORTGAGE30US', 'weekly', 4, '10:00', 'America/New_York'),
  ('UNRATE', 'monthly', 5, '08:30', 'America/New_York'),
  ('PCEPI', 'monthly', 5, '08:30', 'America/New_York'),
  ('PCE', 'monthly', 5, '08:30', 'America/New_York'),
  ('RSAFS', 'monthly', 5, '08:30', 'America/New_York'),
  ('HOUST', 'monthly', 5, '08:30', 'America/New_York'),
  ('CSUSHPISA', 'monthly', 25, '09:00', 'America/New_York'),
  ('BOPGSTB', 'monthly', 5, '08:30', 'America/New_York'),
  ('IMPGS', 'monthly', 5, '08:30', 'America/New_York'),
  ('GDPC1', 'quarterly', 28, '08:30', 'America/New_York')
ON CONFLICT (series_id) DO NOTHING;

-- Done!
SELECT 'Tables created successfully!' as status;
