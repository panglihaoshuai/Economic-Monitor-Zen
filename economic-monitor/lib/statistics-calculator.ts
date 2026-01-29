/**
 * Statistics Calculator Module
 * 统计计算模块 - 确保所有统计计算基于完整的时间范围数据
 * 
 * 这个模块提供统一的统计计算接口，确保：
 * 1. 所有计算都基于用户选择的完整时间范围
 * 2. 不使用固定窗口限制
 * 3. 提供一致的API接口
 */

export interface DataPoint {
    date: string;
    value: number;
}

export interface StatisticsResult {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    variance: number;
    median: number;
    percentile25: number;
    percentile75: number;
    dataPoints: number;
    startDate: string;
    endDate: string;
}

export interface ZScoreResult {
    zScore: number;
    percentile: number;
    deviationPercent: number;
    severity: 'normal' | 'warning' | 'critical';
}

export interface TrendResult {
    direction: 'up' | 'down' | 'stable';
    strength: number; // 0-1, 越接近1表示趋势越强
    changePercent: number;
}

export interface VolatilityResult {
    level: 'low' | 'medium' | 'high';
    coefficientOfVariation: number;
    rollingVolatility: number[];
}

/**
 * 计算基础统计信息
 * @param data 数据点数组
 * @returns 统计结果
 */
export function calculateStatistics(data: DataPoint[]): StatisticsResult {
    if (!data || data.length === 0) {
        throw new Error('No data provided for statistics calculation');
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // 基础统计
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // 方差和标准差
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 中位数和百分位数
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = calculatePercentile(sortedValues, 50);
    const percentile25 = calculatePercentile(sortedValues, 25);
    const percentile75 = calculatePercentile(sortedValues, 75);

    return {
        mean,
        stdDev,
        min,
        max,
        variance,
        median,
        percentile25,
        percentile75,
        dataPoints: n,
        startDate: data[0].date,
        endDate: data[data.length - 1].date,
    };
}

/**
 * 计算Z分数
 * @param currentValue 当前值
 * @param historicalValues 历史值数组（完整的时间范围）
 * @param thresholds 阈值配置
 * @returns Z分数结果
 */
export function calculateZScore(
    currentValue: number,
    historicalValues: number[],
    thresholds: { warning: number; critical: number } = { warning: 2, critical: 3 }
): ZScoreResult {
    if (!historicalValues || historicalValues.length === 0) {
        return {
            zScore: 0,
            percentile: 50,
            deviationPercent: 0,
            severity: 'normal',
        };
    }

    // 使用完整的历史值计算统计
    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const variance =
        historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        historicalValues.length;
    const stdDev = Math.sqrt(variance);

    // Z分数计算
    const zScore = stdDev === 0 ? 0 : (currentValue - mean) / stdDev;

    // 百分位数计算（非参数方法）
    const sortedValues = [...historicalValues].sort((a, b) => a - b);
    const percentile = (sortedValues.filter(v => v < currentValue).length / sortedValues.length) * 100;

    // 偏离百分比
    const deviationPercent = mean !== 0 ? ((currentValue - mean) / Math.abs(mean)) * 100 : 0;

    // 严重程度判断
    const absZScore = Math.abs(zScore);
    const severity = absZScore >= thresholds.critical ? 'critical' :
        absZScore >= thresholds.warning ? 'warning' : 'normal';

    return {
        zScore,
        percentile,
        deviationPercent,
        severity,
    };
}

/**
 * 计算趋势
 * @param data 数据点数组
 * @returns 趋势结果
 */
export function calculateTrend(data: DataPoint[]): TrendResult {
    if (!data || data.length < 2) {
        return {
            direction: 'stable',
            strength: 0,
            changePercent: 0,
        };
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // 简单线性回归计算趋势
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算R²（拟合优度）
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
        const predicted = slope * i + intercept;
        return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    // 趋势方向
    const direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';

    // 趋势强度（基于R²）
    const strength = Math.max(0, Math.min(1, rSquared));

    // 变化百分比
    const changePercent = values[0] !== 0 ? ((values[n - 1] - values[0]) / Math.abs(values[0])) * 100 : 0;

    return {
        direction,
        strength,
        changePercent,
    };
}

/**
 * 计算波动率
 * @param data 数据点数组
 * @param windowSize 滚动窗口大小
 * @returns 波动率结果
 */
export function calculateVolatility(
    data: DataPoint[],
    windowSize: number = 20
): VolatilityResult {
    if (!data || data.length < 2) {
        return {
            level: 'low',
            coefficientOfVariation: 0,
            rollingVolatility: [],
        };
    }

    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    // 变异系数
    const cv = stdDev / Math.abs(mean);

    // 波动率水平
    const level = cv < 0.02 ? 'low' : cv < 0.05 ? 'medium' : 'high';

    // 滚动波动率
    const rollingVolatility: number[] = [];
    for (let i = windowSize; i < values.length; i++) {
        const window = values.slice(i - windowSize, i);
        const windowMean = window.reduce((a, b) => a + b, 0) / windowSize;
        const windowStdDev = Math.sqrt(
            window.reduce((sum, val) => sum + Math.pow(val - windowMean, 2), 0) / windowSize
        );
        rollingVolatility.push(windowStdDev);
    }

    return {
        level,
        coefficientOfVariation: cv,
        rollingVolatility,
    };
}

/**
 * 计算百分位数
 * @param sortedValues 已排序的值数组
 * @param percentile 百分位数（0-100）
 * @returns 百分位数值
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
        return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * 计算数据点的Z分数（用于图表着色）
 * @param data 数据点数组
 * @param statistics 统计结果
 * @returns 带Z分数的数据点数组
 */
export function calculateDataPointZScores(
    data: DataPoint[],
    statistics: StatisticsResult
): Array<DataPoint & { zScore: number; severity: 'normal' | 'warning' | 'critical' }> {
    const { mean, stdDev } = statistics;

    return data.map(d => {
        const zScore = stdDev > 0 ? (d.value - mean) / stdDev : 0;
        const absZScore = Math.abs(zScore);
        const severity = absZScore >= 3 ? 'critical' : absZScore >= 2 ? 'warning' : 'normal';

        return {
            ...d,
            zScore,
            severity,
        };
    });
}

/**
 * 检测历史异常点
 * @param data 数据点数组
 * @param statistics 统计结果
 * @param thresholds 阈值配置
 * @returns 异常点数组
 */
export function detectHistoricalAnomalies(
    data: DataPoint[],
    statistics: StatisticsResult,
    thresholds: { warning: number; critical: number } = { warning: 2, critical: 3 }
): Array<DataPoint & { zScore: number; severity: 'normal' | 'warning' | 'critical' }> {
    const dataWithZScores = calculateDataPointZScores(data, statistics);

    return dataWithZScores.filter(d => d.severity !== 'normal');
}

/**
 * 计算移动平均
 * @param values 值数组
 * @param windowSize 窗口大小
 * @returns 移动平均数组
 */
export function calculateMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];

    for (let i = windowSize - 1; i < values.length; i++) {
        const window = values.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((a, b) => a + b, 0) / windowSize;
        result.push(avg);
    }

    return result;
}

/**
 * 计算变化率
 * @param values 值数组
 * @param period 周期（默认为1）
 * @returns 变化率数组
 */
export function calculateChangeRate(values: number[], period: number = 1): number[] {
    const result: number[] = [];

    for (let i = period; i < values.length; i++) {
        const change = ((values[i] - values[i - period]) / Math.abs(values[i - period])) * 100;
        result.push(change);
    }

    return result;
}
