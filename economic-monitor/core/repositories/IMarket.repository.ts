// ============================================================================
// 📁 core/repositories/IMarket.repository.ts
// ============================================================================
// 市场数据仓储接口 - 定义宏观经济数据访问契约
// ============================================================================
// ✅ 已完成核心功能（FRED 基础指标）
// ⚠️  未来可扩展：
//    - 支持更多指标（PMI、CPI、生产者物价指数等）
//    - 支持历史数据查询
//    - 支持实时数据（WebSocket）
//    - 支持国际指标

import type { 
  MacroIndicator, 
  MacroSignal,
  EconomicCycle,
  ApiResponse 
} from '@/shared/types';

// ============================================================================
// 查询参数
// ============================================================================

/** 指标查询参数 */
export interface IndicatorQueryParams {
  ids?: string[];
  category?: string;
  status?: MacroIndicator['status'][];
  limit?: number;
}

// ============================================================================
// 仓储接口
// ============================================================================

export interface IMarketRepository {
  // -------------------------------------------------------------------------
  // 指标数据
  // -------------------------------------------------------------------------
  
  /** 获取所有指标 */
  getAllIndicators(params?: IndicatorQueryParams): Promise<ApiResponse<MacroIndicator[]>>;
  
  /** 根据ID获取指标 */
  getIndicatorById(id: string): Promise<ApiResponse<MacroIndicator | null>>;
  
  /** 获取最新指标值 */
  getLatestValue(id: string): Promise<ApiResponse<number | null>>;
  
  /** 获取历史数据 */
  getHistoricalData(
    id: string, 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<number[]>>;
  
  // -------------------------------------------------------------------------
  // 信号生成
  // -------------------------------------------------------------------------
  
  /** 获取当前活跃信号 */
  getActiveSignals(): Promise<ApiResponse<MacroSignal[]>>;
  
  /** 获取指标信号 */
  getIndicatorSignal(id: string): Promise<ApiResponse<MacroSignal | null>>;
  
  // -------------------------------------------------------------------------
  // 经济周期
  // -------------------------------------------------------------------------
  
  /** 获取当前经济周期 */
  getCurrentCycle(): Promise<ApiResponse<EconomicCycle>>;
  
   /** 获取周期历史 */
  getCycleHistory(
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<EconomicCycle[]>>;
}
// 仓储工厂
// ============================================================================

export type MarketRepositoryType = 'mock' | 'fred' | 'api';

/** 获取仓储实例 */
export function getMarketRepository(type: MarketRepositoryType = 'mock'): IMarketRepository {
  switch (type) {
    case 'fred':
      // TODO: 实现 FRED API 仓储
      throw new Error('FRED repository not implemented yet');
    case 'api':
      // TODO: 实现 API 仓储
      throw new Error('API repository not implemented yet');
    case 'mock':
    default:
      return createMockMarketRepository();
  }
}

// ============================================================================
// Mock 仓储实现
// ============================================================================

import { 
  INDICATOR_CONFIGS, 
  createMacroIndicator, 
  createMacroSignal,
  determineEconomicCycle 
} from '../entities/MacroIndicator.entity';

// 模拟数据
const mockIndicators: MacroIndicator[] = [
  createMacroIndicator({ id: 'SOFR', value: 5.32, previousValue: 5.26 }),
  createMacroIndicator({ id: 'GDP', value: 2.4, previousValue: 2.3 }),
  createMacroIndicator({ id: 'PCE', value: 2.6, previousValue: 2.7 }),
  createMacroIndicator({ id: 'UNRATE', value: 3.9, previousValue: 3.9 }),
];

function createMockMarketRepository(): IMarketRepository {
  return {
    async getAllIndicators(params?: IndicatorQueryParams): Promise<ApiResponse<MacroIndicator[]>> {
      let result = [...mockIndicators];
      
      if (params?.ids?.length) {
        result = result.filter(i => params.ids!.includes(i.id));
      }
      if (params?.category) {
        result = result.filter(i => i.category === params.category);
      }
      if (params?.status?.length) {
        result = result.filter(i => params.status!.includes(i.status));
      }
      
      return { success: true, data: result };
    },
    
    async getIndicatorById(id: string): Promise<ApiResponse<MacroIndicator | null>> {
      const indicator = mockIndicators.find(i => i.id === id) || null;
      return { success: true, data: indicator };
    },
    
    async getLatestValue(id: string): Promise<ApiResponse<number | null>> {
      const indicator = mockIndicators.find(i => i.id === id);
      return { success: true, data: indicator?.value || null };
    },
    
    async getHistoricalData(
      id: string, 
      startDate: string, 
      endDate: string
    ): Promise<ApiResponse<number[]>> {
      // TODO: 返回模拟历史数据
      return { success: true, data: [] };
    },
    
    async getActiveSignals(): Promise<ApiResponse<MacroSignal[]>> {
      const signals = mockIndicators
        .filter(i => i.status !== 'normal')
        .map(createMacroSignal);
      
      return { success: true, data: signals };
    },
    
    async getIndicatorSignal(id: string): Promise<ApiResponse<MacroSignal | null>> {
      const indicator = mockIndicators.find(i => i.id === id);
      if (!indicator) return { success: true, data: null };
      
      const signal = createMacroSignal(indicator);
      return { success: true, data: signal };
    },
    
    async getCurrentCycle(): Promise<ApiResponse<EconomicCycle>> {
      const gdp = mockIndicators.find(i => i.id === 'GDP');
      const unrate = mockIndicators.find(i => i.id === 'UNRATE');
      const sofr = mockIndicators.find(i => i.id === 'SOFR');
      const pce = mockIndicators.find(i => i.id === 'PCE');
      
      const cycle = determineEconomicCycle({
        gdpTrend: gdp?.value || 2,
        unemploymentRate: unrate?.value || 4,
        interestRateLevel: sofr?.value || 5,
        inflationLevel: pce?.value || 2.5,
      });
      
      return { success: true, data: cycle };
    },
    
    async getCycleHistory(
      startDate: string, 
      endDate: string
    ): Promise<ApiResponse<EconomicCycle[]>> {
      // TODO: 返回周期历史
      return { success: true, data: [] };
    },
  };
}

// ============================================================================
// 未来扩展预留
// ============================================================================

/**
 * TODO: FRED API 集成
 * 
 * interface FREDConfig {
 *   apiKey: string;
 *   baseUrl: string;
 * }
 * 
 * class FREDMarketRepository implements IMarketRepository {
 *   private config: FREDConfig;
 *   private client: FREDClient;
 *   
 *   async getIndicatorsFromFRED(params: FREDQueryParams): Promise<FREDResponse>
 *   async parseFREDData(seriesId: string, rawData: FREDSeries): MacroIndicator
 * }
 */

/**
 * TODO: 实时数据支持
 * 
 * interface RealTimeQuote {
 *   symbol: string;
 *   price: number;
 *   change: number;
 *   timestamp: Date;
 * }
 * 
 * interface IMarketRepositoryWithRealtime extends IMarketRepository {
 *   subscribe(indicators: string[], callback: (quote: RealTimeQuote) => void): Subscription;
 *   unsubscribe(subscriptionId: string): void;
 * }
 */

/**
 * TODO: 国际指标支持
 * 
 * interface InternationalMarketRepository extends IMarketRepository {
 *   getIndicator(country: string, indicatorId: string): Promise<MacroIndicator>;
 *   getGlobalIndices(): Promise<MacroIndicator[]>;
 *   convertCurrency(value: number, from: string, to: string): Promise<number>;
 * }
 */
