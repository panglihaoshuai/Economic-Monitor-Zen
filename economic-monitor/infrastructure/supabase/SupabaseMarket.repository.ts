// ============================================================================
// 📁 infrastructure/supabase/SupabaseMarket.repository.ts
// ============================================================================
// Supabase 市场数据仓储实现
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type {
    IMarketRepository,
    IndicatorQueryParams,
} from '@/core/repositories/IMarket.repository';
import type {
    MacroIndicator,
    MacroSignal,
    EconomicCycle,
    ApiResponse,
} from '@/shared/types';
import {
    INDICATOR_CONFIGS,
    createMacroIndicator,
    createMacroSignal,
    determineEconomicCycle,
} from '@/core/entities/MacroIndicator.entity';

// ============================================================================
// 类型别名
// ============================================================================

// 使用 any 类型绕过 Supabase 类型问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EconomicDataRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnomalyRow = any;

// ============================================================================
// 仓储实现
// ============================================================================

export class SupabaseMarketRepository implements IMarketRepository {
    constructor(private supabase: SupabaseClient) { }

    // -------------------------------------------------------------------------
    // 指标数据
    // -------------------------------------------------------------------------

    async getAllIndicators(
        params?: IndicatorQueryParams
    ): Promise<ApiResponse<MacroIndicator[]>> {
        try {
            // 获取所有指标的最新数据
            const { data: latestData, error } = await this.supabase
                .from('economic_data')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            // 按 series_id 分组，获取每个指标的最新值
            const latestBySeries = new Map<string, EconomicDataRow>();
            latestData?.forEach((row) => {
                if (!latestBySeries.has(row.series_id)) {
                    latestBySeries.set(row.series_id, row);
                }
            });

            // 获取前一个值用于计算变化
            const seriesIds = Array.from(latestBySeries.keys());
            const previousValues = await this.getPreviousValues(seriesIds);

            // 构建指标列表
            const indicators: MacroIndicator[] = [];

            for (const [seriesId, latest] of Array.from(latestBySeries.entries())) {
                const config = INDICATOR_CONFIGS[seriesId as keyof typeof INDICATOR_CONFIGS];
                if (!config) continue;

                // 应用过滤条件
                if (params?.ids && !params.ids.includes(seriesId)) continue;
                if (params?.category && config.category !== params.category) continue;

                // 获取历史数据用于计算 Z 分数
                const historicalValues = await this.getHistoricalValuesForZScore(seriesId);

                const indicator = createMacroIndicator({
                    id: seriesId,
                    value: latest.value,
                    previousValue: previousValues.get(seriesId),
                    historicalValues,
                });

                // 应用状态过滤
                if (params?.status && !params.status.includes(indicator.status)) continue;

                indicators.push(indicator);

                // 应用数量限制
                if (params?.limit && indicators.length >= params.limit) break;
            }

            return {
                success: true,
                data: indicators,
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

    async getIndicatorById(
        id: string
    ): Promise<ApiResponse<MacroIndicator | null>> {
        try {
            const config = INDICATOR_CONFIGS[id as keyof typeof INDICATOR_CONFIGS];
            if (!config) {
                return {
                    success: false,
                    error: { code: 'UNKNOWN_INDICATOR', message: `Unknown indicator: ${id}` },
                };
            }

            // 获取最新值
            const { data: latestData, error } = await this.supabase
                .from('economic_data')
                .select('*')
                .eq('series_id', id)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            if (error || !latestData) {
                return {
                    success: false,
                    error: { code: 'NOT_FOUND', message: `No data found for indicator: ${id}` },
                };
            }

            // 获取前一个值
            const previousValue = await this.getPreviousValue(id);

            // 获取历史数据
            const historicalValues = await this.getHistoricalValuesForZScore(id);

            const indicator = createMacroIndicator({
                id,
                value: latestData.value,
                previousValue,
                historicalValues,
            });

            return {
                success: true,
                data: indicator,
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

    async getLatestValue(id: string): Promise<ApiResponse<number | null>> {
        try {
            const { data, error } = await this.supabase
                .from('economic_data')
                .select('value')
                .eq('series_id', id)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            return {
                success: true,
                data: data?.value ?? null,
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

    async getHistoricalData(
        id: string,
        startDate: string,
        endDate: string
    ): Promise<ApiResponse<number[]>> {
        try {
            const { data, error } = await this.supabase
                .from('economic_data')
                .select('value')
                .eq('series_id', id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true });

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            const values = data?.map((row) => row.value) ?? [];

            return {
                success: true,
                data: values,
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
    // 信号生成
    // -------------------------------------------------------------------------

    async getActiveSignals(): Promise<ApiResponse<MacroSignal[]>> {
        try {
            // 获取所有异常数据
            const { data: anomalies, error } = await this.supabase
                .from('anomalies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            // 转换为信号
            const signals: MacroSignal[] = [];
            const processedSeries = new Set<string>();

            for (const anomaly of anomalies ?? []) {
                // 每个指标只取最新的异常
                if (processedSeries.has(anomaly.series_id)) continue;
                processedSeries.add(anomaly.series_id);

                const indicator = await this.getIndicatorById(anomaly.series_id);
                if (indicator.success && indicator.data) {
                    const signal = createMacroSignal(indicator.data);
                    if (signal.type !== 'neutral') {
                        signals.push(signal);
                    }
                }
            }

            return {
                success: true,
                data: signals,
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

    async getIndicatorSignal(
        id: string
    ): Promise<ApiResponse<MacroSignal | null>> {
        try {
            const indicator = await this.getIndicatorById(id);
            if (!indicator.success || !indicator.data) {
                return indicator as ApiResponse<null>;
            }

            const signal = createMacroSignal(indicator.data);

            return {
                success: true,
                data: signal,
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
    // 经济周期
    // -------------------------------------------------------------------------

    async getCurrentCycle(): Promise<ApiResponse<EconomicCycle>> {
        try {
            // 获取关键指标
            const [gdp, unrate, pce, sofr] = await Promise.all([
                this.getIndicatorById('GDP'),
                this.getIndicatorById('UNRATE'),
                this.getIndicatorById('PCE'),
                this.getIndicatorById('SOFR'),
            ]);

            // 从指标数据中提取数值用于周期判断
            const gdpValue = gdp.success && gdp.data ? gdp.data.value : 0;
            const unrateValue = unrate.success && unrate.data ? unrate.data.value : 0;
            const sofrValue = sofr.success && sofr.data ? sofr.data.value : 0;
            const pceValue = pce.success && pce.data ? pce.data.value : 0;

            const cycle = determineEconomicCycle({
                gdpTrend: gdpValue,
                unemploymentRate: unrateValue,
                interestRateLevel: sofrValue,
                inflationLevel: pceValue,
            });

            return {
                success: true,
                data: cycle,
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

    async getCycleHistory(
        startDate: string,
        endDate: string
    ): Promise<ApiResponse<EconomicCycle[]>> {
        // TODO: 实现基于历史数据的经济周期分析
        // 这需要更复杂的时间序列分析
        return {
            success: true,
            data: [],
            meta: { timestamp: new Date().toISOString() },
        };
    }

    // -------------------------------------------------------------------------
    // 辅助方法
    // -------------------------------------------------------------------------

    private async getPreviousValue(id: string): Promise<number | undefined> {
        const { data } = await this.supabase
            .from('economic_data')
            .select('value')
            .eq('series_id', id)
            .order('date', { ascending: false })
            .limit(2);

        return data && data.length > 1 ? data[1].value : undefined;
    }

    private async getPreviousValues(
        seriesIds: string[]
    ): Promise<Map<string, number>> {
        const previousValues = new Map<string, number>();

        for (const id of seriesIds) {
            const previous = await this.getPreviousValue(id);
            if (previous !== undefined) {
                previousValues.set(id, previous);
            }
        }

        return previousValues;
    }

    private async getHistoricalValuesForZScore(
        id: string,
        limit: number = 252 // 默认一年交易日
    ): Promise<number[]> {
        const { data } = await this.supabase
            .from('economic_data')
            .select('value')
            .eq('series_id', id)
            .order('date', { ascending: false })
            .limit(limit);

        return data?.map((row) => row.value) ?? [];
    }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createSupabaseMarketRepository(
    supabase: SupabaseClient<Database>
): SupabaseMarketRepository {
    return new SupabaseMarketRepository(supabase);
}
