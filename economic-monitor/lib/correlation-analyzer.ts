/**
 * 跨资产相关性分析模块
 * 
 * 独立模块，用于计算多个经济指标之间的皮尔逊相关系数
 * 支持时间序列数据的对齐和缺失值处理
 */

import { DataPoint } from './statistics-calculator';

// 导出DataPoint类型
export type { DataPoint };

/**
 * 相关性结果
 */
export interface CorrelationResult {
    series1: string;
    series2: string;
    correlation: number; // 皮尔逊相关系数 (-1 到 1)
    significance: 'none' | 'weak' | 'moderate' | 'strong';
    pValue?: number; // 统计显著性
    sampleSize: number; // 样本大小
}

/**
 * 相关性矩阵
 */
export interface CorrelationMatrix {
    seriesIds: string[];
    matrix: number[][]; // 相关系数矩阵
    results: CorrelationResult[]; // 详细结果
    summary: {
        strongestPositive: CorrelationResult | null;
        strongestNegative: CorrelationResult | null;
        averageCorrelation: number;
    };
}

/**
 * 对齐后的时间序列数据
 */
export interface AlignedData {
    seriesId: string;
    data: DataPoint[];
}

/**
 * 相关性强度阈值
 */
const CORRELATION_THRESHOLDS = {
    strong: 0.7,
    moderate: 0.4,
    weak: 0.2,
};

/**
 * 对齐多个时间序列数据
 * 找到所有序列共有的日期，并按日期对齐数据
 */
export function alignTimeSeries(
    seriesData: Map<string, DataPoint[]>
): AlignedData[] {
    // 获取所有序列的日期集合
    const allDates = new Set<string>();
    seriesData.forEach((data) => {
        data.forEach(point => allDates.add(point.date));
    });

    // 将日期排序
    const sortedDates = Array.from(allDates).sort();

    // 为每个序列创建对齐后的数据
    const alignedData: AlignedData[] = [];
    seriesData.forEach((data, seriesId) => {
        // 创建日期到值的映射
        const dateToValue = new Map<string, number>();
        data.forEach(point => {
            dateToValue.set(point.date, point.value);
        });

        // 为每个日期创建数据点
        const alignedPoints: DataPoint[] = [];
        sortedDates.forEach(date => {
            const value = dateToValue.get(date);
            if (value !== undefined) {
                alignedPoints.push({ date, value });
            }
        });

        alignedData.push({
            seriesId,
            data: alignedPoints,
        });
    });

    return alignedData;
}

/**
 * 计算皮尔逊相关系数
 * @param series1 第一个时间序列
 * @param series2 第二个时间序列
 * @returns 皮尔逊相关系数 (-1 到 1)
 */
export function calculatePearsonCorrelation(
    series1: DataPoint[],
    series2: DataPoint[]
): number {
    // 确保两个序列长度相同
    const minLength = Math.min(series1.length, series2.length);
    const s1 = series1.slice(0, minLength);
    const s2 = series2.slice(0, minLength);

    if (minLength < 2) {
        return 0;
    }

    // 计算均值
    const mean1 = s1.reduce((sum, p) => sum + p.value, 0) / minLength;
    const mean2 = s2.reduce((sum, p) => sum + p.value, 0) / minLength;

    // 计算协方差
    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < minLength; i++) {
        const diff1 = s1[i].value - mean1;
        const diff2 = s2[i].value - mean2;

        covariance += diff1 * diff2;
        variance1 += diff1 * diff1;
        variance2 += diff2 * diff2;
    }

    // 计算标准差
    const stdDev1 = Math.sqrt(variance1 / minLength);
    const stdDev2 = Math.sqrt(variance2 / minLength);

    // 计算相关系数
    if (stdDev1 === 0 || stdDev2 === 0) {
        return 0;
    }

    return covariance / (minLength * stdDev1 * stdDev2);
}

/**
 * 计算相关性的统计显著性（P值）
 * 使用t检验
 * @param correlation 相关系数
 * @param sampleSize 样本大小
 * @returns P值
 */
export function calculatePValue(correlation: number, sampleSize: number): number {
    if (sampleSize < 3) {
        return 1;
    }

    // 计算t统计量
    const t = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));

    // 使用近似方法计算P值（双尾检验）
    // 这里使用简化的近似方法
    const degreesOfFreedom = sampleSize - 2;

    // 使用t分布的近似
    // 对于大样本，可以使用正态近似
    if (degreesOfFreedom > 30) {
        // 正态近似
        const z = t;
        const pValue = 2 * (1 - normalCDF(z));
        return Math.min(pValue, 1);
    } else {
        // 对于小样本，使用简化的t分布近似
        // 这是一个简化版本，实际应用中可能需要更精确的t分布计算
        const pValue = 2 * (1 - studentTCDF(t, degreesOfFreedom));
        return Math.min(pValue, 1);
    }
}

/**
 * 正态分布累积分布函数（近似）
 */
function normalCDF(z: number): number {
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const a6 = 0.3133997;
    const a7 = 0.483607;
    const a8 = 0.262372;
    const a9 = 0.072115;
    const a10 = 0.022650;
    const a11 = 0.002865;
    const a12 = 0.000567;

    const t = 1 / (1 + 0.2316419 * z);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;
    const t6 = t5 * t;
    const t7 = t6 * t;
    const t8 = t7 * t;
    const t9 = t8 * t;
    const t10 = t9 * t;
    const t11 = t10 * t;
    const t12 = t11 * t;

    const phi = 1 - 0.5 * Math.pow(1 - a1 * t - a2 * t2 - a3 * t3 - a4 * t4 - a5 * t5 -
        a6 * t6 - a7 * t7 - a8 * t8 - a9 * t9 - a10 * t10 - a11 * t11 - a12 * t12, 16);

    return 0.5 * (1 + sign * phi);
}

/**
 * 学生t分布累积分布函数（近似）
 */
function studentTCDF(t: number, df: number): number {
    // 这是一个简化的近似方法
    // 实际应用中可能需要更精确的计算
    if (df <= 0) {
        return 0.5;
    }

    // 对于大自由度，使用正态近似
    if (df > 100) {
        return normalCDF(t);
    }

    // 使用简化的t分布近似
    const x = df / (df + t * t);
    const beta = df / 2;

    // 这是一个非常简化的近似
    // 实际应用中应该使用更精确的数值方法
    const cdf = 1 - 0.5 * Math.pow(x, beta);

    return Math.min(Math.max(cdf, 0), 1);
}

/**
 * 判断相关性强度
 */
export function determineCorrelationStrength(correlation: number): 'none' | 'weak' | 'moderate' | 'strong' {
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation < CORRELATION_THRESHOLDS.weak) {
        return 'none';
    } else if (absCorrelation < CORRELATION_THRESHOLDS.moderate) {
        return 'weak';
    } else if (absCorrelation < CORRELATION_THRESHOLDS.strong) {
        return 'moderate';
    } else {
        return 'strong';
    }
}

/**
 * 计算两个序列之间的相关性
 */
export function calculateCorrelation(
    series1Id: string,
    series1Data: DataPoint[],
    series2Id: string,
    series2Data: DataPoint[]
): CorrelationResult {
    const correlation = calculatePearsonCorrelation(series1Data, series2Data);
    const significance = determineCorrelationStrength(correlation);
    const sampleSize = Math.min(series1Data.length, series2Data.length);
    const pValue = calculatePValue(correlation, sampleSize);

    return {
        series1: series1Id,
        series2: series2Id,
        correlation,
        significance,
        pValue,
        sampleSize,
    };
}

/**
 * 计算多个序列之间的相关性矩阵
 */
export function calculateCorrelationMatrix(
    alignedData: AlignedData[]
): CorrelationMatrix {
    const seriesIds = alignedData.map(d => d.seriesId);
    const n = seriesIds.length;

    // 初始化相关性矩阵
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const results: CorrelationResult[] = [];

    // 计算所有配对的相关性
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const result = calculateCorrelation(
                seriesIds[i],
                alignedData[i].data,
                seriesIds[j],
                alignedData[j].data
            );

            // 填充矩阵（对称矩阵）
            matrix[i][j] = result.correlation;
            matrix[j][i] = result.correlation;

            results.push(result);
        }
    }

    // 计算总结信息
    const allCorrelations = results.map(r => r.correlation);
    const averageCorrelation = allCorrelations.reduce((sum, c) => sum + Math.abs(c), 0) / allCorrelations.length;

    const strongestPositive = results
        .filter(r => r.correlation > 0)
        .sort((a, b) => b.correlation - a.correlation)[0] || null;

    const strongestNegative = results
        .filter(r => r.correlation < 0)
        .sort((a, b) => a.correlation - b.correlation)[0] || null;

    return {
        seriesIds,
        matrix,
        results,
        summary: {
            strongestPositive,
            strongestNegative,
            averageCorrelation,
        },
    };
}

/**
 * 生成相关性分析报告
 */
export function generateCorrelationReport(
    matrix: CorrelationMatrix,
    locale: string = 'en'
): string {
    let report = '';

    if (locale === 'zh') {
        report += '=== 跨资产相关性分析报告 ===\n\n';
        report += `分析指标：${matrix.seriesIds.join(', ')}\n`;
        report += `样本数量：${matrix.results[0]?.sampleSize || 0}\n`;
        report += `平均相关系数：${matrix.summary.averageCorrelation.toFixed(4)}\n\n`;

        if (matrix.summary.strongestPositive) {
            report += `## 最强正相关\n`;
            report += `${matrix.summary.strongestPositive.series1} 与 ${matrix.summary.strongestPositive.series2}\n`;
            report += `相关系数：${matrix.summary.strongestPositive.correlation.toFixed(4)}\n`;
            report += `强度：${matrix.summary.strongestPositive.significance}\n`;
            if (matrix.summary.strongestPositive.pValue !== undefined) {
                report += `P值：${matrix.summary.strongestPositive.pValue.toFixed(4)}\n`;
            }
            report += '\n';
        }

        if (matrix.summary.strongestNegative) {
            report += `## 最强负相关\n`;
            report += `${matrix.summary.strongestNegative.series1} 与 ${matrix.summary.strongestNegative.series2}\n`;
            report += `相关系数：${matrix.summary.strongestNegative.correlation.toFixed(4)}\n`;
            report += `强度：${matrix.summary.strongestNegative.significance}\n`;
            if (matrix.summary.strongestNegative.pValue !== undefined) {
                report += `P值：${matrix.summary.strongestNegative.pValue.toFixed(4)}\n`;
            }
            report += '\n';
        }

        report += `## 相关性矩阵\n`;
        report += `| | ${matrix.seriesIds.join(' | ')} |\n`;
        report += `|---|${matrix.seriesIds.map(() => '---').join('|')}|\n`;
        matrix.seriesIds.forEach((id, i) => {
            const row = matrix.matrix[i];
            report += `| ${id} | ${matrix.seriesIds.map((_, j) => row[j].toFixed(4)).join(' | ')} |\n`;
        });
    } else {
        report += '=== Cross-Asset Correlation Analysis Report ===\n\n';
        report += `Analyzed Indicators: ${matrix.seriesIds.join(', ')}\n`;
        report += `Sample Size: ${matrix.results[0]?.sampleSize || 0}\n`;
        report += `Average Correlation: ${matrix.summary.averageCorrelation.toFixed(4)}\n\n`;

        if (matrix.summary.strongestPositive) {
            report += `## Strongest Positive Correlation\n`;
            report += `${matrix.summary.strongestPositive.series1} and ${matrix.summary.strongestPositive.series2}\n`;
            report += `Correlation: ${matrix.summary.strongestPositive.correlation.toFixed(4)}\n`;
            report += `Strength: ${matrix.summary.strongestPositive.significance}\n`;
            if (matrix.summary.strongestPositive.pValue !== undefined) {
                report += `P-value: ${matrix.summary.strongestPositive.pValue.toFixed(4)}\n`;
            }
            report += '\n';
        }

        if (matrix.summary.strongestNegative) {
            report += `## Strongest Negative Correlation\n`;
            report += `${matrix.summary.strongestNegative.series1} and ${matrix.summary.strongestNegative.series2}\n`;
            report += `Correlation: ${matrix.summary.strongestNegative.correlation.toFixed(4)}\n`;
            report += `Strength: ${matrix.summary.strongestNegative.significance}\n`;
            if (matrix.summary.strongestNegative.pValue !== undefined) {
                report += `P-value: ${matrix.summary.strongestNegative.pValue.toFixed(4)}\n`;
            }
            report += '\n';
        }

        report += `## Correlation Matrix\n`;
        report += `| | ${matrix.seriesIds.join(' | ')} |\n`;
        report += `|---|${matrix.seriesIds.map(() => '---').join('|')}|\n`;
        matrix.seriesIds.forEach((id, i) => {
            const row = matrix.matrix[i];
            report += `| ${id} | ${matrix.seriesIds.map((_, j) => row[j].toFixed(4)).join(' | ')} |\n`;
        });
    }

    return report;
}

/**
 * 执行完整的跨资产相关性分析
 */
export function analyzeCrossAssetCorrelation(
    seriesData: Map<string, DataPoint[]>
): CorrelationMatrix {
    // 对齐时间序列
    const alignedData = alignTimeSeries(seriesData);

    // 计算相关性矩阵
    return calculateCorrelationMatrix(alignedData);
}
