import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { INDICATORS, getAllIndicators } from '@/lib/fred';
import { detectAnomalies } from '@/lib/anomaly-detector';

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

            // 检测异常
            const anomalyResult = await detectAnomalies(seriesId, dataDesc);

            const indicator = INDICATORS[seriesId] || { title: seriesId, category: 'unknown' };

            // Calculate statistics for the period
            const values = data.map(d => d.value);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const currentValue = dataDesc[0]?.value || 0;
            const zScore = stdDev > 0 ? (currentValue - mean) / stdDev : 0;

            // Calculate per-point Z-scores for coloring
            const dataWithZScore = data.map(d => {
                const pointZScore = stdDev > 0 ? (d.value - mean) / stdDev : 0;
                return {
                    ...d,
                    zScore: pointZScore,
                    severity: Math.abs(pointZScore) >= 3 ? 'critical' : Math.abs(pointZScore) >= 2 ? 'warning' : 'normal'
                };
            });

            return NextResponse.json({
                series: indicator,
                data: dataWithZScore,
                latest: {
                    value: dataDesc[0]?.value || 0,
                    date: dataDesc[0]?.date,
                },
                anomaly: anomalyResult,
                statistics: {
                    mean: mean,
                    stdDev: stdDev,
                    min: min,
                    max: max,
                    currentValue: currentValue,
                    zScore: zScore,
                    dataPoints: data.length,
                    startDate: data[0]?.date,
                    endDate: data[data.length - 1]?.date,
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
