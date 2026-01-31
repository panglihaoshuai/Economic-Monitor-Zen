import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeHistoricalSimilarEvents, type DataPoint } from '@/lib/historical-similar-events';

/**
 * 历史相似事件分析API端点
 * 
 * GET /api/historical-similar-events?seriesId=CPI&startDate=2023-01-01&endDate=2024-01-01
 * 
 * 查询参数：
 * - seriesId: 指标ID（必需）
 * - startDate: 开始日期（必需）
 * - endDate: 结束日期（必需）
 * - windowSize: 分析窗口大小（可选，默认30）
 * - similarityThreshold: 相似度阈值（可选，默认0.85）
 * - minEventDuration: 最小事件持续时间（可选，默认5）
 * - maxEvents: 最大返回事件数（可选，默认10）
 * - locale: 语言（可选，默认zh）
 */
export async function GET(request: NextRequest) {
    try {
        // 获取查询参数
        const searchParams = request.nextUrl.searchParams;
        const seriesId = searchParams.get('seriesId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const windowSize = parseInt(searchParams.get('windowSize') || '30');
        const similarityThreshold = parseFloat(searchParams.get('similarityThreshold') || '0.85');
        const minEventDuration = parseInt(searchParams.get('minEventDuration') || '5');
        const maxEvents = parseInt(searchParams.get('maxEvents') || '10');
        const locale = searchParams.get('locale') || 'zh';

        // 验证必需参数
        if (!seriesId || !startDate || !endDate) {
            return NextResponse.json(
                { error: '缺少必需参数：seriesId, startDate, endDate' },
                { status: 400 }
            );
        }

        // 验证参数范围
        if (windowSize < 5 || windowSize > 365) {
            return NextResponse.json(
                { error: 'windowSize必须在5到365之间' },
                { status: 400 }
            );
        }

        if (similarityThreshold < 0.5 || similarityThreshold > 1.0) {
            return NextResponse.json(
                { error: 'similarityThreshold必须在0.5到1.0之间' },
                { status: 400 }
            );
        }

        if (minEventDuration < 1 || minEventDuration > 365) {
            return NextResponse.json(
                { error: 'minEventDuration必须在1到365之间' },
                { status: 400 }
            );
        }

        if (maxEvents < 1 || maxEvents > 50) {
            return NextResponse.json(
                { error: 'maxEvents必须在1到50之间' },
                { status: 400 }
            );
        }

        // 从数据库获取当前时间范围的数据
        const { data: currentData, error: currentError } = await supabaseAdmin
            .from('economic_data')
            .select('date, value')
            .eq('series_id', seriesId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (currentError) {
            console.error('获取当前数据失败:', currentError);
            return NextResponse.json(
                { error: '获取当前数据失败' },
                { status: 500 }
            );
        }

        if (!currentData || currentData.length === 0) {
            return NextResponse.json(
                { error: '未找到指定时间范围的数据' },
                { status: 404 }
            );
        }

        // 从数据库获取所有历史数据（用于搜索相似事件）
        const { data: allHistoricalData, error: historicalError } = await supabaseAdmin
            .from('economic_data')
            .select('date, value')
            .eq('series_id', seriesId)
            .order('date', { ascending: true });

        if (historicalError) {
            console.error('获取历史数据失败:', historicalError);
            return NextResponse.json(
                { error: '获取历史数据失败' },
                { status: 500 }
            );
        }

        if (!allHistoricalData || allHistoricalData.length === 0) {
            return NextResponse.json(
                { error: '未找到历史数据' },
                { status: 404 }
            );
        }

        // 转换数据格式
        const currentDataPoints: DataPoint[] = currentData.map(d => ({
            date: d.date,
            value: d.value
        }));

        const allHistoricalDataPoints: DataPoint[] = allHistoricalData.map(d => ({
            date: d.date,
            value: d.value
        }));

        // 分析历史相似事件
        const similarEvents = analyzeHistoricalSimilarEvents(
            currentDataPoints,
            allHistoricalDataPoints,
            {
                windowSize,
                similarityThreshold,
                minEventDuration,
                maxEvents
            }
        );

        // 生成报告
        const report = generateReport(similarEvents, seriesId, startDate, endDate, locale);

        // 返回结果
        return NextResponse.json({
            success: true,
            seriesId,
            startDate,
            endDate,
            currentData: currentDataPoints,
            similarEvents,
            report
        });

    } catch (error) {
        console.error('历史相似事件分析失败:', error);
        return NextResponse.json(
            { error: '历史相似事件分析失败' },
            { status: 500 }
        );
    }
}

/**
 * 生成报告
 */
function generateReport(
    similarEvents: any[],
    seriesId: string,
    startDate: string,
    endDate: string,
    locale: string
): string {
    if (similarEvents.length === 0) {
        return locale === 'zh'
            ? `在${startDate}至${endDate}期间，${seriesId}的趋势未找到明显的历史相似事件。这可能表明当前趋势具有独特性，需要结合其他因素进行分析。`
            : `No significant historical similar events were found for ${seriesId} between ${startDate} and ${endDate}. This may indicate that the current trend is unique and requires analysis in conjunction with other factors.`;
    }

    const topEvent = similarEvents[0];
    const eventCount = similarEvents.length;

    if (locale === 'zh') {
        let report = `在${startDate}至${endDate}期间，${seriesId}的趋势与${eventCount}个历史事件相似。\n\n`;

        report += `最相似的事件是：${topEvent.eventName}（${topEvent.startDate}至${topEvent.endDate}）\n`;
        report += `- 相似度：${(topEvent.similarityScore * 100).toFixed(1)}%\n`;
        report += `- 趋势特征：${topEvent.trendDescription}\n`;
        report += `- 变化幅度：${topEvent.changePercent.toFixed(2)}%\n`;
        report += `- 波动率：${topEvent.volatility.toFixed(2)}%\n\n`;

        report += `历史背景：${topEvent.historicalContext}\n\n`;
        report += `市场影响：${topEvent.marketImpact}\n\n`;
        report += `投资启示：${topEvent.investmentInsight}\n\n`;

        if (eventCount > 1) {
            report += `其他相似事件：\n`;
            similarEvents.slice(1, 4).forEach((event, index) => {
                report += `${index + 1}. ${event.eventName}（相似度：${(event.similarityScore * 100).toFixed(1)}%）\n`;
            });
        }

        return report;
    } else {
        let report = `Between ${startDate} and ${endDate}, the trend of ${seriesId} is similar to ${eventCount} historical events.\n\n`;

        report += `The most similar event is: ${topEvent.eventName} (${topEvent.startDate} to ${topEvent.endDate})\n`;
        report += `- Similarity: ${(topEvent.similarityScore * 100).toFixed(1)}%\n`;
        report += `- Trend characteristics: ${topEvent.trendDescription}\n`;
        report += `- Change magnitude: ${topEvent.changePercent.toFixed(2)}%\n`;
        report += `- Volatility: ${topEvent.volatility.toFixed(2)}%\n\n`;

        report += `Historical context: ${topEvent.historicalContext}\n\n`;
        report += `Market impact: ${topEvent.marketImpact}\n\n`;
        report += `Investment insight: ${topEvent.investmentInsight}\n\n`;

        if (eventCount > 1) {
            report += `Other similar events:\n`;
            similarEvents.slice(1, 4).forEach((event, index) => {
                report += `${index + 1}. ${event.eventName} (Similarity: ${(event.similarityScore * 100).toFixed(1)}%)\n`;
            });
        }

        return report;
    }
}
