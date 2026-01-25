// Test Supabase connection with proper environment variables
import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  console.log('='.repeat(60));
  console.log('Testing Supabase Connection with Service Role Key');
  console.log('='.repeat(60));
  
  const supabaseUrl = 'https://amwvaakquduxoahmisww.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0';
  
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Service Key: ${serviceRoleKey ? 'Present' : 'Missing'}`);
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Test basic connection
    console.log('\nTesting basic connection...');
    const { data, error } = await supabase.from('economic_data').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('This might mean the database schema is not created yet.');
      return false;
    }
    
    console.log(`✅ Connection successful!`);
    console.log(`   Current economic_data records: ${data?.[0]?.count || 0}`);
    
    // Test all tables
    const tables = ['users', 'user_indicators', 'economic_data', 'anomalies'];
    console.log('\nTesting all tables:');
    
    for (const table of tables) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`  ${table}: ${error ? '❌ Error' : `✅ ${count} records`}`);
      if (error) console.error(`    Error: ${error.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testSupabaseConnection().then(success => {
  console.log(`\n${success ? '✅' : '❌'} Supabase connection ${success ? 'successful' : 'failed'}`);
}).catch(console.error);