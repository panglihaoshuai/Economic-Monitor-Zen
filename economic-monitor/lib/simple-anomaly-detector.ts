// 简化的异常检测器
import { calculateZScore, ZScoreResult } from './zscore';
import { getIndicatorInfo } from './fred';
import { getIndicatorCategory } from './volatility-analyzer';

export type Severity = 'normal' | 'warning' | 'critical';

export interface AnomalyResult {
  seriesId: string;
  seriesTitle: string;
  currentValue: number;
  analyzer: string;
  severity: Severity;
  zScore: number;
  percentile?: number;
  threshold?: number;
  description: string;
  category: string;
  trend?: string;
}

export interface AnomalyDetectionOptions {
  windowSize?: number;
  threshold?: number;
  minimumDataPoints?: number;
}

// 默认选项
const defaultOptions: AnomalyDetectionOptions = {
  windowSize: 30,
  threshold: 2.0,
  minimumDataPoints: 20
};

/**
 * 检测异常数据
 */
export async function detectAnomalies(
  seriesId: string,
  data: any[],
  options: AnomalyDetectionOptions = {}
): Promise<AnomalyResult> {
  const opts = { ...defaultOptions, ...options };
  
  try {
    const indicatorInfo = getIndicatorInfo(seriesId);
    
    if (!data || data.length < opts.minimumDataPoints!) {
      return {
        seriesId,
        seriesTitle: indicatorInfo?.title || seriesId,
        currentValue: 0,
        analyzer: 'insufficient_data',
        severity: 'normal',
        zScore: 0,
        description: 'Insufficient data for anomaly detection',
        category: getIndicatorCategory(seriesId)
      };
    }

    // 使用Z-Score检测异常
    const zScoreResult = calculateZScore(data, opts.windowSize);
    
    // 获取当前值
    const currentValue = data[data.length - 1]?.value || 0;
    
    // 判断严重程度
    const absZScore = Math.abs(zScoreResult.currentZScore);
    let severity: Severity = 'normal';
    
    if (absZScore >= 3) {
      severity = 'critical';
    } else if (absZScore >= 2) {
      severity = 'warning';
    }

    // 趋势分析
    const trend = calculateTrend(data.slice(-10)); // 最近10个数据点
    
    return {
      seriesId,
      seriesTitle: indicatorInfo?.title || seriesId,
      currentValue,
      analyzer: 'zscore',
      severity,
      zScore: zScoreResult.currentZScore,
      percentile: zScoreResult.percentile,
      threshold: opts.threshold,
      description: generateDescription(zScoreResult.currentZScore, trend),
      category: getIndicatorCategory(seriesId),
      trend
    };
    
  } catch (error) {
    console.error(`[Anomaly Detector] Error analyzing ${seriesId}:`, error);
    
    return {
      seriesId,
      seriesTitle: seriesId,
      currentValue: 0,
      analyzer: 'error',
      severity: 'normal',
      zScore: 0,
      description: `Error in anomaly detection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      category: getIndicatorCategory(seriesId)
    };
  }
}

/**
 * 计算趋势
 */
function calculateTrend(dataPoints: any[]): string {
  if (dataPoints.length < 2) return 'stable';
  
  const values = dataPoints.map(p => p.value).filter(v => v !== null && v !== undefined);
  if (values.length < 2) return 'stable';
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i-1]) {
      increasing++;
    } else if (values[i] < values[i-1]) {
      decreasing++;
    }
  }
  
  if (increasing > decreasing * 1.5) return 'increasing';
  if (decreasing > increasing * 1.5) return 'decreasing';
  return 'stable';
}

/**
 * 生成描述文本
 */
function generateDescription(zScore: number, trend: string): string {
  const absZScore = Math.abs(zScore);
  const direction = zScore > 0 ? 'high' : 'low';
  
  if (absZScore >= 3) {
    return `Critically ${direction} value (${absZScore.toFixed(1)} sigma), trend is ${trend}`;
  } else if (absZScore >= 2) {
    return `Unusually ${direction} value (${absZScore.toFixed(1)} sigma), trend is ${trend}`;
  } else {
    return `Normal value with ${trend} trend`;
  }
}