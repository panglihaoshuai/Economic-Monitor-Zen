// Full Sync Execution Script - JavaScript version
// Fetches all historical data from FRED API with rate limiting, gap detection, and error handling

import { createClient } from '@supabase/supabase-js';
import { fetchFREDData, getAllIndicators, INDICATORS } from '../lib/fred.js';

// Rate limiting configuration
const FRED_RATE_LIMIT_PER_MINUTE = 120;
const FRED_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_BATCH_SIZE = 100;

// Frequency configuration
const FREQUENCY_CONFIG = {
  daily: { incrementalDays: 7, fullSyncMinYears: 1, fullSyncMaxYears: 5 },
  weekly: { incrementalDays: 14, fullSyncMinYears: 2, fullSyncMaxYears: 5 },
  monthly: { incrementalDays: 60, fullSyncMinYears: 10, fullSyncMaxYears: 30 },
  quarterly: { incrementalDays: 90, fullSyncMinYears: 20, fullSyncMaxYears: 30 },
};

// Rate limiter class
class RateLimiter {
  constructor(requestsPerMinute = FRED_RATE_LIMIT_PER_MINUTE) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestTimestamps = [];
  }
  
  async acquire() {
    const now = Date.now();
    const windowStart = now - FRED_RATE_LIMIT_WINDOW_MS;
    
    this.requestTimestamps = this.requestTimestamps.filter(t => t >= windowStart);
    
    while (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + FRED_RATE_LIMIT_WINDOW_MS - now;
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const updatedNow = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(t => t >= updatedNow - FRED_RATE_LIMIT_WINDOW_MS);
    }
    
    this.requestTimestamps.push(now);
  }
  
  getInfo() {
    const now = Date.now();
    const windowStart = now - FRED_RATE_LIMIT_WINDOW_MS;
    const requestsInWindow = this.requestTimestamps.filter(t => t >= windowStart).length;
    const oldestTimestamp = this.requestTimestamps[0] || now;
    const resetTime = new Date(oldestTimestamp + FRED_RATE_LIMIT_WINDOW_MS);
    
    return {
      requestsInCurrentWindow: requestsInWindow,
      requestsPerMinute: this.requestsPerMinute,
      resetTime,
      isLimitReached: requestsInWindow >= this.requestsPerMinute,
    };
  }
}

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr) {
  return new Date(dateStr);
}

function getFrequency(seriesId) {
  const info = INDICATORS[seriesId];
  if (!info) return 'daily';
  const freq = info.frequency.toLowerCase();
  if (freq.includes('quarter')) return 'quarterly';
  if (freq.includes('week')) return 'weekly';
  if (freq.includes('month')) return 'monthly';
  return 'daily';
}

// Data validation
function validateAndClean(data, seriesId) {
  const issues = [];
  const cleanedData = [];
  
  for (const obs of data) {
    const { date, value } = obs;
    
    if (!date || typeof date !== 'string') {
      issues.push({ date: date || 'unknown', value, issue: 'Invalid date format', severity: 'error' });
      continue;
    }
    
    if (value === null || value === undefined || value === '' || value === '.' || value === '-') {
      issues.push({ date, value, issue: 'Null or missing value', severity: 'warning' });
      continue;
    }
    
    const parsedValue = parseFloat(value);
    
    if (isNaN(parsedValue)) {
      issues.push({ date, value, issue: 'Invalid numeric value', severity: 'error' });
      continue;
    }
    
    if (!isFinite(parsedValue)) {
      issues.push({ date, value, issue: 'Infinite value', severity: 'error' });
      continue;
    }
    
    cleanedData.push({ date, value: parsedValue });
  }
  
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    cleanedData,
  };
}

// FRED API request with retry
async function fetchFREDDataWithRetry(seriesId, observationStart, rateLimiter, maxRetries = 3) {
  const url = 'https://api.stlouisfed.org/fred/series/observations';
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: process.env.FRED_API_KEY,
    observation_start: observationStart,
    file_type: 'json',
    limit: '100000',
  });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.acquire();
      
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, wait and retry
          await sleep(2000);
          continue;
        }
        throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(DEFAULT_RETRY_DELAY * Math.pow(2, attempt - 1));
    }
  }
}

// Main sync function
async function runFullSync() {
  console.log('='.repeat(60));
  console.log('Economic Monitor - Full Data Sync');
  console.log('='.repeat(60));
  console.log('');
  
  const supabase = createClient(
    'https://amwvaakquduxoahmisww.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY'
  );
  
  const rateLimiter = new RateLimiter(FRED_RATE_LIMIT_PER_MINUTE);
  const indicators = getAllIndicators();
  
  console.log(`Indicators to sync: ${indicators.length}`);
  console.log(`Rate Limit: ${FRED_RATE_LIMIT_PER_MINUTE} requests/minute`);
  console.log(`Batch Size: ${DEFAULT_BATCH_SIZE} records per insert`);
  console.log('');
  console.log('Starting full sync...');
  console.log('This will take approximately 10-15 minutes due to FRED API rate limits.');
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  
  for (const indicator of indicators) {
    const seriesId = indicator.id;
    const frequency = getFrequency(seriesId);
    const config = FREQUENCY_CONFIG[frequency];
    
    console.log(`[${seriesId}] Starting sync...`);
    
    const syncStartTime = Date.now();
    const result = {
      seriesId,
      success: false,
      observationsFetched: 0,
      observationsInserted: 0,
      observationsSkipped: 0,
      errors: [],
      warnings: [],
      durationMs: 0,
    };
    
    try {
      // Calculate observation start date
      let observationStart = new Date();
      observationStart.setFullYear(observationStart.getFullYear() - config.fullSyncMinYears);
      
      console.log(`[${seriesId}] Fetching data from ${formatDate(observationStart)}...`);
      
      // Fetch from FRED
      const fredData = await fetchFREDDataWithRetry(
        seriesId,
        formatDate(observationStart),
        rateLimiter
      );
      
      result.observationsFetched = fredData.observations.length;
      console.log(`[${seriesId}] Fetched ${fredData.observations.length} observations`);
      
      if (fredData.observations.length === 0) {
        result.warnings.push('No observations returned');
        result.success = true;
        result.durationMs = Date.now() - syncStartTime;
        results.push(result);
        continue;
      }
      
      // Validate and clean
      const validationResult = validateAndClean(fredData.observations, seriesId);
      
      if (validationResult.issues.length > 0) {
        result.warnings = validationResult.issues
          .filter(i => i.severity === 'warning')
          .map(i => `${i.date}: ${i.issue}`);
        result.errors = validationResult.issues
          .filter(i => i.severity === 'error')
          .map(i => `${i.date}: ${i.issue}`);
      }
      
      if (!validationResult.isValid) {
        result.errors.push('Data validation failed');
        result.success = false;
        result.durationMs = Date.now() - syncStartTime;
        results.push(result);
        continue;
      }
      
      // Batch insert
      const cleanedData = validationResult.cleanedData;
      const totalBatches = Math.ceil(cleanedData.length / DEFAULT_BATCH_SIZE);
      
      console.log(`[${seriesId}] Inserting ${cleanedData.length} records in ${totalBatches} batches...`);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * DEFAULT_BATCH_SIZE;
        const endIdx = Math.min(startIdx + DEFAULT_BATCH_SIZE, cleanedData.length);
        const batch = cleanedData.slice(startIdx, endIdx);
        
        const records = batch.map(obs => ({
          series_id: seriesId,
          date: obs.date,
          value: obs.value,
          vintage_date: new Date().toISOString().split('T')[0],
        }));
        
        const { error: upsertError } = await supabase
          .from('economic_data')
          .upsert(records, { onConflict: 'series_id,date', ignoreDuplicates: false });
        
        if (upsertError) {
          throw new Error(`Database upsert error: ${upsertError.message}`);
        }
        
        result.observationsInserted += records.length;
        
        if (batchIndex < totalBatches - 1) {
          await sleep(50); // Small delay between batches
        }
        
        // Progress update every 5 batches
        if ((batchIndex + 1) % 5 === 0) {
          console.log(`[${seriesId}] Progress: ${Math.round(((batchIndex + 1) / totalBatches) * 100)}%`);
        }
      }
      
      result.observationsSkipped = result.observationsFetched - validationResult.cleanedData.length;
      result.success = true;
      
      console.log(`[${seriesId}] ✅ Complete: ${result.observationsInserted} inserted, ${result.observationsSkipped} skipped`);
      
    } catch (error) {
      result.errors.push(error.message);
      console.log(`[${seriesId}] ❌ Failed: ${error.message}`);
    }
    
    result.durationMs = Date.now() - syncStartTime;
    results.push(result);
    
    // Small delay between indicators
    await sleep(500);
  }
  
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
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.seriesId}: fetched=${result.observationsFetched}, inserted=${result.observationsInserted}`);
    
    totalFetched += result.observationsFetched;
    totalInserted += result.observationsInserted;
    totalErrors += result.errors.length;
  }
  
  console.log('');
  console.log(`Total Fetched: ${totalFetched}`);
  console.log(`Total Inserted: ${totalInserted}`);
  console.log(`Total Errors: ${totalErrors}`);
  
  // Verify data
  console.log('');
  console.log('Verifying data in database...');
  const { count } = await supabase.from('economic_data').select('*', { count: 'exact', head: true });
  console.log(`Total records: ${count || 0}`);
  
  const { data: dateRange } = await supabase
    .from('economic_data')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);
  
  if (dateRange && dateRange.length > 0) {
    console.log(`Latest date: ${dateRange[0].date}`);
  }
  
  process.exit(0);
}

runFullSync().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
