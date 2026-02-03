/**
 * 共享数据获取 Hook
 * 
 * 用于在多个组件之间共享 SWR 缓存，消除重复请求
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSharedEconomicData() {
    const { data, error, isLoading, mutate } = useSWR<{
        indicators: any[];
        anomalies: any[];
        summary: {
            totalIndicators: number;
            anomalyCount: number;
            criticalCount: number;
            warningCount: number;
        };
    }>(
        '/api/economic-data',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // 1分钟内不重复请求
            refreshInterval: 60000, // 每60秒自动刷新
        }
    );

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
