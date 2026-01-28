// ===========================================
// 🚀 Optimized Batch Insert Operations for FRED Data
// ===========================================
// Based on Supabase Postgres Best Practices - Batch Inserts
// Impact: 10-50x faster bulk data loading

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// ===========================================
// 1. Batch Insert Types
// ===========================================

export interface EconomicDataBatch {
  series_id: string;
  date: string;
  value: number;
  vintage_date?: string | null;
  created_at?: string;
}

export interface BatchInsertResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: string[];
  duration: number;
}

// ===========================================
// 2. Optimized Batch Insert Function
// ===========================================

/**
 * Batch insert economic data with optimal performance
 * - Uses batch inserts instead of individual statements
 * - Implements proper error handling and retry logic
 * - Optimized for time-series data patterns
 */
export async function batchInsertEconomicData(
  supabase: SupabaseClient<Database>,
  data: EconomicDataBatch[],
  options: {
    batchSize?: number;
    maxRetries?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<BatchInsertResult> {
  const startTime = Date.now();
  const {
    batchSize = 1000,  // Optimal batch size for Supabase
    maxRetries = 3,
    onProgress
  } = options;

  const result: BatchInsertResult = {
    success: true,
    inserted: 0,
    skipped: 0,
    errors: [],
    duration: 0
  };

  // Deduplicate data by (series_id, date) before inserting
  const dedupedData = deduplicateEconomicData(data);
  
  if (dedupedData.length === 0) {
    return { ...result, duration: Date.now() - startTime };
  }

  console.log(`[Batch] Starting batch insert: ${dedupedData.length} rows, batch size: ${batchSize}`);

  // Process in batches to avoid timeout and memory issues
  for (let i = 0; i < dedupedData.length; i += batchSize) {
    const batch = dedupedData.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(dedupedData.length / batchSize);

    try {
      const batchResult = await insertBatchWithRetry(supabase, batch, maxRetries);
      
      result.inserted += batchResult.inserted;
      result.skipped += batchResult.skipped;
      result.errors.push(...batchResult.errors);

      // Report progress
      if (onProgress) {
        const processed = Math.min(i + batchSize, dedupedData.length);
        onProgress(processed, dedupedData.length);
      }

      console.log(`[Batch] Batch ${batchNumber}/${totalBatches} completed: ${batchResult.inserted} inserted, ${batchResult.skipped} skipped`);

    } catch (error) {
      const errorMsg = `Batch ${batchNumber}/${totalBatches} failed: ${error.message}`;
      result.errors.push(errorMsg);
      result.success = false;
      console.error(errorMsg);
      
      // Continue with next batch on failure (resilient approach)
      continue;
    }
  }

  result.duration = Date.now() - startTime;
  
  console.log(`[Batch] Completed: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors.length} errors, ${result.duration}ms`);
  
  return result;
}

// ===========================================
// 3. Core Batch Insert with Retry Logic
// ===========================================

async function insertBatchWithRetry(
  supabase: SupabaseClient<Database>,
  batch: EconomicDataBatch[],
  maxRetries: number
): Promise<BatchInsertResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use Supabase's built-in upsert to handle duplicates efficiently
      const { data, error, count } = await supabase
        .from('economic_data')
        .upsert(batch, {
          onConflict: 'series_id,date',  // Unique constraint
          ignoreDuplicates: false        // Update existing rows
        })
        .select('id', { count: 'exact' });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        inserted: count || 0,
        skipped: 0,
        errors: [],
        duration: 0
      };

    } catch (error) {
      lastError = error as Error;
      
      // Exponential backoff for retries
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`[Batch] Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    inserted: 0,
    skipped: batch.length,
    errors: [`All ${maxRetries} attempts failed: ${lastError?.message}`],
    duration: 0
  };
}

// ===========================================
// 4. Data Deduplication
// ===========================================

/**
 * Remove duplicates from economic data based on (series_id, date)
 * Keeps the most recent vintage_date if multiple entries exist
 */
function deduplicateEconomicData(data: EconomicDataBatch[]): EconomicDataBatch[] {
  const unique = new Map<string, EconomicDataBatch>();
  
  data.forEach(row => {
    const key = `${row.series_id}|${row.date}`;
    
    if (!unique.has(key) || 
        (row.vintage_date && (!unique.get(key)?.vintage_date || row.vintage_date > unique.get(key)!.vintage_date!))) {
      unique.set(key, row);
    }
  });
  
  return Array.from(unique.values());
}

// ===========================================
// 5. Optimized Fetch + Insert Workflow
// ===========================================

/**
 * Optimized workflow for fetching FRED data and inserting in batches
 * Combines efficient fetching with bulk insert operations
 */
export async function optimizedFetchAndInsert(
  supabase: SupabaseClient<Database>,
  seriesId: string,
  observations: Array<{ date: string; value: string }>,
  options: {
    batchSize?: number;
    onProgress?: (step: string, progress: number) => void;
  } = {}
): Promise<BatchInsertResult> {
  const { batchSize = 1000, onProgress } = options;
  
  // Convert FRED data to our format
  const economicData: EconomicDataBatch[] = observations
    .filter(obs => obs.value !== null && obs.value !== '.')
    .map(obs => ({
      series_id: seriesId,
      date: obs.date,
      value: parseFloat(obs.value),
      created_at: new Date().toISOString()
    }));

  if (onProgress) {
    onProgress('prepared', economicData.length);
  }

  // Use the optimized batch insert
  return batchInsertEconomicData(supabase, economicData, {
    batchSize,
    onProgress: (processed, total) => {
      if (onProgress) {
        onProgress('inserting', (processed / total) * 100);
      }
    }
  });
}

// ===========================================
// 6. Connection Pooling Optimization
// ===========================================

/**
 * Optimized Supabase client configuration for bulk operations
 * Uses transaction pooling for better performance
 */
export function getOptimizedSupabaseClient(
  url: string,
  serviceKey: string
): SupabaseClient<Database> {
  const supabase = createClient(url, serviceKey, {
    // Enable connection pooling optimizations
    db: {
      // Use transaction pooling (best for bulk operations)
      poolSize: 10,
      // Enable prepared statements for repeated queries
      prepare: true
    },
    // Optimistic timeout for bulk operations
    global: {
      headers: {
        'Connection': 'keep-alive'
      }
    }
  });

  return supabase as SupabaseClient<Database>;
}

// ===========================================
// 7. Performance Monitoring
// ===========================================

export interface BatchPerformanceMetrics {
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  totalRows: number;
  averageBatchSize: number;
  totalTime: number;
  rowsPerSecond: number;
  errorRate: number;
}

export function calculateBatchMetrics(results: BatchInsertResult[]): BatchPerformanceMetrics {
  const totalBatches = results.length;
  const successfulBatches = results.filter(r => r.success).length;
  const failedBatches = totalBatches - successfulBatches;
  const totalRows = results.reduce((sum, r) => sum + r.inserted + r.skipped, 0);
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return {
    totalBatches,
    successfulBatches,
    failedBatches,
    totalRows,
    averageBatchSize: totalRows / totalBatches,
    totalTime,
    rowsPerSecond: totalInserted / (totalTime / 1000),
    errorRate: totalErrors / totalBatches
  };
}

// ===========================================
// Usage Examples
// ===========================================

/*
// Example 1: Basic batch insert
const economicData = [
  { series_id: 'GDP', date: '2024-01-01', value: 123.45 },
  { series_id: 'GDP', date: '2024-02-01', value: 124.56 },
  // ... thousands more rows
];

const result = await batchInsertEconomicData(supabase, economicData);
console.log(`Inserted ${result.inserted} rows in ${result.duration}ms`);

// Example 2: Fetch and insert workflow
const observations = await fetchFREDData('GDP', '2023-01-01');
const result = await optimizedFetchAndInsert(supabase, 'GDP', observations);

// Example 3: Monitor performance
const metrics = calculateBatchMetrics([result]);
console.log(`Performance: ${metrics.rowsPerSecond.toFixed(1)} rows/second, error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
*/

// ===========================================
// Expected Performance Improvements
// ===========================================

/*
✅ Batch inserts: 10-50x faster than individual inserts
✅ Deduplication: Prevents constraint violations
✅ Retry logic: Handles network issues gracefully
✅ Progress reporting: Better user experience
✅ Connection pooling: Optimized for bulk operations
✅ Performance monitoring: Visibility into bottlenecks

Expected throughput: 1,000-10,000 rows per second (depending on data complexity)
*/