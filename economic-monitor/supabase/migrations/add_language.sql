-- Add language column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh' CHECK (language IN ('en', 'zh'));

-- Update existing users to have Chinese as default
UPDATE users SET language = 'zh' WHERE language IS NULL;

-- Add comment
COMMENT ON COLUMN users.language IS 'User interface language preference: en (English) or zh (中文)';
