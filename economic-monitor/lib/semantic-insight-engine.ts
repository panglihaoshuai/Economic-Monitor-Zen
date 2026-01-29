/**
 * 语义解释引擎
 * 
 * 独立模块，用于生成上下文感知的经济指标洞察
 * 支持中英文输出
 */

import { DataPoint, StatisticsResult, detectHistoricalAnomalies } from './statistics-calculator';
import { VolatilityAnalysisResult } from './volatility-trend-analyzer';

// 导出DataPoint类型
export type { DataPoint };

/**
 * 趋势类型
 */
export type TrendType = 'rising' | 'falling' | 'stable' | 'volatile';

/**
 * 变化幅度
 */
export type ChangeMagnitude = 'slight' | 'moderate' | 'significant' | 'extreme';

/**
 * 波动率水平
 */
export type VolatilityLevel = 'low' | 'medium' | 'high';

/**
 * 洞察类型
 */
export type InsightType = 'trend' | 'volatility' | 'anomaly' | 'breakout' | 'summary';

/**
 * 洞察项
 */
export interface InsightItem {
    type: InsightType;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    confidence: number; // 0-1
    timestamp?: string;
}

/**
 * 语义分析结果
 */
export interface SemanticAnalysisResult {
    trend: {
        type: TrendType;
        magnitude: ChangeMagnitude;
        description: string;
    };
    volatility: {
        level: VolatilityLevel;
        description: string;
    };
    change: {
        absolute: number;
        percentage: number;
        magnitude: ChangeMagnitude;
        description: string;
    };
    insights: InsightItem[];
    summary: string;
    recommendations: string[];
}

/**
 * 语言配置
 */
interface LanguageConfig {
    trend: {
        rising: string;
        falling: string;
        stable: string;
        volatile: string;
    };
    magnitude: {
        slight: string;
        moderate: string;
        significant: string;
        extreme: string;
    };
    volatility: {
        low: string;
        medium: string;
        high: string;
    };
    insights: {
        trend: string;
        volatility: string;
        anomaly: string;
        breakout: string;
        summary: string;
    };
}

// 中文配置
const zhConfig: LanguageConfig = {
    trend: {
        rising: '上升',
        falling: '下降',
        stable: '稳定',
        volatile: '波动'
    },
    magnitude: {
        slight: '轻微',
        moderate: '中等',
        significant: '显著',
        extreme: '极端'
    },
    volatility: {
        low: '低',
        medium: '中',
        high: '高'
    },
    insights: {
        trend: '趋势',
        volatility: '波动率',
        anomaly: '异常',
        breakout: '突破',
        summary: '总结'
    }
};

// 英文配置
const enConfig: LanguageConfig = {
    trend: {
        rising: 'rising',
        falling: 'falling',
        stable: 'stable',
        volatile: 'volatile'
    },
    magnitude: {
        slight: 'slight',
        moderate: 'moderate',
        significant: 'significant',
        extreme: 'extreme'
    },
    volatility: {
        low: 'low',
        medium: 'medium',
        high: 'high'
    },
    insights: {
        trend: 'Trend',
        volatility: 'Volatility',
        anomaly: 'Anomaly',
        breakout: 'Breakout',
        summary: 'Summary'
    }
};

/**
 * 获取语言配置
 */
function getLanguageConfig(locale: string): LanguageConfig {
    return locale === 'zh' ? zhConfig : enConfig;
}

/**
 * 计算趋势类型
 */
function calculateTrendType(data: DataPoint[]): TrendType {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const volatility = calculateVolatility(data);

    // 如果波动率很高，标记为波动
    if (volatility > 0.05) {
        return 'volatile';
    }

    // 根据变化幅度判断趋势
    const relativeChange = Math.abs(change) / firstAvg;
    if (relativeChange < 0.01) {
        return 'stable';
    } else if (change > 0) {
        return 'rising';
    } else {
        return 'falling';
    }
}

/**
 * 计算变化幅度
 */
function calculateChangeMagnitude(percentage: number): ChangeMagnitude {
    const absPercentage = Math.abs(percentage);
    if (absPercentage < 1) return 'slight';
    if (absPercentage < 5) return 'moderate';
    if (absPercentage < 15) return 'significant';
    return 'extreme';
}

/**
 * 计算波动率
 */
function calculateVolatility(data: DataPoint[]): number {
    if (data.length < 2) return 0;

    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.sqrt(variance) / mean;
}

/**
 * 判断波动率水平
 */
function determineVolatilityLevel(volatility: number): VolatilityLevel {
    if (volatility < 0.02) return 'low';
    if (volatility < 0.05) return 'medium';
    return 'high';
}

/**
 * 生成趋势洞察
 */
function generateTrendInsight(
    data: DataPoint[],
    statistics: StatisticsResult,
    locale: string
): InsightItem {
    const config = getLanguageConfig(locale);
    const trendType = calculateTrendType(data);
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = lastValue - firstValue;
    const percentage = (change / firstValue) * 100;
    const magnitude = calculateChangeMagnitude(percentage);

    let title = '';
    let description = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (locale === 'zh') {
        title = `${config.trend[trendType]}趋势`;
        description = `该指标呈现${config.trend[trendType]}趋势，从${firstValue.toFixed(2)}变化至${lastValue.toFixed(2)}，变化幅度为${percentage.toFixed(2)}%（${config.magnitude[magnitude]}）。`;

        if (magnitude === 'extreme') {
            severity = 'critical';
            description += ' 变化幅度极大，需要密切关注。';
        } else if (magnitude === 'significant') {
            severity = 'warning';
            description += ' 变化幅度显著，建议关注后续走势。';
        }
    } else {
        title = `${config.trend[trendType]} trend`;
        description = `The indicator shows a ${config.trend[trendType]} trend, changing from ${firstValue.toFixed(2)} to ${lastValue.toFixed(2)}, with a change of ${percentage.toFixed(2)}% (${config.magnitude[magnitude]}).`;

        if (magnitude === 'extreme') {
            severity = 'critical';
            description += ' The change is extreme and requires close attention.';
        } else if (magnitude === 'significant') {
            severity = 'warning';
            description += ' The change is significant, recommend monitoring future trends.';
        }
    }

    return {
        type: 'trend',
        severity,
        title,
        description,
        confidence: 0.85
    };
}

/**
 * 生成波动率洞察
 */
function generateVolatilityInsight(
    volatilityAnalysis: VolatilityAnalysisResult,
    locale: string
): InsightItem {
    const config = getLanguageConfig(locale);
    const currentVolatility = volatilityAnalysis.summary.currentVolatility;
    const volatilityLevel = determineVolatilityLevel(currentVolatility);
    const trend = volatilityAnalysis.summary.volatilityTrend;

    let title = '';
    let description = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (locale === 'zh') {
        title = `${config.volatility[volatilityLevel]}波动率`;
        description = `当前波动率为${currentVolatility.toFixed(4)}，处于${config.volatility[volatilityLevel]}水平。`;

        if (trend === 'increasing') {
            description += ' 波动率呈上升趋势，市场不确定性增加。';
            if (volatilityLevel === 'high') {
                severity = 'critical';
            } else if (volatilityLevel === 'medium') {
                severity = 'warning';
            }
        } else if (trend === 'decreasing') {
            description += ' 波动率呈下降趋势，市场趋于稳定。';
        } else {
            description += ' 波动率保持稳定。';
        }
    } else {
        title = `${config.volatility[volatilityLevel]} volatility`;
        description = `Current volatility is ${currentVolatility.toFixed(4)}, at a ${config.volatility[volatilityLevel]} level.`;

        if (trend === 'increasing') {
            description += ' Volatility is trending upward, indicating increased market uncertainty.';
            if (volatilityLevel === 'high') {
                severity = 'critical';
            } else if (volatilityLevel === 'medium') {
                severity = 'warning';
            }
        } else if (trend === 'decreasing') {
            description += ' Volatility is trending downward, indicating market stabilization.';
        } else {
            description += ' Volatility remains stable.';
        }
    }

    return {
        type: 'volatility',
        severity,
        title,
        description,
        confidence: 0.9
    };
}

/**
 * 生成异常洞察
 */
function generateAnomalyInsight(
    anomalies: Array<DataPoint & { zScore: number; severity: 'normal' | 'warning' | 'critical' }>,
    locale: string
): InsightItem | null {
    const config = getLanguageConfig(locale);

    // 检查是否有异常值
    if (!anomalies || anomalies.length === 0) {
        return null;
    }

    const recentAnomalies = anomalies.slice(-5); // 最近5个异常
    const severity: 'info' | 'warning' | 'critical' =
        recentAnomalies.some((a: any) => Math.abs(a.zScore) > 3) ? 'critical' : 'warning';

    let title = '';
    let description = '';

    if (locale === 'zh') {
        title = `检测到${recentAnomalies.length}个异常值`;
        description = `在选定时间范围内检测到${recentAnomalies.length}个异常值。`;

        if (severity === 'critical') {
            description += ' 部分异常值偏离均值超过3个标准差，属于极端异常，需要立即关注。';
        } else {
            description += ' 异常值偏离均值超过2个标准差，建议进一步分析原因。';
        }
    } else {
        title = `${recentAnomalies.length} anomalies detected`;
        description = `${recentAnomalies.length} anomalies detected in the selected time range.`;

        if (severity === 'critical') {
            description += ' Some anomalies deviate from the mean by more than 3 standard deviations, indicating extreme anomalies that require immediate attention.';
        } else {
            description += ' Anomalies deviate from the mean by more than 2 standard deviations, recommend further analysis of the causes.';
        }
    }

    return {
        type: 'anomaly',
        severity,
        title,
        description,
        confidence: 0.8
    };
}

/**
 * 生成突破洞察
 */
function generateBreakoutInsight(
    volatilityAnalysis: VolatilityAnalysisResult,
    locale: string
): InsightItem | null {
    const config = getLanguageConfig(locale);
    const breakouts = volatilityAnalysis.breakouts;

    if (!breakouts || breakouts.length === 0) {
        return null;
    }

    // 获取最近的突破
    const recentBreakouts = breakouts.slice(-3);
    const lastBreakout = recentBreakouts[recentBreakouts.length - 1];

    let title = '';
    let description = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (locale === 'zh') {
        title = `检测到${breakouts.length}次突破`;
        description = `在选定时间范围内检测到${breakouts.length}次价格突破波动率带。`;

        if (lastBreakout.type === 'breakout_up') {
            description += ` 最近一次向上突破发生在${lastBreakout.date}，价格为${lastBreakout.value.toFixed(2)}。`;
        } else {
            description += ` 最近一次向下突破发生在${lastBreakout.date}，价格为${lastBreakout.value.toFixed(2)}。`;
        }

        if (breakouts.length > 10) {
            severity = 'warning';
            description += ' 突破次数较多，市场波动剧烈。';
        }
    } else {
        title = `${breakouts.length} breakouts detected`;
        description = `${breakouts.length} price breakouts detected in the selected time range.`;

        if (lastBreakout.type === 'breakout_up') {
            description += ` The most recent upward breakout occurred on ${lastBreakout.date} at a price of ${lastBreakout.value.toFixed(2)}.`;
        } else {
            description += ` The most recent downward breakout occurred on ${lastBreakout.date} at a price of ${lastBreakout.value.toFixed(2)}.`;
        }

        if (breakouts.length > 10) {
            severity = 'warning';
            description += ' High number of breakouts indicates significant market volatility.';
        }
    }

    return {
        type: 'breakout',
        severity,
        title,
        description,
        confidence: 0.75,
        timestamp: lastBreakout.date
    };
}

/**
 * 生成总结
 */
function generateSummary(
    data: DataPoint[],
    statistics: StatisticsResult,
    volatilityAnalysis: VolatilityAnalysisResult,
    anomalies: Array<DataPoint & { zScore: number; severity: 'normal' | 'warning' | 'critical' }>,
    locale: string
): string {
    const config = getLanguageConfig(locale);
    const trendType = calculateTrendType(data);
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = lastValue - firstValue;
    const percentage = (change / firstValue) * 100;
    const magnitude = calculateChangeMagnitude(percentage);
    const volatilityLevel = determineVolatilityLevel(volatilityAnalysis.summary.currentVolatility);

    if (locale === 'zh') {
        return `该指标在选定时间范围内呈现${config.trend[trendType]}趋势，从${firstValue.toFixed(2)}变化至${lastValue.toFixed(2)}，变化幅度为${percentage.toFixed(2)}%（${config.magnitude[magnitude]}）。当前波动率为${volatilityAnalysis.summary.currentVolatility.toFixed(4)}，处于${config.volatility[volatilityLevel]}水平。${anomalies.length > 0 ? `检测到${anomalies.length}个异常值。` : '未检测到异常值。'}${volatilityAnalysis.breakouts.length > 0 ? `检测到${volatilityAnalysis.breakouts.length}次突破。` : '未检测到突破。'}`;
    } else {
        return `The indicator shows a ${config.trend[trendType]} trend in the selected time range, changing from ${firstValue.toFixed(2)} to ${lastValue.toFixed(2)}, with a change of ${percentage.toFixed(2)}% (${config.magnitude[magnitude]}). Current volatility is ${volatilityAnalysis.summary.currentVolatility.toFixed(4)}, at a ${config.volatility[volatilityLevel]} level. ${anomalies.length > 0 ? `${anomalies.length} anomalies detected.` : 'No anomalies detected.'} ${volatilityAnalysis.breakouts.length > 0 ? `${volatilityAnalysis.breakouts.length} breakouts detected.` : 'No breakouts detected.'}`;
    }
}

/**
 * 生成建议
 */
function generateRecommendations(
    data: DataPoint[],
    statistics: StatisticsResult,
    volatilityAnalysis: VolatilityAnalysisResult,
    anomalies: Array<DataPoint & { zScore: number; severity: 'normal' | 'warning' | 'critical' }>,
    locale: string
): string[] {
    const recommendations: string[] = [];
    const trendType = calculateTrendType(data);
    const volatilityLevel = determineVolatilityLevel(volatilityAnalysis.summary.currentVolatility);
    const volatilityTrend = volatilityAnalysis.summary.volatilityTrend;

    if (locale === 'zh') {
        // 基于趋势的建议
        if (trendType === 'rising') {
            recommendations.push('指标呈上升趋势，建议关注是否持续上涨。');
        } else if (trendType === 'falling') {
            recommendations.push('指标呈下降趋势，建议关注是否持续下跌。');
        } else if (trendType === 'volatile') {
            recommendations.push('指标波动剧烈，建议谨慎决策。');
        }

        // 基于波动率的建议
        if (volatilityLevel === 'high') {
            recommendations.push('当前波动率较高，市场不确定性大，建议降低风险敞口。');
        } else if (volatilityLevel === 'medium' && volatilityTrend === 'increasing') {
            recommendations.push('波动率呈上升趋势，建议密切关注市场动态。');
        }

        // 基于异常值的建议
        if (anomalies.length > 5) {
            recommendations.push('异常值较多，建议深入分析数据质量和市场事件。');
        }

        // 基于突破的建议
        if (volatilityAnalysis.breakouts.length > 10) {
            recommendations.push('突破次数较多，市场波动剧烈，建议谨慎操作。');
        }

        // 如果没有特别建议
        if (recommendations.length === 0) {
            recommendations.push('当前指标表现稳定，建议持续监控。');
        }
    } else {
        // 基于趋势的建议
        if (trendType === 'rising') {
            recommendations.push('The indicator is trending upward, monitor if the rise continues.');
        } else if (trendType === 'falling') {
            recommendations.push('The indicator is trending downward, monitor if the decline continues.');
        } else if (trendType === 'volatile') {
            recommendations.push('The indicator is highly volatile, exercise caution in decision-making.');
        }

        // 基于波动率的建议
        if (volatilityLevel === 'high') {
            recommendations.push('Current volatility is high with significant market uncertainty, consider reducing risk exposure.');
        } else if (volatilityLevel === 'medium' && volatilityTrend === 'increasing') {
            recommendations.push('Volatility is trending upward, monitor market dynamics closely.');
        }

        // 基于异常值的建议
        if (anomalies.length > 5) {
            recommendations.push('Multiple anomalies detected, recommend in-depth analysis of data quality and market events.');
        }

        // 基于突破的建议
        if (volatilityAnalysis.breakouts.length > 10) {
            recommendations.push('High number of breakouts indicates significant market volatility, exercise caution.');
        }

        // 如果没有特别建议
        if (recommendations.length === 0) {
            recommendations.push('Current indicator performance is stable, continue monitoring.');
        }
    }

    return recommendations;
}

/**
 * 执行语义分析
 */
export function analyzeSemantics(
    data: DataPoint[],
    statistics: StatisticsResult,
    volatilityAnalysis: VolatilityAnalysisResult,
    locale: string = 'en'
): SemanticAnalysisResult {
    const config = getLanguageConfig(locale);

    // 计算趋势
    const trendType = calculateTrendType(data);
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = lastValue - firstValue;
    const percentage = (change / firstValue) * 100;
    const magnitude = calculateChangeMagnitude(percentage);

    // 计算波动率
    const currentVolatility = volatilityAnalysis.summary.currentVolatility;
    const volatilityLevel = determineVolatilityLevel(currentVolatility);

    // 计算异常值
    const anomalies = detectHistoricalAnomalies(data, statistics);

    // 生成洞察
    const insights: InsightItem[] = [];

    // 趋势洞察
    insights.push(generateTrendInsight(data, statistics, locale));

    // 波动率洞察
    insights.push(generateVolatilityInsight(volatilityAnalysis, locale));

    // 异常洞察
    const anomalyInsight = generateAnomalyInsight(anomalies, locale);
    if (anomalyInsight) {
        insights.push(anomalyInsight);
    }

    // 突破洞察
    const breakoutInsight = generateBreakoutInsight(volatilityAnalysis, locale);
    if (breakoutInsight) {
        insights.push(breakoutInsight);
    }

    // 生成总结和建议
    const summary = generateSummary(data, statistics, volatilityAnalysis, anomalies, locale);
    const recommendations = generateRecommendations(data, statistics, volatilityAnalysis, anomalies, locale);

    return {
        trend: {
            type: trendType,
            magnitude,
            description: locale === 'zh'
                ? `该指标呈现${config.trend[trendType]}趋势，变化幅度为${config.magnitude[magnitude]}。`
                : `The indicator shows a ${config.trend[trendType]} trend with ${config.magnitude[magnitude]} change.`
        },
        volatility: {
            level: volatilityLevel,
            description: locale === 'zh'
                ? `当前波动率为${currentVolatility.toFixed(4)}，处于${config.volatility[volatilityLevel]}水平。`
                : `Current volatility is ${currentVolatility.toFixed(4)}, at a ${config.volatility[volatilityLevel]} level.`
        },
        change: {
            absolute: change,
            percentage,
            magnitude,
            description: locale === 'zh'
                ? `从${firstValue.toFixed(2)}变化至${lastValue.toFixed(2)}，变化幅度为${percentage.toFixed(2)}%（${config.magnitude[magnitude]}）。`
                : `Changed from ${firstValue.toFixed(2)} to ${lastValue.toFixed(2)}, with a change of ${percentage.toFixed(2)}% (${config.magnitude[magnitude]}).`
        },
        insights,
        summary,
        recommendations
    };
}

/**
 * 生成语义分析报告
 */
export function generateSemanticReport(analysis: SemanticAnalysisResult, locale: string = 'en'): string {
    const config = getLanguageConfig(locale);

    let report = '';

    if (locale === 'zh') {
        report += '=== 语义分析报告 ===\n\n';
        report += `## 趋势分析\n`;
        report += `${analysis.trend.description}\n\n`;
        report += `## 波动率分析\n`;
        report += `${analysis.volatility.description}\n\n`;
        report += `## 变化分析\n`;
        report += `${analysis.change.description}\n\n`;
        report += `## 关键洞察\n`;
        analysis.insights.forEach(insight => {
            report += `### ${insight.title}\n`;
            report += `${insight.description}\n\n`;
        });
        report += `## 总结\n`;
        report += `${analysis.summary}\n\n`;
        report += `## 建议\n`;
        analysis.recommendations.forEach(rec => {
            report += `- ${rec}\n`;
        });
    } else {
        report += '=== Semantic Analysis Report ===\n\n';
        report += `## Trend Analysis\n`;
        report += `${analysis.trend.description}\n\n`;
        report += `## Volatility Analysis\n`;
        report += `${analysis.volatility.description}\n\n`;
        report += `## Change Analysis\n`;
        report += `${analysis.change.description}\n\n`;
        report += `## Key Insights\n`;
        analysis.insights.forEach(insight => {
            report += `### ${insight.title}\n`;
            report += `${insight.description}\n\n`;
        });
        report += `## Summary\n`;
        report += `${analysis.summary}\n\n`;
        report += `## Recommendations\n`;
        analysis.recommendations.forEach(rec => {
            report += `- ${rec}\n`;
        });
    }

    return report;
}
