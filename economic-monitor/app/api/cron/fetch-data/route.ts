import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { smartFetchWithLogging, getSchedulerStats } from '@/lib/data-scheduler';

export const maxDuration = 300; // 5 分钟

// CRON_SECRET 用于验证 cron 任务请求
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // 验证 CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized access attempt to fetch-data');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'incremental';
    const seriesIdsParam = searchParams.get('seriesIds');
    
    // 解析选项
    const options: any = {};
    
    if (mode === 'full') {
      options.forceFullSync = true;
    } else if (['daily', 'weekly', 'monthly', 'quarterly'].includes(mode)) {
      options.frequency = mode;
    }
    
    if (seriesIdsParam) {
      options.seriesIds = seriesIdsParam.split(',');
    }

    console.log(`[Cron] Starting data fetch... Mode: ${mode}`);

    // 执行智能采集（带日志）
    const run = await smartFetchWithLogging(
      supabaseAdmin,
      process.env.FRED_API_KEY!,
      options
    );

    console.log(`[Cron] Data fetch complete. Duration: ${run.durationMs}ms`);
    console.log(`[Cron] Inserted: ${run.totalInserted}, Skipped: ${run.totalSkipped}, Errors: ${run.totalErrors}`);

    return NextResponse.json({
      success: true,
      runId: run.runId,
      mode: run.mode,
      duration: run.durationMs,
      totals: {
        indicators: run.totalIndicators,
        fetched: run.totalFetched,
        inserted: run.totalInserted,
        skipped: run.totalSkipped,
        errors: run.totalErrors,
      },
      status: run.status,
      errorSummary: run.errorSummary,
    });
  } catch (error) {
    console.error('[Cron] Data fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Data fetch failed' },
      { status: 500 }
    );
  }
}

// ========== 调度器管理 API ==========

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'stats') {
      const stats = await getSchedulerStats(supabaseAdmin);
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'frequency') {
      const { searchParams } = new URL(request.url);
      const seriesId = searchParams.get('seriesId');
      
      if (!seriesId) {
        return NextResponse.json({ error: 'seriesId required' }, { status: 400 });
      }
      
      const { getFrequency } = await import('@/lib/data-scheduler');
      return NextResponse.json({
        success: true,
        seriesId,
        frequency: getFrequency(seriesId),
      });
    }

    if (action === 'quality') {
      // 检查数据质量
      const { data, error } = await supabaseAdmin
        .from('data_quality_issues')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 获取新鲜度
      const freshnessResult = await getSchedulerStats(supabaseAdmin);

      return NextResponse.json({
        success: true,
        issues: data || [],
        freshness: freshnessResult.dataFreshness,
      });
    }

    if (action === 'logs') {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      
      const { data: runs } = await supabaseAdmin
        .from('collection_runs')
        .select(`
          run_id,
          run_type,
          mode,
          status,
          started_at,
          completed_at,
          duration_ms,
          total_indicators,
          total_fetched,
          total_inserted,
          total_skipped,
          total_errors
        `)
        .order('started_at', { ascending: false })
        .limit(limit);

      const { data: details } = await supabaseAdmin
        .from('collection_run_details')
        .select('*')
        .in('run_id', (runs || []).map(r => r.run_id));

      return NextResponse.json({
        success: true,
        runs: runs || [],
        details: details || [],
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Cron] API error:', error);
    return NextResponse.json(
      { error: 'API error' },
      { status: 500 }
    );
  }
}
