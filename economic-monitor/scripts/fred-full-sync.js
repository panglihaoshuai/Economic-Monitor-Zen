#!/usr/bin/env node
// Full Data Sync Script - Standalone version
// Run with: node scripts/fred-full-sync.js

const https = require('https');

// Configuration
const SUPABASE_URL = 'https://amwvaakquduxoahmisww.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5OTU4MDYsImV4cCI6MjA4NDU3MTgwNn0.PeS61_VD8jLROtEtUo3mbJ2VOYAXHUs-KlXifa-mnEY';
const FRED_API_KEY = process.env.FRED_API_KEY || '6d03f382a06187128c3d72d6cb37ea85';

const RATE_LIMIT_DELAY = 500; // 120 requests per minute = 500ms between requests
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

// FRED indicators configuration
const INDICATORS = [
  { id: 'SOFR', name: 'Secured Overnight Financing Rate', frequency: 'daily' },
  { id: 'DGS2', name: '2-Year Treasury Constant Maturity Rate', frequency: 'daily' },
  { id: 'DGS10', name: '10-Year Treasury Constant Maturity Rate', frequency: 'daily' },
  { id: 'TEDRATE', name: 'TED Spread', frequency: 'daily' },
  { id: 'MORTGAGE30US', name: '30-Year Fixed Rate Mortgage Average', frequency: 'weekly' },
  { id: 'UNRATE', name: 'Unemployment Rate', frequency: 'monthly' },
  { id: 'PCEPI', name: 'PCE Price Index', frequency: 'monthly' },
  { id: 'PCE', name: 'Personal Consumption Expenditures', frequency: 'monthly' },
  { id: 'RSAFS', name: 'Advance Retail Sales', frequency: 'monthly' },
  { id: 'HOUST', name: 'Housing Starts', frequency: 'monthly' },
  { id: 'CSUSHPISA', name: 'Case-Shiller Home Price Index', frequency: 'monthly' },
  { id: 'BOPGSTB', name: 'Trade Balance', frequency: 'monthly' },
  { id: 'IMPGS', name: 'Imports of Goods and Services', frequency: 'monthly' },
  { id: 'GDPC1', name: 'Real GDP', frequency: 'quarterly' },
];

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

// HTTP request helper
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Handle empty responses
          if (!data || data.trim() === '') {
            resolve({ status: res.statusCode, data: null });
            return;
          }
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (parseError) {
          console.error('JSON parse error:', data.substring(0, 200));
          resolve({ status: res.statusCode, data: null, parseError: parseError.message });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// FRED API request
async function fetchFRED(seriesId, observationStart, maxRetries = MAX_RETRIES) {
  const url = new URL(`https://api.stlouisfed.org/fred/series/observations`);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', FRED_API_KEY);
  url.searchParams.set('observation_start', observationStart);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('limit', '100000');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await httpsRequest(url, { method: 'GET' });

      if (response.status === 429) {
        // Rate limited, wait and retry
        await sleep(2000);
        continue;
      }

      if (response.status !== 200) {
        throw new Error(`FRED API error: ${response.status}`);
      }

      // Handle empty or invalid response
      if (!response.data || !response.data.observations) {
        console.warn(`[${seriesId}] No observations found or invalid response`);
        return { observations: [] };
      }

      return response.data;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
}

// Supabase helpers
async function supabaseRequest(path, method = 'GET', body = null) {
  const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
  url.searchParams.set('apikey', SUPABASE_KEY);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return httpsRequest(url, options);
}

// Data validation
function validateAndClean(observations) {
  const issues = [];
  const cleanedData = [];
  
  for (const obs of observations) {
    const { date, value } = obs;
    
    if (!date || typeof date !== 'string') {
      issues.push({ date, value, issue: 'Invalid date', severity: 'error' });
      continue;
    }
    
    if (value === null || value === undefined || value === '' || value === '.' || value === '-') {
      issues.push({ date, value, issue: 'Null value', severity: 'warning' });
      continue;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || !isFinite(numValue)) {
      issues.push({ date, value, issue: 'Invalid number', severity: 'error' });
      continue;
    }
    
    cleanedData.push({ date, value: numValue });
  }
  
  return { isValid: issues.filter(i => i.severity === 'error').length === 0, issues, cleanedData };
}

// Main sync function
async function runFullSync() {
  console.log('='.repeat(60));
  console.log('Economic Monitor - Full Data Sync');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Indicators: ${INDICATORS.length}`);
  console.log(`Rate Limit: 120 req/min (~${RATE_LIMIT_DELAY}ms between requests)`);
  console.log(`Batch Size: ${BATCH_SIZE} records per insert`);
  console.log('');
  console.log('Starting full sync...');
  console.log('This will take 10-15 minutes due to FRED API rate limits.');
  console.log('');
  
  const startTime = Date.now();
  const results = [];
  
  for (const indicator of INDICATORS) {
    const { id: seriesId, frequency } = indicator;
    const syncStartTime = Date.now();
    
    console.log(`[${seriesId}] Starting sync...`);
    
    const result = {
      seriesId,
      frequency,
      success: false,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      duration: 0,
    };
    
    try {
      // Calculate observation start date based on frequency
      let observationStart = new Date();
      switch (frequency) {
        case 'daily': observationStart.setFullYear(observationStart.getFullYear() - 2); break;
        case 'weekly': observationStart.setFullYear(observationStart.getFullYear() - 3); break;
        case 'monthly': observationStart.setFullYear(observationStart.getFullYear() - 10); break;
        case 'quarterly': observationStart.setFullYear(observationStart.getFullYear() - 20); break;
      }
      
      console.log(`[${seriesId}] Fetching from ${formatDate(observationStart)}...`);
      
      // Fetch from FRED with rate limiting
      await sleep(RATE_LIMIT_DELAY);
      const fredData = await fetchFRED(seriesId, formatDate(observationStart));
      
      result.fetched = fredData.observations.length;
      console.log(`[${seriesId}] Fetched ${fredData.observations.length} observations`);
      
      if (fredData.observations.length === 0) {
        result.warnings.push('No observations returned');
        result.success = true;
        result.duration = Date.now() - syncStartTime;
        results.push(result);
        continue;
      }
      
      // Validate and clean
      const validation = validateAndClean(fredData.observations);
      result.warnings = validation.issues.filter(i => i.severity === 'warning').map(i => `${i.date}: ${i.issue}`);
      result.errors = validation.issues.filter(i => i.severity === 'error').map(i => `${i.date}: ${i.issue}`);
      
      if (!validation.isValid) {
        result.errors.push('Data validation failed');
        result.success = false;
        result.duration = Date.now() - syncStartTime;
        results.push(result);
        continue;
      }
      
      // Batch insert to Supabase
      const data = validation.cleanedData;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);
      
      console.log(`[${seriesId}] Inserting ${data.length} records in ${totalBatches} batches...`);
      
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const records = batch.map(obs => ({
          series_id: seriesId,
          date: obs.date,
          value: obs.value,
          vintage_date: new Date().toISOString().split('T')[0],
        }));
        
        try {
          await supabaseRequest('/economic_data', 'POST', records);
          result.inserted += records.length;
        } catch (error) {
          // Try upsert
          for (const record of records) {
            try {
              await supabaseRequest(`/economic_data?series_id=eq.${seriesId}&date=eq.${record.date}`, 'PATCH', record);
              result.inserted++;
            } catch (e) {
              console.error(`[${seriesId}] Failed to insert ${record.date}:`, e.message?.substring(0, 50));
            }
            await sleep(50);
          }
        }
        
        // Rate limiting between batches
        if (i + BATCH_SIZE < data.length) {
          await sleep(RATE_LIMIT_DELAY);
        }
        
        // Progress update
        const progress = Math.round(((i + BATCH_SIZE) / data.length) * 100);
        if (progress % 25 === 0) {
          console.log(`[${seriesId}] Progress: ${progress}%`);
        }
      }
      
      result.skipped = result.fetched - validation.cleanedData.length;
      result.success = true;
      console.log(`[${seriesId}] ✅ Complete: ${result.inserted} inserted`);
      
    } catch (error) {
      result.errors.push(error.message);
      console.log(`[${seriesId}] ❌ Failed: ${error.message}`);
    }
    
    result.duration = Date.now() - syncStartTime;
    results.push(result);
    
    // Small delay between indicators
    await sleep(RATE_LIMIT_DELAY);
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Sync Complete!');
  console.log('='.repeat(60));
  console.log(`Duration: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
  console.log('');
  
  let totalFetched = 0, totalInserted = 0, totalErrors = 0;
  
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.seriesId}: fetched=${r.fetched}, inserted=${r.inserted}, errors=${r.errors.length}`);
    totalFetched += r.fetched;
    totalInserted += r.inserted;
    totalErrors += r.errors.length;
  }
  
  console.log('');
  console.log(`Total Fetched: ${totalFetched}`);
  console.log(`Total Inserted: ${totalInserted}`);
  console.log(`Total Errors: ${totalErrors}`);
  
  // Verify
  console.log('');
  console.log('Verifying database...');
  try {
    const response = await supabaseRequest('/economic_data?select=count');
    console.log(`Total records in database: ${response.data[0].count}`);
    
    const latest = await supabaseRequest('/economic_data?date=neq.null&select=date&order=date.desc&limit=1');
    if (latest.data && latest.data.length > 0) {
      console.log(`Latest date: ${latest.data[0].date}`);
    }
  } catch (e) {
    console.log('Could not verify database:', e.message?.substring(0, 100));
  }
  
  process.exit(0);
}

runFullSync().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
