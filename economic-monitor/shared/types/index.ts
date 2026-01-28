// ============================================================================
// 📁 shared/types/index.ts
// ============================================================================
// 共享类型定义 - 所有模块共用
// TODO: 未来可考虑使用 @types/ 包的自动生成

// ---------------------------------------------------------------------------
// 基础类型
// ---------------------------------------------------------------------------

/** 唯一标识符 */
export type UUID = string;

/** 日期时间 */
export type DateTime = string;

// ---------------------------------------------------------------------------
// 交易相关类型
// ---------------------------------------------------------------------------

/** 交易方向 */
export type TradeDirection = 'long' | 'short';

/** 资产类别 */
export type AssetClass = 'stock' | 'crypto' | 'futures' | 'forex' | 'commodity' | 'bond';

/** 交易类型 */
export type TradeType = 'trend' | 'swing' | 'day' | 'position' | 'spot' | 'margin' | 'options';

/** 交易状态 */
export type TradeStatus = 'open' | 'closed' | 'cancelled';

/** 情绪标签 - 自动识别 */
export type EmotionTag = 'calm' | 'fomo' | 'greed' | 'panic' | 'revenge' | string;

/** 交易记录 */
export interface Trade {
  id: UUID;
  userId: UUID;

  // 基础信息
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  tradeType: TradeType;

  // 价格与数量
  entryPrice: number;
  exitPrice?: number;
  quantity: number;

  // 仓位管理
  positionSize: number;      // 0.2 = 20%
  leverage: number;          // 1x = 现货

  // 时间
  entryTime: DateTime;
  exitTime?: DateTime;
  holdingPeriodHours?: number;

  // 结果
  pnlPercent?: number;
  pnlAmount?: number;
  status: TradeStatus;

  // 标签与备注
  tags: string[];
  note?: string;

  // 宏观关联
  macroCorrelations: MacroCorrelation[];

  // 情绪（自动识别）
  emotionTag?: EmotionTag;

  // 元数据
  createdAt: DateTime;
  updatedAt: DateTime;
}

/** 宏观关联 */
export interface MacroCorrelation {
  indicatorId: string;       // SOFR, GDP, PCE...
  signalType: string;        // bullish, bearish, neutral
  action: 'followed' | 'ignored' | 'opposite';
  confidence: number;        // 0-1
}

// ---------------------------------------------------------------------------
// 宏观经济相关类型
// ---------------------------------------------------------------------------

/** 指标状态 */
export type IndicatorStatus = 'normal' | 'warning' | 'critical';

/** 经济周期阶段 */
export type CyclePhase =
  | 'early_expansion'   // 扩张前期
  | 'mid_expansion'     // 扩张中期
  | 'late_expansion'    // 扩张后期
  | 'early_contraction' // 收缩前期
  | 'mid_contraction'   // 收缩中期
  | 'late_contraction'; // 收缩后期

/** 经济周期 */
export interface EconomicCycle {
  phase: CyclePhase;
  confidence: number;        // 判定置信度
  description: string;       // 简短描述
  recommendation: string;    // 投资建议
}

/** 宏观经济指标 */
export interface MacroIndicator {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change: number;            // 变化幅度
  changePercent: number;     // 变化百分比
  zScore: number;            // Z分数（异常程度）
  percentile: number;        // 历史分位
  status: IndicatorStatus;
  description: string;       // 解读
  category: string;          // 分类：growth, inflation, labor, rates
  unit: string;              // 单位
  frequency: string;         // 更新频率：daily, weekly, monthly
}

/** 宏观信号 */
export interface MacroSignal {
  indicatorId: string;
  type: 'bullish' | 'bearish' | 'neutral';
  severity: IndicatorStatus;
  confidence: number;
  description: string;
  expectedImpact?: string;   // 预期影响
  validFrom: DateTime;
  validUntil: DateTime;
}

// ---------------------------------------------------------------------------
// 统计相关类型
// ---------------------------------------------------------------------------

/** 月度统计 */
export interface MonthlyStats {
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  maxDrawdown: number;
  avgHoldingPeriod: number;
}

/** 相关性统计 */
export interface CorrelationStats {
  indicatorId: string;
  indicatorName: string;

  totalTrades: number;

  followed: {
    count: number;
    avgPnl: number;
    winRate: number;
    totalPnl: number;
  };

  ignored: {
    count: number;
    avgPnl: number;
    winRate: number;
    totalPnl: number;
  };

  opposite: {
    count: number;
    avgPnl: number;
    winRate: number;
    totalPnl: number;
  };

  conclusion: string;        // AI 生成的结论
}

/** 情绪统计 */
export interface EmotionStats {
  tag: EmotionTag;
  count: number;
  avgPnl: number;
  winRate: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// 用户相关类型（预留）
// ---------------------------------------------------------------------------

/** 用户配置 */
export interface UserConfig {
  id: UUID;

  // 偏好设置
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  language: 'en' | 'zh';

  // 通知设置
  notifyOnAnomaly: boolean;
  notifyOnSignal: boolean;

  // 监控设置
  monitoredIndicators: string[];
  alertThresholds: Record<string, number>;

  // API 配置（预留）
  deepseekApiKey?: string;

  // 元数据
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ---------------------------------------------------------------------------
// API 响应类型
// ---------------------------------------------------------------------------

/** API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: DateTime;
    page?: number;
    limit?: number;
    total?: number;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** 排序参数 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// 功能标记（用于条件编译）
// ------------------------------------------------------------------------===

/** 功能开关 - 可在环境变量中配置 */
export interface FeatureFlags {
  enableAI: boolean;           // AI 分析功能
  enableSocial: boolean;       // 社交功能（预留）
  enableBacktest: boolean;     // 回测功能（预留）
  enableNotifications: boolean;// 通知功能
  enableRealData: boolean;     // 真实数据（预留）
}

// 获取功能开关
export function getFeatureFlags(): FeatureFlags {
  return {
    enableAI: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
    enableSocial: process.env.NEXT_PUBLIC_ENABLE_SOCIAL === 'true',
    enableBacktest: process.env.NEXT_PUBLIC_ENABLE_BACKTEST === 'true',
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
    enableRealData: process.env.NEXT_PUBLIC_ENABLE_REAL_DATA === 'true',
  };
}
