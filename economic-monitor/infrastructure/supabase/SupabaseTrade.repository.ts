// ============================================================================
// 📁 infrastructure/supabase/SupabaseTrade.repository.ts
// ============================================================================
// Supabase 交易数据仓储实现
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type {
    ITradeRepository,
    TradeQueryParams,
} from '@/core/repositories/ITrade.repository';
import type {
    Trade,
    PaginationParams,
    SortParams,
    ApiResponse,
} from '@/shared/types';

// ============================================================================
// 类型别名 - 使用 any 绕过 Supabase 类型问题
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TradeRow = any;

// ============================================================================
// 仓储实现
// ============================================================================

export class SupabaseTradeRepository implements ITradeRepository {
    constructor(private supabase: SupabaseClient) { }

    // -------------------------------------------------------------------------
    // CRUD 操作
    // -------------------------------------------------------------------------

    async create(trade: Trade): Promise<ApiResponse<Trade>> {
        try {
            // 转换 Trade 实体为数据库格式
            const dbRecord = this.tradeToDbRecord(trade);

            const { data, error } = await this.supabase
                .from('trades')
                .insert(dbRecord)
                .select()
                .single();

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const createdTrade = this.dbRecordToTrade(data);

            return {
                success: true,
                data: createdTrade,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async findById(id: string): Promise<ApiResponse<Trade | null>> {
        try {
            const { data, error } = await this.supabase
                .from('trades')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // 未找到记录
                    return {
                        success: true,
                        data: null,
                        meta: { timestamp: new Date().toISOString() },
                    };
                }
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const trade = data ? this.dbRecordToTrade(data) : null;

            return {
                success: true,
                data: trade,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async findMany(
        params: TradeQueryParams,
        pagination?: PaginationParams,
        sort?: SortParams
    ): Promise<ApiResponse<Trade[]>> {
        try {
            let query = this.supabase.from('trades').select('*');

            // 应用过滤条件
            if (params.userId) {
                query = query.eq('user_id', params.userId);
            }
            if (params.status?.length) {
                query = query.in('status', params.status);
            }
            if (params.direction?.length) {
                query = query.in('direction', params.direction);
            }
            if (params.assetClass?.length) {
                query = query.in('asset_class', params.assetClass);
            }
            if (params.startDate) {
                query = query.gte('entry_time', params.startDate);
            }
            if (params.endDate) {
                query = query.lte('entry_time', params.endDate);
            }
            if (params.minPnl !== undefined) {
                query = query.gte('pnl_percent', params.minPnl);
            }
            if (params.maxPnl !== undefined) {
                query = query.lte('pnl_percent', params.maxPnl);
            }

            // 应用排序
            if (sort) {
                query = query.order(sort.field, {
                    ascending: sort.direction === 'asc',
                });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            // 应用分页
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 20;
            const start = (page - 1) * limit;

            query = query.range(start, start + limit - 1);

            const { data, error } = await query;

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const trades = (data || []).map((row: TradeRow) => this.dbRecordToTrade(row));

            return {
                success: true,
                data: trades,
                meta: {
                    timestamp: new Date().toISOString(),
                    page,
                    limit,
                    total: trades.length, // 注意：这里应该查询总数
                },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async update(id: string, data: Partial<Trade>): Promise<ApiResponse<Trade>> {
        try {
            // 转换更新数据
            const updateData: Record<string, unknown> = {};

            if (data.exitPrice !== undefined) updateData.exit_price = data.exitPrice;
            if (data.exitTime !== undefined) updateData.exit_time = data.exitTime;
            if (data.pnlPercent !== undefined) updateData.pnl_percent = data.pnlPercent;
            if (data.pnlAmount !== undefined) updateData.pnl_amount = data.pnlAmount;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.holdingPeriodHours !== undefined)
                updateData.holding_period_hours = data.holdingPeriodHours;
            if (data.tags !== undefined) updateData.tags = data.tags;
            if (data.note !== undefined) updateData.note = data.note;
            if (data.macroCorrelations !== undefined)
                updateData.macro_correlations = data.macroCorrelations;
            if (data.emotionTag !== undefined) updateData.emotion_tag = data.emotionTag;

            updateData.updated_at = new Date().toISOString();

            const { data: result, error } = await this.supabase
                .from('trades')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const updatedTrade = this.dbRecordToTrade(result);

            return {
                success: true,
                data: updatedTrade,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async delete(id: string): Promise<ApiResponse<void>> {
        try {
            const { error } = await this.supabase.from('trades').delete().eq('id', id);

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            return {
                success: true,
                data: undefined,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    // -------------------------------------------------------------------------
    // 统计查询
    // -------------------------------------------------------------------------

    async count(params: TradeQueryParams): Promise<ApiResponse<number>> {
        try {
            let query = this.supabase.from('trades').select('*', { count: 'exact', head: true });

            if (params.userId) {
                query = query.eq('user_id', params.userId);
            }
            if (params.status?.length) {
                query = query.in('status', params.status);
            }
            if (params.direction?.length) {
                query = query.in('direction', params.direction);
            }
            if (params.assetClass?.length) {
                query = query.in('asset_class', params.assetClass);
            }

            const { count, error } = await query;

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            return {
                success: true,
                data: count || 0,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async sumPnl(
        userId: string,
        startDate?: string,
        endDate?: string
    ): Promise<ApiResponse<number>> {
        try {
            let query = this.supabase.from('trades').select('pnl_amount').eq('user_id', userId);

            if (startDate) {
                query = query.gte('entry_time', startDate);
            }
            if (endDate) {
                query = query.lte('entry_time', endDate);
            }

            const { data, error } = await query;

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const totalPnl = (data || []).reduce((sum: number, row: TradeRow) => {
                return sum + (row.pnl_amount || 0);
            }, 0);

            return {
                success: true,
                data: totalPnl,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async calculateWinRate(
        userId: string,
        startDate?: string,
        endDate?: string
    ): Promise<ApiResponse<number>> {
        try {
            let query = this.supabase
                .from('trades')
                .select('pnl_percent')
                .eq('user_id', userId)
                .eq('status', 'closed');

            if (startDate) {
                query = query.gte('entry_time', startDate);
            }
            if (endDate) {
                query = query.lte('entry_time', endDate);
            }

            const { data, error } = await query;

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const closedTrades = data || [];
            if (closedTrades.length === 0) {
                return {
                    success: true,
                    data: 0,
                    meta: { timestamp: new Date().toISOString() },
                };
            }

            const winningTrades = closedTrades.filter((row: TradeRow) => (row.pnl_percent || 0) > 0);
            const winRate = (winningTrades.length / closedTrades.length) * 100;

            return {
                success: true,
                data: winRate,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    async calculateMaxDrawdown(
        userId: string,
        startDate?: string,
        endDate?: string
    ): Promise<ApiResponse<number>> {
        try {
            let query = this.supabase
                .from('trades')
                .select('pnl_percent, entry_time')
                .eq('user_id', userId)
                .eq('status', 'closed')
                .order('entry_time', { ascending: true });

            if (startDate) {
                query = query.gte('entry_time', startDate);
            }
            if (endDate) {
                query = query.lte('entry_time', endDate);
            }

            const { data, error } = await query;

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const trades = data || [];
            if (trades.length === 0) {
                return {
                    success: true,
                    data: 0,
                    meta: { timestamp: new Date().toISOString() },
                };
            }

            // 计算最大回撤
            let maxDrawdown = 0;
            let peak = 0;
            let cumulative = 0;

            for (const trade of trades) {
                cumulative += trade.pnl_percent || 0;
                if (cumulative > peak) {
                    peak = cumulative;
                }
                const drawdown = peak - cumulative;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }

            return {
                success: true,
                data: maxDrawdown,
                meta: { timestamp: new Date().toISOString() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }

    // -------------------------------------------------------------------------
    // 辅助方法
    // -------------------------------------------------------------------------

    private tradeToDbRecord(trade: Trade): Record<string, unknown> {
        return {
            id: trade.id,
            user_id: trade.userId,
            symbol: trade.symbol,
            asset_class: trade.assetClass,
            direction: trade.direction,
            trade_type: trade.tradeType,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            quantity: trade.quantity,
            position_size: trade.positionSize,
            leverage: trade.leverage,
            entry_time: trade.entryTime,
            exit_time: trade.exitTime,
            holding_period_hours: trade.holdingPeriodHours,
            pnl_percent: trade.pnlPercent,
            pnl_amount: trade.pnlAmount,
            status: trade.status,
            tags: trade.tags,
            note: trade.note,
            macro_correlations: trade.macroCorrelations,
            emotion_tag: trade.emotionTag,
            created_at: trade.createdAt,
            updated_at: trade.updatedAt,
        };
    }

    private dbRecordToTrade(row: TradeRow): Trade {
        return {
            id: row.id,
            userId: row.user_id,
            symbol: row.symbol,
            assetClass: row.asset_class,
            direction: row.direction,
            tradeType: row.trade_type,
            entryPrice: row.entry_price,
            exitPrice: row.exit_price,
            quantity: row.quantity,
            positionSize: row.position_size,
            leverage: row.leverage,
            entryTime: row.entry_time,
            exitTime: row.exit_time,
            holdingPeriodHours: row.holding_period_hours,
            pnlPercent: row.pnl_percent,
            pnlAmount: row.pnl_amount,
            status: row.status,
            tags: row.tags || [],
            note: row.note,
            macroCorrelations: row.macro_correlations || [],
            emotionTag: row.emotion_tag,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createSupabaseTradeRepository(
    supabase: SupabaseClient
): SupabaseTradeRepository {
    return new SupabaseTradeRepository(supabase);
}
