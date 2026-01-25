-- Add risk_tolerance column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive'));

-- Update existing users to have a risk tolerance
UPDATE users SET risk_tolerance = 'moderate' WHERE risk_tolerance IS NULL;

-- Add comment
COMMENT ON COLUMN users.risk_tolerance IS 'User risk tolerance: conservative, moderate, aggressive';
