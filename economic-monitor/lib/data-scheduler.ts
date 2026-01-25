// Data Collection Scheduler with Logging and Persistence
// 智能数据采集调度器 - 支持采集日志和状态持久化
//
// 功能：
// 1. 按数据频率分组（每日/每周/每月/每季度）
// 2. API 限速处理
// 3. 断点重传
// 4. 缺失数据检测和填补
// 5. 采集日志记录
// 6. 状态持久化到数据库

import { FREDSeriesInfo, INDICATORS, getAllIndicators } from './fred';
import type { Database } from './database.types';

// ========== 类型定义 ==========

export type DataFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface FetchConfig {
  frequency: DataFrequency;
  maxWindowDays: number;  // 每次获取多少天的数据
  rateLimitDelay: number; // 请求间隔（毫秒）
  retryAttempts: number;
  retryDelay: number;
}

export interface FetchResult {
  success: boolean;
  seriesId: string;
  frequency: DataFrequency;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
  missingDates: string[];  // 缺失的日期
  durationMs: number;
}

export interface CollectionRun {
  runId: string;
  runType: 'scheduled' | 'manual' | 'backfill' | 'recovery';
  mode: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  totalIndicators: number;
  totalFetched: number;
  totalInserted: number;
  totalSkipped: number;
  totalErrors: number;
  errorSummary: Record<string, string[]>;
  results: FetchResult[];
}

export interface SchedulerStats {
  totalSeries: number;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  quarterlyCount: number;
  lastRun: CollectionRun | null;
  nextScheduledRun: string | null;
  recentRuns: CollectionRun[];
  dataFreshness: Array<{
    seriesId: string;
    lastUpdate: string | null;
    daysAgo: number;
    status: 'fresh' | 'warning' | 'stale';
  }>;
}

// ========== 配置 ==========

// FRED API 限速：每秒最多 120 次请求（免费版）
const FRED_RATE_LIMIT_DELAY = 1000 / 120; // ~8ms

// 按频率配置
const FETCH_CONFIGS: Record<DataFrequency, FetchConfig> = {
  daily: {
    frequency: 'daily',
    maxWindowDays: 7,      // 每日数据每次只拿 7 天（增量更新）
    rateLimitDelay: FRED_RATE_LIMIT_DELAY,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  weekly: {
    frequency: 'weekly',
    maxWindowDays: 14,     // 每周数据每次拿 2 周
    rateLimitDelay: FRED_RATE_LIMIT_DELAY,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  monthly: {
    frequency: 'monthly',
    maxWindowDays: 60,     // 月度数据每次拿 2 个月
    rateLimitDelay: FRED_RATE_LIMIT_DELAY,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  quarterly: {
    frequency: 'quarterly',
    maxWindowDays: 180,    // 季度数据每次拿半年
    rateLimitDelay: FRED_RATE_LIMIT_DELAY,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

// ========== 辅助函数 ==========

export function getFrequency(seriesId: string): DataFrequency {
  const info = INDICATORS[seriesId];
  if (!info) return 'daily';
  
  const freq = info.frequency.toLowerCase();
  if (freq.includes('quarter')) return 'quarterly';
  if (freq.includes('week')) return 'weekly';
  if (freq.includes('month')) return 'monthly';
  return 'daily';
}

export function groupIndicatorsByFrequency(): Record<DataFrequency, FREDSeriesInfo[]> {
  const groups: Record<DataFrequency, FREDSeriesInfo[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    quarterly: [],
  };

  const indicators = getAllIndicators();
  for (const indicator of indicators) {
    const freq = getFrequency(indicator.id);
    groups[freq].push(indicator);
  }

  return groups;
}

// ========== 缺失数据检测 ==========

export function findMissingDates(
  existingDates: string[],
  expectedDates: string[]
): string[] {
  const existingSet = new Set(existingDates);
  return expectedDates.filter(date => !existingSet.has(date));
}

export function generateExpectedDates(
  startDate: Date,
  endDate: Date,
  frequency: DataFrequency
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    
    switch (frequency) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
    }
  }
  
  return dates;
}

// ========== 智能采集（带日志） ==========

export interface SmartFetchOptions {
  frequency?: DataFrequency;
  forceFullSync?: boolean;
  seriesIds?: string[];
  runType?: 'scheduled' | 'manual' | 'backfill' | 'recovery';
}

export async function smartFetchWithLogging(
  supabase: any,
  apiKey: string,
  options: SmartFetchOptions = {}
): Promise<CollectionRun> {
  const runId = generateRunId();
  const startTime = Date.now();
  
  // 创建运行记录
  const run: CollectionRun = {
    runId,
    runType: options.runType || 'scheduled',
    mode: options.forceFullSync ? 'full' : options.frequency || 'incremental',
    status: 'running',
    startedAt: new Date(),
    totalIndicators: 0,
    totalFetched: 0,
    totalInserted: 0,
    totalSkipped: 0,
    totalErrors: 0,
    errorSummary: {},
    results: [],
  };

  try {
    // 记录运行开始
    await logRunStart(supabase, run);

    // 确定要采集的指标
    let indicators: FREDSeriesInfo[] = [];
    
    if (options.seriesIds && options.seriesIds.length > 0) {
      indicators = options.seriesIds
        .map(id => INDICATORS[id])
        .filter(Boolean);
    } else if (options.frequency) {
      const groups = groupIndicatorsByFrequency();
      indicators = groups[options.frequency] || [];
    } else {
      indicators = getAllIndicators();
    }
    
    run.totalIndicators = indicators.length;

    // 按频率分组处理
    const byFreq = groupIndicatorsByFrequency();
    const allResults: FetchResult[] = [];

    for (const freq of (Object.keys(byFreq) as DataFrequency[])) {
      const freqIndicators = byFreq[freq];
      
      if (options.frequency && options.frequency !== freq) continue;
      
      // 如果指定了 seriesIds，只处理匹配的
      const filteredIndicators = options.seriesIds
        ? freqIndicators.filter(i => options.seriesIds!.includes(i.id))
        : freqIndicators;
      
      if (filteredIndicators.length === 0 && options.seriesIds) continue;
      
      const config = FETCH_CONFIGS[freq];
      
      // 并发处理（限制并发数）
      const batchSize = 3;  // 每次最多3个并发
      for (let i = 0; i < filteredIndicators.length; i += batchSize) {
        const batch = filteredIndicators.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(indicator => 
            fetchWithLogging(supabase, indicator.id, apiKey, config, options.forceFullSync)
          )
        );
        allResults.push(...batchResults);
        
        // 限速
        await sleep(config.rateLimitDelay * batch.length);
      }
    }

    // 汇总结果
    run.results = allResults;
    run.totalFetched = allResults.reduce((sum, r) => sum + r.fetched, 0);
    run.totalInserted = allResults.reduce((sum, r) => sum + r.inserted, 0);
    run.totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
    run.totalErrors = allResults.filter(r => !r.success).length;
    
    // 构建错误汇总
    for (const result of allResults) {
      if (result.errors.length > 0) {
        run.errorSummary[result.seriesId] = result.errors;
      }
    }

    run.status = run.totalErrors === 0 ? 'completed' : 
                 run.totalErrors < run.totalIndicators / 2 ? 'partial' : 'failed';

  } catch (error) {
    run.status = 'failed';
    run.errorSummary['__system'] = [error instanceof Error ? error.message : 'Unknown error'];
  } finally {
    run.completedAt = new Date();
    run.durationMs = Date.now() - startTime;
    
    // 记录运行完成
    await logRunComplete(supabase, run);
  }

  return run;
}

// ========== 带日志的采集 ==========

async function fetchWithLogging(
  supabase: any,
  seriesId: string,
  apiKey: string,
  config: FetchConfig,
  forceFullSync: boolean = false
): Promise<FetchResult> {
  const result: FetchResult = {
    success: false,
    seriesId,
    frequency: config.frequency,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
    missingDates: [],
    durationMs: 0,
  };

  const startTime = Date.now();

  // 计算获取窗口
  let observationStart: Date;
  
  if (forceFullSync) {
    observationStart = new Date();
    observationStart.setFullYear(observationStart.getFullYear() - 5);
  } else {
    const lastRecord = await getLatestRecord(supabase, seriesId);
    if (lastRecord) {
      observationStart = new Date(lastRecord.date);
      observationStart.setDate(observationStart.getDate() - config.maxWindowDays);
    } else {
      observationStart = new Date();
      observationStart.setFullYear(observationStart.getFullYear() - 1);
    }
  }

  // 重试机制
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const data = await fetchFREDSeries(seriesId, apiKey, observationStart);
      result.fetched = data.observations.length;
      
      // 检测缺失日期
      const expectedDates = generateExpectedDates(
        observationStart,
        new Date(),
        config.frequency
      );
      const existingDates = data.observations.map((o: { date: string }) => o.date);
      result.missingDates = findMissingDates(existingDates, expectedDates);
      
      // 批量插入数据
      const records = data.observations
        .filter((obs: { value: string }) => obs.value && obs.value !== '.' && obs.value !== '-')
        .map((obs: { date: string; value: string }) => ({
          series_id: seriesId,
          date: obs.date,
          value: parseFloat(obs.value),
          vintage_date: new Date().toISOString().split('T')[0],
        }));

      if (records.length > 0) {
        const { data: upserted, error } = await supabase
          .from('economic_data')
          .upsert(records, { onConflict: 'series_id,date', ignoreDuplicates: false });

        if (error) {
          result.errors.push(`Upsert error: ${error.message}`);
        } else {
          result.inserted = records.length;
        }
      }

      result.skipped = data.observations.length - records.length;
      result.success = result.errors.length === 0;
      break;
      
    } catch (error) {
      const errorMsg = `Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      
      if (attempt < config.retryAttempts) {
        await sleep(config.retryDelay * attempt);
      }
    }
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ========== 日志记录 ==========

async function logRunStart(supabase: any, run: CollectionRun): Promise<void> {
  const { error } = await supabase
    .from('collection_runs')
    .insert({
      run_id: run.runId,
      run_type: run.runType,
      mode: run.mode,
      status: 'running',
      started_at: run.startedAt.toISOString(),
      total_indicators: run.totalIndicators,
    });

  if (error) {
    console.error('[Scheduler] Failed to log run start:', error);
  }
}

async function logRunComplete(supabase: any, run: CollectionRun): Promise<void> {
  // 更新运行记录
  const { error: runError } = await supabase
    .from('collection_runs')
    .update({
      status: run.status,
      completed_at: run.completedAt?.toISOString(),
      duration_ms: run.durationMs,
      total_fetched: run.totalFetched,
      total_inserted: run.totalInserted,
      total_skipped: run.totalSkipped,
      total_errors: run.totalErrors,
      error_summary: run.errorSummary,
    })
    .eq('run_id', run.runId);

  if (runError) {
    console.error('[Scheduler] Failed to update run:', runError);
  }

  // 记录每个指标的详情
  const details = run.results.map(r => ({
    run_id: run.runId,
    series_id: r.seriesId,
    frequency: r.frequency,
    status: r.success ? 'completed' : 'failed',
    duration_ms: r.durationMs,
    observations_fetched: r.fetched,
    observations_inserted: r.inserted,
    observations_skipped: r.skipped,
    missing_dates: r.missingDates,
    errors: r.errors.length > 0 ? r.errors : null,
  }));

  if (details.length > 0) {
    const { error: detailError } = await supabase
      .from('collection_run_details')
      .upsert(details, { onConflict: 'run_id,series_id' });

    if (detailError) {
      console.error('[Scheduler] Failed to log run details:', detailError);
    }
  }

  // 检测并记录数据质量问题
  await detectAndLogDataQualityIssues(supabase, run.results);
}

// ========== 数据质量检测 ==========

async function detectAndLogDataQualityIssues(
  supabase: any,
  results: FetchResult[]
): Promise<void> {
  const issues: Array<{
    series_id: string;
    issue_type: 'missing' | 'gap' | 'stale';
    date_or_range: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> = [];

  for (const result of results) {
    // 检测缺失日期
    if (result.missingDates.length > 0) {
      // 只记录超过3天的缺失为问题
      const significantGaps = result.missingDates.slice(0, 5);
      for (const date of significantGaps) {
        issues.push({
          series_id: result.seriesId,
          issue_type: 'missing',
          date_or_range: date,
          severity: 'medium',
          description: `Missing data for ${result.seriesId} on ${date}`,
        });
      }
    }

    // 检测连续失败
    if (!result.success && result.errors.length >= 2) {
      issues.push({
        series_id: result.seriesId,
        issue_type: 'stale',
        date_or_range: result.errors.length.toString(),
        severity: 'high',
        description: `Failed to fetch ${result.seriesId} ${result.errors.length} times consecutively`,
      });
    }
  }

  if (issues.length > 0) {
    await supabase.from('data_quality_issues').insert(issues);
  }
}

// ========== 调度器状态 ==========

export async function getSchedulerStats(supabase: any): Promise<SchedulerStats> {
  const groups = groupIndicatorsByFrequency();

  // 获取最近运行记录
  const { data: recentRuns } = await supabase
    .from('collection_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  const lastRun = recentRuns?.[0] || null;

  // 获取数据新鲜度
  const { data: freshness } = await supabase
    .from('economic_data')
    .select('series_id, date')
    .order('date', { ascending: false });

  const freshnessMap = new Map<string, Date>();
  for (const row of freshness || []) {
    if (!freshnessMap.has(row.series_id)) {
      freshnessMap.set(row.series_id, new Date(row.date));
    }
  }

  const dataFreshness = getAllIndicators().map(ind => {
    const lastUpdate = freshnessMap.get(ind.id);
    const daysAgo = lastUpdate 
      ? Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    let status: 'fresh' | 'warning' | 'stale' = 'fresh';
    if (daysAgo === -1) {
      status = 'stale';
    } else {
      const freq = getFrequency(ind.id);
      const thresholds = { daily: 3, weekly: 10, monthly: 45, quarterly: 120 };
      const threshold = thresholds[freq];
      
      if (daysAgo > threshold) status = 'stale';
      else if (daysAgo > threshold / 2) status = 'warning';
    }

    return {
      seriesId: ind.id,
      lastUpdate: lastUpdate?.toISOString().split('T')[0] || null,
      daysAgo,
      status,
    };
  });

  return {
    totalSeries: getAllIndicators().length,
    dailyCount: groups.daily.length,
    weeklyCount: groups.weekly.length,
    monthlyCount: groups.monthly.length,
    quarterlyCount: groups.quarterly.length,
    lastRun: lastRun ? {
      runId: lastRun.run_id,
      runType: lastRun.run_type,
      mode: lastRun.mode,
      status: lastRun.status,
      startedAt: new Date(lastRun.started_at),
      completedAt: lastRun.completed_at ? new Date(lastRun.completed_at) : undefined,
      durationMs: lastRun.duration_ms,
      totalIndicators: lastRun.total_indicators,
      totalFetched: lastRun.total_fetched,
      totalInserted: lastRun.total_inserted,
      totalSkipped: lastRun.total_skipped,
      totalErrors: lastRun.total_errors,
      errorSummary: lastRun.error_summary || {},
      results: [],
    } : null,
    nextScheduledRun: calculateNextRunTime(),
    recentRuns: (recentRuns || []).map((r: { run_id: string; run_type: string; mode: string; status: string; started_at: string; completed_at: string | null; duration_ms: number; total_indicators: number; total_fetched: number; total_inserted: number; total_skipped: number; total_errors: number; error_summary: Record<string, string> }) => ({
      runId: r.run_id,
      runType: r.run_type,
      mode: r.mode,
      status: r.status,
      startedAt: new Date(r.started_at),
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
      durationMs: r.duration_ms,
      totalIndicators: r.total_indicators,
      totalFetched: r.total_fetched,
      totalInserted: r.total_inserted,
      totalSkipped: r.total_skipped,
      totalErrors: r.total_errors,
      errorSummary: r.error_summary || {},
      results: [],
    })),
    dataFreshness,
  };
}

function calculateNextRunTime(): string {
  const now = new Date();
  // 每天早上 8:00 UTC
  const next = new Date(now);
  next.setUTCHours(8, 0, 0, 0);
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toISOString();
}

function generateRunId(): string {
  const now = new Date();
  return `run_${now.toISOString().replace(/[-:]/g, '').split('.')[0]}_${Math.random().toString(36).slice(2, 8)}`;
}

// ========== 辅助函数 ==========

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFREDSeries(
  seriesId: string,
  apiKey: string,
  observationStart: Date
): Promise<any> {
  const url = 'https://api.stlouisfed.org/fred/series/observations';
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    observation_start: observationStart.toISOString().split('T')[0],
    file_type: 'json',
    limit: '100000',
  });

  const response = await fetch(`${url}?${params}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FRED API error ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

async function getLatestRecord(supabase: any, seriesId: string): Promise<any> {
  const { data } = await supabase
    .from('economic_data')
    .select('date')
    .eq('series_id', seriesId)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  return data;
}
