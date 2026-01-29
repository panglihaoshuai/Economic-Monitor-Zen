/**
 * Volatility Trend Analyzer Module
 * 高级波动率分析模块 - 实现波动率趋势可视化和历史异常检测
 * 
 * 这个模块提供：
 * 1. 波动率趋势计算和可视化
 * 2. 历史异常检测和突破点识别
 * 3. 波动率聚类分析
 * 4. 波动率变化率计算
 */

import { DataPoint, StatisticsResult } from './statistics-calculator';

// 重新导出DataPoint类型以供其他模块使用
export type { DataPoint };

export interface VolatilityTrendPoint {
    date: string;
    volatility: number;
    movingAverage: number;
    upperBand: number;
    lowerBand: number;
}

export interface BreakoutPoint {
    date: string;
    value: number;
    type: 'breakout_up' | 'breakout_down' | 'reversal';
    strength: number; // 0-1, 突破强度
}

export interface VolatilityCluster {
    startDate: string;
    endDate: string;
    level: 'low' | 'medium' | 'high';
    averageVolatility: number;
    duration: number; // 天数
}

export interface VolatilityAnalysisResult {
    trend: VolatilityTrendPoint[];
    breakouts: BreakoutPoint[];
    clusters: VolatilityCluster[];
    summary: {
        currentVolatility: number;
        volatilityTrend: 'increasing' | 'decreasing' | 'stable';
        breakoutCount: number;
        highVolatilityPeriods: number;
    };
}

/**
 * 计算波动率趋势
 * @param data 数据点数组
 * @param windowSize 滚动窗口大小
 * @param bandWidth 波动带宽度（标准差倍数）
 * @returns 波动率趋势点数组
 */
export function calculateVolatilityTrend(
    data: DataPoint[],
    windowSize: number = 20,
    bandWidth: number = 2
): VolatilityTrendPoint[] {
    if (!data || data.length < windowSize) {
        return [];
    }

    const values = data.map(d => d.value);
    const result: VolatilityTrendPoint[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
        const window = values.slice(i - windowSize + 1, i + 1);
        const mean = window.reduce((a, b) => a + b, 0) / windowSize;
        const stdDev = Math.sqrt(
            window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowSize
        );

        result.push({
            date: data[i].date,
            volatility: stdDev,
            movingAverage: mean,
            upperBand: mean + bandWidth * stdDev,
            lowerBand: mean - bandWidth * stdDev,
        });
    }

    return result;
}

/**
 * 检测突破点
 * @param data 数据点数组
 * @param volatilityTrend 波动率趋势
 * @param threshold 突破阈值（标准差倍数）
 * @returns 突破点数组
 */
export function detectBreakouts(
    data: DataPoint[],
    volatilityTrend: VolatilityTrendPoint[],
    threshold: number = 2.5
): BreakoutPoint[] {
    if (!data || data.length === 0 || volatilityTrend.length === 0) {
        return [];
    }

    const breakouts: BreakoutPoint[] = [];
    const values = data.map(d => d.value);

    for (let i = 1; i < data.length; i++) {
        const currentVolatility = volatilityTrend[i]?.volatility || 0;
        const currentMA = volatilityTrend[i]?.movingAverage || values[i];
        const currentUpperBand = volatilityTrend[i]?.upperBand || values[i];
        const currentLowerBand = volatilityTrend[i]?.lowerBand || values[i];

        // 检测向上突破
        if (values[i] > currentUpperBand) {
            const strength = Math.min(1, (values[i] - currentUpperBand) / currentVolatility);
            breakouts.push({
                date: data[i].date,
                value: values[i],
                type: 'breakout_up',
                strength,
            });
        }
        // 检测向下突破
        else if (values[i] < currentLowerBand) {
            const strength = Math.min(1, (currentLowerBand - values[i]) / currentVolatility);
            breakouts.push({
                date: data[i].date,
                value: values[i],
                type: 'breakout_down',
                strength,
            });
        }
        // 检测反转（趋势改变）
        else if (i > 1) {
            const prevMA = volatilityTrend[i - 1]?.movingAverage || values[i - 1];
            const prevValue = values[i - 1];
            const prevUpperBand = volatilityTrend[i - 1]?.upperBand || values[i - 1];
            const prevLowerBand = volatilityTrend[i - 1]?.lowerBand || values[i - 1];

            // 从上轨下方突破到下轨下方
            if (prevValue > prevUpperBand && values[i] < currentLowerBand) {
                const strength = Math.min(1, (prevUpperBand - prevValue) / currentVolatility);
                breakouts.push({
                    date: data[i].date,
                    value: values[i],
                    type: 'reversal',
                    strength,
                });
            }
            // 从下轨下方突破到上轨上方
            else if (prevValue < prevLowerBand && values[i] > currentUpperBand) {
                const strength = Math.min(1, (prevValue - prevLowerBand) / currentVolatility);
                breakouts.push({
                    date: data[i].date,
                    value: values[i],
                    type: 'reversal',
                    strength,
                });
            }
        }
    }

    // 按日期排序并去重
    const uniqueBreakouts = breakouts
        .filter((b, index, self) =>
            index === self.findIndex(b2 => b2.date === b.date)
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return uniqueBreakouts;
}

/**
 * 检测波动率聚类
 * @param volatilityTrend 波动率趋势
 * @param lowThreshold 低波动率阈值
 * @param highThreshold 高波动率阈值
 * @returns 波动率聚类数组
 */
export function detectVolatilityClusters(
    volatilityTrend: VolatilityTrendPoint[],
    lowThreshold: number = 0.02,
    highThreshold: number = 0.05
): VolatilityCluster[] {
    if (!volatilityTrend || volatilityTrend.length === 0) {
        return [];
    }

    const clusters: VolatilityCluster[] = [];
    let currentCluster: {
        startDate: string;
        endDate: string;
        level: 'low' | 'medium' | 'high';
        averageVolatility: number;
        values: number[];
    } | null = null;

    for (let i = 0; i < volatilityTrend.length; i++) {
        const point = volatilityTrend[i];
        const level = point.volatility < lowThreshold ? 'low' :
            point.volatility < highThreshold ? 'medium' : 'high';

        if (!currentCluster || currentCluster.level !== level) {
            // 保存上一个聚类
            if (currentCluster) {
                clusters.push({
                    startDate: currentCluster.startDate,
                    endDate: volatilityTrend[i - 1].date,
                    level: currentCluster.level,
                    averageVolatility: currentCluster.averageVolatility,
                    duration: currentCluster.values.length,
                });
            }

            // 开始新聚类
            currentCluster = {
                startDate: point.date,
                endDate: point.date,
                level,
                averageVolatility: point.volatility,
                values: [point.volatility],
            };
        } else {
            // 继续当前聚类
            currentCluster.values.push(point.volatility);
            currentCluster.endDate = point.date;
            currentCluster.averageVolatility =
                currentCluster.values.reduce((a, b) => a + b, 0) / currentCluster.values.length;
        }
    }

    // 保存最后一个聚类
    if (currentCluster) {
        clusters.push({
            startDate: currentCluster.startDate,
            endDate: currentCluster.endDate,
            level: currentCluster.level,
            averageVolatility: currentCluster.averageVolatility,
            duration: currentCluster.values.length,
        });
    }

    return clusters;
}

/**
 * 计算波动率变化率
 * @param volatilityTrend 波动率趋势
 * @param period 周期（默认为1）
 * @returns 波动率变化率数组
 */
export function calculateVolatilityChangeRate(
    volatilityTrend: VolatilityTrendPoint[],
    period: number = 1
): number[] {
    if (!volatilityTrend || volatilityTrend.length < period + 1) {
        return [];
    }

    const result: number[] = [];

    for (let i = period; i < volatilityTrend.length; i++) {
        const currentVol = volatilityTrend[i].volatility;
        const prevVol = volatilityTrend[i - period].volatility;
        const change = ((currentVol - prevVol) / Math.abs(prevVol)) * 100;
        result.push(change);
    }

    return result;
}

/**
 * 执行完整的波动率分析
 * @param data 数据点数组
 * @param options 配置选项
 * @returns 波动率分析结果
 */
export function analyzeVolatility(
    data: DataPoint[],
    options: {
        windowSize?: number;
        bandWidth?: number;
        breakoutThreshold?: number;
        lowVolatilityThreshold?: number;
        highVolatilityThreshold?: number;
    } = {}
): VolatilityAnalysisResult {
    const {
        windowSize = 20,
        bandWidth = 2,
        breakoutThreshold = 2.5,
        lowVolatilityThreshold = 0.02,
        highVolatilityThreshold = 0.05,
    } = options;

    // 计算波动率趋势
    const trend = calculateVolatilityTrend(data, windowSize, bandWidth);

    // 检测突破点
    const breakouts = detectBreakouts(data, trend, breakoutThreshold);

    // 检测波动率聚类
    const clusters = detectVolatilityClusters(trend, lowVolatilityThreshold, highVolatilityThreshold);

    // 计算波动率变化率
    const changeRates = calculateVolatilityChangeRate(trend);

    // 计算汇总信息
    const currentVolatility = trend.length > 0 ? trend[trend.length - 1].volatility : 0;

    // 判断波动率趋势
    const recentVolatility = trend.slice(-10).map(p => p.volatility);
    const volatilityTrend = recentVolatility.length > 1 ?
        recentVolatility[recentVolatility.length - 1] > recentVolatility[0] ? 'increasing' :
            recentVolatility[recentVolatility.length - 1] < recentVolatility[0] ? 'decreasing' : 'stable' : 'stable';

    const highVolatilityPeriods = clusters.filter(c => c.level === 'high').length;

    return {
        trend,
        breakouts,
        clusters,
        summary: {
            currentVolatility,
            volatilityTrend,
            breakoutCount: breakouts.length,
            highVolatilityPeriods,
        },
    };
}

/**
 * 生成波动率分析报告
 * @param analysis 波动率分析结果
 * @param locale 语言（'en' 或 'zh'）
 * @returns 分析报告文本
 */
export function generateVolatilityReport(
    analysis: VolatilityAnalysisResult,
    locale: string = 'en'
): string {
    const { summary, breakouts, clusters } = analysis;

    const isZh = locale === 'zh';

    // 波动率趋势描述
    const trendText = isZh ?
        (summary.volatilityTrend === 'increasing' ? '上升' :
            summary.volatilityTrend === 'decreasing' ? '下降' : '稳定') :
        (summary.volatilityTrend === 'increasing' ? 'increasing' :
            summary.volatilityTrend === 'decreasing' ? 'decreasing' : 'stable');

    // 高波动率期间描述
    const highVolText = isZh ?
        `高波动率期间: ${summary.highVolatilityPeriods}个` :
        `High volatility periods: ${summary.highVolatilityPeriods}`;

    // 突破点描述
    const breakoutText = isZh ?
        `突破点: ${breakouts.length}个` :
        `Breakouts: ${breakouts.length}`;

    // 波动率聚类描述
    const clusterText = isZh ?
        `波动率聚类: ${clusters.length}个` :
        `Volatility clusters: ${clusters.length}`;

    return isZh ?
        `波动率分析报告\n` +
        `当前波动率: ${summary.currentVolatility.toFixed(4)}\n` +
        `波动率趋势: ${trendText}\n` +
        `${highVolText}\n` +
        `${breakoutText}\n` +
        `${clusterText}\n` +
        `最近高波动率期间: ${clusters.filter(c => c.level === 'high').map(c =>
            `${c.startDate} 至 ${c.endDate} (${c.duration}天)`
        ).join(', ') || '无'}`
        :
        `Volatility Analysis Report\n` +
        `Current Volatility: ${summary.currentVolatility.toFixed(4)}\n` +
        `Volatility Trend: ${trendText}\n` +
        `${highVolText}\n` +
        `${breakoutText}\n` +
        `${clusterText}\n` +
        `Recent High Volatility Periods: ${clusters.filter(c => c.level === 'high').map(c =>
            `${c.startDate} to ${c.endDate} (${c.duration} days)`
        ).join(', ') || 'None'}`;
}

/**
 * 获取波动率水平描述
 * @param volatility 波动率值
 * @param locale 语言
 * @returns 波动率水平描述
 */
export function getVolatilityLevelDescription(
    volatility: number,
    locale: string = 'en'
): string {
    const isZh = locale === 'zh';

    if (volatility < 0.02) {
        return isZh ? '低波动率' : 'Low Volatility';
    } else if (volatility < 0.05) {
        return isZh ? '中等波动率' : 'Medium Volatility';
    } else {
        return isZh ? '高波动率' : 'High Volatility';
    }
}

/**
 * 获取突破点类型描述
 * @param type 突破点类型
 * @param locale 语言
 * @returns 突破点类型描述
 */
export function getBreakoutTypeDescription(
    type: BreakoutPoint['type'],
    locale: string = 'en'
): string {
    const isZh = locale === 'zh';

    switch (type) {
        case 'breakout_up':
            return isZh ? '向上突破' : 'Breakout Up';
        case 'breakout_down':
            return isZh ? '向下突破' : 'Breakout Down';
        case 'reversal':
            return isZh ? '趋势反转' : 'Reversal';
        default:
            return isZh ? '未知' : 'Unknown';
    }
}
