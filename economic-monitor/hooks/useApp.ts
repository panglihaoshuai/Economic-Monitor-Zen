// ============================================================================
// 📁 hooks/useApp.ts
// ============================================================================
// 应用状态 Hook - 管理全局应用状态
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持主题切换
//    - 支持用户认证状态
//    - 支持通知状态
//    - 支持设置持久化

import { useState, useCallback, useEffect } from 'react';
import type { UserConfig, FeatureFlags } from '@/shared/types';
import { getFeatureFlags } from '@/shared/types';

// ============================================================================
// 类型定义
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';

export interface UseAppReturn {
  // 状态
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
  featureFlags: FeatureFlags;
  userConfig: UserConfig | null;
  isInitialized: boolean;
  
  // 操作
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  updateUserConfig: (config: Partial<UserConfig>) => void;
  clearUserConfig: () => void;
}

// ============================================================================
// 常量
// ============================================================================

const STORAGE_KEYS = {
  THEME: 'economic-monitor-theme',
  LANGUAGE: 'economic-monitor-language',
  SIDEBAR_OPEN: 'economic-monitor-sidebar-open',
  USER_CONFIG: 'economic-monitor-user-config',
};

// ============================================================================
// Hook 实现
// ============================================================================

export function useApp(): UseAppReturn {
  // 状态
  const [theme, setThemeState] = useState<Theme>('system');
  const [language, setLanguageState] = useState<Language>('zh');
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [featureFlags] = useState<FeatureFlags>(getFeatureFlags());
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 从本地存储加载设置
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 加载主题
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }

    // 加载语言
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
    if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }

    // 加载侧边栏状态
    const savedSidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
    if (savedSidebar !== null) {
      setSidebarOpenState(savedSidebar === 'true');
    }

    // 加载用户配置
    const savedConfig = localStorage.getItem(STORAGE_KEYS.USER_CONFIG);
    if (savedConfig) {
      try {
        setUserConfig(JSON.parse(savedConfig));
      } catch {
        // 解析失败，使用默认配置
      }
    }

    setIsInitialized(true);
  }, []);

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);

      // 应用主题到 DOM
      if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // 设置语言
  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLanguage);
      document.documentElement.lang = newLanguage;
    }
  }, []);

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setSidebarOpenState(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(newValue));
      }
      return newValue;
    });
  }, []);

  // 设置侧边栏状态
  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(open));
    }
  }, []);

  // 更新用户配置
  const updateUserConfig = useCallback((config: Partial<UserConfig>) => {
    setUserConfig(prev => {
      const newConfig = prev ? { ...prev, ...config } : createDefaultUserConfig(config);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(newConfig));
      }
      return newConfig;
    });
  }, []);

  // 清除用户配置
  const clearUserConfig = useCallback(() => {
    setUserConfig(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER_CONFIG);
    }
  }, []);

  return {
    theme,
    language,
    sidebarOpen,
    featureFlags,
    userConfig,
    isInitialized,
    setTheme,
    setLanguage,
    toggleSidebar,
    setSidebarOpen,
    updateUserConfig,
    clearUserConfig,
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

function createDefaultUserConfig(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    id: 'default',
    riskTolerance: 'moderate',
    language: 'zh',
    notifyOnAnomaly: true,
    notifyOnSignal: true,
    monitoredIndicators: ['SOFR', 'GDP', 'PCE', 'UNRATE'],
    alertThresholds: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// 统计 Hook
// ============================================================================

export interface UseStatsReturn {
  stats: {
    totalPnl: number;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<UseStatsReturn['stats']>({
    totalPnl: 0,
    winRate: 0,
    tradeCount: 0,
    maxDrawdown: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 导入服务（避免循环依赖）
      const { getTradingService } = await import('@/core/services/TradingService');
      const service = getTradingService();

      const response = await service.getOverallStats();

      if (response.success && response.data) {
        setStats({
          totalPnl: response.data.totalPnl,
          winRate: response.data.winRate,
          tradeCount: response.data.tradeCount,
          maxDrawdown: response.data.maxDrawdown,
        });
      } else {
        setError(response.error?.message || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// 组合 Hook
// ============================================================================

export function useApplication() {
  const app = useApp();
  const stats = useStats();

  return {
    ...app,
    ...stats,
  };
}
