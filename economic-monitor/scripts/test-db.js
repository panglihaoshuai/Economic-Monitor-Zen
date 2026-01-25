import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY'
);

async function testDB() {
  console.log('Testing database connection...');

  // Try to select from economic_data
  const { data, error } = await supabase
    .from('economic_data')
    .select('series_id, date, value')
    .limit(10);

  console.log('Select error:', error ? error.message : 'none');
  console.log('Records found:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample records:', JSON.stringify(data, null, 2));
  }

  // Try insert
  console.log('\nTesting insert...');
  const testRecord = {
    series_id: 'TEST',
    date: '2025-01-22',
    value: 5.0,
    vintage_date: null
  };

  const { data: insertData, error: insertError } = await supabase
    .from('economic_data')
    .insert(testRecord)
    .select();

  console.log('Insert error:', insertError ? insertError.message : 'none');
  console.log('Insert result:', insertData ? JSON.stringify(insertData, null, 2) : 'null');

  // Try select again
  console.log('\nSelect after insert...');
  const { data: selectData } = await supabase
    .from('economic_data')
    .select('series_id, date, value')
    .limit(10);
  console.log('Records:', selectData ? JSON.stringify(selectData, null, 2) : 'null');

  // Clean up test record
  if (insertData && insertData.length > 0) {
    console.log('\nCleaning up test record...');
    await supabase.from('economic_data').delete().eq('series_id', 'TEST').eq('date', '2025-01-22');
    console.log('Test record deleted');
  }
}

testDB().catch(console.error);
