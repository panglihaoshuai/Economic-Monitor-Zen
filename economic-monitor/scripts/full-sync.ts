// Full Sync Execution Script
// Fetches all historical data from FRED API with rate limiting, gap detection, and error handling

import { createClient } from '@supabase/supabase-js';
import { fullSync, syncIndicators, RateLimiter } from '../lib/improved-scheduler';
import { getAllIndicators, INDICATORS } from '../lib/fred';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY'
);

async function runFullSync() {
  console.log('='.repeat(60));
  console.log('Economic Monitor - Full Data Sync');
  console.log('='.repeat(60));
  console.log('');
  
  const indicators = getAllIndicators();
  console.log(`Indicators to sync: ${indicators.length}`);
  
  // Group by frequency
  const byFrequency: Record<string, typeof indicators> = {
    daily: [],
    weekly: [],
    monthly: [],
    quarterly: [],
  };
  
  for (const ind of indicators) {
    const freq = ind.frequency.toLowerCase();
    if (freq.includes('quarter')) byFrequency.quarterly.push(ind);
    else if (freq.includes('week')) byFrequency.weekly.push(ind);
    else if (freq.includes('month')) byFrequency.monthly.push(ind);
    else byFrequency.daily.push(ind);
  }
  
  console.log('Daily:', byFrequency.daily.length);
  console.log('Weekly:', byFrequency.weekly.length);
  console.log('Monthly:', byFrequency.monthly.length);
  console.log('Quarterly:', byFrequency.quarterly.length);
  console.log('');
  
  // Show rate limit info
  const rateLimiter = new RateLimiter(120);
  const rateInfo = rateLimiter.getInfo();
  console.log(`Rate Limit: ${rateInfo.requestsPerMinute} requests/minute`);
  console.log(`Batch Size: 100 records per insert`);
  console.log(`Retry Attempts: 3 with exponential backoff`);
  console.log('');
  
  console.log('Starting full sync...');
  console.log('This will take approximately 10-15 minutes due to FRED API rate limits.');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const results = await fullSync(undefined, {
      validateData: true,
      fillGaps: true,
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Sync Complete!');
    console.log('='.repeat(60));
    console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
    console.log('');
    
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let totalGapsFilled = 0;
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.seriesId}: fetched=${result.observationsFetched}, inserted=${result.observationsInserted}, gapsFilled=${result.gapsFilled}`);
      
      totalFetched += result.observationsFetched;
      totalInserted += result.observationsInserted;
      totalErrors += result.errors.length;
      totalGapsFilled += result.gapsFilled;
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
    }
    
    console.log('');
    console.log(`Total Fetched: ${totalFetched}`);
    console.log(`Total Inserted: ${totalInserted}`);
    console.log(`Total Gaps Filled: ${totalGapsFilled}`);
    console.log(`Total Errors: ${totalErrors}`);
    
    // Verify data in database
    console.log('');
    console.log('Verifying data in database...');
    const { count } = await supabase.from('economic_data').select('*', { count: 'exact', head: true });
    console.log(`Total records in database: ${count || 0}`);
    
    // Show date range
    const { data: dateRange } = await supabase
      .from('economic_data')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    
    if (dateRange && dateRange.length > 0) {
      console.log(`Latest date: ${dateRange[0].date}`);
    }
    
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runFullSync();
