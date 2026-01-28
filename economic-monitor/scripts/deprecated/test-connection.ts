// Test FRED API connectivity and data fetch feasibility
import { createClient } from '@supabase/supabase-js';

// Simple FRED API fetch test
async function testFREDConnection() {
  const apiKey = '6d03f382a06187128c3d72d6cb37ea85';
  const seriesId = 'GDPC1';
  
  console.log('='.repeat(60));
  console.log('Testing FRED API Connection');
  console.log('='.repeat(60));
  
  try {
    // Test series info
    const seriesUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
    const seriesResponse = await fetch(seriesUrl);
    const seriesData = await seriesResponse.json();
    
    if (seriesData.seriness && seriesData.seriness.length > 0) {
      const series = seriesData.seriness[0];
      console.log(`✅ Series: ${series.title}`);
      console.log(`   ID: ${series.id}`);
      console.log(`   Frequency: ${series.frequency}`);
      console.log(`   Units: ${series.units}`);
      console.log(`   Seasonal Adjustment: ${series.seasonal_adjustment}`);
      console.log(`   Observation Start: ${series.observation_start}`);
      console.log(`   Observation End: ${series.observation_end}`);
    }
    
    // Test observations fetch (last 5 years)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const obsUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&limit=1000`;
    
    console.log(`\nFetching observations from ${startDate} to ${endDate}...`);
    
    const startTime = Date.now();
    const obsResponse = await fetch(obsUrl);
    const obsData = await obsResponse.json();
    const endTime = Date.now();
    
    if (obsData.observations) {
      console.log(`✅ Fetched ${obsData.observations.length} observations in ${endTime - startTime}ms`);
      console.log(`   Date range: ${obsData.observations[0]?.date} to ${obsData.observations[obsData.observations.length - 1]?.date}`);
      
      // Show sample data
      console.log('\nSample observations:');
      obsData.observations.slice(-3).forEach(obs => {
        console.log(`   ${obs.date}: ${obs.value}`);
      });
    }
    
    return { success: true, observationsCount: obsData.observations?.length || 0 };
    
  } catch (error) {
    console.error('❌ FRED API Test Failed:', error);
    return { success: false, error: error.message };
  }
}

// Test Supabase connection (if service key available)
async function testSupabaseConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Supabase Connection');
  console.log('='.repeat(60));
  
  const serviceRoleKey = 'your_service_role_key_here';
  
  if (serviceRoleKey === 'your_service_role_key_here') {
    console.log('⚠️  Supabase Service Role Key not configured - skipping database test');
    return { success: false, reason: 'No service role key' };
  }
  
  try {
    const supabase = createClient(
      'https://amwvaakquduxoahmisww.supabase.co',
      serviceRoleKey
    );
    
    // Test basic connection
    const { data, error } = await supabase.from('economic_data').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase Connection Failed:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Database connection successful`);
    console.log(`   Current records: ${data?.[0]?.count || 0}`);
    
    return { success: true, currentRecords: data?.[0]?.count || 0 };
    
  } catch (error) {
    console.error('❌ Supabase Test Failed:', error);
    return { success: false, error: error.message };
  }
}

// Analyze feasibility
async function analyzeFeasibility() {
  console.log('\n' + '='.repeat(60));
  console.log('Feasibility Analysis');
  console.log('='.repeat(60));
  
  const fredResult = await testFREDConnection();
  const supabaseResult = await testSupabaseConnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('Feasibility Summary');
  console.log('='.repeat(60));
  
  const indicators = [
    'GDPC1', 'UNRATE', 'PCEPI', 'PCE', 'RSAFS', 'HOUST', 
    'CSUSHPISA', 'BOPGSTB', 'IMPGS', 'SOFR', 'DGS2', 
    'DGS10', 'MORTGAGE30US', 'TEDRATE'
  ];
  
  console.log(`Total Indicators: ${indicators.length}`);
  console.log(`FRED API: ${fredResult.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`Supabase: ${supabaseResult.success ? '✅ Working' : '⚠️  Needs configuration'}`);
  
  if (fredResult.success) {
    // Estimate total data points
    const avgObservationsPerYear = {
      'quarterly': 4,
      'monthly': 12,
      'weekly': 52,
      'daily': 365
    };
    
    // Rough estimate for 5 years of data
    let estimatedTotal = 0;
    indicators.forEach(id => {
      if (id === 'GDPC1') estimatedTotal += 5 * 4; // quarterly
      else if (id.includes('GS') || id === 'SOFR' || id === 'TEDRATE') estimatedTotal += 5 * 365; // daily
      else if (id === 'MORTGAGE30US') estimatedTotal += 5 * 52; // weekly
      else estimatedTotal += 5 * 12; // monthly
    });
    
    console.log(`\nEstimated 5-year data points: ~${estimatedTotal.toLocaleString()}`);
    console.log(`API Rate Limit: 120 requests/minute`);
    console.log(`Estimated Time: ${Math.ceil(estimatedTotal / 100 / 120)} minutes (with rate limiting)`);
    
    console.log('\n✅ Full sync is TECHNICALLY FEASIBLE');
    console.log('Requirements:');
    console.log('  - Configure Supabase Service Role Key');
    console.log('  - Run during off-peak hours');
    console.log('  - Monitor for rate limiting');
    console.log('  - Use existing full-sync.ts script');
  } else {
    console.log('\n❌ Full sync is NOT FEASIBLE');
    console.log('Requirements:');
    console.log('  - Fix FRED API connection');
    console.log('  - Verify API key permissions');
  }
}

// Run analysis
analyzeFeasibility().catch(console.error);