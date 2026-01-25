import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY'
);

async function debugDB() {
  console.log('=== Database Debug ===\n');

  // Check what tables exist
  console.log('1. Checking tables via RPC...');
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_tables', { });
  console.log('Tables error:', tablesError ? tablesError.message : 'none');
  console.log('Tables:', JSON.stringify(tables, null, 2));

  // Try to get table info
  console.log('\n2. Checking economic_data structure...');
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'economic_data')
    .eq('table_schema', 'public');
  console.log('Columns error:', colError ? colError.message : 'none');
  console.log('Columns:', JSON.stringify(columns, null, 2));

  // Try direct insert to test
  console.log('\n3. Testing direct insert...');
  const testRecord = {
    series_id: 'TEST',
    date: '2025-01-22',
    value: 5.0,
    updated_at: new Date().toISOString()
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('economic_data')
    .insert(testRecord)
    .select();
  console.log('Insert error:', insertError ? insertError.message : 'none');
  console.log('Insert result:', JSON.stringify(insertData, null, 2));

  // Try select again
  console.log('\n4. Select after insert...');
  const { data: selectData, error: selectError } = await supabase
    .from('economic_data')
    .select('*')
    .limit(5);
  console.log('Select error:', selectError ? selectError.message : 'none');
  console.log('Records:', JSON.stringify(selectData, null, 2));
}

debugDB().catch(console.error);
