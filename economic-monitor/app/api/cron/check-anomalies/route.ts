import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { detectAnomalies, type AnomalyResult } from '@/lib/simple-anomaly-detector';
import { getAllIndicators } from '@/lib/fred';

export const maxDuration = 300; // 5 分钟

// CRON_SECRET 用于验证 cron 任务请求
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // 验证 CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized access attempt to check-anomalies');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Anomaly Check] Starting anomaly detection...');
    
    // 获取所有指标数据
    const { data: economicData, error: dataError } = await supabaseAdmin
      .from('economic_data')
      .select('series_id, date, value')
      .order('date', { ascending: false })
      .limit(5000); // 限制数据量以提高性能

    if (dataError) {
      console.error('[Anomaly Check] Failed to fetch data:', dataError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    if (!economicData || economicData.length === 0) {
      console.log('[Anomaly Check] No data available for analysis');
      return NextResponse.json({
        success: true,
        message: 'No data available for analysis',
        anomalies: [],
        summary: { totalIndicators: 0, anomalyCount: 0, criticalCount: 0, warningCount: 0 }
      });
    }

    // 按指标分组数据
    const dataByIndicator: { [key: string]: any[] } = {};
    economicData.forEach(record => {
      if (!dataByIndicator[record.series_id]) {
        dataByIndicator[record.series_id] = [];
      }
      dataByIndicator[record.series_id].push(record);
    });

    // 检测每个指标的异常
    const allAnomalies: AnomalyResult[] = [];
    const indicators = getAllIndicators();

    for (const [seriesId, data] of Object.entries(dataByIndicator)) {
      try {
        const anomalyResult = await detectAnomalies(seriesId, data);
        
        if (anomalyResult.severity !== 'normal') {
          allAnomalies.push(anomalyResult);
          console.log(`[Anomaly Check] ${anomalyResult.severity.toUpperCase()} anomaly detected in ${seriesId}: Z=${anomalyResult.zScore.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`[Anomaly Check] Error analyzing ${seriesId}:`, error);
      }
    }

    // 按严重程度分类
    const criticalAnomalies = allAnomalies.filter(a => a.severity === 'critical');
    const warningAnomalies = allAnomalies.filter(a => a.severity === 'warning');

    // 将异常检测结果保存到数据库
    if (allAnomalies.length > 0) {
      try {
        const anomalyRecords = allAnomalies.map(anomaly => ({
          series_id: anomaly.seriesId,
          series_title: anomaly.seriesTitle,
          current_value: anomaly.currentValue,
          analyzer: anomaly.analyzer,
          severity: anomaly.severity,
          z_score: anomaly.zScore,
          percentile: anomaly.percentile || null,
          threshold: anomaly.threshold || null,
          description: anomaly.description,
          category: anomaly.category,
          trend: anomaly.trend || null,
          detected_at: new Date().toISOString(),
          resolved: false
        }));

        const { error: insertError } = await supabaseAdmin
          .from('anomalies')
          .insert(anomalyRecords);

        if (insertError) {
          console.error('[Anomaly Check] Failed to save anomalies:', insertError);
        } else {
          console.log(`[Anomaly Check] Saved ${anomalyRecords.length} anomalies to database`);
        }
      } catch (error) {
        console.error('[Anomaly Check] Error saving anomalies:', error);
      }
    }

    // 生成摘要
    const summary = {
      totalIndicators: Object.keys(dataByIndicator).length,
      anomalyCount: allAnomalies.length,
      criticalCount: criticalAnomalies.length,
      warningCount: warningAnomalies.length
    };

    console.log(`[Anomaly Check] Completed: ${summary.anomalyCount} anomalies detected (${summary.criticalCount} critical, ${summary.warningCount} warnings)`);

    return NextResponse.json({
      success: true,
      message: `Anomaly check completed. Found ${summary.anomalyCount} anomalies.`,
      anomalies: allAnomalies,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Anomaly Check] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Anomaly check failed' },
      { status: 500 }
    );
  }
}