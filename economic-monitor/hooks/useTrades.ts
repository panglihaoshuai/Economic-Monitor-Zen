// ============================================================================
// 📁 hooks/useTrades.ts
// ============================================================================
// 交易数据 Hook - 管理交易相关状态和操作
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持实时更新（WebSocket）
//    - 支持乐观更新
//    - 支持分页加载

import { useState, useCallback, useEffect } from 'react';
import type { Trade, PaginationParams, SortParams } from '@/shared/types';
import { createTradingService } from '@/core/services/TradingService';
import { getTradeRepository } from '@/core/repositories/ITrade.repository';

// ============================================================================
// 类型定义
// ============================================================================

export interface UseTradesOptions {
  autoFetch?: boolean;
  initialPagination?: PaginationParams;
}

export interface UseTradesReturn {
  // 状态
  trades: Trade[];
  loading: boolean;
  error: string | null;
  total: number;
  
  // 操作
  fetchTrades: (params?: {
    status?: Trade['status'][];
    direction?: Trade['direction'][];
    assetClass?: Trade['assetClass'][];
  }, pagination?: PaginationParams, sort?: SortParams) => Promise<void>;
  createTrade: (trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Trade | null>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<Trade | null>;
  deleteTrade: (id: string) => Promise<boolean>;
  closeTrade: (id: string, exitPrice: number) => Promise<Trade | null>;
  
  // 重置
  clearError: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useTrades(options: UseTradesOptions = {}): UseTradesReturn {
  const { autoFetch = true, initialPagination } = options;

  // 状态
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // 服务实例
  const service = createTradingService(getTradeRepository('mock'));

  // 获取交易列表
  const fetchTrades = useCallback(async (
    params?: {
      status?: Trade['status'][];
      direction?: Trade['direction'][];
      assetClass?: Trade['assetClass'][];
    },
    pagination?: PaginationParams,
    sort?: SortParams
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.getTrades(params, pagination, sort);
      
      if (response.success) {
        setTrades(response.data || []);
        setTotal(response.meta?.total || 0);
      } else {
        setError(response.error?.message || 'Failed to fetch trades');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建交易
  const createTrade = useCallback(async (
    trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Trade | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.createTrade({
        ...trade,
        entryTime: trade.entryTime ? new Date(trade.entryTime) : undefined,
      });

      if (response.success && response.data) {
        setTrades(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to create trade');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新交易
  const updateTrade = useCallback(async (
    id: string,
    data: Partial<Trade>
  ): Promise<Trade | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.updateTrade(id, data);

      if (response.success && response.data) {
        setTrades(prev => prev.map(t => t.id === id ? response.data! : t));
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to update trade');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除交易
  const deleteTrade = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.deleteTrade(id);

      if (response.success) {
        setTrades(prev => prev.filter(t => t.id !== id));
        return true;
      } else {
        setError(response.error?.message || 'Failed to delete trade');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 平仓交易
  const closeTrade = useCallback(async (
    id: string,
    exitPrice: number
  ): Promise<Trade | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.closeTrade(id, exitPrice);

      if (response.success && response.data) {
        setTrades(prev => prev.map(t => t.id === id ? response.data! : t));
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to close trade');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始加载
  useEffect(() => {
    if (autoFetch) {
      fetchTrades(undefined, initialPagination);
    }
  }, [autoFetch, fetchTrades, initialPagination]);

  return {
    trades,
    loading,
    error,
    total,
    fetchTrades,
    createTrade,
    updateTrade,
    deleteTrade,
    closeTrade,
    clearError,
  };
}

// ============================================================================
// 统计 Hook
// ============================================================================

export interface UseTradeStatsReturn {
  overallStats: {
    totalPnl: number;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
    openPositions: number;
  } | null;
  pnlCurve: { date: string; cumulativePnl: number }[];
  tradeTypeDistribution: Record<string, number>;
  directionDistribution: Record<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTradeStats(): UseTradeStatsReturn {
  const [overallStats, setOverallStats] = useState<UseTradeStatsReturn['overallStats']>(null);
  const [pnlCurve, setPnlCurve] = useState<{ date: string; cumulativePnl: number }[]>([]);
  const [tradeTypeDistribution, setTradeTypeDistribution] = useState<Record<string, number>>({});
  const [directionDistribution, setDirectionDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = createTradingService(getTradeRepository('mock'));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsResponse, pnlResponse, typeResponse, directionResponse] = await Promise.all([
        service.getOverallStats(),
        service.getPnlCurve(),
        service.getTradeTypeDistribution(),
        service.getDirectionDistribution(),
      ]);

      if (statsResponse.success) setOverallStats(statsResponse.data || null);
      if (pnlResponse.success) setPnlCurve(pnlResponse.data || []);
      if (typeResponse.success) setTradeTypeDistribution(typeResponse.data || {});
      if (directionResponse.success) setDirectionDistribution(directionResponse.data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    overallStats,
    pnlCurve,
    tradeTypeDistribution,
    directionDistribution,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// 组合 Hook
// ============================================================================

export function useTrading() {
  const trades = useTrades();
  const stats = useTradeStats();

  return {
    ...trades,
    ...stats,
  };
}
