// Improved Data Scheduler - Enhanced version with full sync, resume capability, gap filling, and comprehensive error handling

import { fetchFREDData, INDICATORS, getAllIndicators, type FREDSeriesInfo } from './fred';
import { supabase } from './supabase';

// ========== Type Definitions ==========

export type SyncMode = 'full' | 'incremental' | 'backfill' | 'recovery';

export interface SyncProgress {
  seriesId: string;
  totalObservations: number;
  completedObservations: number;
  currentObservationDate?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface SyncResult {
  seriesId: string;
  success: boolean;
  mode: SyncMode;
  observationsFetched: number;
  observationsInserted: number;
  observationsUpdated: number;
  observationsSkipped: number;
  gapsDetected: number;
  gapsFilled: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
  startDate?: string;
  endDate?: string;
}

export interface FetchOptions {
  seriesIds?: string[];
  startDate?: Date;
  endDate?: Date;
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  validateData?: boolean;
  fillGaps?: boolean;
  resumeFromCheckpoint?: boolean;
}

export interface DataValidationResult {
  isValid: boolean;
  issues: Array<{
    date: string;
    value: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
  cleanedData: Array<{ date: string; value: number }>;
}

export interface SyncCheckpoint {
  seriesId: string;
  lastSyncedDate: string;
  lastObservationDate: string;
  totalSynced: number;
  mode: SyncMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitInfo {
  requestsInCurrentWindow: number;
  requestsPerMinute: number;
  resetTime: Date;
  isLimitReached: boolean;
}

export interface FREDAPIError {
  status: number;
  message: string;
  code?: string;
  isRetryable: boolean;
}

// ========== Configuration ==========

const FRED_RATE_LIMIT_PER_MINUTE = 120;
const FRED_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_BATCH_SIZE = 100;

const FREQUENCY_CONFIG: Record<string, {
  incrementalDays: number;
  fullSyncMinYears: number;
  fullSyncMaxYears: number;
}> = {
  daily: {
    incrementalDays: 7,
    fullSyncMinYears: 1,
    fullSyncMaxYears: 5,
  },
  weekly: {
    incrementalDays: 14,
    fullSyncMinYears: 2,
    fullSyncMaxYears: 5,
  },
  monthly: {
    incrementalDays: 60,
    fullSyncMinYears: 10,
    fullSyncMaxYears: 30,
  },
  quarterly: {
    incrementalDays: 90,
    fullSyncMinYears: 20,
    fullSyncMaxYears: 30,
  },
};

// ========== Utility Functions ==========

function getFrequency(seriesId: string): string {
  const info = INDICATORS[seriesId];
  if (!info) return 'daily';
  const freq = info.frequency.toLowerCase();
  if (freq.includes('quarter')) return 'quarterly';
  if (freq.includes('week')) return 'weekly';
  if (freq.includes('month')) return 'monthly';
  return 'daily';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRunId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// ========== Rate Limiting ==========

class RateLimiter {
  private requestTimestamps: number[] = [];
  private requestsPerMinute: number;

  constructor(requestsPerMinute: number = FRED_RATE_LIMIT_PER_MINUTE) {
    this.requestsPerMinute = requestsPerMinute;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - FRED_RATE_LIMIT_WINDOW_MS;
    
    this.requestTimestamps = this.requestTimestamps.filter(t => t >= windowStart);
    
    while (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = oldestRequest + FRED_RATE_LIMIT_WINDOW_MS - now;
      
      if (waitTime > 0) {
        await sleep(waitTime);
      }
      
      const updatedNow = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(t => t >= updatedNow - FRED_RATE_LIMIT_WINDOW_MS);
    }
    
    this.requestTimestamps.push(now);
  }

  getInfo(): RateLimitInfo {
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

  reset(): void {
    this.requestTimestamps = [];
  }
}

// ========== Error Handling ==========

function classifyFREDError(status: number, message: string): FREDAPIError {
  const isRetryable = [408, 429, 500, 502, 503, 504].includes(status);
  
  let code: string | undefined;
  if (status === 429) code = 'RATE_LIMIT_EXCEEDED';
  else if (status === 404) code = 'SERIES_NOT_FOUND';
  else if (status === 400) code = 'BAD_REQUEST';
  else if (status >= 500) code = 'SERVER_ERROR';
  
  return {
    status,
    message,
    code,
    isRetryable,
  };
}

async function handleFREDRequest<T>(
  request: () => Promise<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  baseDelay: number = DEFAULT_RETRY_DELAY,
  rateLimiter?: RateLimiter
): Promise<T> {
  let lastError: FREDAPIError | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (rateLimiter) {
        await rateLimiter.acquire();
      }
      
      return await request();
    } catch (error) {
      const response = error as Response;
      let status = 0;
      let message = 'Unknown error';
      
      if (response instanceof Response) {
        status = response.status;
        message = await response.text().catch(() => response.statusText);
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      lastError = classifyFREDError(status, message);
      
      if (!lastError.isRetryable || attempt === maxRetries) {
        throw new Error(`FRED API error: ${lastError.message} (status: ${lastError.status}, code: ${lastError.code})`);
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError ? new Error(lastError.message) : new Error('Unknown error occurred');
}

// ========== Data Validation ==========

export function validateAndClean(data: Array<{ date: string; value: string }>, seriesId: string): DataValidationResult {
  const issues: DataValidationResult['issues'] = [];
  const cleanedData: Array<{ date: string; value: number }> = [];
  
  const validValues = new Set<string>();
  let minValue: number | null = null;
  let maxValue: number | null = null;
  
  for (const obs of data) {
    const { date, value } = obs;
    
    if (!date || typeof date !== 'string') {
      issues.push({
        date: date || 'unknown',
        value,
        issue: 'Invalid date format',
        severity: 'error',
      });
      continue;
    }
    
    if (value === null || value === undefined || value === '' || value === '.' || value === '-') {
      issues.push({
        date,
        value,
        issue: 'Null or missing value',
        severity: 'warning',
      });
      continue;
    }
    
    const parsedValue = parseFloat(value);
    
    if (isNaN(parsedValue)) {
      issues.push({
        date,
        value,
        issue: 'Invalid numeric value',
        severity: 'error',
      });
      continue;
    }
    
    if (!isFinite(parsedValue)) {
      issues.push({
        date,
        value,
        issue: 'Infinite value',
        severity: 'error',
      });
      continue;
    }
    
    if (parsedValue < 0 && !isNegativeAllowed(seriesId)) {
      issues.push({
        date,
        value,
        issue: 'Negative value not allowed for this indicator',
        severity: 'error',
      });
      continue;
    }
    
    validValues.add(value);
    
    if (minValue === null || parsedValue < minValue) {
      minValue = parsedValue;
    }
    if (maxValue === null || parsedValue > maxValue) {
      maxValue = parsedValue;
    }
    
    cleanedData.push({ date, value: parsedValue });
  }
  
  if (validValues.size > 0 && minValue !== null && maxValue !== null) {
    const range = maxValue - minValue;
    const meanRange = (minValue + maxValue) / 2;
    
    for (const obs of cleanedData) {
      const deviation = Math.abs(obs.value - meanRange);
      
      if (range > 0 && deviation > range * 10) {
        issues.push({
          date: obs.date,
          value: obs.value.toString(),
          issue: 'Extreme outlier detected',
          severity: 'warning',
        });
      }
    }
  }
  
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    cleanedData,
  };
}

function isNegativeAllowed(seriesId: string): boolean {
  const allowedNegative = ['BOPGSTB'];
  return allowedNegative.includes(seriesId);
}

// ========== Checkpoint Management (using existing collection_run_details) ==========

async function saveCheckpoint(supabase: any, seriesId: string, checkpoint: SyncCheckpoint): Promise<void> {
  const runId = generateRunId();
  
  const { error } = await supabase
    .from('collection_run_details')
    .upsert({
      run_id: runId,
      series_id: seriesId,
      frequency: getFrequency(seriesId),
      status: 'completed',
      observations_inserted: checkpoint.totalSynced,
      observations_fetched: checkpoint.totalSynced,
      missing_dates: [],
      errors: [],
    }, {
      onConflict: 'series_id',
    });
  
  if (error) {
    console.error(`[Scheduler] Failed to save checkpoint for ${seriesId}:`, error);
  }
}

async function loadCheckpoint(supabase: any, seriesId: string): Promise<SyncCheckpoint | null> {
  const { data, error } = await supabase
    .from('collection_run_details')
    .select('*')
    .eq('series_id', seriesId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  const { data: latestRecord } = await supabase
    .from('economic_data')
    .select('date')
    .eq('series_id', seriesId)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  return {
    seriesId: data.series_id,
    lastSyncedDate: data.completed_at?.split('T')[0] || '',
    lastObservationDate: latestRecord?.date || '',
    totalSynced: data.observations_inserted || 0,
    mode: 'full',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(),
  };
}

// ========== Gap Detection ==========

async function detectGaps(
  supabase: any,
  seriesId: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> {
  const frequency = getFrequency(seriesId);
  
  const { data, error } = await supabase
    .from('economic_data')
    .select('date')
    .eq('series_id', seriesId)
    .gte('date', formatDate(startDate))
    .lte('date', formatDate(endDate))
    .order('date', { ascending: true });
  
  if (error || !data) {
    return [];
  }
  
  const existingDates = new Set(data.map((d: { date: string }) => d.date));
  const missingDates: string[] = [];
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    
    if (!existingDates.has(dateStr)) {
      missingDates.push(dateStr);
    }
    
    switch (frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
    }
  }
  
  return missingDates;
}

// ========== Data Fetching ==========

async function fetchAndStoreSeries(
  seriesId: string,
  options: FetchOptions,
  rateLimiter: RateLimiter
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    seriesId,
    success: false,
    mode: options.resumeFromCheckpoint ? 'recovery' : 'full',
    observationsFetched: 0,
    observationsInserted: 0,
    observationsUpdated: 0,
    observationsSkipped: 0,
    gapsDetected: 0,
    gapsFilled: 0,
    errors: [],
    warnings: [],
    durationMs: 0,
  };
  
  try {
    const indicatorInfo = INDICATORS[seriesId];
    if (!indicatorInfo) {
      throw new Error(`Indicator ${seriesId} not found in configuration`);
    }
    
    const frequency = getFrequency(seriesId);
    const config = FREQUENCY_CONFIG[frequency] || FREQUENCY_CONFIG.daily;
    
    let observationStart = options.startDate || new Date();
    let observationEnd = options.endDate || new Date();
    
    let checkpoint: SyncCheckpoint | null = null;
    
    if (options.resumeFromCheckpoint) {
      checkpoint = await loadCheckpoint(supabase, seriesId);
      if (checkpoint) {
        observationStart = parseDate(checkpoint.lastSyncedDate);
        result.mode = 'recovery';
      } else {
        result.warnings.push(`No checkpoint found for ${seriesId}, starting from default date`);
      }
    }
    
    if (!options.startDate && !checkpoint) {
      observationStart = new Date();
      observationStart.setFullYear(observationStart.getFullYear() - config.fullSyncMinYears);
    }
    
    result.startDate = formatDate(observationStart);
    result.endDate = formatDate(observationEnd);
    
    const fredData = await handleFREDRequest(
      () => fetchFREDData(seriesId, formatDate(observationStart)),
      options.maxRetries || DEFAULT_MAX_RETRIES,
      options.retryDelay || DEFAULT_RETRY_DELAY,
      rateLimiter
    );
    
    result.observationsFetched = fredData.observations.length;
    
    if (fredData.observations.length === 0) {
      result.warnings.push('No observations returned from FRED API');
      result.success = true;
      result.durationMs = Date.now() - startTime;
      return result;
    }
    
    const validationResult = validateAndClean(fredData.observations, seriesId);
    
    if (validationResult.issues.length > 0) {
      result.errors.push(
        ...validationResult.issues
          .filter(i => i.severity === 'error')
          .map(i => `${i.date}: ${i.issue}`)
      );
      
      result.warnings.push(
        ...validationResult.issues
          .filter(i => i.severity === 'warning')
          .map(i => `${i.date}: ${i.issue}`)
      );
    }
    
    if (!validationResult.isValid) {
      throw new Error(`Data validation failed for ${seriesId}`);
    }
    
    const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    const totalBatches = Math.ceil(validationResult.cleanedData.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, validationResult.cleanedData.length);
      const batch = validationResult.cleanedData.slice(startIdx, endIdx);
      
      const records = batch.map(obs => ({
        series_id: seriesId,
        date: obs.date,
        value: obs.value,
        vintage_date: new Date().toISOString().split('T')[0],
      }));
      
      const { data: upsertedData, error: upsertError } = await supabase
        .from('economic_data')
        .upsert(records, { onConflict: 'series_id,date', ignoreDuplicates: false });
      
      if (upsertError) {
        throw new Error(`Database upsert error: ${upsertError.message}`);
      }
      
      result.observationsInserted += records.length;
      
      if (batchIndex < totalBatches - 1) {
        await sleep(50);
      }
    }
    
    result.observationsSkipped = result.observationsFetched - validationResult.cleanedData.length;
    
    if (options.fillGaps) {
      const missingDates = await detectGaps(
        supabase,
        seriesId,
        observationStart,
        observationEnd
      );
      
      result.gapsDetected = missingDates.length;
      
      if (missingDates.length > 0) {
        result.gapsFilled = await fillMissingData(
          seriesId,
          missingDates,
          indicatorInfo,
          rateLimiter,
          options
        );
      }
    }
    
    if (checkpoint || options.resumeFromCheckpoint) {
      await saveCheckpoint(supabase, seriesId, {
        seriesId,
        lastSyncedDate: formatDate(observationEnd),
        lastObservationDate: fredData.observations[fredData.observations.length - 1]?.date || '',
        totalSynced: result.observationsInserted + result.observationsUpdated,
        mode: result.mode,
        createdAt: checkpoint?.createdAt || new Date(),
        updatedAt: new Date(),
      });
    }
    
    result.success = true;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  result.durationMs = Date.now() - startTime;
  return result;
}

async function fillMissingData(
  seriesId: string,
  missingDates: string[],
  indicatorInfo: FREDSeriesInfo,
  rateLimiter: RateLimiter,
  options: FetchOptions
): Promise<number> {
  let filledCount = 0;
  
  for (const date of missingDates) {
    try {
      const fetchDate = new Date(date);
      const startDate = new Date(fetchDate);
      startDate.setDate(startDate.getDate() - 1);
      
      const fredData = await handleFREDRequest(
        () => fetchFREDData(seriesId, formatDate(startDate)),
        options.maxRetries || DEFAULT_MAX_RETRIES,
        options.retryDelay || DEFAULT_RETRY_DELAY,
        rateLimiter
      );
      
      const foundObs = fredData.observations.find((obs: { date: string }) => obs.date === date);
      
      if (foundObs) {
        const value = parseFloat(foundObs.value);
        
        if (!isNaN(value) && foundObs.value !== '.' && foundObs.value !== '-') {
          const { error } = await supabase
            .from('economic_data')
            .upsert({
              series_id: seriesId,
              date: date,
              value: value,
              vintage_date: new Date().toISOString().split('T')[0],
            }, { onConflict: 'series_id,date', ignoreDuplicates: false });
          
          if (!error) {
            filledCount++;
          }
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to fill gap for ${seriesId} on ${date}:`, error);
    }
    
    await sleep(100);
  }
  
  return filledCount;
}

// ========== Main Exported Functions ==========

export async function fullSync(seriesIds?: string[], options: Partial<FetchOptions> = {}): Promise<SyncResult[]> {
  const rateLimiter = new RateLimiter(FRED_RATE_LIMIT_PER_MINUTE);
  
  const indicatorsToSync = seriesIds && seriesIds.length > 0
    ? seriesIds
    : getAllIndicators().map(ind => ind.id);
  
  const results: SyncResult[] = [];
  
  for (const seriesId of indicatorsToSync) {
    const result = await fetchAndStoreSeries(
      seriesId,
      {
        ...options,
        validateData: options.validateData ?? true,
        fillGaps: options.fillGaps ?? true,
      },
      rateLimiter
    );
    
    results.push(result);
  }
  
  return results;
}

export async function incrementalSync(): Promise<SyncResult[]> {
  const rateLimiter = new RateLimiter(FRED_RATE_LIMIT_PER_MINUTE);
  const results: SyncResult[] = [];
  
  const allIndicators = getAllIndicators();
  
  for (const indicator of allIndicators) {
    const frequency = getFrequency(indicator.id);
    const config = FREQUENCY_CONFIG[frequency];
    
    const { data: latestData } = await supabase
      .from('economic_data')
      .select('date')
      .eq('series_id', indicator.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    const startDate = latestData?.date
      ? new Date(latestData.date)
      : new Date();
    
    startDate.setDate(startDate.getDate() - config.incrementalDays);
    
    const result = await fetchAndStoreSeries(
      indicator.id,
      {
        startDate,
        endDate: new Date(),
        validateData: true,
        fillGaps: false,
      },
      rateLimiter
    );
    
    results.push(result);
  }
  
  return results;
}

export async function resumeSync(seriesId: string): Promise<SyncResult> {
  const rateLimiter = new RateLimiter(FRED_RATE_LIMIT_PER_MINUTE);
  
  return await fetchAndStoreSeries(
    seriesId,
    {
      resumeFromCheckpoint: true,
      validateData: true,
      fillGaps: true,
    },
    rateLimiter
  );
}

export async function backfillGaps(seriesIds?: string[]): Promise<SyncResult[]> {
  const rateLimiter = new RateLimiter(FRED_RATE_LIMIT_PER_MINUTE);
  const results: SyncResult[] = [];
  
  const indicatorsToProcess = seriesIds && seriesIds.length > 0
    ? seriesIds
    : getAllIndicators().map(ind => ind.id);
  
  for (const seriesId of indicatorsToProcess) {
    const { data: firstData } = await supabase
      .from('economic_data')
      .select('date')
      .eq('series_id', seriesId)
      .order('date', { ascending: true })
      .limit(1)
      .single();
    
    const { data: lastData } = await supabase
      .from('economic_data')
      .select('date')
      .eq('series_id', seriesId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (!firstData || !lastData) {
      results.push({
        seriesId,
        success: false,
        mode: 'backfill',
        observationsFetched: 0,
        observationsInserted: 0,
        observationsUpdated: 0,
        observationsSkipped: 0,
        gapsDetected: 0,
        gapsFilled: 0,
        errors: ['No existing data found for this series'],
        warnings: [],
        durationMs: 0,
      });
      continue;
    }
    
    const missingDates = await detectGaps(
      supabase,
      seriesId,
      new Date(firstData.date),
      new Date(lastData.date)
    );
    
    const result: SyncResult = {
      seriesId,
      success: true,
      mode: 'backfill',
      observationsFetched: 0,
      observationsInserted: 0,
      observationsUpdated: 0,
      observationsSkipped: 0,
      gapsDetected: missingDates.length,
      gapsFilled: 0,
      errors: [],
      warnings: [],
      durationMs: 0,
    };
    
    if (missingDates.length > 0) {
      const indicatorInfo = INDICATORS[seriesId];
      if (indicatorInfo) {
        result.gapsFilled = await fillMissingData(
          seriesId,
          missingDates,
          indicatorInfo,
          rateLimiter,
          {
            validateData: true,
            maxRetries: 3,
            retryDelay: 1000,
          }
        );
      }
    }
    
    result.durationMs = Date.now();
    results.push(result);
  }
  
  return results;
}

export async function syncIndicators(
  mode: SyncMode,
  options: Partial<FetchOptions> = {}
): Promise<SyncResult[]> {
  switch (mode) {
    case 'full':
      return await fullSync(options.seriesIds, options);
    case 'incremental':
      return await incrementalSync();
    case 'recovery':
      if (options.seriesIds && options.seriesIds.length === 1) {
        return [await resumeSync(options.seriesIds[0])];
      }
      throw new Error('Recovery mode requires exactly one seriesId');
    case 'backfill':
      return await backfillGaps(options.seriesIds);
    default:
      throw new Error(`Unknown sync mode: ${mode}`);
  }
}

export function getFrequencyConfig(frequency: string) {
  return FREQUENCY_CONFIG[frequency] || FREQUENCY_CONFIG.daily;
}

export function getSeriesFrequency(seriesId: string): string {
  return getFrequency(seriesId);
}

export { RateLimiter };
