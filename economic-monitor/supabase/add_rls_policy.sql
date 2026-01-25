-- Add missing INSERT policy for economic_data table
-- This allows the sync script (using anon key) to insert data

-- Enable RLS if not already enabled
ALTER TABLE economic_data ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy for anon role (sync script uses anon key)
CREATE POLICY "Anon can insert economic data" ON economic_data
  FOR INSERT WITH CHECK (true);

-- Also add UPDATE policy if needed for upserts
CREATE POLICY "Anon can update economic data" ON economic_data
  FOR UPDATE USING (true);

-- Verify the policies
SELECT polname, cmd, roles::text FROM pg_policies WHERE tablename = 'economic_data';
