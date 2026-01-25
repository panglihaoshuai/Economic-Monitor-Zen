// ============================================================================
// 📁 hooks/useMacro.ts
// ============================================================================
// 宏观经济数据 Hook - 管理宏观指标状态和操作
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持实时更新
//    - 支持历史数据查询
//    - 支持自定义指标

import { useState, useCallback, useEffect } from 'react';
import type { MacroIndicator, MacroSignal, EconomicCycle } from '@/shared/types';
import { createMacroService } from '@/core/services/MacroService';
import { getMarketRepository } from '@/core/repositories/IMarket.repository';

// ============================================================================
// 类型定义
// ============================================================================

export interface UseMacroOptions {
  autoFetch?: boolean;
  categories?: string[];
}

export interface UseMacroReturn {
  // 状态
  indicators: MacroIndicator[];
  signals: MacroSignal[];
  cycle: EconomicCycle | null;
  loading: boolean;
  error: string | null;
  
  // 操作
  refresh: () => Promise<void>;
  getIndicator: (id: string) => Promise<MacroIndicator | null>;
  getIndicatorSignal: (id: string) => Promise<MacroSignal | null>;
  clearError: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useMacro(options: UseMacroOptions = {}): UseMacroReturn {
  const { autoFetch = true, categories } = options;

  // 状态
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [signals, setSignals] = useState<MacroSignal[]>([]);
  const [cycle, setCycle] = useState<EconomicCycle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 服务实例
  const service = createMacroService(getMarketRepository('mock'));

  // 刷新数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [indicatorsResponse, signalsResponse, cycleResponse] = await Promise.all([
        service.getAllIndicators(categories ? { category: categories.join(',') as any } : undefined),
        service.getActiveSignals(),
        service.getCurrentCycle(),
      ]);

      if (indicatorsResponse.success) {
        setIndicators(indicatorsResponse.data || []);
      } else {
        setError(indicatorsResponse.error?.message || 'Failed to fetch indicators');
      }

      if (signalsResponse.success) {
        setSignals(signalsResponse.data || []);
      }

      if (cycleResponse.success) {
        setCycle(cycleResponse.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [service, categories]);

  // 获取单个指标
  const getIndicator = useCallback(async (id: string): Promise<MacroIndicator | null> => {
    try {
      const response = await service.getIndicator(id);
      return response.data || null;
    } catch {
      return null;
    }
  }, [service]);

  // 获取单个指标的信号
  const getIndicatorSignal = useCallback(async (id: string): Promise<MacroSignal | null> => {
    try {
      const response = await service.getIndicatorSignal(id);
      return response.data || null;
    } catch {
      return null;
    }
  }, [service]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始加载
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  return {
    indicators,
    signals,
    cycle,
    loading,
    error,
    refresh,
    getIndicator,
    getIndicatorSignal,
    clearError,
  };
}

// ============================================================================
// 仪表盘 Hook
// ============================================================================

export interface UseMacroDashboardReturn {
  data: {
    indicators: MacroIndicator[];
    signals: MacroSignal[];
    cycle: EconomicCycle;
    summary: {
      totalIndicators: number;
      warningCount: number;
      criticalCount: number;
      bullishSignals: number;
      bearishSignals: number;
    };
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMacroDashboard(): UseMacroDashboardReturn {
  const [data, setData] = useState<UseMacroDashboardReturn['data']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = createMacroService(getMarketRepository('mock'));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.getDashboardData();

      if (response.success) {
        setData(response.data || null);
      } else {
        setError(response.error?.message || 'Failed to fetch dashboard data');
      }
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
    data,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// 分类 Hook
// ============================================================================

export interface UseMacroByCategoryReturn {
  groupedIndicators: Record<string, MacroIndicator[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMacroByCategory(): UseMacroByCategoryReturn {
  const [groupedIndicators, setGroupedIndicators] = useState<Record<string, MacroIndicator[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = createMacroService(getMarketRepository('mock'));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.getIndicatorsByCategory();

      if (response.success) {
        setGroupedIndicators(response.data || {});
      } else {
        setError(response.error?.message || 'Failed to fetch grouped indicators');
      }
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
    groupedIndicators,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// 异常 Hook
// ============================================================================

export interface UseMacroAnomaliesReturn {
  anomalies: MacroIndicator[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMacroAnomalies(): UseMacroAnomaliesReturn {
  const [anomalies, setAnomalies] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = createMacroService(getMarketRepository('mock'));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await service.getAnomalies();

      if (response.success) {
        setAnomalies(response.data || []);
      } else {
        setError(response.error?.message || 'Failed to fetch anomalies');
      }
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
    anomalies,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// 组合 Hook
// ============================================================================

export function useMacroData() {
  const macro = useMacro();
  const dashboard = useMacroDashboard();
  const byCategory = useMacroByCategory();
  const anomalies = useMacroAnomalies();

  return {
    ...macro,
    dashboard,
    byCategory,
    anomalies,
  };
}
