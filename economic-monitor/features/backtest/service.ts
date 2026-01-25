// ============================================================================
// 📁 features/backtest/service.ts
// ============================================================================
// 回测服务 - 预留
// ============================================================================
// ⚠️  尚未实现 - 等待功能开发

import type { BacktestConfig, BacktestResult, BacktestStrategy } from './types';

/**
 * 回测服务
 * 
 * 功能规划：
 * - 支持多种技术指标策略
 * - 支持自定义策略
 * - 支持参数优化
 * - 支持多周期回测
 */
export class BacktestService {
  /**
   * 执行回测
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    throw new Error('Backtest feature not implemented yet');
  }

  /**
   * 获取可用策略列表
   */
  getAvailableStrategies(): { id: BacktestStrategy; name: string; description: string }[] {
    return [
      { id: 'ma_crossover', name: '均线交叉', description: '短期均线上穿做多，下穿做空' },
      { id: 'rsi_oversold', name: 'RSI 策略', description: 'RSI 超卖买入，超买卖出' },
      { id: 'macd_signal', name: 'MACD 信号', description: 'MACD 金叉死叉信号' },
      { id: 'bollinger_bands', name: '布林带', description: '价格触及下轨买入，上轨卖出' },
      { id: 'custom', name: '自定义', description: '使用自定义交易逻辑' },
    ];
  }

  /**
   * 获取策略默认参数
   */
  getDefaultParams(strategy: BacktestStrategy): Record<string, unknown> {
    const params: Record<string, Record<string, unknown>> = {
      ma_crossover: { shortPeriod: 5, longPeriod: 20 },
      rsi_oversold: { period: 14, oversoldLevel: 30, overboughtLevel: 70 },
      macd_signal: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      bollinger_bands: { period: 20, stdDev: 2 },
      custom: {},
    };
    return params[strategy] || {};
  }
}

// ============================================================================
// 服务工厂
// ============================================================================

let backtestServiceInstance: BacktestService | null = null;

export function getBacktestService(): BacktestService {
  if (!backtestServiceInstance) {
    backtestServiceInstance = new BacktestService();
  }
  return backtestServiceInstance;
}
