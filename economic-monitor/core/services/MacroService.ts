// ============================================================================
// 📁 core/services/MacroService.ts
// ============================================================================
// 宏观经济服务 - 封装宏观指标相关业务逻辑
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持更多指标
//    - 支持历史趋势分析
//    - 支持多周期比较
//    - 支持国际指标

import type {
  MacroIndicator,
  MacroSignal,
  EconomicCycle,
  ApiResponse,
} from '@/shared/types';
import type { IMarketRepository } from '@/core/repositories/IMarket.repository';
import { INDICATOR_CONFIGS } from '@/core/entities/MacroIndicator.entity';

// ============================================================================
// 服务类
// ============================================================================

export class MacroService {
  private repository: IMarketRepository;

  constructor(repository: IMarketRepository) {
    this.repository = repository;
  }

  // -------------------------------------------------------------------------
  // 指标查询
  // -------------------------------------------------------------------------

  /** 获取所有指标 */
  async getAllIndicators(params?: {
    category?: string;
    status?: MacroIndicator['status'][];
    limit?: number;
  }): Promise<ApiResponse<MacroIndicator[]>> {
    return this.repository.getAllIndicators(params);
  }

  /** 获取单个指标 */
  async getIndicator(id: string): Promise<ApiResponse<MacroIndicator | null>> {
    return this.repository.getIndicatorById(id);
  }

  /** 获取指标当前值 */
  async getIndicatorValue(id: string): Promise<ApiResponse<number | null>> {
    return this.repository.getLatestValue(id);
  }

  // -------------------------------------------------------------------------
  // 信号查询
  // -------------------------------------------------------------------------

  /** 获取所有活跃信号 */
  async getActiveSignals(): Promise<ApiResponse<MacroSignal[]>> {
    return this.repository.getActiveSignals();
  }

  /** 获取单个指标的信号 */
  async getIndicatorSignal(id: string): Promise<ApiResponse<MacroSignal | null>> {
    return this.repository.getIndicatorSignal(id);
  }

  // -------------------------------------------------------------------------
  // 经济周期
  // -------------------------------------------------------------------------

  /** 获取当前经济周期 */
  async getCurrentCycle(): Promise<ApiResponse<EconomicCycle>> {
    return this.repository.getCurrentCycle();
  }

  // -------------------------------------------------------------------------
  // 组合查询
  // -------------------------------------------------------------------------

  /** 获取仪表盘数据（包含所有关键信息） */
  async getDashboardData(): Promise<ApiResponse<{
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
  }>> {
    const [indicatorsResponse, signalsResponse, cycleResponse] = await Promise.all([
      this.repository.getAllIndicators(),
      this.repository.getActiveSignals(),
      this.repository.getCurrentCycle(),
    ]);

    const indicators = indicatorsResponse.data || [];
    const signals = signalsResponse.data || [];

    const summary = {
      totalIndicators: indicators.length,
      warningCount: indicators.filter(i => i.status === 'warning').length,
      criticalCount: indicators.filter(i => i.status === 'critical').length,
      bullishSignals: signals.filter(s => s.type === 'bullish').length,
      bearishSignals: signals.filter(s => s.type === 'bearish').length,
    };

    return {
      success: true,
      data: {
        indicators,
        signals,
        cycle: cycleResponse.data!,
        summary,
      },
    };
  }

  /** 按分类获取指标 */
  async getIndicatorsByCategory(): Promise<ApiResponse<Record<string, MacroIndicator[]>>> {
    const response = await this.repository.getAllIndicators();
    const indicators = response.data || [];

    const grouped: Record<string, MacroIndicator[]> = {};
    for (const indicator of indicators) {
      if (!grouped[indicator.category]) {
        grouped[indicator.category] = [];
      }
      grouped[indicator.category].push(indicator);
    }

    return { success: true, data: grouped };
  }

  /** 获取异常指标 */
  async getAnomalies(): Promise<ApiResponse<MacroIndicator[]>> {
    const response = await this.repository.getAllIndicators({
      status: ['warning', 'critical'],
    });

    return {
      success: true,
      data: response.data || [],
    };
  }

  // -------------------------------------------------------------------------
  // 工具方法
  // -------------------------------------------------------------------------

  /** 获取指标配置 */
  getIndicatorConfig(id: string) {
    return INDICATOR_CONFIGS[id as keyof typeof INDICATOR_CONFIGS];
  }

  /** 获取所有指标配置 */
  getAllIndicatorConfigs() {
    return INDICATOR_CONFIGS;
  }

  /** 检查指标是否被监控 */
  isMonitoredIndicator(id: string): boolean {
    return id in INDICATOR_CONFIGS;
  }
}

// ============================================================================
// 服务工厂
// ============================================================================

let macroServiceInstance: MacroService | null = null;

export function getMacroService(repository?: IMarketRepository): MacroService {
  if (!macroServiceInstance) {
    const repo = repository || (() => {
      const { getMarketRepository } = require('@/repositories/IMarket.repository');
      return getMarketRepository('mock');
    })();
    macroServiceInstance = new MacroService(repo);
  }
  return macroServiceInstance;
}

export function createMacroService(repository: IMarketRepository): MacroService {
  return new MacroService(repository);
}
