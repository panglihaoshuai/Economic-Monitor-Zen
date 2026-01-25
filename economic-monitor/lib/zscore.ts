// Z-score calculation and anomaly detection module
// 增强版：添加百分位计算，支持滚动窗口

export type Severity = 'normal' | 'warning' | 'critical';

export interface ZScoreResult {
  zScore: number;
  mean: number;
  stdDev: number;
  deviationPercent: number;
  percentile: number;  // 新增：百分位
  severity: Severity;
  displayText: {
    en: string;
    zh: string;
  };
  trend: 'up' | 'down' | 'stable';  // 新增：趋势
  volatility: 'low' | 'medium' | 'high';  // 新增：波动率
}

export interface ZScoreConfig {
  warningThreshold: number;
  criticalThreshold: number;
  minDataPoints: number;  // 新增：最小数据点数
  windowSize: number;  // 新增：滚动窗口大小
}

const DEFAULT_CONFIG: ZScoreConfig = {
  warningThreshold: 2,
  criticalThreshold: 3,
  minDataPoints: 12,
  windowSize: 24,
};

// ========== 核心计算函数 ==========

export function calculateZScore(
  currentValue: number,
  historicalValues: number[],
  config: ZScoreConfig = DEFAULT_CONFIG
): ZScoreResult {
  // 使用滚动窗口（如果数据量超过窗口大小）
  const values = historicalValues.length > config.windowSize
    ? historicalValues.slice(0, config.windowSize)
    : historicalValues;

  if (values.length < config.minDataPoints) {
    return createInsufficientDataResult(currentValue);
  }

  // 计算基本统计量
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    (values.length - 1);
  const stdDev = Math.sqrt(variance);

  // Z-Score 计算
  const zScore = stdDev === 0 ? 0 : (currentValue - mean) / stdDev;

  // 百分位计算（不依赖正态分布）
  const sortedValues = [...values].sort((a, b) => a - b);
  const percentile = (sortedValues.filter(v => v < currentValue).length / sortedValues.length) * 100;

  // 偏离百分比
  const deviationPercent = mean !== 0 ? ((currentValue - mean) / Math.abs(mean)) * 100 : 0;

  // 趋势判断（最近一半 vs 早一半）
  const midpoint = Math.floor(values.length / 2);
  const recentMean = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
  const olderMean = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint);
  const trend = recentMean > olderMean * 1.02 ? 'up' :
                recentMean < olderMean * 0.98 ? 'down' : 'stable';

  // 波动率水平（变异系数）
  const cv = stdDev / Math.abs(mean);
  const volatility = cv < 0.02 ? 'low' : cv < 0.05 ? 'medium' : 'high';

  // 严重程度判断
  const absZ = Math.abs(zScore);
  let severity: Severity;
  let displayText: { en: string; zh: string };

  if (absZ <= 1) {
    severity = 'normal';
    displayText = {
      en: zScore >= 0 ? 'Normal (slightly above average)' : 'Normal (slightly below average)',
      zh: zScore >= 0 ? '正常（略高于均值）' : '正常（略低于均值）',
    };
  } else if (absZ <= config.warningThreshold) {
    severity = 'warning';
    const direction = zScore > 0 ? 'above' : 'below';
    displayText = {
      en: `Slightly ${direction} historical average`,
      zh: `略${zScore > 0 ? '高于' : '低于'}历史均值`,
    };
  } else if (absZ <= config.criticalThreshold) {
    severity = 'warning';
    const direction = zScore > 0 ? 'above' : 'below';
    displayText = {
      en: `${zScore > 0 ? 'Above' : 'Below'} historical average`,
      zh: `${zScore > 0 ? '高于' : '低于'}历史均值`,
    };
  } else {
    severity = 'critical';
    const direction = zScore > 0 ? 'above' : 'below';
    displayText = {
      en: `Significantly ${direction} historical average`,
      zh: `大幅${zScore > 0 ? '高于' : '低于'}历史均值`,
    };
  }

  return {
    zScore,
    mean,
    stdDev,
    deviationPercent,
    percentile,
    severity,
    displayText,
    trend,
    volatility,
  };
}

/**
 * 创建数据不足的结果
 */
function createInsufficientDataResult(currentValue: number): ZScoreResult {
  return {
    zScore: 0,
    mean: currentValue,
    stdDev: 0,
    deviationPercent: 0,
    percentile: 50,
    severity: 'normal',
    displayText: {
      en: 'Insufficient data',
      zh: '数据不足',
    },
    trend: 'stable',
    volatility: 'low',
  };
}

// ========== 辅助函数 ==========

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    default:
      return 'text-green-600 bg-green-50 border-green-200';
  }
}

export function getSeverityIcon(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    default:
      return '🟢';
  }
}

export function getDeviationPercent(value: number, mean: number): string {
  if (mean === 0) return 'N/A';
  const percent = ((value - mean) / Math.abs(mean)) * 100;
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * 根据百分位判断严重程度（不依赖正态分布假设）
 */
export function getSeverityByPercentile(
  percentile: number,
  warningPercentile: number = 10,  // 低于10%或高于90%触发警告
  criticalPercentile: number = 5    // 低于5%或高于95%触发严重
): Severity {
  const deviation = Math.abs(50 - percentile);
  
  if (percentile < criticalPercentile || percentile > (100 - criticalPercentile)) {
    return 'critical';
  }
  if (percentile < warningPercentile || percentile > (100 - warningPercentile)) {
    return 'warning';
  }
  return 'normal';
}

/**
 * 计算百分位（使用线性插值）
 */
export function calculatePercentile(values: number[], value: number): number {
  if (values.length === 0) return 50;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  
  if (index === 0) return 0;
  if (index === -1) return 100;
  
  // 线性插值
  const lower = sorted[index - 1];
  const upper = sorted[index];
  const ratio = (value - lower) / (upper - lower);
  
  return ((index - 1 + ratio) / sorted.length) * 100;
}

/**
 * 创建配置
 */
export function createZScoreConfig(
  warningThreshold: number = 2,
  criticalThreshold: number = 3,
  minDataPoints: number = 12,
  windowSize: number = 24
): ZScoreConfig {
  return {
    warningThreshold,
    criticalThreshold,
    minDataPoints,
    windowSize,
  };
}
