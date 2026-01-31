/**
 * 历史相似事件分析模块
 * 
 * 该模块用于识别和分析与当前趋势相似的历史事件
 * 帮助用户理解当前趋势可能的发展方向
 */

export interface DataPoint {
    date: string;
    value: number;
}

export interface HistoricalSimilarEvent {
    eventName: string;
    startDate: string;
    endDate: string;
    duration: number;
    similarityScore: number;
    trendDescription: string;
    startValue: number;
    endValue: number;
    changePercent: number;
    volatility: number;
    historicalContext: string;
    marketImpact: string;
    investmentInsight: string;
}

export interface HistoricalSimilarEventsOptions {
    windowSize?: number;
    similarityThreshold?: number;
    minEventDuration?: number;
    maxEvents?: number;
}

/**
 * 分析历史相似事件
 * 
 * @param currentData - 当前时间范围的数据
 * @param allHistoricalData - 所有历史数据
 * @param options - 分析选项
 * @returns 历史相似事件列表
 */
export function analyzeHistoricalSimilarEvents(
    currentData: DataPoint[],
    allHistoricalData: DataPoint[],
    options: HistoricalSimilarEventsOptions = {}
): HistoricalSimilarEvent[] {
    const {
        windowSize = 30,
        similarityThreshold = 0.85,
        minEventDuration = 5,
        maxEvents = 10
    } = options;

    // 如果数据不足，返回空数组
    if (currentData.length < windowSize || allHistoricalData.length < windowSize * 2) {
        return [];
    }

    // 计算当前趋势的特征
    const currentTrend = calculateTrendFeatures(currentData);

    // 在历史数据中搜索相似事件
    const similarEvents: HistoricalSimilarEvent[] = [];

    for (let i = 0; i <= allHistoricalData.length - windowSize; i++) {
        // 跳过当前数据的时间段
        const windowStart = allHistoricalData[i].date;
        const windowEnd = allHistoricalData[i + windowSize - 1].date;

        if (isOverlappingWithCurrent(windowStart, windowEnd, currentData)) {
            continue;
        }

        // 提取历史窗口数据
        const historicalWindow = allHistoricalData.slice(i, i + windowSize);

        // 计算历史趋势的特征
        const historicalTrend = calculateTrendFeatures(historicalWindow);

        // 计算相似度
        const similarity = calculateSimilarity(currentTrend, historicalTrend);

        // 如果相似度达到阈值，则记录该事件
        if (similarity >= similarityThreshold) {
            // 扩展事件窗口以获取完整事件
            const extendedEvent = extendEventWindow(
                allHistoricalData,
                i,
                windowSize,
                minEventDuration
            );

            if (extendedEvent) {
                const event = createHistoricalEvent(
                    extendedEvent,
                    similarity,
                    currentTrend
                );
                similarEvents.push(event);
            }
        }
    }

    // 按相似度排序并返回前N个事件
    return similarEvents
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, maxEvents);
}

/**
 * 计算趋势特征
 */
function calculateTrendFeatures(data: DataPoint[]): TrendFeatures {
    const values = data.map(d => d.value);
    const n = values.length;

    // 计算基本统计量
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 计算趋势斜率（线性回归）
    const xValues = Array.from({ length: n }, (_, i) => i);
    const slope = calculateSlope(xValues, values);

    // 计算变化率
    const changeRate = ((values[n - 1] - values[0]) / values[0]) * 100;

    // 计算波动率
    const volatility = (stdDev / mean) * 100;

    // 计算动量（最近5天的平均变化）
    const momentum = n >= 5
        ? ((values[n - 1] - values[n - 5]) / values[n - 5]) * 100
        : changeRate;

    // 计算加速度（动量的变化）
    const acceleration = n >= 10
        ? ((values[n - 1] - values[n - 5]) / values[n - 5]) -
        ((values[n - 5] - values[n - 10]) / values[n - 10])
        : 0;

    return {
        mean,
        stdDev,
        slope,
        changeRate,
        volatility,
        momentum,
        acceleration,
        values: [...values]
    };
}

/**
 * 计算线性回归斜率
 */
function calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = n * sumX2 - sumX * sumX;

    return denominator !== 0 ? numerator / denominator : 0;
}

/**
 * 计算两个趋势的相似度
 */
function calculateSimilarity(
    trend1: TrendFeatures,
    trend2: TrendFeatures
): number {
    // 归一化特征
    const normalized1 = normalizeFeatures(trend1);
    const normalized2 = normalizeFeatures(trend2);

    // 计算欧氏距离
    const distance = Math.sqrt(
        Math.pow(normalized1.slope - normalized2.slope, 2) +
        Math.pow(normalized1.changeRate - normalized2.changeRate, 2) +
        Math.pow(normalized1.volatility - normalized2.volatility, 2) +
        Math.pow(normalized1.momentum - normalized2.momentum, 2) +
        Math.pow(normalized1.acceleration - normalized2.acceleration, 2)
    );

    // 转换为相似度（距离越小，相似度越高）
    const maxDistance = Math.sqrt(5); // 5个特征，每个最大差值为1
    const similarity = Math.max(0, 1 - distance / maxDistance);

    return similarity;
}

/**
 * 归一化特征
 */
function normalizeFeatures(features: TrendFeatures): NormalizedFeatures {
    return {
        slope: normalizeValue(features.slope, -1, 1),
        changeRate: normalizeValue(features.changeRate, -50, 50),
        volatility: normalizeValue(features.volatility, 0, 20),
        momentum: normalizeValue(features.momentum, -20, 20),
        acceleration: normalizeValue(features.acceleration, -10, 10)
    };
}

/**
 * 归一化值到[0, 1]范围
 */
function normalizeValue(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * 检查历史窗口是否与当前数据重叠
 */
function isOverlappingWithCurrent(
    windowStart: string,
    windowEnd: string,
    currentData: DataPoint[]
): boolean {
    const currentStart = currentData[0].date;
    const currentEnd = currentData[currentData.length - 1].date;

    return windowStart <= currentEnd && windowEnd >= currentStart;
}

/**
 * 扩展事件窗口以获取完整事件
 */
function extendEventWindow(
    allHistoricalData: DataPoint[],
    startIndex: number,
    windowSize: number,
    minDuration: number
): DataPoint[] | null {
    // 向前扩展
    let extendedStart = startIndex;
    while (extendedStart > 0) {
        const prevValue = allHistoricalData[extendedStart - 1].value;
        const currentValue = allHistoricalData[extendedStart].value;

        // 如果趋势发生明显变化，停止扩展
        if (Math.abs(prevValue - currentValue) / currentValue > 0.05) {
            break;
        }
        extendedStart--;
    }

    // 向后扩展
    let extendedEnd = startIndex + windowSize;
    while (extendedEnd < allHistoricalData.length) {
        const currentValue = allHistoricalData[extendedEnd - 1].value;
        const nextValue = allHistoricalData[extendedEnd].value;

        // 如果趋势发生明显变化，停止扩展
        if (Math.abs(nextValue - currentValue) / currentValue > 0.05) {
            break;
        }
        extendedEnd++;
    }

    // 检查持续时间
    const duration = extendedEnd - extendedStart;
    if (duration < minDuration) {
        return null;
    }

    return allHistoricalData.slice(extendedStart, extendedEnd);
}

/**
 * 创建历史事件对象
 */
function createHistoricalEvent(
    eventData: DataPoint[],
    similarityScore: number,
    currentTrend: TrendFeatures
): HistoricalSimilarEvent {
    const startDate = eventData[0].date;
    const endDate = eventData[eventData.length - 1].date;
    const duration = eventData.length;
    const startValue = eventData[0].value;
    const endValue = eventData[eventData.length - 1].value;
    const changePercent = ((endValue - startValue) / startValue) * 100;

    // 计算波动率
    const values = eventData.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    // 生成趋势描述
    const trendDescription = generateTrendDescription(changePercent, volatility);

    // 生成历史背景
    const historicalContext = generateHistoricalContext(startDate, endDate, changePercent);

    // 生成市场影响
    const marketImpact = generateMarketImpact(changePercent, volatility, startDate);

    // 生成投资启示
    const investmentInsight = generateInvestmentInsight(
        changePercent,
        volatility,
        currentTrend,
        similarityScore
    );

    // 生成事件名称
    const eventName = generateEventName(startDate, changePercent, volatility);

    return {
        eventName,
        startDate,
        endDate,
        duration,
        similarityScore,
        trendDescription,
        startValue,
        endValue,
        changePercent,
        volatility,
        historicalContext,
        marketImpact,
        investmentInsight
    };
}

/**
 * 生成趋势描述
 */
function generateTrendDescription(changePercent: number, volatility: number): string {
    let trend = '';
    if (changePercent > 10) {
        trend = '强劲上升';
    } else if (changePercent > 5) {
        trend = '温和上升';
    } else if (changePercent > -5) {
        trend = '相对稳定';
    } else if (changePercent > -10) {
        trend = '温和下降';
    } else {
        trend = '急剧下降';
    }

    let volatilityDesc = '';
    if (volatility > 10) {
        volatilityDesc = '高波动';
    } else if (volatility > 5) {
        volatilityDesc = '中等波动';
    } else {
        volatilityDesc = '低波动';
    }

    return `${trend}，${volatilityDesc}`;
}

/**
 * 生成历史背景
 */
function generateHistoricalContext(
    startDate: string,
    endDate: string,
    changePercent: number
): string {
    const year = parseInt(startDate.substring(0, 4));

    // 根据年份和变化幅度生成背景
    if (year >= 2020) {
        if (changePercent > 10) {
            return 'COVID-19疫情后经济复苏期，政策刺激推动经济指标快速回升';
        } else if (changePercent < -10) {
            return 'COVID-19疫情冲击期，经济活动大幅收缩';
        } else {
            return 'COVID-19疫情后经济调整期，市场逐步适应新常态';
        }
    } else if (year >= 2008) {
        if (changePercent > 10) {
            return '金融危机后经济复苏期，量化宽松政策推动经济回暖';
        } else if (changePercent < -10) {
            return '全球金融危机爆发期，金融市场剧烈波动';
        } else {
            return '金融危机后经济调整期，政策效果逐步显现';
        }
    } else if (year >= 2000) {
        if (changePercent > 10) {
            return '互联网泡沫破裂后经济复苏期';
        } else if (changePercent < -10) {
            return '互联网泡沫破裂期，科技股大幅下跌';
        } else {
            return '互联网泡沫后经济调整期';
        }
    } else {
        return '历史经济周期中的正常波动';
    }
}

/**
 * 生成市场影响
 */
function generateMarketImpact(
    changePercent: number,
    volatility: number,
    startDate: string
): string {
    const impacts: string[] = [];

    if (Math.abs(changePercent) > 15) {
        impacts.push('对金融市场产生重大影响');
    } else if (Math.abs(changePercent) > 10) {
        impacts.push('对金融市场产生显著影响');
    } else if (Math.abs(changePercent) > 5) {
        impacts.push('对金融市场产生一定影响');
    }

    if (volatility > 10) {
        impacts.push('市场不确定性大幅增加');
    } else if (volatility > 5) {
        impacts.push('市场波动性有所上升');
    }

    if (impacts.length === 0) {
        impacts.push('对市场影响相对温和');
    }

    return impacts.join('，');
}

/**
 * 生成投资启示
 */
function generateInvestmentInsight(
    changePercent: number,
    volatility: number,
    currentTrend: TrendFeatures,
    similarityScore: number
): string {
    const insights: string[] = [];

    // 基于相似度的建议
    if (similarityScore >= 0.9) {
        insights.push('当前趋势与历史事件高度相似，历史经验具有重要参考价值');
    } else if (similarityScore >= 0.85) {
        insights.push('当前趋势与历史事件较为相似，可参考历史经验');
    } else {
        insights.push('当前趋势与历史事件有一定相似性，需结合其他因素综合判断');
    }

    // 基于变化幅度的建议
    if (changePercent > 10) {
        insights.push('历史事件显示强劲上升后可能出现回调，建议关注风险');
    } else if (changePercent < -10) {
        insights.push('历史事件显示急剧下降后可能出现反弹，可寻找机会');
    }

    // 基于波动率的建议
    if (volatility > 10) {
        insights.push('历史事件显示高波动期市场风险较大，建议谨慎操作');
    } else if (volatility < 3) {
        insights.push('历史事件显示低波动期可能酝酿新趋势，建议密切关注');
    }

    // 基于当前趋势的建议
    if (currentTrend.momentum > 5) {
        insights.push('当前动量较强，建议顺势而为但注意风险控制');
    } else if (currentTrend.momentum < -5) {
        insights.push('当前动量较弱，建议等待趋势明朗后再做决策');
    }

    return insights.join('；');
}

/**
 * 生成事件名称
 */
function generateEventName(
    startDate: string,
    changePercent: number,
    volatility: number
): string {
    const year = startDate.substring(0, 4);
    const month = startDate.substring(5, 7);

    let trend = '';
    if (changePercent > 10) {
        trend = '强劲上升';
    } else if (changePercent > 5) {
        trend = '温和上升';
    } else if (changePercent > -5) {
        trend = '相对稳定';
    } else if (changePercent > -10) {
        trend = '温和下降';
    } else {
        trend = '急剧下降';
    }

    let volatilityDesc = '';
    if (volatility > 10) {
        volatilityDesc = '高波动';
    } else if (volatility > 5) {
        volatilityDesc = '中等波动';
    } else {
        volatilityDesc = '低波动';
    }

    return `${year}年${parseInt(month)}月${trend}${volatilityDesc}事件`;
}

/**
 * 趋势特征接口
 */
interface TrendFeatures {
    mean: number;
    stdDev: number;
    slope: number;
    changeRate: number;
    volatility: number;
    momentum: number;
    acceleration: number;
    values: number[];
}

/**
 * 归一化特征接口
 */
interface NormalizedFeatures {
    slope: number;
    changeRate: number;
    volatility: number;
    momentum: number;
    acceleration: number;
}
