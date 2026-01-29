/**
 * 语义分析API端点
 * 
 * 提供经济指标的语义分析，生成上下文感知的洞察
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFREDData, getIndicatorInfo, type FREDSeries, type FREDSeriesInfo } from '@/lib/fred';
import { calculateStatistics, type DataPoint } from '@/lib/statistics-calculator';
import { analyzeVolatility, type VolatilityAnalysisResult } from '@/lib/volatility-trend-analyzer';
import { analyzeSemantics, generateSemanticReport, type SemanticAnalysisResult } from '@/lib/semantic-insight-engine';

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
                { error: 'No data found for the specified series and date range' },
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

        // 计算统计信息
        const statistics = calculateStatistics(dataPoints);

        // 计算波动率分析
        const volatilityAnalysis: VolatilityAnalysisResult = analyzeVolatility(dataPoints, {
            windowSize: 20,
            bandWidth: 2,
            breakoutThreshold: 2.5,
            lowVolatilityThreshold: 0.02,
            highVolatilityThreshold: 0.05,
        });

        // 执行语义分析
        const semanticAnalysis: SemanticAnalysisResult = analyzeSemantics(
            dataPoints,
            statistics,
            volatilityAnalysis,
            locale
        );

        // 根据格式返回结果
        if (format === 'report') {
            const report = generateSemanticReport(semanticAnalysis, locale);
            return NextResponse.json({
                series: seriesInfo,
                data: dataPoints,
                analysis: semanticAnalysis,
                report,
            });
        } else {
            return NextResponse.json({
                series: seriesInfo,
                data: dataPoints,
                analysis: semanticAnalysis,
            });
        }
    } catch (error) {
        console.error('Semantic analysis error:', error);
        return NextResponse.json(
            {
                error: 'Failed to perform semantic analysis',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
