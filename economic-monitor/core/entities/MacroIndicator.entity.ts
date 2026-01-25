// ============================================================================
// 📁 core/entities/MacroIndicator.entity.ts
// ============================================================================
// 宏观经济指标实体 - 领域模型
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持更多指标（PMI、CPI、生产者物价指数等）
//    - 支持指标相关性分析
//    - 支持自定义指标
//    - 支持国际指标（日本、欧洲等）

import type { 
  MacroIndicator, 
  MacroSignal,
  EconomicCycle,
  IndicatorStatus 
} from '@/shared/types';

// ============================================================================
// 常量定义
// ============================================================================

/** 指标分类 */
export const INDICATOR_CATEGORIES = {
  growth: '增长',
  inflation: '通胀',
  labor: '就业',
  rates: '利率',
} as const;

/** 指标更新频率 */
export const INDICATOR_FREQUENCIES = {
  daily: '日度',
  weekly: '周度',
  monthly: '月度',
  quarterly: '季度',
} as const;

/** Z分数阈值 */
export const Z_SCORE_THRESHOLDS = {
  normal: 1.0,      // |Z| < 1.0  正常
  warning: 2.0,     // 1.0 < |Z| < 2.0 警告
  critical: 3.0,    // |Z| > 2.0 异常
} as const;

/** 历史分位阈值 */
export const PERCENTILE_THRESHOLDS = {
  low: 25,          // 历史低位
  high: 75,         // 历史高位
} as const;

// ============================================================================
// 指标定义
// ============================================================================

/** 预定义指标配置 */
export const INDICATOR_CONFIGS = {
  SOFR: {
    id: 'SOFR',
    name: 'SOFR 利率',
    category: 'rates',
    unit: '%',
    frequency: 'daily',
    description: '担保隔夜融资利率，美国最重要的短期利率指标',
    normalRange: { min: 0, max: 5.5 },
  },
  GDP: {
    id: 'GDP',
    name: 'GDP 增长',
    category: 'growth',
    unit: '%',
    frequency: 'quarterly',
    description: '国内生产总值增长率，经济健康状况的核心指标',
    normalRange: { min: -5, max: 5 },
  },
  PCE: {
    id: 'PCE',
    name: 'PCE 通胀',
    category: 'inflation',
    unit: '%',
    frequency: 'monthly',
    description: '个人消费支出价格指数，美联储首选的通胀指标',
    normalRange: { min: 0, max: 5 },
  },
  UNRATE: {
    id: 'UNRATE',
    name: '失业率',
    category: 'labor',
    unit: '%',
    frequency: 'monthly',
    description: '失业率，劳动力市场健康状况的关键指标',
    normalRange: { min: 2, max: 10 },
  },
  // TODO: 未来可添加更多指标
  // CPI: { /* ... */ },
  // PMI: { /* ... */ },
  // DGS10: { /* ... */ },
  // TEDRATE: { /* ... */ },
} as const;

// ============================================================================
// 工厂函数
// ============================================================================

/** 创建宏观指标 */
export function createMacroIndicator(params: {
  id: string;
  value: number;
  previousValue?: number;
  historicalValues?: number[];
}): MacroIndicator {
  const config = INDICATOR_CONFIGS[params.id as keyof typeof INDICATOR_CONFIGS];
  
  if (!config) {
    throw new Error(`Unknown indicator: ${params.id}`);
  }
  
  const change = params.previousValue 
    ? params.value - params.previousValue 
    : 0;
  const changePercent = params.previousValue 
    ? (change / params.previousValue) * 100 
    : 0;
  
  // 计算 Z 分数（如果有足够的历史数据）
  const zScore = params.historicalValues && params.historicalValues.length > 1
    ? calculateZScore(params.value, params.historicalValues)
    : 0;
  
  // 计算历史分位
  const percentile = params.historicalValues && params.historicalValues.length > 10
    ? calculatePercentile(params.value, params.historicalValues)
    : 50;
  
  // 判断状态
  const status = determineStatus(zScore);
  
  // 生成描述
  const description = generateDescription(params.id, params.value, change, status);
  
  return {
    id: params.id,
    name: config.name,
    value: params.value,
    previousValue: params.previousValue,
    change,
    changePercent,
    zScore,
    percentile,
    status,
    description,
    category: config.category,
    unit: config.unit,
    frequency: config.frequency,
  };
}

/** 创建宏观信号 */
export function createMacroSignal(indicator: MacroIndicator): MacroSignal {
  const { zScore, value, status, id, percentile } = indicator;
  
  // 判断信号类型
  let type: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let severity: IndicatorStatus = 'normal';
  let description = '';
  let expectedImpact = '';
  
  // 根据指标类型和状态生成信号
  switch (id) {
    case 'SOFR': {
      // SOFR 下降对风险资产有利
      if (zScore < -1) {
        type = 'bullish';
        severity = status;
        description = `SOFR 降至 ${value.toFixed(2)}%，流动性改善`;
        expectedImpact = '股票、加密货币可能上涨';
      } else if (zScore > 1) {
        type = 'bearish';
        severity = status;
        description = `SOFR 升至 ${value.toFixed(2)}%，流动性收紧`;
        expectedImpact = '股票、加密货币可能承压';
      }
      break;
    }
    case 'GDP': {
      // GDP 增长对风险资产有利
      if (value > 2) {
        type = 'bullish';
        severity = percentile > 80 ? 'warning' : 'normal';
        description = `GDP 增长 ${value.toFixed(1)}%，经济强劲`;
        expectedImpact = '顺周期资产受益';
      } else if (value < 0) {
        type = 'bearish';
        severity = 'critical';
        description = `GDP 负增长 ${value.toFixed(1)}%，经济衰退风险`;
        expectedImpact = '防御配置增加';
      }
      break;
    }
    case 'PCE': {
      // PCE 接近 2% 是理想的
      if (value > 3) {
        type = 'bearish';
        severity = percentile > 80 ? 'critical' : 'warning';
        description = `PCE 通胀 ${value.toFixed(1)}%，高于目标`;
        expectedImpact = '美联储可能维持紧缩政策';
      } else if (value < 1.5) {
        type = 'bullish';
        severity = 'normal';
        description = `PCE 通胀 ${value.toFixed(1)}%，接近目标`;
        expectedImpact = '美联储可能转向宽松';
      }
      break;
    }
    case 'UNRATE': {
      // 失业率低对经济有信心，但过高有风险
      if (value < 3.5) {
        type = 'bullish';
        severity = percentile < 20 ? 'warning' : 'normal';
        description = `失业率 ${value.toFixed(1)}%，劳动力市场强劲`;
        expectedImpact = '消费支出可能增加';
      } else if (value > 6) {
        type = 'bearish';
        severity = percentile > 80 ? 'critical' : 'warning';
        description = `失业率 ${value.toFixed(1)}%，经济放缓信号`;
        expectedImpact = '防御性配置增加';
      }
      break;
    }
  }
  
  const now = new Date();
  
  return {
    indicatorId: id,
    type,
    severity,
    confidence: Math.min(Math.abs(zScore) / 3, 1), // Z分数越高置信度越高
    description,
    expectedImpact,
    validFrom: now.toISOString(),
    validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24小时有效
  };
}

// ============================================================================
// 经济周期判断
// ============================================================================

/** 判断经济周期（简化版） */
export function determineEconomicCycle(params: {
  gdpTrend: number;      // GDP 趋势
  unemploymentRate: number; // 失业率
  interestRateLevel: number; // 利率水平
  inflationLevel: number;   // 通胀水平
}): EconomicCycle {
  const { gdpTrend, unemploymentRate, interestRateLevel, inflationLevel } = params;
  
  // 简化判断逻辑
  if (gdpTrend > 2 && unemploymentRate < 4 && interestRateLevel > 4) {
    return {
      phase: 'late_expansion',
      confidence: 0.75,
      description: '扩张后期',
      recommendation: '建议减少风险敞口，增加防御配置',
    };
  } else if (gdpTrend > 2 && unemploymentRate < 4) {
    return {
      phase: 'mid_expansion',
      confidence: 0.8,
      description: '扩张中期',
      recommendation: '可适度增加风险敞口',
    };
  } else if (gdpTrend > 0) {
    return {
      phase: 'early_expansion',
      confidence: 0.7,
      description: '扩张前期',
      recommendation: '经济复苏初期，建议逐步建仓',
    };
  } else if (gdpTrend < -1 && unemploymentRate > 5) {
    return {
      phase: 'mid_contraction',
      confidence: 0.8,
      description: '收缩中期',
      recommendation: '建议防御配置，减少风险敞口',
    };
  } else if (gdpTrend < 0) {
    return {
      phase: 'early_contraction',
      confidence: 0.7,
      description: '收缩前期',
      recommendation: '经济放缓信号，关注防御性资产',
    };
  }
  
  return {
    phase: 'mid_expansion',
    confidence: 0.5,
    description: '不确定',
    recommendation: '建议均衡配置',
  };
}

// ============================================================================
// 统计方法
// ============================================================================

/** 计算 Z 分数 */
function calculateZScore(value: number, historical: number[]): number {
  const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
  const variance = historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/** 计算历史分位 */
function calculatePercentile(value: number, historical: number[]): number {
  const sorted = [...historical].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

/** 判断状态 */
function determineStatus(zScore: number): IndicatorStatus {
  const absZ = Math.abs(zScore);
  if (absZ > Z_SCORE_THRESHOLDS.critical) return 'critical';
  if (absZ > Z_SCORE_THRESHOLDS.warning) return 'warning';
  return 'normal';
}

/** 生成描述 */
function generateDescription(
  id: string, 
  value: number, 
  change: number, 
  status: IndicatorStatus
): string {
  const changeText = change > 0 ? '上升' : change < 0 ? '下降' : '稳定';
  const statusText = status === 'critical' ? '异常' : status === 'warning' ? '偏高/低' : '正常';
  
  const descriptions: Record<string, string> = {
    SOFR: `利率${changeText}至${value.toFixed(2)}%，${statusText}`,
    GDP: `GDP增长${value.toFixed(1)}%，${statusText}`,
    PCE: `通胀${value.toFixed(1)}%，${statusText}`,
    UNRATE: `失业率${value.toFixed(1)}%，${statusText}`,
  };
  
  return descriptions[id] || `${value}${statusText}`;
}

// ============================================================================
// 格式化方法
// ============================================================================

/** 格式化指标值 */
export function formatIndicatorValue(value: number, unit: string, decimals: number = 2): string {
  return `${value.toFixed(decimals)}${unit}`;
}

/** 格式化变化 */
export function formatChange(change: number): string {
  if (change === 0) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/** 格式化分位条 */
export function renderPercentileBar(percentile: number, length: number = 20): string {
  const filled = Math.round(percentile / (100 / length));
  const bar = '█'.repeat(filled) + '░'.repeat(length - filled);
  return bar;
}

// ============================================================================
// 未来扩展预留
// ============================================================================

/**
 * TODO: 未来功能 - 多指标相关性分析
 * 
 * function calculateIndicatorCorrelation(
 *   indicators: MacroIndicator[]
 * ): Record<string, number>
 */

/**
 * TODO: 未来功能 - 领先/滞后指标判断
 * 
 * interface LeadingIndicator {
 *   indicatorId: string;
 *   leadsBy: number;        // 领先月数
 *   predicts: string[];    // 预测的指标
 *   confidence: number;
 * }
 * 
 * function identifyLeadingIndicators(indicators: MacroIndicator[]): LeadingIndicator[]
 */

/**
 * TODO: 未来功能 - 国际指标支持
 * 
 * interface InternationalIndicator {
 *   country: string;
 *   region: string;         // APAC, EMEA, Americas
 *   currency: string;
 *   localName: string;
 *   localDescription: string;
 * }
 */
