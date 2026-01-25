// ============================================================================
// 📁 core/services/TradingService.ts
// ============================================================================
// 交易服务 - 封装交易相关业务逻辑
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持批量操作
//    - 支持交易模板
//    - 支持交易策略评分
//    - 支持AI信号集成

import type {
  Trade,
  PaginationParams,
  SortParams,
  ApiResponse,
  MonthlyStats,
  CorrelationStats,
} from '@/shared/types';
import type { ITradeRepository, TradeQueryParams } from '@/core/repositories/ITrade.repository';
import { closeTrade, createTrade, calculatePnlPercent } from '@/core/entities/Trade.entity';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 默认用户ID（开发环境使用）
// ============================================================================

const DEFAULT_USER_ID = 'default-user';

// ============================================================================
// 服务类
// ============================================================================

export class TradingService {
  private repository: ITradeRepository;
  private userId: string;

  constructor(repository: ITradeRepository, userId?: string) {
    this.repository = repository;
    this.userId = userId || DEFAULT_USER_ID;
  }

  // -------------------------------------------------------------------------
  // CRUD 操作
  // -------------------------------------------------------------------------

  /** 创建交易 */
  async createTrade(params: {
    symbol: string;
    assetClass: Trade['assetClass'];
    direction: Trade['direction'];
    entryPrice: number;
    quantity: number;
    tradeType?: Trade['tradeType'];
    positionSize?: number;
    leverage?: number;
    entryTime?: Date;
    tags?: string[];
    note?: string;
  }): Promise<ApiResponse<Trade>> {
    const trade = createTrade(params);
    trade.userId = this.userId;
    return this.repository.create(trade);
  }

  /** 获取交易 */
  async getTrade(id: string): Promise<ApiResponse<Trade | null>> {
    return this.repository.findById(id);
  }

  /** 查询交易列表 */
  async getTrades(
    params?: Partial<TradeQueryParams>,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<ApiResponse<Trade[]>> {
    return this.repository.findMany(
      { userId: this.userId, ...params },
      pagination,
      sort
    );
  }

  /** 更新交易 */
  async updateTrade(id: string, data: Partial<Trade>): Promise<ApiResponse<Trade>> {
    return this.repository.update(id, data);
  }

  /** 删除交易 */
  async deleteTrade(id: string): Promise<ApiResponse<void>> {
    return this.repository.delete(id);
  }

  // -------------------------------------------------------------------------
  // 平仓操作
  // -------------------------------------------------------------------------

  /** 平仓交易 */
  async closeTrade(id: string, exitPrice: number, exitTime?: Date): Promise<ApiResponse<Trade>> {
    const { data: trade, success } = await this.repository.findById(id);
    
    if (!success || !trade) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Trade not found' } };
    }

    if (trade.status === 'closed') {
      return { success: false, error: { code: 'ALREADY_CLOSED', message: 'Trade already closed' } };
    }

    const closed = closeTrade(trade, exitPrice, exitTime);
    return this.repository.update(id, closed);
  }

  // -------------------------------------------------------------------------
  // 统计查询
  // -------------------------------------------------------------------------

  /** 获取月度统计 */
  async getMonthlyStats(month: number, year: number): Promise<ApiResponse<MonthlyStats>> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [pnlResponse, countResponse] = await Promise.all([
      this.repository.sumPnl(this.userId, startDate, endDate),
      this.repository.findMany({ userId: this.userId, status: ['closed'] }, undefined, { field: 'entryTime', direction: 'asc' }),
    ]);

    const closedTrades = countResponse.data || [];
    const totalPnl = pnlResponse.data || 0;
    const tradeCount = closedTrades.length;
    
    // 计算胜率
    const wins = closedTrades.filter(t => (t.pnlPercent || 0) > 0).length;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

    // 计算最大回撤
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const trade of closedTrades) {
      if (trade.entryTime < startDate || trade.entryTime > endDate) continue;
      cumulative += trade.pnlPercent || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // 计算平均持仓时间
    const totalHoldingHours = closedTrades.reduce((acc, t) => acc + (t.holdingPeriodHours || 0), 0);
    const avgHoldingPeriod = tradeCount > 0 ? totalHoldingHours / tradeCount : 0;

    return {
      success: true,
      data: {
        totalPnl,
        winRate,
        tradeCount,
        maxDrawdown: -maxDrawdown,
        avgHoldingPeriod,
      },
    };
  }

  /** 获取总体统计 */
  async getOverallStats(): Promise<ApiResponse<{
    totalPnl: number;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
    openPositions: number;
  }>> {
    const [pnlResponse, winRateResponse, countResponse] = await Promise.all([
      this.repository.sumPnl(this.userId),
      this.repository.calculateWinRate(this.userId),
      this.repository.count({ userId: this.userId }),
    ]);

    const openResponse = await this.repository.count({ userId: this.userId, status: ['open'] });

    const closedResponse = await this.repository.findMany(
      { userId: this.userId, status: ['closed'] },
      undefined,
      { field: 'entryTime', direction: 'asc' }
    );

    // 计算最大回撤
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const trade of closedResponse.data || []) {
      cumulative += trade.pnlPercent || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      success: true,
      data: {
        totalPnl: pnlResponse.data || 0,
        winRate: winRateResponse.data || 0,
        tradeCount: countResponse.data || 0,
        maxDrawdown: -maxDrawdown,
        openPositions: openResponse.data || 0,
      },
    };
  }

  /** 获取收益曲线数据 */
  async getPnlCurve(): Promise<ApiResponse<{ date: string; cumulativePnl: number }[]>> {
    const response = await this.repository.findMany(
      { userId: this.userId, status: ['closed'] },
      { page: 1, limit: 1000 },
      { field: 'exitTime', direction: 'asc' }
    );

    const trades = response.data || [];
    const curve: { date: string; cumulativePnl: number }[] = [];
    let cumulative = 0;

    for (const trade of trades) {
      cumulative += trade.pnlPercent || 0;
      curve.push({
        date: trade.exitTime || trade.entryTime,
        cumulativePnl: Number(cumulative.toFixed(2)),
      });
    }

    return { success: true, data: curve };
  }

  /** 获取交易类型分布 */
  async getTradeTypeDistribution(): Promise<ApiResponse<Record<string, number>>> {
    const response = await this.repository.findMany({ userId: this.userId });
    const trades = response.data || [];

    const distribution: Record<string, number> = {};
    for (const trade of trades) {
      distribution[trade.tradeType] = (distribution[trade.tradeType] || 0) + 1;
    }

    return { success: true, data: distribution };
  }

  /** 获取方向分布 */
  async getDirectionDistribution(): Promise<ApiResponse<Record<string, number>>> {
    const response = await this.repository.findMany({ userId: this.userId });
    const trades = response.data || [];

    const distribution: Record<string, number> = { long: 0, short: 0 };
    for (const trade of trades) {
      distribution[trade.direction]++;
    }

    return { success: true, data: distribution };
  }
}

// ============================================================================
// 服务工厂
// ============================================================================

let tradingServiceInstance: TradingService | null = null;

export function getTradingService(repository?: ITradeRepository): TradingService {
  if (!tradingServiceInstance) {
    const repo = repository || (() => {
      // 动态导入以避免循环依赖
      const { getTradeRepository } = require('@/repositories/ITrade.repository');
      return getTradeRepository('mock');
    })();
    tradingServiceInstance = new TradingService(repo);
  }
  return tradingServiceInstance;
}

export function createTradingService(repository: ITradeRepository, userId?: string): TradingService {
  return new TradingService(repository, userId);
}
