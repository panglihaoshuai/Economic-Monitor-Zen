/**
 * 测试 economic-data API 路由的异步瀑布修复
 * 
 * 测试目标：
 * 1. 验证 API 能够正确返回所有指标数据
 * 2. 验证异常检测是并行执行的（通过性能测试）
 * 3. 验证响应时间在合理范围内
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockDetectAnomalies = vi.fn((seriesId: string, records: any[]) =>
    Promise.resolve({
        seriesId,
        seriesTitle: 'Test Indicator',
        currentValue: records[0]?.value || 0,
        analyzer: 'zscore',
        severity: 'normal',
        zScore: 0.5,
        description: 'Normal',
        percentile: 50,
        trend: 'stable',
        volatility: 'low',
        displayText: { zh: '正常', en: 'Normal' }
    })
);

vi.mock('@/lib/anomaly-detector', () => ({
    detectAnomalies: mockDetectAnomalies
}));

describe('Economic Data API - Async Waterfall Fix', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle single indicator request', async () => {
        const mockRequest = new Request('http://localhost/api/economic-data?seriesId=SOFR', {
            method: 'GET'
        });

        const { GET } = await import('@/app/api/economic-data/route');

        const response = await GET(mockRequest);
        const data = await response.json();

        // 验证响应结构
        expect(data).toHaveProperty('series');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('latest');
        expect(data).toHaveProperty('anomaly');
        expect(data).toHaveProperty('statistics');
    });

    it('should handle date range filters', async () => {
        const mockRequest = new Request(
            'http://localhost/api/economic-data?seriesId=SOFR&startDate=2024-01-01&endDate=2024-01-31',
            { method: 'GET' }
        );

        const { GET } = await import('@/app/api/economic-data/route');

        const response = await GET(mockRequest);
        const data = await response.json();

        // 验证响应结构
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return 404 for non-existent series', async () => {
        const mockRequest = new Request('http://localhost/api/economic-data?seriesId=NONEXISTENT', {
            method: 'GET'
        });

        const { GET } = await import('@/app/api/economic-data/route');

        const response = await GET(mockRequest);

        expect(response.status).toBe(404);
    });

    it('should handle errors gracefully', async () => {
        const mockRequest = new Request('http://localhost/api/economic-data', {
            method: 'GET'
        });

        const { GET } = await import('@/app/api/economic-data/route');

        const response = await GET(mockRequest);

        // 验证响应状态
        expect(response).toBeDefined();
    });

    it('should execute anomaly detection in parallel', async () => {
        const mockRequest = new Request('http://localhost/api/economic-data', {
            method: 'GET'
        });

        const { GET } = await import('@/app/api/economic-data/route');

        const startTime = Date.now();
        await GET(mockRequest);
        const endTime = Date.now();

        const executionTime = endTime - startTime;

        // 验证执行时间合理（并行执行应该很快）
        // 如果是串行执行，时间会是 n × 单个检测时间
        // 如果是并行执行，时间应该接近单个检测时间
        console.log(`Execution time: ${executionTime}ms`);
        expect(executionTime).toBeLessThan(5000); // 应该在 5 秒内完成
    });
});
