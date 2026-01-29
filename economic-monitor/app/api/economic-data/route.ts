import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { INDICATORS, getAllIndicators } from '@/lib/fred';
import { detectAnomalies } from '@/lib/anomaly-detector';
import {
    calculateStatistics,
    calculateZScore,
    calculateDataPointZScores,
    type DataPoint,
    type StatisticsResult
} from '@/lib/statistics-calculator';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const startDate = searchParams.get('startDate'); // YYYY-MM-DD
        const endDate = searchParams.get('endDate');     // YYYY-MM-DD

        if (seriesId) {
            // 单个指标分析
            let query = supabaseAdmin
                .from('economic_data')
                .select('series_id, date, value')
                .eq('series_id', seriesId)
                .order('date', { ascending: true }); // ascending for chart display

            // Apply date filters if provided
            if (startDate) {
                query = query.gte('date', startDate);
            }
            if (endDate) {
                query = query.lte('date', endDate);
            }

            // If no date range specified, use limit
            if (!startDate && !endDate) {
                query = query.limit(limit);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[API] Database error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (!data || data.length === 0) {
                return NextResponse.json({ error: 'No data found' }, { status: 404 });
            }

            // For anomaly detection, we need descending order
            const dataDesc = [...data].reverse();

            // 转换为DataPoint格式
            const dataPoints: DataPoint[] = data.map(d => ({
                date: d.date,
                value: d.value
            }));

            // 使用新的统计计算模块 - 基于完整的时间范围
            const statistics: StatisticsResult = calculateStatistics(dataPoints);

            // 检测异常 - 使用完整的时间范围数据
            const anomalyResult = await detectAnomalies(seriesId, dataDesc);

            const indicator = INDICATORS[seriesId] || { title: seriesId, category: 'unknown' };

            // 计算当前值的Z分数 - 基于完整时间范围的统计
            const historicalValues = dataPoints.slice(0, -1).map(d => d.value); // 排除当前值
            const currentValue = dataDesc[0]?.value || 0;
            const zScoreResult = calculateZScore(currentValue, historicalValues);

            // Calculate per-point Z-scores for coloring - 基于时间范围的统计
            const dataWithZScore = calculateDataPointZScores(dataPoints, statistics);

            return NextResponse.json({
                series: indicator,
                data: dataWithZScore,
                latest: {
                    value: dataDesc[0]?.value || 0,
                    date: dataDesc[0]?.date,
                },
                anomaly: anomalyResult,
                statistics: {
                    mean: statistics.mean,
                    stdDev: statistics.stdDev,
                    min: statistics.min,
                    max: statistics.max,
                    currentValue: currentValue,
                    zScore: zScoreResult.zScore,
                    dataPoints: statistics.dataPoints,
                    startDate: statistics.startDate,
                    endDate: statistics.endDate,
                }
            });
        }

        // 获取所有指标的最新数据
        const { data, error } = await supabaseAdmin
            .from('economic_data')
            .select('series_id, date, value')
            .order('date', { ascending: false })
            .limit(1000); // 限制数量以提高性能

        if (error) {
            console.error('[API] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ indicators: [], anomalies: [] });
        }

        // 按指标分组获取最新数据
        const latestByIndicator: { [key: string]: any[] } = {};

        data.forEach(row => {
            if (!latestByIndicator[row.series_id]) {
                latestByIndicator[row.series_id] = [];
            }
            latestByIndicator[row.series_id].push(row);
        });

        // 获取每个指标的最新值和检测异常
        const indicators = [];
        const anomalies = [];

        for (const [sid, records] of Object.entries(latestByIndicator)) {
            if (records.length === 0) continue;

            const indicator = INDICATORS[sid] || { title: sid, category: 'unknown' };
            const latest = records[0];

            // 检测异常
            const anomalyResult = await detectAnomalies(sid, records);

            indicators.push({
                ...indicator,
                series_id: sid,
                latest: {
                    value: latest.value,
                    date: latest.date,
                },
                anomaly: anomalyResult,
            });

            if (anomalyResult.severity !== 'normal') {
                anomalies.push(anomalyResult);
            }
        }

        return NextResponse.json({
            indicators,
            anomalies,
            summary: {
                totalIndicators: indicators.length,
                anomalyCount: anomalies.length,
                criticalCount: anomalies.filter(a => a.severity === 'critical').length,
                warningCount: anomalies.filter(a => a.severity === 'warning').length,
            }
        });

    } catch (error) {
        console.error('[API] Data route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
