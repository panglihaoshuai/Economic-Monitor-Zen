import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 900; // 15 分钟 for full sync

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // 验证 CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized access attempt to weekly-full-sync');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Weekly Sync] Starting weekly full data synchronization...');
    
    // 导入fullSync函数
    const { fullSync } = await import('../../../../lib/improved-scheduler');
    
    const startTime = Date.now();
    
    // 执行全量同步
    const results = await fullSync(undefined, {
      validateData: true,
      fillGaps: true,
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 统计结果
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    let successCount = 0;
    
    for (const result of results) {
      totalFetched += result.observationsFetched;
      totalInserted += result.observationsInserted;
      totalErrors += result.errors.length;
      if (result.success) successCount++;
    }
    
    // 记录到collection_runs表
    const { error: logError } = await supabaseAdmin
      .from('collection_runs')
      .insert({
        run_type: 'weekly_full_sync',
        mode: 'full',
        status: totalErrors === 0 ? 'completed' : 'completed_with_errors',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(endTime).toISOString(),
        duration_ms: duration,
        total_indicators: results.length,
        total_fetched: totalFetched,
        total_inserted: totalInserted,
        total_errors: totalErrors,
      });
    
    if (logError) {
      console.error('[Weekly Sync] Failed to log run:', logError);
    }
    
    console.log(`[Weekly Sync] Completed in ${Math.round(duration / 1000)}s`);
    console.log(`[Weekly Sync] Success: ${successCount}/${results.length} indicators`);
    console.log(`[Weekly Sync] Fetched: ${totalFetched}, Inserted: ${totalInserted}, Errors: ${totalErrors}`);
    
    return NextResponse.json({
      success: true,
      type: 'weekly_full_sync',
      duration: duration,
      summary: {
        indicators: results.length,
        successful: successCount,
        totalFetched,
        totalInserted,
        totalErrors,
      },
      status: totalErrors === 0 ? 'success' : 'success_with_errors',
    });
    
  } catch (error) {
    console.error('[Weekly Sync] Full sync failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Weekly full sync failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}