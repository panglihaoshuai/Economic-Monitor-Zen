/**
 * 自适应数据粒度API端点
 * 
 * 根据时间范围自动调整数据粒度
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFREDData, type FREDSeries, type FREDSeriesInfo, getIndicatorInfo } from '@/lib/fred';
import { type DataPoint } from '@/lib/statistics-calculator';
import { adjustGranularityForAnalysis, generateGranularityReport, type GranularityAdjustmentResult } from '@/lib/adaptive-granularity';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const seriesId = searchParams.get('seriesId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const locale = searchParams.get('locale') || 'en';
        const format = searchParams.get('format') || 'json'; // json 或 report

        // 验证必需参数
        if (!seriesId) {
            return NextResponse.json(
                { error: 'Missing required parameter: seriesId' },
                { status: 400 }
            );
        }

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required parameters: startDate and endDate' },
                { status: 400 }
            );
        }

        // 获取FRED数据
        const fredData: FREDSeries = await fetchFREDData(seriesId, startDate);

        if (!fredData || !fredData.observations || fredData.observations.length === 0) {
            return NextResponse.json(
                { error: 'No data found for specified series and date range' },
                { status: 404 }
            );
        }

        // 获取系列元数据
        const seriesInfo: FREDSeriesInfo | undefined = getIndicatorInfo(seriesId);

        // 转换为DataPoint格式
        const dataPoints: DataPoint[] = fredData.observations
            .filter((d: any) => d.value !== '.')
            .map((d: any) => ({
                date: d.date,
                value: parseFloat(d.value)
            }));

        // 执行自适应数据粒度调整
        const granularityResult: GranularityAdjustmentResult = adjustGranularityForAnalysis(
            dataPoints,
            startDate,
            endDate,
            locale
        );

        // 根据格式返回结果
        if (format === 'report') {
            const report = generateGranularityReport(granularityResult, locale);
            return NextResponse.json({
                series: seriesInfo,
                originalData: granularityResult.originalData,
                adjustedData: granularityResult.adjustedData,
                granularity: granularityResult,
                report,
            });
        } else {
            return NextResponse.json({
                series: seriesInfo,
                originalData: granularityResult.originalData,
                adjustedData: granularityResult.adjustedData,
                granularity: granularityResult,
            });
        }
    } catch (error) {
        console.error('Adaptive granularity error:', error);
        return NextResponse.json(
            {
                error: 'Failed to adjust data granularity',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
