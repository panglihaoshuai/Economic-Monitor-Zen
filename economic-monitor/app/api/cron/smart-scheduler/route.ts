// Smart Data Scheduler API Route
// 智能数据调度API - 支持发布检测、按需更新和缺口分析

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
    checkPublicationStatus,
    checkAllPublications,
    executeOnDemandUpdate,
    analyzeDataGaps,
    type GapAnalysisReport,
    type PublicationCheckResult,
} from '@/lib/smart-data-scheduler';

export const maxDuration = 300; // 5分钟

const CRON_SECRET = process.env.CRON_SECRET;
const FRED_API_KEY = process.env.FRED_API_KEY;

// ========== 认证中间件 ==========
function authenticate(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return !CRON_SECRET || authHeader === `Bearer ${CRON_SECRET}`;
}

// ========== GET: 发布状态检查和缺口分析 ==========
export async function GET(request: Request) {
    if (!authenticate(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    try {
        switch (action) {
            case 'status': {
                // 获取调度器状态概览
                const status = await getSchedulerStatus();
                return NextResponse.json({ success: true, status });
            }

            case 'check-publication': {
                // 检查单个指标的发布状态
                const seriesId = searchParams.get('seriesId');
                if (!seriesId) {
                    return NextResponse.json(
                        { error: 'seriesId is required' },
                        { status: 400 }
                    );
                }

                if (!FRED_API_KEY) {
                    return NextResponse.json(
                        { error: 'FRED_API_KEY not configured' },
                        { status: 500 }
                    );
                }

                const result = await checkPublicationStatus(supabaseAdmin, FRED_API_KEY, seriesId);
                return NextResponse.json({ success: true, result });
            }

            case 'check-all': {
                // 检查所有指标的发布状态
                if (!FRED_API_KEY) {
                    return NextResponse.json(
                        { error: 'FRED_API_KEY not configured' },
                        { status: 500 }
                    );
                }

                const seriesIdsParam = searchParams.get('seriesIds');
                const seriesIds = seriesIdsParam ? seriesIdsParam.split(',') : undefined;

                const results = await checkAllPublications(supabaseAdmin, FRED_API_KEY, seriesIds);

                // 汇总结果
                const summary = {
                    total: results.length,
                    hasNewData: results.filter(r => r.hasNewData).length,
                    shouldFetch: results.filter(r => r.shouldFetch).length,
                    byPriority: {
                        high: results.filter(r => r.priority === 'high').length,
                        normal: results.filter(r => r.priority === 'normal').length,
                        low: results.filter(r => r.priority === 'low').length,
                    },
                };

                return NextResponse.json({
                    success: true,
                    summary,
                    results: results.filter(r => r.hasNewData), // 只返回有更新的
                });
            }

            case 'analyze-gaps': {
                // 分析数据缺口
                const checkRangeDays = parseInt(searchParams.get('checkRangeDays') || '730');
                const minGapDays = parseInt(searchParams.get('minGapDays') || '7');
                const seriesIdsParam = searchParams.get('seriesIds');
                const seriesIds = seriesIdsParam ? seriesIdsParam.split(',') : undefined;

                const report = await analyzeDataGaps(supabaseAdmin, {
                    checkRangeDays,
                    minGapDays,
                    seriesIds,
                });

                return NextResponse.json({ success: true, report });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[Smart Scheduler API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// ========== POST: 执行数据更新 ==========
export async function POST(request: Request) {
    if (!authenticate(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!FRED_API_KEY) {
        return NextResponse.json(
            { error: 'FRED_API_KEY not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'update-on-demand': {
                // 执行按需更新
                console.log('[Smart Scheduler] Starting on-demand update...');

                const result = await executeOnDemandUpdate(supabaseAdmin, FRED_API_KEY, {
                    enableRealtime: body.enableRealtime ?? true,
                    checkIntervalMinutes: body.checkIntervalMinutes ?? 60,
                    batchSize: body.batchSize ?? 5,
                    priorityFetchThreshold: body.priorityFetchThreshold ?? 5,
                });

                console.log('[Smart Scheduler] On-demand update complete:', result);

                return NextResponse.json({
                    success: true,
                    result,
                });
            }

            case 'force-update': {
                // 强制更新指定指标
                const { seriesIds } = body;
                if (!seriesIds || !Array.isArray(seriesIds)) {
                    return NextResponse.json(
                        { error: 'seriesIds array is required' },
                        { status: 400 }
                    );
                }

                console.log(`[Smart Scheduler] Force updating ${seriesIds.length} indicators...`);

                const results: PublicationCheckResult[] = [];
                for (const seriesId of seriesIds) {
                    const result = await checkPublicationStatus(supabaseAdmin, FRED_API_KEY, seriesId);
                    results.push(result);
                }

                return NextResponse.json({
                    success: true,
                    results,
                });
            }

            case 'remediate': {
                // 执行修复计划
                const { remediationPlan } = body;
                if (!remediationPlan || !Array.isArray(remediationPlan)) {
                    return NextResponse.json(
                        { error: 'remediationPlan array is required' },
                        { status: 400 }
                    );
                }

                console.log(`[Smart Scheduler] Executing remediation plan with ${remediationPlan.length} actions...`);

                const remediationResults = await executeRemediationPlan(remediationPlan);

                return NextResponse.json({
                    success: true,
                    results: remediationResults,
                });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[Smart Scheduler API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// ========== 辅助函数 ==========

async function getSchedulerStatus(): Promise<{
    lastRun: string | null;
    nextScheduledRun: string;
    indicatorsStatus: {
        total: number;
        upToDate: number;
        needsUpdate: number;
        stale: number;
    };
}> {
    // 获取最近的采集运行记录
    const { data: lastRun } = await supabaseAdmin
        .from('collection_runs')
        .select('started_at, status')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

    // 获取指标状态概览
    const { data: indicators } = await supabaseAdmin
        .from('economic_data')
        .select('series_id, date')
        .order('date', { ascending: false });

    const latestByIndicator = new Map<string, string>();
    indicators?.forEach((row: { series_id: string; date: string }) => {
        if (!latestByIndicator.has(row.series_id)) {
            latestByIndicator.set(row.series_id, row.date);
        }
    });

    const now = new Date();
    let upToDate = 0;
    let needsUpdate = 0;
    let stale = 0;

    latestByIndicator.forEach((dateStr, seriesId) => {
        const lastDate = new Date(dateStr);
        const daysSinceUpdate = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 根据频率判断状态
        if (daysSinceUpdate <= 3) {
            upToDate++;
        } else if (daysSinceUpdate <= 10) {
            needsUpdate++;
        } else {
            stale++;
        }
    });

    // 计算下次调度时间（明天8:00 UTC）
    const nextRun = new Date();
    nextRun.setUTCHours(8, 0, 0, 0);
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return {
        lastRun: lastRun?.started_at || null,
        nextScheduledRun: nextRun.toISOString(),
        indicatorsStatus: {
            total: latestByIndicator.size,
            upToDate,
            needsUpdate,
            stale,
        },
    };
}

async function executeRemediationPlan(
    plan: Array<{
        seriesId: string;
        action: string;
        timeRange: { start: string; end: string };
    }>
): Promise<Array<{ seriesId: string; success: boolean; recordsInserted: number; error?: string }>> {
    const results: Array<{ seriesId: string; success: boolean; recordsInserted: number; error?: string }> = [];

    for (const action of plan) {
        try {
            // 根据修复动作执行相应的数据获取
            const url = 'https://api.stlouisfed.org/fred/series/observations';
            const params = new URLSearchParams({
                series_id: action.seriesId,
                api_key: FRED_API_KEY!,
                observation_start: action.timeRange.start,
                observation_end: action.timeRange.end,
                file_type: 'json',
                limit: '10000',
            });

            const response = await fetch(`${url}?${params}`);
            if (!response.ok) {
                throw new Error(`FRED API error: ${response.status}`);
            }

            const data = await response.json();

            const records = data.observations
                .filter((obs: { value: string }) => obs.value && obs.value !== '.' && obs.value !== '-')
                .map((obs: { date: string; value: string }) => ({
                    series_id: action.seriesId,
                    date: obs.date,
                    value: parseFloat(obs.value),
                    vintage_date: new Date().toISOString().split('T')[0],
                }));

            if (records.length > 0) {
                const { error } = await supabaseAdmin
                    .from('economic_data')
                    .upsert(records, { onConflict: 'series_id,date' });

                if (error) {
                    throw new Error(`Insert error: ${error.message}`);
                }
            }

            results.push({
                seriesId: action.seriesId,
                success: true,
                recordsInserted: records.length,
            });

            // 限速
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            results.push({
                seriesId: action.seriesId,
                success: false,
                recordsInserted: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return results;
}
