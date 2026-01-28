/**
 * DataService - 统一数据访问服务
 * 整合市场数据和交易数据的操作，提供统一的数据访问接口
 */

import { IMarketRepository, getMarketRepository } from '../repositories/IMarket.repository';
import { ITradeRepository, getTradeRepository } from '../repositories/ITrade.repository';
import type {
    Trade,
    TradeStatus,
    MacroIndicator,
    MacroSignal,
    EconomicCycle,
    AssetClass,
    TradeType,
    EmotionTag
} from '@/shared/types';
import { supabaseAdmin } from '@/lib/supabase';

// 数据服务配置接口
export interface DataServiceConfig {
    batchSize?: number;
    enableCache?: boolean;
    cacheTTL?: number;
}

// 批量插入结果接口
export interface BatchInsertResult {
    success: boolean;
    insertedCount: number;
    errorCount: number;
    errors: string[];
}

// 数据同步状态接口
export interface DataSyncStatus {
    isRunning: boolean;
    lastSyncTime?: Date;
    nextSyncTime?: Date;
    progress: number;
    message: string;
}

// 交易统计接口
export interface TradeStatistics {
    totalTrades: number;
    totalPnl: number;
    winRate: number;
    maxDrawdown: number;
}

// 历史数据点接口
export interface HistoricalDataPoint {
    date: string;
    value: number;
}

// 最新值接口
export interface LatestValue {
    value: number;
    date: string;
}

// API 响应类型
interface ApiResponse<T> {
    data?: T;
    error?: { code: string; message: string };
}

/**
 * 统一数据服务类
 * 整合市场数据和交易数据的操作
 */
export class DataService {
    private marketRepo: IMarketRepository;
    private tradeRepo: ITradeRepository;
    private config: DataServiceConfig;
    private syncStatus: DataSyncStatus = {
        isRunning: false,
        progress: 0,
        message: 'Idle'
    };

    constructor(config: DataServiceConfig = {}) {
        this.config = {
            batchSize: 1000,
            enableCache: true,
            cacheTTL: 5 * 60 * 1000, // 5 minutes
            ...config
        };

        this.marketRepo = getMarketRepository();
        this.tradeRepo = getTradeRepository();
    }

    // ========== 市场数据操作 ==========

    /**
     * 获取所有指标
     */
    async getAllIndicators(): Promise<MacroIndicator[]> {
        const response = await this.marketRepo.getAllIndicators() as ApiResponse<MacroIndicator[]>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || [];
    }

    /**
     * 获取特定指标
     */
    async getIndicator(seriesId: string): Promise<MacroIndicator | null> {
        const response = await this.marketRepo.getIndicatorById(seriesId) as ApiResponse<MacroIndicator>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || null;
    }

    /**
     * 获取指标最新值
     */
    async getLatestValue(seriesId: string): Promise<LatestValue | null> {
        const response = await this.marketRepo.getLatestValue(seriesId) as ApiResponse<number>;
        if (response.error || !response.data) {
            return null;
        }
        return {
            value: response.data,
            date: new Date().toISOString()
        };
    }

    /**
     * 获取指标历史数据
     */
    async getHistoricalData(
        seriesId: string,
        startDate?: string,
        endDate?: string,
        limit?: number
    ): Promise<HistoricalDataPoint[]> {
        const response = await this.marketRepo.getHistoricalData(
            seriesId,
            startDate || '',
            endDate || ''
        ) as ApiResponse<number[]>;

        if (response.error) {
            throw new Error(response.error.message);
        }
        // 转换数据格式
        const data = response.data || [];
        return data.map((value) => ({
            date: startDate || new Date().toISOString(),
            value
        }));
    }

    /**
     * 获取所有活跃信号
     */
    async getActiveSignals(): Promise<MacroSignal[]> {
        const response = await this.marketRepo.getActiveSignals() as ApiResponse<MacroSignal[]>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || [];
    }

    /**
     * 获取特定指标信号
     */
    async getIndicatorSignal(seriesId: string): Promise<MacroSignal | null> {
        const response = await this.marketRepo.getIndicatorSignal(seriesId) as ApiResponse<MacroSignal>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || null;
    }

    /**
     * 获取当前经济周期
     */
    async getCurrentCycle(): Promise<EconomicCycle | null> {
        const response = await this.marketRepo.getCurrentCycle() as ApiResponse<EconomicCycle>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || null;
    }

    /**
     * 获取经济周期历史
     */
    async getCycleHistory(limit?: number): Promise<EconomicCycle[]> {
        const response = await this.marketRepo.getCycleHistory('default', String(limit || 100)) as ApiResponse<EconomicCycle[]>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || [];
    }

    // ========== 交易数据操作 ==========

    /**
     * 创建交易
     */
    async createTrade(tradeData: {
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
        status?: TradeStatus;
        tags?: string[];
        note?: string;
        emotionTag?: EmotionTag;
        macroCorrelations?: Trade['macroCorrelations'];
    }): Promise<Trade> {
        // 构建完整的 Trade 对象
        const now = new Date().toISOString();
        const trade: Trade = {
            id: crypto.randomUUID(),
            userId: tradeData.userId,
            symbol: tradeData.symbol,
            assetClass: tradeData.assetClass,
            direction: tradeData.direction,
            tradeType: tradeData.tradeType,
            entryPrice: tradeData.entryPrice,
            quantity: tradeData.quantity,
            positionSize: tradeData.positionSize || tradeData.entryPrice * tradeData.quantity,
            leverage: tradeData.leverage || 1,
            entryTime: tradeData.entryTime || now,
            status: tradeData.status || 'open',
            tags: tradeData.tags || [],
            note: tradeData.note,
            emotionTag: tradeData.emotionTag,
            macroCorrelations: tradeData.macroCorrelations || [],
            createdAt: now,
            updatedAt: now
        };

        const response = await this.tradeRepo.create(trade) as ApiResponse<Trade>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data!;
    }

    /**
     * 获取交易详情
     */
    async getTrade(id: string): Promise<Trade | null> {
        const response = await this.tradeRepo.findById(id) as ApiResponse<Trade>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || null;
    }

    /**
     * 获取用户所有交易
     */
    async getUserTrades(userId: string, filters?: {
        startDate?: string;
        endDate?: string;
        asset?: string;
        status?: 'open' | 'closed';
    }): Promise<Trade[]> {
        const query: { userId: string; startDate?: string; endDate?: string; symbol?: string; status?: TradeStatus[] } = {
            userId
        };

        if (filters?.startDate) query.startDate = filters.startDate;
        if (filters?.endDate) query.endDate = filters.endDate;
        if (filters?.asset) query.symbol = filters.asset;
        if (filters?.status) query.status = [filters.status];

        const response = await this.tradeRepo.findMany(query) as ApiResponse<Trade[]>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || [];
    }

    /**
     * 更新交易
     */
    async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | null> {
        const response = await this.tradeRepo.update(id, updates) as ApiResponse<Trade>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return response.data || null;
    }

    /**
     * 删除交易
     */
    async deleteTrade(id: string): Promise<boolean> {
        const response = await this.tradeRepo.delete(id) as ApiResponse<void>;
        if (response.error) {
            throw new Error(response.error.message);
        }
        return true;
    }

    /**
     * 获取交易统计
     */
    async getTradeStatistics(userId: string): Promise<TradeStatistics> {
        const [totalTradesRes, totalPnlRes, winRateRes, maxDrawdownRes] = await Promise.all([
            this.tradeRepo.count({ userId }) as Promise<ApiResponse<number>>,
            this.tradeRepo.sumPnl(userId) as Promise<ApiResponse<number>>,
            this.tradeRepo.calculateWinRate(userId) as Promise<ApiResponse<number>>,
            this.tradeRepo.calculateMaxDrawdown(userId) as Promise<ApiResponse<number>>
        ]);

        return {
            totalTrades: totalTradesRes.data || 0,
            totalPnl: totalPnlRes.data || 0,
            winRate: winRateRes.data || 0,
            maxDrawdown: maxDrawdownRes.data || 0
        };
    }

    // ========== 批量数据操作 ==========

    /**
     * 批量插入经济指标数据
     */
    async batchInsertEconomicData(
        data: Array<{
            seriesId: string;
            date: string;
            value: number;
        }>
    ): Promise<BatchInsertResult> {
        const result: BatchInsertResult = {
            success: true,
            insertedCount: 0,
            errorCount: 0,
            errors: []
        };

        try {
            // 分批处理
            const batchSize = this.config.batchSize || 1000;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);

                const { error } = await supabaseAdmin
                    .from('economic_data')
                    .upsert(
                        batch.map(item => ({
                            series_id: item.seriesId,
                            date: item.date,
                            value: item.value,
                            created_at: new Date().toISOString()
                        })),
                        { onConflict: 'series_id,date' }
                    );

                if (error) {
                    result.errorCount += batch.length;
                    result.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
                } else {
                    result.insertedCount += batch.length;
                }

                // 更新进度
                this.syncStatus.progress = Math.round((i + batch.length) / data.length * 100);
            }

            result.success = result.errorCount === 0;
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        return result;
    }

    /**
     * 批量插入交易记录
     */
    async batchInsertTrades(
        trades: Array<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }>
    ): Promise<BatchInsertResult> {
        const result: BatchInsertResult = {
            success: true,
            insertedCount: 0,
            errorCount: 0,
            errors: []
        };

        try {
            const batchSize = this.config.batchSize || 100;

            for (let i = 0; i < trades.length; i += batchSize) {
                const batch = trades.slice(i, i + batchSize);

                for (const tradeData of batch) {
                    try {
                        await this.createTrade(tradeData);
                        result.insertedCount++;
                    } catch (error) {
                        result.errorCount++;
                        result.errors.push(
                            error instanceof Error ? error.message : 'Failed to create trade'
                        );
                    }
                }
            }

            result.success = result.errorCount === 0;
        } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }

        return result;
    }

    // ========== 数据同步功能 ==========

    /**
     * 获取同步状态
     */
    getSyncStatus(): DataSyncStatus {
        return { ...this.syncStatus };
    }

    /**
     * 执行数据同步
     */
    async syncData(options: {
        seriesIds?: string[];
        startDate?: string;
        endDate?: string;
    } = {}): Promise<BatchInsertResult> {
        if (this.syncStatus.isRunning) {
            return {
                success: false,
                insertedCount: 0,
                errorCount: 0,
                errors: ['Sync is already running']
            };
        }

        this.syncStatus.isRunning = true;
        this.syncStatus.progress = 0;
        this.syncStatus.message = 'Starting sync...';

        try {
            // 这里实现具体的数据同步逻辑
            // 例如：从 FRED API 获取数据并插入
            this.syncStatus.message = 'Sync completed';
            this.syncStatus.lastSyncTime = new Date();

            return {
                success: true,
                insertedCount: 0,
                errorCount: 0,
                errors: []
            };
        } catch (error) {
            this.syncStatus.message = 'Sync failed';
            return {
                success: false,
                insertedCount: 0,
                errorCount: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        } finally {
            this.syncStatus.isRunning = false;
            this.syncStatus.progress = 100;
        }
    }

    // ========== 缓存管理 ==========

    /**
     * 清除缓存
     */
    clearCache(): void {
        // 实现缓存清除逻辑
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<DataServiceConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// 单例实例
let dataServiceInstance: DataService | null = null;

/**
 * 获取 DataService 实例
 */
export function getDataService(config?: DataServiceConfig): DataService {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService(config);
    }
    return dataServiceInstance;
}

/**
 * 重置 DataService 实例（用于测试）
 */
export function resetDataService(): void {
    dataServiceInstance = null;
}
