// ============================================================================
// 📁 core/entities/Trade.entity.ts
// ============================================================================
// 交易实体 - 领域模型
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持更多资产类别
//    - 支持交易手续费计算
//    - 支持仓位自动计算
//    - 支持交易成本计算（滑点等）

import type { 
  Trade, 
  TradeDirection, 
  AssetClass, 
  TradeType, 
  TradeStatus,
  MacroCorrelation,
  EmotionTag,
  DateTime
} from '@/shared/types';

// ============================================================================
// 常量定义
// ============================================================================

/** 允许的资产类别 */
export const ASSET_CLASSES: AssetClass[] = ['stock', 'crypto', 'futures'];

/** 允许的交易方向 */
export const TRADE_DIRECTIONS: TradeDirection[] = ['long', 'short'];

/** 允许的交易类型 */
export const TRADE_TYPES: TradeType[] = ['trend', 'swing', 'day', 'position'];

/** 默认仓位比例 */
export const DEFAULT_POSITION_SIZE = 0.2; // 20%

/** 默认杠杆 */
export const DEFAULT_LEVERAGE = 1;

// ============================================================================
// 工厂函数
// ============================================================================

/** 创建交易（工厂模式） */
export function createTrade(params: {
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  entryPrice: number;
  quantity: number;
  tradeType?: TradeType;
  positionSize?: number;
  leverage?: number;
  entryTime?: Date;
  tags?: string[];
  note?: string;
}): Trade {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID(),
    userId: '', // 将在保存时设置
    symbol: params.symbol,
    assetClass: params.assetClass,
    direction: params.direction,
    tradeType: params.tradeType || 'swing',
    entryPrice: params.entryPrice,
    quantity: params.quantity,
    positionSize: params.positionSize || DEFAULT_POSITION_SIZE,
    leverage: params.leverage || DEFAULT_LEVERAGE,
    entryTime: (params.entryTime || new Date()).toISOString(),
    status: 'open',
    tags: params.tags || [],
    note: params.note,
    macroCorrelations: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// 计算方法
// ============================================================================

/** 计算盈亏百分比 */
export function calculatePnlPercent(entryPrice: number, exitPrice: number, direction: TradeDirection): number {
  if (direction === 'long') {
    return ((exitPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - exitPrice) / entryPrice) * 100;
  }
}

/** 计算盈亏金额 */
export function calculatePnlAmount(
  entryPrice: number, 
  exitPrice: number, 
  quantity: number, 
  direction: TradeDirection
): number {
  const pnlPercent = calculatePnlPercent(entryPrice, exitPrice, direction);
  return entryPrice * quantity * (pnlPercent / 100);
}

/** 计算持仓时间（小时） */
export function calculateHoldingPeriod(entryTime: DateTime, exitTime: DateTime): number {
  const entry = new Date(entryTime).getTime();
  const exit = new Date(exitTime).getTime();
  return Math.floor((exit - entry) / (1000 * 60 * 60));
}

// ============================================================================
// 业务方法
// ============================================================================

/** 平仓 - 返回更新后的交易 */
export function closeTrade(
  trade: Trade, 
  exitPrice: number, 
  exitTime?: Date
): Trade {
  const exit = exitTime || new Date();
  const pnlPercent = calculatePnlPercent(trade.entryPrice, exitPrice, trade.direction);
  const pnlAmount = calculatePnlAmount(
    trade.entryPrice, 
    exitPrice, 
    trade.quantity, 
    trade.direction
  );
  
  return {
    ...trade,
    exitPrice,
    exitTime: exit.toISOString(),
    pnlPercent,
    pnlAmount,
    status: 'closed' as TradeStatus,
    holdingPeriodHours: calculateHoldingPeriod(trade.entryTime, exit.toISOString()),
    updatedAt: new Date().toISOString(),
  };
}

/** 添加标签（自动去重和限制数量） */
export function addTag(trade: Trade, tag: string, maxTags: number = 5): Trade {
  const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
  const uniqueTags = Array.from(new Set([...trade.tags, cleanTag])).slice(0, maxTags);
  
  return {
    ...trade,
    tags: uniqueTags,
    updatedAt: new Date().toISOString(),
  };
}

/** 移除标签 */
export function removeTag(trade: Trade, tag: string): Trade {
  return {
    ...trade,
    tags: trade.tags.filter(t => t !== tag),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 验证方法
// ============================================================================

/** 验证交易是否有效 */
export function isValidTrade(trade: Partial<Trade>): trade is Trade {
  return !!(
    trade.symbol &&
    trade.entryPrice &&
    trade.quantity &&
    trade.direction &&
    trade.assetClass
  );
}

/** 验证价格 */
export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && price > 0 && !isNaN(price);
}

/** 验证仓位比例 */
export function isValidPositionSize(size: unknown): boolean {
  return typeof size === 'number' && size > 0 && size <= 10; // 最高10倍杠杆
}

// ============================================================================
// 格式化方法
// ============================================================================

/** 格式化盈亏显示 */
export function formatPnl(pnlPercent: number): string {
  const sign = pnlPercent >= 0 ? '+' : '';
  return `${sign}${pnlPercent.toFixed(2)}%`;
}

/** 格式化持仓时间 */
export function formatHoldingPeriod(hours: number): string {
  if (hours < 24) {
    return `${hours}h`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
}

/** 格式化方向显示 */
export function formatDirection(direction: TradeDirection): string {
  return direction === 'long' ? '📈 多' : '📉 空';
}

// ============================================================================
// 类型守卫
// ============================================================================

/** 判断交易是否已平仓 */
export function isClosedTrade(trade: Trade): boolean {
  return trade.status === 'closed';
}

/** 判断交易是否盈利 */
export function isProfitableTrade(trade: Trade): boolean {
  return isClosedTrade(trade) && (trade.pnlPercent || 0) > 0;
}

/** 判断交易是否亏损 */
export function isLosingTrade(trade: Trade): boolean {
  return isClosedTrade(trade) && (trade.pnlPercent || 0) < 0;
}

// ============================================================================
// 未来扩展预留
// ============================================================================

/**
 * TODO: 未来功能 - 交易成本计算
 * 
 * interface TradeCost {
 *   commission: number;       // 手续费
 *   slippage: number;         // 滑点
 *   funding: number;          // 资金费（合约）
 *   total: number;            // 总成本
 * }
 * 
 * function calculateTradeCost(trade: Trade, marketData: MarketData): TradeCost
 */

/**
 * TODO: 未来功能 - 自动仓位计算
 * 
 * function calculatePositionSize(params: {
 *   accountBalance: number;
 *   riskPercent: number;      // 风险比例
 *   stopLossPercent: number;  // 止损比例
 *   entryPrice: number;
 *   stopLossPrice: number;
 * }): number
 */

/**
 * TODO: 未来功能 - 交易评分
 * 
 * interface TradeScore {
 *   overall: number;          // 0-100
 *   entryQuality: number;
 *   riskManagement: number;
 *   emotionControl: number;
 *   macroAlignment: number;
 * }
 * 
 * function scoreTrade(trade: Trade, marketContext: MarketContext): TradeScore
 */
