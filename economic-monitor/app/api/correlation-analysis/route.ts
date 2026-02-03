/**
 * 跨资产相关性分析API端点
 * 
 * 提供多个经济指标之间的相关性分析
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFREDData, type FREDSeries, type FREDSeriesInfo, getIndicatorInfo } from '@/lib/fred';
import { type DataPoint } from '@/lib/statistics-calculator';
import { analyzeCrossAssetCorrelation, generateCorrelationReport, type CorrelationMatrix } from '@/lib/correlation-analyzer';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const seriesIdsParam = searchParams.get('seriesIds');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const locale = searchParams.get('locale') || 'en';
        const format = searchParams.get('format') || 'json'; // json 或 report

        // 验证必需参数
        if (!seriesIdsParam) {
            return NextResponse.json(
                { error: 'Missing required parameter: seriesIds' },
                { status: 400 }
            );
        }

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required parameters: startDate and endDate' },
                { status: 400 }
            );
        }

        // 解析seriesIds（逗号分隔）
        const seriesIds = seriesIdsParam.split(',').map(id => id.trim());

        if (seriesIds.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 series IDs are required for correlation analysis' },
                { status: 400 }
            );
        }

        // 获取所有系列的数据 - 并行执行
        const seriesDataMap = new Map<string, DataPoint[]>();
        const seriesInfoMap = new Map<string, FREDSeriesInfo>();

        // 并行获取所有系列数据
        const fetchPromises = seriesIds.map(async (seriesId) => {
            try {
                // 获取FRED数据
                const fredData: FREDSeries = await fetchFREDData(seriesId, startDate);

                if (!fredData || !fredData.observations || fredData.observations.length === 0) {
                    console.warn(`No data found for series: ${seriesId}`);
                    return null;
                }

                // 获取系列元数据
                const seriesInfo: FREDSeriesInfo | undefined = getIndicatorInfo(seriesId);
                if (seriesInfo) {
                    seriesInfoMap.set(seriesId, seriesInfo);
                }

                // 转换为DataPoint格式
                const dataPoints: DataPoint[] = fredData.observations
                    .filter((d: any) => d.value !== '.')
                    .map((d: any) => ({
                        date: d.date,
                        value: parseFloat(d.value)
                    }));

                return { seriesId, dataPoints };
            } catch (error) {
                console.error(`Failed to fetch data for ${seriesId}:`, error);
                return null;
            }
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(result => {
            if (result) {
                seriesDataMap.set(result.seriesId, result.dataPoints);
            }
        });

        // 检查是否有足够的数据
        if (seriesDataMap.size < 2) {
            return NextResponse.json(
                { error: 'Insufficient data for correlation analysis. At least 2 series with valid data are required.' },
                { status: 400 }
            );
        }

        // 执行跨资产相关性分析
        const correlationMatrix: CorrelationMatrix = analyzeCrossAssetCorrelation(seriesDataMap);

        // 根据格式返回结果
        if (format === 'report') {
            const report = generateCorrelationReport(correlationMatrix, locale);
            return NextResponse.json({
                seriesInfo: Object.fromEntries(seriesInfoMap),
                correlationMatrix,
                report,
            });
        } else {
            return NextResponse.json({
                seriesInfo: Object.fromEntries(seriesInfoMap),
                correlationMatrix,
            });
        }
    } catch (error) {
        console.error('Correlation analysis error:', error);
        return NextResponse.json(
            {
                error: 'Failed to perform correlation analysis',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
