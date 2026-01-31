import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeHistoricalSimilarEvents, type HistoricalSimilarEvent } from '@/lib/historical-similar-events';

/**
 * GET /api/historical-events
 * 
 * 获取历史相似事件分析
 * 
 * Query Parameters:
 * - seriesId: 指标ID（必需）
 * - startDate: 开始日期（可选，默认为1年前）
 * - endDate: 结束日期（可选，默认为今天）
 * - locale: 语言（可选，默认为'en'）
 * - format: 返回格式（可选，'json' 或 'report'，默认为'json'）
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const seriesId = searchParams.get('seriesId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const locale = searchParams.get('locale') || 'en';
        const format = searchParams.get('format') || 'json';

        // 验证必需参数
        if (!seriesId) {
            return NextResponse.json(
                { error: 'seriesId is required' },
                { status: 400 }
            );
        }

        // 设置默认日期范围
        const defaultEndDate = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);

        const start = startDate ? new Date(startDate) : defaultStartDate;
        const end = endDate ? new Date(endDate) : defaultEndDate;

        // 验证日期格式
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
                { status: 400 }
            );
        }

        // 从数据库获取数据
        const { data: indicatorData, error: indicatorError } = await supabaseAdmin
            .from('macro_indicators')
            .select('*')
            .eq('series_id', seriesId)
            .gte('date', start.toISOString().split('T')[0])
            .lte('date', end.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (indicatorError) {
            console.error('Error fetching indicator data:', indicatorError);
            return NextResponse.json(
                { error: 'Failed to fetch indicator data' },
                { status: 500 }
            );
        }

        if (!indicatorData || indicatorData.length === 0) {
            return NextResponse.json(
                { error: 'No data found for the specified series and date range' },
                { status: 404 }
            );
        }

        // 获取所有历史数据用于相似性分析
        const { data: allHistoricalData, error: historicalError } = await supabaseAdmin
            .from('macro_indicators')
            .select('*')
            .eq('series_id', seriesId)
            .order('date', { ascending: true });

        if (historicalError) {
            console.error('Error fetching historical data:', historicalError);
            return NextResponse.json(
                { error: 'Failed to fetch historical data' },
                { status: 500 }
            );
        }

        // 转换数据格式
        const dataPoints = indicatorData.map(d => ({
            date: d.date,
            value: d.value
        }));

        const allHistoricalPoints = allHistoricalData.map(d => ({
            date: d.date,
            value: d.value
        }));

        // 分析历史相似事件
        const similarEvents: HistoricalSimilarEvent[] = analyzeHistoricalSimilarEvents(
            dataPoints,
            allHistoricalPoints,
            {
                windowSize: 30,
                similarityThreshold: 0.85,
                minEventDuration: 5,
                maxEvents: 10
            }
        );

        // 根据格式返回结果
        if (format === 'report') {
            const report = generateHistoricalEventsReport(similarEvents, seriesId, locale);
            return NextResponse.json({
                seriesId,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                report
            });
        }

        return NextResponse.json({
            seriesId,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            similarEvents,
            summary: {
                totalEvents: similarEvents.length,
                highSimilarityEvents: similarEvents.filter(e => e.similarityScore >= 0.9).length,
                mediumSimilarityEvents: similarEvents.filter(e => e.similarityScore >= 0.8 && e.similarityScore < 0.9).length,
                lowSimilarityEvents: similarEvents.filter(e => e.similarityScore < 0.8).length
            }
        });

    } catch (error) {
        console.error('Error in historical events analysis:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * 生成历史相似事件报告
 */
function generateHistoricalEventsReport(
    events: HistoricalSimilarEvent[],
    seriesId: string,
    locale: string
): string {
    const isZh = locale === 'zh';

    if (events.length === 0) {
        return isZh
            ? `在指定的时间范围内，未找到与指标 ${seriesId} 当前趋势相似的历史事件。`
            : `No historical events similar to the current trend of indicator ${seriesId} were found in the specified time range.`;
    }

    let report = isZh
        ? `## 历史相似事件分析\n\n`
        : `## Historical Similar Events Analysis\n\n`;

    report += isZh
        ? `在指定的时间范围内，找到了 ${events.length} 个与当前趋势相似的历史事件。\n\n`
        : `Found ${events.length} historical events similar to the current trend in the specified time range.\n\n`;

    // 按相似度排序
    const sortedEvents = [...events].sort((a, b) => b.similarityScore - a.similarityScore);

    sortedEvents.forEach((event, index) => {
        report += isZh ? `### ${index + 1}. ${event.eventName}\n\n` : `### ${index + 1}. ${event.eventName}\n\n`;
        report += isZh ? `**相似度**: ${(event.similarityScore * 100).toFixed(1)}%\n\n` : `**Similarity Score**: ${(event.similarityScore * 100).toFixed(1)}%\n\n`;
        report += isZh ? `**时间范围**: ${event.startDate} 至 ${event.endDate}\n\n` : `**Time Range**: ${event.startDate} to ${event.endDate}\n\n`;
        report += isZh ? `**持续时间**: ${event.duration} 天\n\n` : `**Duration**: ${event.duration} days\n\n`;
        report += isZh ? `**趋势特征**: ${event.trendDescription}\n\n` : `**Trend Characteristics**: ${event.trendDescription}\n\n`;
        report += isZh ? `**关键指标**:\n` : `**Key Metrics**:\n`;
        report += isZh ? `- 起始值: ${event.startValue.toFixed(2)}\n` : `- Start Value: ${event.startValue.toFixed(2)}\n`;
        report += isZh ? `- 结束值: ${event.endValue.toFixed(2)}\n` : `- End Value: ${event.endValue.toFixed(2)}\n`;
        report += isZh ? `- 变化幅度: ${event.changePercent.toFixed(2)}%\n` : `- Change: ${event.changePercent.toFixed(2)}%\n`;
        report += isZh ? `- 波动率: ${event.volatility.toFixed(2)}%\n\n` : `- Volatility: ${event.volatility.toFixed(2)}%\n\n`;
        report += isZh ? `**历史背景**: ${event.historicalContext}\n\n` : `**Historical Context**: ${event.historicalContext}\n\n`;
        report += isZh ? `**市场影响**: ${event.marketImpact}\n\n` : `**Market Impact**: ${event.marketImpact}\n\n`;
        report += isZh ? `**投资启示**: ${event.investmentInsight}\n\n` : `**Investment Insight**: ${event.investmentInsight}\n\n`;
        report += '---\n\n';
    });

    // 添加总结
    report += isZh ? `## 总结\n\n` : `## Summary\n\n`;
    const highSimilarity = events.filter(e => e.similarityScore >= 0.9).length;
    const mediumSimilarity = events.filter(e => e.similarityScore >= 0.8 && e.similarityScore < 0.9).length;

    if (isZh) {
        report += `- 高相似度事件（≥90%）：${highSimilarity} 个\n`;
        report += `- 中等相似度事件（80%-90%）：${mediumSimilarity} 个\n`;
        report += `- 低相似度事件（<80%）：${events.length - highSimilarity - mediumSimilarity} 个\n\n`;
        report += `建议：重点关注高相似度事件的历史背景和市场影响，以更好地理解当前趋势可能的发展方向。\n`;
    } else {
        report += `- High similarity events (≥90%): ${highSimilarity}\n`;
        report += `- Medium similarity events (80%-90%): ${mediumSimilarity}\n`;
        report += `- Low similarity events (<80%): ${events.length - highSimilarity - mediumSimilarity}\n\n`;
        report += `Recommendation: Focus on high similarity events' historical context and market impact to better understand the potential direction of the current trend.\n`;
    }

    return report;
}
