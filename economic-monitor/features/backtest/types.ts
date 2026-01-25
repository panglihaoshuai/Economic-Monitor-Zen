// ============================================================================
// 📁 features/backtest/types.ts
// ============================================================================
// 回测功能类型定义
// ============================================================================
// ⚠️  预留功能 - 尚未实现

import type { TradeDirection, AssetClass } from '@/shared/types';

// ============================================================================
// 回测配置
// ============================================================================

export interface BacktestConfig {
  /** 交易对 */
  symbol: string;
  /** 资产类别 */
  assetClass: AssetClass;
  /** 交易方向 */
  direction: TradeDirection;
  /** 初始资金 */
  initialCapital: number;
  /** 仓位比例 */
  positionSize: number;
  /** 止损比例 */
  stopLossPercent: number;
  /** 止盈比例 */
  takeProfitPercent: number;
  /** 回测开始日期 */
  startDate: string;
  /** 回测结束日期 */
  endDate: string;
  /** 交易策略 */
  strategy: BacktestStrategy;
}

// ============================================================================
// 回测策略
// ============================================================================

export type BacktestStrategy = 
  | 'ma_crossover'      // 均线交叉
  | 'rsi_oversold'      // RSI 超卖
  | 'macd_signal'       // MACD 信号
  | 'bollinger_bands'   // 布林带
  | 'custom';           // 自定义

export interface StrategyParams {
  ma_crossover?: {
    shortPeriod: number;    // 短期均线周期
    longPeriod: number;     // 长期均线周期
  };
  rsi_oversold?: {
    period: number;         // RSI 周期
    oversoldLevel: number;  // 超卖水平
    overboughtLevel: number;// 超买水平
  };
  macd_signal?: {
    fastPeriod: number;     // 快线周期
    slowPeriod: number;     // 慢线周期
    signalPeriod: number;   // 信号线周期
  };
  bollinger_bands?: {
    period: number;         // 布林带周期
    stdDev: number;         // 标准差倍数
  };
}

// ============================================================================
// 回测结果
// ============================================================================

export interface BacktestResult {
  /** 配置 */
  config: BacktestConfig;
  /** 交易记录 */
  trades: BacktestTrade[];
  /** 统计指标 */
  stats: BacktestStats;
  /** 权益曲线 */
  equityCurve: EquityPoint[];
  /** 执行时间（毫秒） */
  executionTime: number;
}

export interface BacktestTrade {
  id: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  direction: TradeDirection;
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number;  // 天数
  status: 'win' | 'loss' | 'open';
}

export interface BacktestStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  avgHoldingPeriod: number;
  SharpeRatio: number;
  SortinoRatio: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

// ============================================================================
// 图表数据
// ============================================================================

export interface BacktestChartData {
  price: { date: string; value: number }[];
  equity: { date: string; value: number }[];
  drawdown: { date: string; value: number }[];
  trades: BacktestTrade[];
}

// ============================================================================
// 未来扩展
// ============================================================================

/**
 * TODO: 多周期回测
 * TODO: 参数优化
 * TODO: Walk-Forward 分析
 * TODO: 蒙特卡洛模拟
 * TODO: 策略对比
 */
