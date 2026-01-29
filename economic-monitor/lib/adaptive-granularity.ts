/**
 * 自适应数据粒度模块
 * 
 * 独立模块，根据时间范围自动调整数据粒度
 * 平衡数据精度和性能
 */

import { DataPoint } from './statistics-calculator';

// 导出DataPoint类型
export type { DataPoint };

/**
 * 数据粒度类型
 */
export type DataGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * 时间范围类型
 */
export type TimeRangeType = 'short' | 'medium' | 'long';

/**
 * 粒度配置
 */
export interface GranularityConfig {
    granularity: DataGranularity;
    description: string;
    maxDataPoints: number;
    aggregationMethod: 'none' | 'average' | 'sum' | 'last';
}

/**
 * 粒度调整结果
 */
export interface GranularityAdjustmentResult {
    originalData: DataPoint[];
    adjustedData: DataPoint[];
    granularity: DataGranularity;
    timeRangeType: TimeRangeType;
    reductionRatio: number; // 数据减少比例 (0-1)
    config: GranularityConfig;
}

/**
 * 粒度配置映射
 */
const GRANULARITY_CONFIGS: Record<TimeRangeType, GranularityConfig> = {
    short: {
        granularity: 'daily',
        description: '原始数据，无聚合',
        maxDataPoints: 365,
        aggregationMethod: 'none',
    },
    medium: {
        granularity: 'weekly',
        description: '周聚合数据',
        maxDataPoints: 52,
        aggregationMethod: 'average',
    },
    long: {
        granularity: 'monthly',
        description: '月聚合数据',
        maxDataPoints: 12,
        aggregationMethod: 'average',
    },
};

/**
 * 计算时间范围类型
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 时间范围类型
 */
export function determineTimeRangeType(
    startDate: string,
    endDate: string
): TimeRangeType {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // 根据天数判断时间范围类型
    if (daysDiff <= 30) {
        return 'short';
    } else if (daysDiff <= 365) {
        return 'medium';
    } else {
        return 'long';
    }
}

/**
 * 获取粒度配置
 * @param timeRangeType 时间范围类型
 * @returns 粒度配置
 */
export function getGranularityConfig(timeRangeType: TimeRangeType): GranularityConfig {
    return GRANULARITY_CONFIGS[timeRangeType];
}

/**
 * 聚合数据到周粒度
 * @param data 原始数据
 * @returns 聚合后的数据
 */
export function aggregateToWeekly(data: DataPoint[]): DataPoint[] {
    if (data.length === 0) {
        return [];
    }

    const weeklyData: Map<string, { sum: number; count: number }> = new Map();

    // 按周聚合数据
    data.forEach(point => {
        const date = new Date(point.date);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;

        if (!weeklyData.has(key)) {
            weeklyData.set(key, { sum: 0, count: 0 });
        }

        const entry = weeklyData.get(key)!;
        entry.sum += point.value;
        entry.count += 1;
    });

    // 计算每周的平均值
    const result: DataPoint[] = [];
    const sortedKeys = Array.from(weeklyData.keys()).sort();

    sortedKeys.forEach(key => {
        const entry = weeklyData.get(key)!;
        const [year, week] = key.split('-W');
        const weekDate = getDateFromWeekNumber(parseInt(year), parseInt(week));

        result.push({
            date: weekDate.toISOString().split('T')[0],
            value: entry.sum / entry.count,
        });
    });

    return result;
}

/**
 * 聚合数据到月粒度
 * @param data 原始数据
 * @returns 聚合后的数据
 */
export function aggregateToMonthly(data: DataPoint[]): DataPoint[] {
    if (data.length === 0) {
        return [];
    }

    const monthlyData: Map<string, { sum: number; count: number }> = new Map();

    // 按月聚合数据
    data.forEach(point => {
        const date = new Date(point.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month.toString().padStart(2, '0')}`;

        if (!monthlyData.has(key)) {
            monthlyData.set(key, { sum: 0, count: 0 });
        }

        const entry = monthlyData.get(key)!;
        entry.sum += point.value;
        entry.count += 1;
    });

    // 计算每月的平均值
    const result: DataPoint[] = [];
    const sortedKeys = Array.from(monthlyData.keys()).sort();

    sortedKeys.forEach(key => {
        const entry = monthlyData.get(key)!;
        const [year, month] = key.split('-');

        result.push({
            date: `${year}-${month}-01`,
            value: entry.sum / entry.count,
        });
    });

    return result;
}

/**
 * 聚合数据到季度粒度
 * @param data 原始数据
 * @returns 聚合后的数据
 */
export function aggregateToQuarterly(data: DataPoint[]): DataPoint[] {
    if (data.length === 0) {
        return [];
    }

    const quarterlyData: Map<string, { sum: number; count: number }> = new Map();

    // 按季度聚合数据
    data.forEach(point => {
        const date = new Date(point.date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        const key = `${year}-Q${quarter}`;

        if (!quarterlyData.has(key)) {
            quarterlyData.set(key, { sum: 0, count: 0 });
        }

        const entry = quarterlyData.get(key)!;
        entry.sum += point.value;
        entry.count += 1;
    });

    // 计算每季度的平均值
    const result: DataPoint[] = [];
    const sortedKeys = Array.from(quarterlyData.keys()).sort();

    sortedKeys.forEach(key => {
        const entry = quarterlyData.get(key)!;
        const [year, quarter] = key.split('-Q');

        // 计算季度的第一个月
        const firstMonth = (parseInt(quarter) - 1) * 3 + 1;
        const monthStr = firstMonth.toString().padStart(2, '0');

        result.push({
            date: `${year}-${monthStr}-01`,
            value: entry.sum / entry.count,
        });
    });

    return result;
}

/**
 * 获取周数（ISO 8601标准）
 */
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 4);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * 从周数获取日期
 */
function getDateFromWeekNumber(year: number, week: number): Date {
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    return date;
}

/**
 * 聚合数据
 * @param data 原始数据
 * @param granularity 目标粒度
 * @returns 聚合后的数据
 */
export function aggregateData(
    data: DataPoint[],
    granularity: DataGranularity
): DataPoint[] {
    switch (granularity) {
        case 'daily':
            return data;
        case 'weekly':
            return aggregateToWeekly(data);
        case 'monthly':
            return aggregateToMonthly(data);
        case 'quarterly':
            return aggregateToQuarterly(data);
        default:
            return data;
    }
}

/**
 * 调整数据粒度
 * @param data 原始数据
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 粒度调整结果
 */
export function adjustDataGranularity(
    data: DataPoint[],
    startDate: string,
    endDate: string
): GranularityAdjustmentResult {
    // 确定时间范围类型
    const timeRangeType = determineTimeRangeType(startDate, endDate);

    // 获取粒度配置
    const config = getGranularityConfig(timeRangeType);

    // 如果数据点数量已经小于配置的最大值，不需要聚合
    if (data.length <= config.maxDataPoints) {
        return {
            originalData: data,
            adjustedData: data,
            granularity: config.granularity,
            timeRangeType,
            reductionRatio: 0,
            config,
        };
    }

    // 聚合数据
    const adjustedData = aggregateData(data, config.granularity);

    // 计算数据减少比例
    const reductionRatio = 1 - (adjustedData.length / data.length);

    return {
        originalData: data,
        adjustedData,
        granularity: config.granularity,
        timeRangeType,
        reductionRatio,
        config,
    };
}

/**
 * 生成粒度调整报告
 */
export function generateGranularityReport(
    result: GranularityAdjustmentResult,
    locale: string = 'en'
): string {
    let report = '';

    if (locale === 'zh') {
        report += '=== 自适应数据粒度报告 ===\n\n';
        report += `时间范围类型：${result.timeRangeType === 'short' ? '短期' : result.timeRangeType === 'medium' ? '中期' : '长期'}\n`;
        report += `数据粒度：${result.granularity === 'daily' ? '日' : result.granularity === 'weekly' ? '周' : result.granularity === 'monthly' ? '月' : '季度'}\n`;
        report += `原始数据点：${result.originalData.length}\n`;
        report += `调整后数据点：${result.adjustedData.length}\n`;
        report += `数据减少比例：${(result.reductionRatio * 100).toFixed(2)}%\n`;
        report += `粒度描述：${result.config.description}\n\n`;

        if (result.reductionRatio > 0) {
            report += `## 数据聚合说明\n`;
            report += `为了优化性能和可视化效果，数据已从${result.originalData.length}个点聚合到${result.adjustedData.length}个点。\n`;
            report += `聚合方法：${result.config.aggregationMethod === 'average' ? '平均值' : result.config.aggregationMethod === 'sum' ? '求和' : '无'}\n`;
            report += `这有助于减少数据量，提高图表可读性，同时保留主要趋势。\n`;
        } else {
            report += `## 数据粒度说明\n`;
            report += `当前数据粒度已满足要求，无需聚合。\n`;
            report += `使用原始数据以保持最高精度。\n`;
        }
    } else {
        report += '=== Adaptive Data Granularity Report ===\n\n';
        report += `Time Range Type: ${result.timeRangeType}\n`;
        report += `Data Granularity: ${result.granularity}\n`;
        report += `Original Data Points: ${result.originalData.length}\n`;
        report += `Adjusted Data Points: ${result.adjustedData.length}\n`;
        report += `Data Reduction Ratio: ${(result.reductionRatio * 100).toFixed(2)}%\n`;
        report += `Granularity Description: ${result.config.description}\n\n`;

        if (result.reductionRatio > 0) {
            report += `## Data Aggregation Note\n`;
            report += `To optimize performance and visualization, data has been aggregated from ${result.originalData.length} points to ${result.adjustedData.length} points.\n`;
            report += `Aggregation Method: ${result.config.aggregationMethod}\n`;
            report += `This helps reduce data volume and improve chart readability while preserving major trends.\n`;
        } else {
            report += `## Data Granularity Note\n`;
            report += `Current data granularity meets requirements, no aggregation needed.\n`;
            report += `Using original data for maximum precision.\n`;
        }
    }

    return report;
}

/**
 * 执行完整的自适应数据粒度调整
 */
export function adjustGranularityForAnalysis(
    data: DataPoint[],
    startDate: string,
    endDate: string,
    locale: string = 'en'
): GranularityAdjustmentResult {
    const result = adjustDataGranularity(data, startDate, endDate);
    return result;
}
