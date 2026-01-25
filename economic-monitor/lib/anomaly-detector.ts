// Unified Anomaly Detector
// 统一异常检测器 - 根据指标类型自动选择 增强版GARCH 或 Z-Score

import { calculateZScore, ZScoreResult } from './zscore';
import { calculateEnhancedGARCH, type EnhancedGarchResult } from './enhanced-garch';
import { getAnalyzerType, getIndicatorInfo } from './fred';
import { getIndicatorCategory, getRecommendedWindow } from './volatility-analyzer';
import type { AnalyzerType, FREDSeriesInfo } from './fred';

// 类型定义
export type Severity = 'normal' | 'warning' | 'critical';

export interface AnomalyResult {
  seriesId: string;
  seriesTitle: string;
  currentValue: number;
  analyzer: AnalyzerType;
  severity: Severity;
  zScore: number;
  percentile?: number;
  mean?: number;
  stdDev?: number;
  trend?: 'up' | 'down' | 'stable';
  volatility?: 'low' | 'medium' | 'high';
  confidence?: number; // 增强版GARCH的置信度 (0-100)
  garchParams?: { // GARCH模型参数
    omega?: number;
    alpha?: number;
    beta?: number;
    persistence?: number;
  };
  displayText: {
    en: string;
    zh: string;
  };
  explanation: string;
}

export interface BatchAnomalyResult {
  results: AnomalyResult[];
  summary: {
    total: number;
    normal: number;
    warning: number;
    critical: number;
    garchCount: number;
    zscoreCount: number;
  };
}

// ========== 统一异常检测入口 ==========

/**
 * 检测单个指标是否异常（同步版本）
 * 根据指标类型自动选择分析方法
 */
export function detectAnomaly(
  seriesId: string,
  currentValue: number,
  historicalValues: number[]
): AnomalyResult {
  const analyzer = getAnalyzerType(seriesId);
  const indicator = getIndicatorInfo(seriesId);
  const category = getIndicatorCategory(seriesId);

  if (analyzer === 'garch') {
    // GARCH 指标使用 JavaScript 实现作为默认
    return detectWithGARCH(
      seriesId,
      currentValue,
      historicalValues,
      indicator,
      category
    );
  } else {
    // Z-Score 指标
    return detectWithZScore(
      seriesId,
      currentValue,
      historicalValues,
      indicator,
      category
    );
  }
}



/**
 * 使用 增强版 GARCH 检测异常
 */
function detectWithGARCH(
  seriesId: string,
  currentValue: number,
  historicalValues: number[],
  indicator?: FREDSeriesInfo,
  category?: ReturnType<typeof getIndicatorCategory>
): AnomalyResult {
  // 使用增强版GARCH实现
  const garchResult = calculateEnhancedGARCH(currentValue, historicalValues, {
    warningThreshold: category?.thresholds?.warning || 2,
    criticalThreshold: category?.thresholds?.critical || 3,
    useMLE: true,
    minDataPoints: getRecommendedWindow(seriesId)
  });
  
  return convertEnhancedGARCHResult(
    seriesId,
    currentValue,
    garchResult,
    indicator,
    category
  );
}

/**
 * 转换 增强版 GARCH 结果为统一格式
 */
function convertEnhancedGARCHResult(
  seriesId: string,
  currentValue: number,
  garchResult: EnhancedGarchResult,
  indicator?: FREDSeriesInfo,
  category?: ReturnType<typeof getIndicatorCategory>
): AnomalyResult {
  const thresholds = category?.thresholds || { warning: 2, critical: 3 };
  
  return {
    seriesId,
    seriesTitle: indicator?.title || seriesId,
    currentValue,
    analyzer: 'garch',
    severity: garchResult.severity,
    zScore: garchResult.zScore,
    mean: undefined, // GARCH 不直接提供均值
    stdDev: garchResult.conditionalVolatility,
    trend: garchResult.zScore > 0 ? 'up' : garchResult.zScore < 0 ? 'down' : 'stable',
    volatility: garchResult.conditionalVolatility > 0.5 ? 'high' : 
                 garchResult.conditionalVolatility > 0.2 ? 'medium' : 'low',
    confidence: garchResult.confidence,
    garchParams: {
      omega: garchResult.longRunVariance,
      alpha: garchResult.persistence * 0.1, // 估算值
      beta: garchResult.persistence * 0.9,  // 估算值
      persistence: garchResult.persistence,
    },
    displayText: {
      en: `Enhanced GARCH: Z=${garchResult.zScore.toFixed(2)}, σ=${garchResult.conditionalVolatility.toFixed(3)}% (${garchResult.confidence}% confidence)`,
      zh: `增强GARCH: Z=${garchResult.zScore.toFixed(2)}, σ=${garchResult.conditionalVolatility.toFixed(3)}% (${garchResult.confidence}%置信度)`
    },
    explanation: garchResult.explanation,
  };
}

/**
 * 转换旧版 GARCH 结果为统一格式 (兼容性)
 */
function convertGARCHResult(
  seriesId: string,
  currentValue: number,
  garchResult: any,
  indicator?: FREDSeriesInfo,
  category?: ReturnType<typeof getIndicatorCategory>
): AnomalyResult {
  const thresholds = category?.thresholds || { warning: 2, critical: 3 };
  
  return {
    seriesId,
    seriesTitle: indicator?.title || seriesId,
    currentValue,
    analyzer: 'garch',
    severity: garchResult.severity,
    zScore: garchResult.zScore,
    mean: undefined, // GARCH 不直接提供均值
    stdDev: garchResult.conditionalVolatility,
    trend: garchResult.zScore > 0 ? 'up' : garchResult.zScore < 0 ? 'down' : 'stable',
    volatility: garchResult.conditionalVolatility > 0.5 ? 'high' : 
                 garchResult.conditionalVolatility > 0.2 ? 'medium' : 'low',
    displayText: {
      en: `GARCH Analysis: Z=${garchResult.zScore.toFixed(2)}, Volatility=${garchResult.conditionalVolatility.toFixed(4)}%`,
      zh: `GARCH分析: Z分数=${garchResult.zScore.toFixed(2)}, 波动率=${garchResult.conditionalVolatility.toFixed(4)}%`
    },
    explanation: garchResult.explanation,
  };
}

/**
 * 使用 Z-Score + 百分位检测异常
 */
function detectWithZScore(
  seriesId: string,
  currentValue: number,
  historicalValues: number[],
  indicator?: FREDSeriesInfo,
  category?: ReturnType<typeof getIndicatorCategory>
): AnomalyResult {
  const zScoreResult = calculateZScore(currentValue, historicalValues);
  const thresholds = category?.thresholds || { warning: 2, critical: 3 };

  // 生成解释
  const explanation = generateExplanation(
    seriesId,
    indicator?.title || seriesId,
    currentValue,
    zScoreResult,
    thresholds
  );

  return {
    seriesId,
    seriesTitle: indicator?.title || seriesId,
    currentValue,
    analyzer: 'zscore',
    severity: zScoreResult.severity,
    zScore: zScoreResult.zScore,
    percentile: Math.round(zScoreResult.percentile),
    mean: zScoreResult.mean,
    stdDev: zScoreResult.stdDev,
    trend: zScoreResult.trend,
    volatility: zScoreResult.volatility,
    displayText: zScoreResult.displayText,
    explanation,
  };
}

/**
 * 批量检测多个指标
 */
export function detectBatchAnomalies(
  data: Array<{
    seriesId: string;
    currentValue: number;
    historicalValues: number[];
  }>
): BatchAnomalyResult {
  const results = data.map(d =>
    detectAnomaly(d.seriesId, d.currentValue, d.historicalValues)
  );

  const summary = {
    total: results.length,
    normal: results.filter(r => r.severity === 'normal').length,
    warning: results.filter(r => r.severity === 'warning').length,
    critical: results.filter(r => r.severity === 'critical').length,
    garchCount: results.filter(r => r.analyzer === 'garch').length,
    zscoreCount: results.filter(r => r.analyzer === 'zscore').length,
  };

  return { results, summary };
}

/**
 * 为前端生成简化版本的结果
 */
export function simplifyForFrontend(result: AnomalyResult) {
  return {
    id: result.seriesId,
    title: result.seriesTitle,
    value: result.currentValue,
    analyzer: result.analyzer,
    severity: result.severity,
    severityText: result.displayText.zh,
    zScore: result.zScore,
    percentile: result.percentile,
    mean: result.mean,
    trend: result.trend,
    volatility: result.volatility,
  };
}

// ========== 辅助函数 ==========

/**
 * 生成异常解释文本
 */
function generateExplanation(
  seriesId: string,
  title: string,
  value: number,
  zScoreResult: ZScoreResult,
  thresholds: { warning: number; critical: number }
): string {
  const { zScore, percentile, trend } = zScoreResult;
  const direction = zScore > 0 ? '高于' : '低于';
  const pct = Math.round(percentile);

  // 状态描述
  let status: string;
  if (Math.abs(zScore) < thresholds.warning) {
    status = '波动在正常范围内';
  } else if (Math.abs(zScore) < thresholds.critical) {
    status = `偏离历史均值${Math.abs(zScore).toFixed(1)}个标准差`;
  } else {
    status = '大幅偏离历史均值，可能存在异常';
  }

  // 趋势描述
  let trendText = '';
  if (trend === 'up') {
    trendText = '近期呈上升趋势';
  } else if (trend === 'down') {
    trendText = '近期呈下降趋势';
  }

  // 组合解释
  return `${title}
当前值: ${value.toFixed(2)}
${status} (Z=${zScore.toFixed(2)}，位于历史第${pct}百分位)
${trendText ? `${trendText}，` : ''}标准差=${zScoreResult.stdDev.toFixed(4)}
${seriesId === 'SOFR' && Math.abs(zScore) > 2 ? '⚠️ 利率异常波动可能预示流动性问题' : ''}
${seriesId === 'TEDRATE' && Math.abs(zScore) > 2 ? '⚠️ TED利差扩大表明银行间信用风险上升' : ''}
${seriesId === 'UNRATE' && zScore > 2 ? '⚠️ 失业率飙升可能预示经济衰退' : ''}
${seriesId === 'PCEPI' && zScore > 2 ? '⚠️ 通胀压力增大' : ''}`.trim();
}

/**
 * 获取高风险指标（需要优先关注）
 */
export function getHighPriorityAnomalies(results: AnomalyResult[]): AnomalyResult[] {
  return results
    .filter(r => r.severity === 'critical' || (r.severity === 'warning' && r.analyzer === 'garch'))
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

/**
 * 生成警报摘要
 */
export function generateAlertSummary(results: AnomalyResult[]): string {
  const critical = results.filter(r => r.severity === 'critical');
  const warnings = results.filter(r => r.severity === 'warning');

  if (critical.length === 0 && warnings.length === 0) {
    return '所有经济指标均在正常范围内';
  }

  const parts: string[] = [];

  if (critical.length > 0) {
    parts.push(`🔴 严重异常: ${critical.map(r => r.seriesId).join(', ')}`);
  }

  if (warnings.length > 0) {
    parts.push(`🟡 偏离预警: ${warnings.map(r => r.seriesId).join(', ')}`);
  }

  return parts.join('\n');
}
