// Simplified GARCH(1,1) implementation in JavaScript
// 简化版 GARCH 实现 - 无需 Python 服务
//
// 核心思想：
// - 波动率不是恒定的，而是时变的
// - 大波动后往往伴随大波动（波动聚集）
// - 用指数加权移动平均估计条件波动率

export interface GarchResult {
  zScore: number;
  conditionalVolatility: number;
  persistence: number;
  halfLife: number;
  isAnomaly: boolean;
  severity: 'normal' | 'warning' | 'critical';
  explanation: string;
}

export interface GarchConfig {
  omega: number;  // 常数项（长期波动率基准）
  alpha: number;  // 短期冲击影响系数
  beta: number;   // 波动率持续性系数
  lambda?: number; // EWMA 平滑参数（简化版用）
}

/**
 * 简化版 GARCH(1,1) - EWMA 实现
 * 
 * 与 Z-Score 的区别：
 * - Z-Score: σ = 常数（假设波动率不变）
 * - GARCH: σ_t = √(ω + αε²_{t-1} + βσ²_{t-1})
 * 
 * 简化版使用 EWMA（指数加权移动平均）：
 * σ²_t = λσ²_{t-1} + (1-λ)ε²_{t-1}
 */
export function calculateGARCH(
  currentValue: number,
  historicalValues: number[],
  lambda: number = 0.94,  // RiskMetrics 标准参数
  warningThreshold: number = 2,
  criticalThreshold: number = 3
): GarchResult {
  // 计算收益率序列
  const returns: number[] = [];
  const values = historicalValues.slice(-100); // 最多用100个点
  
  for (let i = 1; i < values.length; i++) {
    returns.push(Math.log(values[i] / values[i - 1]) * 100); // 百分比收益率
  }
  
  if (returns.length < 30) {
    return {
      zScore: 0,
      conditionalVolatility: 0,
      persistence: 0,
      halfLife: 0,
      isAnomaly: false,
      severity: 'normal',
      explanation: '数据不足，无法使用 GARCH 分析'
    };
  }

  // 计算当前收益率
  const currentReturn = Math.log(currentValue / values[values.length - 1]) * 100;

  // EWMA 估计条件波动率
  // σ²_t = λσ²_{t-1} + (1-λ)ε²_{t-1}
  let variance = 0;
  
  // 初始化：用历史方差
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const historicalVariance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  // 逆序计算（从旧到新）
  for (let i = 0; i < returns.length; i++) {
    const epsilon = returns[i] - mean;
    variance = lambda * (i === 0 ? historicalVariance : variance) + (1 - lambda) * epsilon * epsilon;
  }
  
  const conditionalVolatility = Math.sqrt(variance);
  
  // 计算 Z-Score（基于条件波动率）
  const zScore = conditionalVolatility === 0 ? 0 : (currentReturn - mean) / conditionalVolatility;
  
  // 波动率持续性（λ 越接近1，持续性越强）
  const persistence = lambda;
  
  // 半衰期 = ln(0.5) / ln(λ)
  const halfLife = Math.log(0.5) / Math.log(lambda);
  
  // 判断异常
  const absZ = Math.abs(zScore);
  let severity: 'normal' | 'warning' | 'critical';
  let explanation: string;
  
  if (absZ < warningThreshold) {
    severity = 'normal';
    explanation = `当前波动率 ${conditionalVolatility.toFixed(4)}% 处于正常范围`;
  } else if (absZ < criticalThreshold) {
    severity = 'warning';
    explanation = `波动率偏高 ${conditionalVolatility.toFixed(4)}%，但仍在预期范围内`;
  } else {
    severity = 'critical';
    explanation = `⚠️ 异常波动！波动率 ${conditionalVolatility.toFixed(4)}% 显著高于历史水平`;
  }
  
  return {
    zScore,
    conditionalVolatility,
    persistence,
    halfLife,
    isAnomaly: absZ >= warningThreshold,
    severity,
    explanation
  };
}

/**
 * 滚动 GARCH - 实时更新波动率
 * 适合监控 SOFR 这种高频数据
 */
export function rollingGARCH(
  values: number[],
  windowSize: number = 100,
  lambda: number = 0.94
): Array<{
  date: string;
  volatility: number;
  zScore: number;
}> {
  const results: Array<{ date: string; volatility: number; zScore: number }> = [];
  
  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const result = calculateGARCH(values[i], window, lambda);
    
    results.push({
      date: `t-${i}`,
      volatility: result.conditionalVolatility,
      zScore: result.zScore
    });
  }
  
  return results;
}

/**
 * GARCH 与 Z-Score 对比
 * 展示两种方法的区别
 */
export function compareGARCHvsZScore(
  currentValue: number,
  historicalValues: number[]
): {
  garch: { zScore: number; volatility: number; isAnomaly: boolean };
  zscore: { zScore: number; volatility: number; isAnomaly: boolean };
  comparison: string;
} {
  // Z-Score 计算
  const values = historicalValues.slice(-50);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1));
  const zScoreZscore = (currentValue - mean) / std;
  
  // GARCH 计算
  const garchResult = calculateGARCH(currentValue, historicalValues);
  
  const comparison = garchResult.conditionalVolatility > std * 1.5
    ? `GARCH 检测到当前波动率较高 (${garchResult.conditionalVolatility.toFixed(4)}% vs Z-Score 的 ${std.toFixed(4)}%)，这意味着危机时期的标准更宽松，避免误报。`
    : `两种方法结果接近，当前市场波动正常。`;
  
  return {
    garch: {
      zScore: garchResult.zScore,
      volatility: garchResult.conditionalVolatility,
      isAnomaly: garchResult.isAnomaly
    },
    zscore: {
      zScore: zScoreZscore,
      volatility: std,
      isAnomaly: Math.abs(zScoreZscore) > 2
    },
    comparison
  };
}

/**
 * 创建默认配置
 */
export function createGarchConfig(lambda: number = 0.94): GarchConfig {
  return {
    omega: 0.0001,  // 长期波动率基准
    alpha: 0.05,    // 短期冲击
    beta: lambda - 0.05, // 确保 alpha + beta = lambda
    lambda
  };
}
