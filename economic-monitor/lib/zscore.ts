// 简化的Z-Score计算
export interface ZScoreResult {
  currentZScore: number;
  percentile?: number;
  mean: number;
  stdDev: number;
  sampleSize: number;
}

/**
 * 计算Z-Score
 */
export function calculateZScore(
  data: any[],
  windowSize?: number
): ZScoreResult {
  if (!data || data.length === 0) {
    return {
      currentZScore: 0,
      percentile: 0.5,
      mean: 0,
      stdDev: 0,
      sampleSize: 0
    };
  }

  // 过滤有效数据
  const values = data
    .map(d => d.value)
    .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
    .map(v => Number(v));

  if (values.length < 2) {
    return {
      currentZScore: 0,
      percentile: 0.5,
      mean: values[0] || 0,
      stdDev: 0,
      sampleSize: values.length
    };
  }

  // 使用窗口大小或全部数据
  const analysisValues = windowSize && windowSize < values.length 
    ? values.slice(-windowSize)
    : values;

  // 计算均值
  const mean = analysisValues.reduce((sum, val) => sum + val, 0) / analysisValues.length;

  // 计算标准差
  const squaredDiffs = analysisValues.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // 获取当前值（最新的值）
  const currentValue = values[values.length - 1];

  // 计算Z-Score
  const zScore = stdDev === 0 ? 0 : (currentValue - mean) / stdDev;

  // 简单的百分位数估算（基于正态分布）
  const percentile = 0.5 * (1 + erf(zScore / Math.sqrt(2)));

  return {
    currentZScore: zScore,
    percentile,
    mean,
    stdDev,
    sampleSize: analysisValues.length
  };
}

/**
 * 误差函数近似实现
 */
function erf(x: number): number {
  // 使用近似公式计算误差函数
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}