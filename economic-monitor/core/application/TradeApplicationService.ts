/**
 * TradeApplicationService - 交易应用服务层
 * 封装交易相关的业务逻辑，协调领域服务和数据访问
 */

import { getDataService, DataService } from '../services/DataService';
import type { Trade, TradeStatus, AssetClass, TradeType, EmotionTag } from '@/shared/types';

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/** 创建交易请求 DTO */
export interface CreateTradeRequest {
    userId: string;
    symbol: string;
    assetClass: AssetClass;
    direction: 'long' | 'short';
    tradeType: TradeType;
    entryPrice: number;
    quantity: number;
    positionSize?: number;
    leverage?: number;
    entryTime?: string;
    tags?: string[];
    note?: string;
    emotionTag?: EmotionTag;
}

/** 更新交易请求 DTO */
export interface UpdateTradeRequest {
    exitPrice?: number;
    exitTime?: string;
    pnlPercent?: number;
    pnlAmount?: number;
    status?: TradeStatus;
    holdingPeriodHours?: number;
    tags?: string[];
    note?: string;
    emotionTag?: string;
}

/** 查询交易请求 DTO */
export interface QueryTradesRequest {
    userId: string;
    startDate?: string;
    endDate?: string;
    asset?: string;
    status?: 'open' | 'closed';
    page?: number;
    limit?: number;
}

/** 交易响应 DTO */
export interface TradeResponse {
    success: boolean;
    data?: Trade;
    error?: {
        code: string;
        message: string;
    };
}

/** 交易列表响应 DTO */
export interface TradesListResponse {
    success: boolean;
    data?: Trade[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

/** 交易统计响应 DTO */
export interface TradeStatisticsResponse {
    success: boolean;
    data?: {
        totalTrades: number;
        totalPnl: number;
        winRate: number;
        maxDrawdown: number;
        averagePnl: number;
        bestTrade: number;
        worstTrade: number;
        averageHoldingPeriod: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

// ============================================================================
// 验证函数
// ============================================================================

function validateCreateTradeRequest(req: CreateTradeRequest): string | null {
    if (!req.userId) return 'User ID is required';
    if (!req.symbol) return 'Symbol is required';
    if (!req.assetClass) return 'Asset class is required';
    if (!req.direction) return 'Direction is required';
    if (!req.tradeType) return 'Trade type is required';
    if (req.entryPrice === undefined || req.entryPrice <= 0) return 'Valid entry price is required';
    if (req.quantity === undefined || req.quantity <= 0) return 'Valid quantity is required';
    return null;
}

function validateUpdateTradeRequest(req: UpdateTradeRequest): string | null {
    if (req.exitPrice !== undefined && req.exitPrice < 0) return 'Exit price cannot be negative';
    if (req.pnlPercent !== undefined && req.pnlPercent < -100) return 'P&L percent cannot be less than -100%';
    return null;
}

// ============================================================================
// 应用服务类
// ============================================================================

export class TradeApplicationService {
    private dataService: DataService;

    constructor(dataService?: DataService) {
        this.dataService = dataService || getDataService();
    }

    // -------------------------------------------------------------------------
    // 交易管理
    // -------------------------------------------------------------------------

    /**
     * 创建新交易
     */
    async createTrade(request: CreateTradeRequest): Promise<TradeResponse> {
        try {
            // 验证请求
            const validationError = validateCreateTradeRequest(request);
            if (validationError) {
                return {
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: validationError }
                };
            }

            // 计算持仓规模
            const positionSize = request.positionSize || request.entryPrice * request.quantity;

            // 创建交易
            const trade = await this.dataService.createTrade({
                userId: request.userId,
                symbol: request.symbol,
                assetClass: request.assetClass,
                direction: request.direction,
                tradeType: request.tradeType,
                entryPrice: request.entryPrice,
                quantity: request.quantity,
                positionSize,
                leverage: request.leverage || 1,
                entryTime: request.entryTime || new Date().toISOString(),
                status: 'open',
                tags: request.tags || [],
                note: request.note,
                emotionTag: request.emotionTag,
                macroCorrelations: []
            });

            return {
                success: true,
                data: trade
            };
        } catch (error) {
            console.error('[TradeApplicationService] Create trade error:', error);
            return {
                success: false,
                error: {
                    code: 'CREATE_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to create trade'
                }
            };
        }
    }

    /**
     * 获取交易详情
     */
    async getTrade(tradeId: string): Promise<TradeResponse> {
        try {
            const trade = await this.dataService.getTrade(tradeId);

            if (!trade) {
                return {
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Trade not found' }
                };
            }

            return {
                success: true,
                data: trade
            };
        } catch (error) {
            console.error('[TradeApplicationService] Get trade error:', error);
            return {
                success: false,
                error: {
                    code: 'FETCH_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to fetch trade'
                }
            };
        }
    }

    /**
     * 查询用户交易列表
     */
    async queryTrades(request: QueryTradesRequest): Promise<TradesListResponse> {
        try {
            if (!request.userId) {
                return {
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'User ID is required' }
                };
            }

            const trades = await this.dataService.getUserTrades(request.userId, {
                startDate: request.startDate,
                endDate: request.endDate,
                asset: request.asset,
                status: request.status
            });

            // 简单的内存分页
            const page = request.page || 1;
            const limit = request.limit || 20;
            const start = (page - 1) * limit;
            const paginatedTrades = trades.slice(start, start + limit);

            return {
                success: true,
                data: paginatedTrades,
                pagination: {
                    page,
                    limit,
                    total: trades.length
                }
            };
        } catch (error) {
            console.error('[TradeApplicationService] Query trades error:', error);
            return {
                success: false,
                error: {
                    code: 'QUERY_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to query trades'
                }
            };
        }
    }

    /**
     * 更新交易
     */
    async updateTrade(tradeId: string, request: UpdateTradeRequest): Promise<TradeResponse> {
        try {
            // 验证请求
            const validationError = validateUpdateTradeRequest(request);
            if (validationError) {
                return {
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: validationError }
                };
            }

            // 检查交易是否存在
            const existingTrade = await this.dataService.getTrade(tradeId);
            if (!existingTrade) {
                return {
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Trade not found' }
                };
            }

            // 更新交易
            const updatedTrade = await this.dataService.updateTrade(tradeId, request);

            return {
                success: true,
                data: updatedTrade!
            };
        } catch (error) {
            console.error('[TradeApplicationService] Update trade error:', error);
            return {
                success: false,
                error: {
                    code: 'UPDATE_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to update trade'
                }
            };
        }
    }

    /**
     * 关闭交易
     */
    async closeTrade(
        tradeId: string,
        exitPrice: number,
        exitTime?: string
    ): Promise<TradeResponse> {
        try {
            const trade = await this.dataService.getTrade(tradeId);

            if (!trade) {
                return {
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Trade not found' }
                };
            }

            if (trade.status === 'closed') {
                return {
                    success: false,
                    error: { code: 'ALREADY_CLOSED', message: 'Trade is already closed' }
                };
            }

            // 计算盈亏
            const entryValue = trade.entryPrice * trade.quantity;
            const exitValue = exitPrice * trade.quantity;
            const pnlAmount = trade.direction === 'long'
                ? exitValue - entryValue
                : entryValue - exitValue;
            const pnlPercent = (pnlAmount / entryValue) * 100;

            // 计算持仓时间
            const entryTime = new Date(trade.entryTime);
            const closeTime = exitTime ? new Date(exitTime) : new Date();
            const holdingPeriodHours = (closeTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);

            const updatedTrade = await this.dataService.updateTrade(tradeId, {
                exitPrice,
                exitTime: exitTime || new Date().toISOString(),
                pnlPercent,
                pnlAmount,
                status: 'closed',
                holdingPeriodHours
            });

            return {
                success: true,
                data: updatedTrade!
            };
        } catch (error) {
            console.error('[TradeApplicationService] Close trade error:', error);
            return {
                success: false,
                error: {
                    code: 'CLOSE_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to close trade'
                }
            };
        }
    }

    /**
     * 删除交易
     */
    async deleteTrade(tradeId: string): Promise<{ success: boolean; error?: { code: string; message: string } }> {
        try {
            const trade = await this.dataService.getTrade(tradeId);

            if (!trade) {
                return {
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Trade not found' }
                };
            }

            await this.dataService.deleteTrade(tradeId);

            return { success: true };
        } catch (error) {
            console.error('[TradeApplicationService] Delete trade error:', error);
            return {
                success: false,
                error: {
                    code: 'DELETE_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to delete trade'
                }
            };
        }
    }

    // -------------------------------------------------------------------------
    // 统计分析
    // -------------------------------------------------------------------------

    /**
     * 获取交易统计
     */
    async getTradeStatistics(userId: string): Promise<TradeStatisticsResponse> {
        try {
            const stats = await this.dataService.getTradeStatistics(userId);

            // 获取所有交易计算额外统计
            const trades = await this.dataService.getUserTrades(userId);
            const closedTrades = trades.filter(t => t.status === 'closed');

            // 计算平均盈亏
            const averagePnl = closedTrades.length > 0
                ? closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0) / closedTrades.length
                : 0;

            // 计算最佳/最差交易
            const bestTrade = closedTrades.length > 0
                ? Math.max(...closedTrades.map(t => t.pnlPercent || 0))
                : 0;

            const worstTrade = closedTrades.length > 0
                ? Math.min(...closedTrades.map(t => t.pnlPercent || 0))
                : 0;

            // 计算平均持仓时间
            const averageHoldingPeriod = closedTrades.length > 0
                ? closedTrades.reduce((sum, t) => sum + (t.holdingPeriodHours || 0), 0) / closedTrades.length
                : 0;

            return {
                success: true,
                data: {
                    ...stats,
                    averagePnl,
                    bestTrade,
                    worstTrade,
                    averageHoldingPeriod
                }
            };
        } catch (error) {
            console.error('[TradeApplicationService] Get statistics error:', error);
            return {
                success: false,
                error: {
                    code: 'STATS_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to get statistics'
                }
            };
        }
    }

    /**
     * 批量导入交易
     */
    async batchImportTrades(
        userId: string,
        trades: Omit<CreateTradeRequest, 'userId'>[]
    ): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
        const errors: string[] = [];
        let importedCount = 0;

        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            const result = await this.createTrade({ ...trade, userId });

            if (result.success) {
                importedCount++;
            } else {
                errors.push(`Row ${i + 1}: ${result.error?.message}`);
            }
        }

        return {
            success: errors.length === 0,
            importedCount,
            errors
        };
    }
}

// ============================================================================
// 单例实例
// ============================================================================

let tradeApplicationServiceInstance: TradeApplicationService | null = null;

/**
 * 获取 TradeApplicationService 实例
 */
export function getTradeApplicationService(): TradeApplicationService {
    if (!tradeApplicationServiceInstance) {
        tradeApplicationServiceInstance = new TradeApplicationService();
    }
    return tradeApplicationServiceInstance;
}

/**
 * 重置 TradeApplicationService 实例（用于测试）
 */
export function resetTradeApplicationService(): void {
    tradeApplicationServiceInstance = null;
}
