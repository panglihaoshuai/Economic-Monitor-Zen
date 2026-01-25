import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amwvaakquduxoahmisww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY';

const client = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  const { data, error } = await client
    .from('users')
    .select('count')
    .single();
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Connected! Users count:', data?.count || 0);
}

testConnection().catch(console.error);
