/**
 * 测试核心统计计算模块
 * 测试 statistics-calculator.ts 中的所有函数
 */

import { describe, it, expect } from 'vitest';
import {
    calculateStatistics,
    calculateZScore,
    calculateTrend,
    calculateVolatility,
    calculateDataPointZScores,
    detectHistoricalAnomalies,
    calculateMovingAverage,
    calculateChangeRate,
    type DataPoint
} from '@/lib/statistics-calculator';

describe('Statistics Calculator', () => {
    describe('calculateStatistics', () => {
        it('应该正确计算基本统计量', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 20 },
                { date: '2024-01-03', value: 30 },
                { date: '2024-01-04', value: 40 },
                { date: '2024-01-05', value: 50 },
            ];

            const result = calculateStatistics(data);

            expect(result.mean).toBe(30);
            expect(result.min).toBe(10);
            expect(result.max).toBe(50);
            expect(result.dataPoints).toBe(5);
            expect(result.startDate).toBe('2024-01-01');
            expect(result.endDate).toBe('2024-01-05');
        });

        it('应该正确计算标准差', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 2 },
                { date: '2024-01-02', value: 4 },
                { date: '2024-01-03', value: 4 },
                { date: '2024-01-04', value: 4 },
                { date: '2024-01-05', value: 5 },
                { date: '2024-01-06', value: 5 },
                { date: '2024-01-07', value: 7 },
                { date: '2024-01-08', value: 9 },
            ];

            const result = calculateStatistics(data);
            expect(result.stdDev).toBeCloseTo(2.138, 2);
        });

        it('应该正确计算中位数', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 1 },
                { date: '2024-01-02', value: 2 },
                { date: '2024-01-03', value: 3 },
                { date: '2024-01-04', value: 4 },
                { date: '2024-01-05', value: 5 },
            ];

            const result = calculateStatistics(data);
            expect(result.median).toBe(3);
        });

        it('应该处理空数据', () => {
            expect(() => calculateStatistics([])).toThrow('No data provided');
        });
    });

    describe('calculateZScore', () => {
        it('应该正确计算Z分数', () => {
            const currentValue = 15;
            const historicalValues = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

            const result = calculateZScore(currentValue, historicalValues);

            expect(result.zScore).toBeCloseTo(0, 1);
            expect(result.severity).toBe('normal');
        });

        it('应该检测到异常值', () => {
            const currentValue = 100;
            const historicalValues = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

            const result = calculateZScore(currentValue, historicalValues);

            expect(Math.abs(result.zScore)).toBeGreaterThan(3);
            expect(result.severity).toBe('critical');
        });

        it('应该正确计算百分位', () => {
            const currentValue = 15;
            const historicalValues = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

            const result = calculateZScore(currentValue, historicalValues);

            expect(result.percentile).toBeGreaterThan(40);
            expect(result.percentile).toBeLessThan(60);
        });

        it('应该处理空历史数据', () => {
            const result = calculateZScore(10, []);

            expect(result.zScore).toBe(0);
            expect(result.severity).toBe('normal');
        });
    });

    describe('calculateTrend', () => {
        it('应该检测上升趋势', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 20 },
                { date: '2024-01-03', value: 30 },
                { date: '2024-01-04', value: 40 },
                { date: '2024-01-05', value: 50 },
            ];

            const result = calculateTrend(data);

            expect(result.direction).toBe('up');
            expect(result.strength).toBeGreaterThan(0.9);
        });

        it('应该检测下降趋势', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 50 },
                { date: '2024-01-02', value: 40 },
                { date: '2024-01-03', value: 30 },
                { date: '2024-01-04', value: 20 },
                { date: '2024-01-05', value: 10 },
            ];

            const result = calculateTrend(data);

            expect(result.direction).toBe('down');
            expect(result.strength).toBeGreaterThan(0.9);
        });

        it('应该检测稳定趋势', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 30 },
                { date: '2024-01-02', value: 31 },
                { date: '2024-01-03', value: 29 },
                { date: '2024-01-04', value: 30 },
                { date: '2024-01-05', value: 30 },
            ];

            const result = calculateTrend(data);

            expect(result.direction).toBe('stable');
        });

        it('应该处理数据不足的情况', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
            ];

            const result = calculateTrend(data);

            expect(result.direction).toBe('stable');
            expect(result.strength).toBe(0);
        });
    });

    describe('calculateVolatility', () => {
        it('应该正确计算波动率', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 20 },
                { date: '2024-01-03', value: 30 },
                { date: '2024-01-04', value: 40 },
                { date: '2024-01-05', value: 50 },
            ];

            const result = calculateVolatility(data);

            expect(result.level).toBe('high');
            expect(result.coefficientOfVariation).toBeGreaterThan(0);
        });

        it('应该检测低波动率', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 100 },
                { date: '2024-01-02', value: 101 },
                { date: '2024-01-03', value: 100 },
                { date: '2024-01-04', value: 101 },
                { date: '2024-01-05', value: 100 },
            ];

            const result = calculateVolatility(data);

            expect(result.level).toBe('low');
        });

        it('应该计算滚动波动率', () => {
            const data: DataPoint[] = Array.from({ length: 30 }, (_, i) => ({
                date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
                value: 100 + Math.random() * 10,
            }));

            const result = calculateVolatility(data, 10);

            expect(result.rollingVolatility.length).toBeGreaterThan(0);
            expect(result.rollingVolatility.length).toBe(data.length - 10);
        });
    });

    describe('calculateDataPointZScores', () => {
        it('应该为所有数据点计算Z分数', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 20 },
                { date: '2024-01-03', value: 30 },
                { date: '2024-01-04', value: 40 },
                { date: '2024-01-05', value: 50 },
            ];

            const statistics = calculateStatistics(data);
            const result = calculateDataPointZScores(data, statistics);

            expect(result).toHaveLength(5);
            expect(result[0]).toHaveProperty('zScore');
            expect(result[0]).toHaveProperty('severity');
        });

        it('应该正确标记异常点', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 11 },
                { date: '2024-01-03', value: 12 },
                { date: '2024-01-04', value: 100 }, // 异常值
                { date: '2024-01-05', value: 13 },
            ];

            const statistics = calculateStatistics(data);
            const result = calculateDataPointZScores(data, statistics);

            const anomalyPoint = result.find(d => d.date === '2024-01-04');
            expect(anomalyPoint?.severity).toBe('critical');
        });
    });

    describe('detectHistoricalAnomalies', () => {
        it('应该检测历史异常点', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 11 },
                { date: '2024-01-03', value: 12 },
                { date: '2024-01-04', value: 100 }, // 异常值
                { date: '2024-01-05', value: 13 },
            ];

            const statistics = calculateStatistics(data);
            const anomalies = detectHistoricalAnomalies(data, statistics);

            expect(anomalies.length).toBeGreaterThan(0);
            expect(anomalies[0].date).toBe('2024-01-04');
        });

        it('应该在没有异常时返回空数组', () => {
            const data: DataPoint[] = [
                { date: '2024-01-01', value: 10 },
                { date: '2024-01-02', value: 11 },
                { date: '2024-01-03', value: 12 },
                { date: '2024-01-04', value: 13 },
                { date: '2024-01-05', value: 14 },
            ];

            const statistics = calculateStatistics(data);
            const anomalies = detectHistoricalAnomalies(data, statistics);

            expect(anomalies.length).toBe(0);
        });
    });

    describe('calculateMovingAverage', () => {
        it('应该正确计算移动平均', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const result = calculateMovingAverage(values, 3);

            expect(result).toHaveLength(8);
            expect(result[0]).toBe(2); // (1+2+3)/3
            expect(result[1]).toBe(3); // (2+3+4)/3
            expect(result[2]).toBe(4); // (3+4+5)/3
        });

        it('应该处理窗口大小大于数据长度的情况', () => {
            const values = [1, 2, 3];
            const result = calculateMovingAverage(values, 5);

            expect(result).toHaveLength(0);
        });
    });

    describe('calculateChangeRate', () => {
        it('应该正确计算变化率', () => {
            const values = [100, 110, 120, 130, 140];
            const result = calculateChangeRate(values, 1);

            expect(result).toHaveLength(4);
            expect(result[0]).toBeCloseTo(10, 1); // (110-100)/100*100
            expect(result[1]).toBeCloseTo(9.09, 1); // (120-110)/110*100
        });

        it('应该处理负变化', () => {
            const values = [100, 90, 80, 70, 60];
            const result = calculateChangeRate(values, 1);

            expect(result[0]).toBeCloseTo(-10, 1);
            expect(result[1]).toBeCloseTo(-11.11, 1);
        });
    });
});
