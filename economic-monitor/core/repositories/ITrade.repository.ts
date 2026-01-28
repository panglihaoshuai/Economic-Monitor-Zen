// ============================================================================
// 📁 core/repositories/ITrade.repository.ts
// ============================================================================
// 交易数据仓储接口 - 定义数据访问契约
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持批量操作
//    - 支持事务
//    - 支持乐观锁
//    - 支持软删除

import type {
  Trade,
  PaginationParams,
  SortParams,
  ApiResponse
} from '@/shared/types';

// ============================================================================
// 查询参数
// ============================================================================

/** 交易查询参数 */
export interface TradeQueryParams {
  userId: string;
  status?: Trade['status'][];
  direction?: Trade['direction'][];
  assetClass?: Trade['assetClass'][];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  minPnl?: number;
  maxPnl?: number;
}

// ============================================================================
// 仓储接口
// ============================================================================

export interface ITradeRepository {
  // -------------------------------------------------------------------------
  // CRUD 操作
  // -------------------------------------------------------------------------

  /** 创建交易 */
  create(trade: Trade): Promise<ApiResponse<Trade>>;

  /** 根据ID获取交易 */
  findById(id: string): Promise<ApiResponse<Trade | null>>;

  /** 查询交易列表 */
  findMany(
    params: TradeQueryParams,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<ApiResponse<Trade[]>>;

  /** 更新交易 */
  update(id: string, data: Partial<Trade>): Promise<ApiResponse<Trade>>;

  /** 删除交易 */
  delete(id: string): Promise<ApiResponse<void>>;

  // -------------------------------------------------------------------------
  // 统计查询
  // -------------------------------------------------------------------------

  /** 获取用户交易数量 */
  count(params: TradeQueryParams): Promise<ApiResponse<number>>;

  /** 获取用户总盈亏 */
  sumPnl(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>>;

  /** 获取用户胜率 */
  calculateWinRate(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>>;

  /** 获取最大回撤 */
  calculateMaxDrawdown(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>>;
}

// ============================================================================
// 仓储工厂
// ============================================================================

/** 仓储类型 */
export type RepositoryType = 'mock' | 'supabase' | 'api';

/** 获取仓储实例 */
export function getTradeRepository(type?: RepositoryType): ITradeRepository {
  // 从环境变量或参数确定仓库类型
  const repositoryType = type || (process.env.NEXT_PUBLIC_REPOSITORY_TYPE as RepositoryType) || 'mock';

  switch (repositoryType) {
    case 'supabase': {
      // 动态导入以避免服务端/客户端问题
      const { createSupabaseTradeRepository } = require('@/infrastructure/supabase/SupabaseTrade.repository');
      const { supabase } = require('@/lib/supabase');
      return createSupabaseTradeRepository(supabase);
    }
    case 'api':
      // TODO: 实现 API 仓储
      throw new Error('API repository not implemented yet');
    case 'mock':
    default:
      return createMockTradeRepository();
  }
}

// ============================================================================
// Mock 仓储实现
// ============================================================================

import { v4 as uuidv4 } from 'uuid';

const mockTradeStore: Map<string, Trade> = new Map();

function createMockTradeRepository(): ITradeRepository {
  return {
    async create(trade: Trade): Promise<ApiResponse<Trade>> {
      try {
        const id = uuidv4();
        const newTrade = { ...trade, id };
        mockTradeStore.set(id, newTrade);
        return { success: true, data: newTrade };
      } catch (error) {
        return {
          success: false,
          error: { code: 'CREATE_ERROR', message: String(error) }
        };
      }
    },

    async findById(id: string): Promise<ApiResponse<Trade | null>> {
      const trade = mockTradeStore.get(id) || null;
      return { success: true, data: trade };
    },

    async findMany(
      params: TradeQueryParams,
      pagination?: PaginationParams,
      sort?: SortParams
    ): Promise<ApiResponse<Trade[]>> {
      let trades = Array.from(mockTradeStore.values());

      if (params.userId) {
        trades = trades.filter(t => t.userId === params.userId);
      }
      if (params.status?.length) {
        trades = trades.filter(t => params.status!.includes(t.status));
      }
      if (params.direction?.length) {
        trades = trades.filter(t => params.direction!.includes(t.direction));
      }
      if (params.assetClass?.length) {
        trades = trades.filter(t => params.assetClass!.includes(t.assetClass));
      }
      if (params.startDate) {
        trades = trades.filter(t => t.entryTime >= params.startDate!);
      }
      if (params.endDate) {
        trades = trades.filter(t => t.entryTime <= params.endDate!);
      }

      if (sort) {
        trades.sort((a, b) => {
          const aVal = a[sort.field as keyof Trade];
          const bVal = b[sort.field as keyof Trade];
          if (aVal === undefined && bVal === undefined) return 0;
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sort.direction === 'asc' ? comparison : -comparison;
        });
      } else {
        trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const start = (page - 1) * limit;
      const paginated = trades.slice(start, start + limit);

      return {
        success: true,
        data: paginated,
        meta: {
          timestamp: new Date().toISOString(),
          page,
          limit,
          total: trades.length,
        }
      };
    },

    async update(id: string, data: Partial<Trade>): Promise<ApiResponse<Trade>> {
      const existing = mockTradeStore.get(id);
      if (!existing) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Trade not found' }
        };
      }
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      mockTradeStore.set(id, updated);
      return { success: true, data: updated };
    },

    async delete(id: string): Promise<ApiResponse<void>> {
      if (!mockTradeStore.has(id)) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Trade not found' }
        };
      }
      mockTradeStore.delete(id);
      return { success: true };
    },

    async count(params: TradeQueryParams): Promise<ApiResponse<number>> {
      const { data } = await this.findMany(params);
      return { success: true, data: (data || []).length };
    },

    async sumPnl(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>> {
      const { data } = await this.findMany({ userId, status: ['closed'] });
      const closed = (data || []).filter(t => {
        if (startDate && t.exitTime! < startDate) return false;
        if (endDate && t.exitTime! > endDate) return false;
        return true;
      });
      const sum = closed.reduce((acc, t) => acc + (t.pnlPercent || 0), 0);
      return { success: true, data: sum };
    },

    async calculateWinRate(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>> {
      const { data } = await this.findMany({ userId, status: ['closed'] });
      const closed = (data || []).filter(t => {
        if (startDate && t.exitTime! < startDate) return false;
        if (endDate && t.exitTime! > endDate) return false;
        return true;
      });
      if (closed.length === 0) return { success: true, data: 0 };
      const wins = closed.filter(t => (t.pnlPercent || 0) > 0).length;
      return { success: true, data: (wins / closed.length) * 100 };
    },

    async calculateMaxDrawdown(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<number>> {
      const { data } = await this.findMany(
        { userId, status: ['closed'] },
        undefined,
        { field: 'entryTime', direction: 'asc' as const }
      );

      let maxDrawdown = 0;
      let peak = 0;
      let cumulative = 0;

      for (const trade of data || []) {
        if (startDate && trade.entryTime < startDate) continue;
        if (endDate && trade.entryTime > endDate) continue;

        cumulative += trade.pnlPercent || 0;
        if (cumulative > peak) peak = cumulative;
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      return { success: true, data: -maxDrawdown };
    },
  };
}

// ============================================================================
// 未来扩展预留
// ============================================================================

/**
 * TODO: 事务支持
 * interface TradeTransaction {
 *   commit(): Promise<void>;
 *   rollback(): Promise<void>;
 * }
 */

/**
 * TODO: 乐观锁支持
 * interface TradeWithVersion extends Trade {
 *   version: number;
 * }
 */
