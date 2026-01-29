import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { INDICATORS } from '@/lib/fred';
import {
    analyzeVolatility,
    generateVolatilityReport,
    getVolatilityLevelDescription,
    getBreakoutTypeDescription,
    type DataPoint
} from '@/lib/volatility-trend-analyzer';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('seriesId');
        const startDate = searchParams.get('startDate'); // YYYY-MM-DD
        const endDate = searchParams.get('endDate');     // YYYY-MM-DD
        const locale = searchParams.get('locale') || 'en';

        if (!seriesId) {
            return NextResponse.json({ error: 'seriesId is required' }, { status: 400 });
        }

        // 查询数据
        let query = supabaseAdmin
            .from('economic_data')
            .select('series_id, date, value')
            .eq('series_id', seriesId)
            .order('date', { ascending: true });

        // 应用日期筛选
        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        // 转换为DataPoint格式
        const dataPoints: DataPoint[] = data.map(d => ({
            date: d.date,
            value: d.value
        }));

        // 执行波动率分析
        const analysis = analyzeVolatility(dataPoints, {
            windowSize: 20,
            bandWidth: 2,
            breakoutThreshold: 2.5,
            lowVolatilityThreshold: 0.02,
            highVolatilityThreshold: 0.05,
        });

        // 生成报告
        const report = generateVolatilityReport(analysis, locale);

        const indicator = INDICATORS[seriesId] || { title: seriesId, category: 'unknown' };

        return NextResponse.json({
            series: indicator,
            data: dataPoints,
            analysis: {
                trend: analysis.trend,
                breakouts: analysis.breakouts,
                clusters: analysis.clusters,
                summary: analysis.summary,
                report,
            },
            metadata: {
                dataPoints: dataPoints.length,
                startDate: data[0]?.date,
                endDate: data[data.length - 1]?.date,
                windowSize: 20,
                bandWidth: 2,
            },
        });
    } catch (error) {
        console.error('[API] Volatility analysis route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
