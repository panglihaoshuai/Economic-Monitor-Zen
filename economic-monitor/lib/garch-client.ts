// GARCH Client - 支持JavaScript和Python两种实现
// 根据环境变量选择使用哪种实现

import { calculateEnhancedGARCH, type EnhancedGarchResult } from './enhanced-garch';

export interface GarchConfig {
  usePythonService: boolean;
  serviceUrl: string;
  fallbackToJS: boolean;
  timeout: number;
}

// 默认配置
const DEFAULT_CONFIG: GarchConfig = {
  usePythonService: process.env.GARCH_SERVICE_ENABLED === 'true',
  serviceUrl: process.env.GARCH_SERVICE_URL || 'http://localhost:8000',
  fallbackToJS: true, // 如果Python服务失败，回退到JS实现
  timeout: 10000, // 10秒超时
};

/**
 * 统一的 GARCH 分析接口
 */
export async function analyzeWithGARCH(
  currentValue: number,
  historicalValues: number[],
  config: Partial<GarchConfig> = {}
): Promise<EnhancedGarchResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 1. 优先使用Python服务（如果启用）
  if (finalConfig.usePythonService) {
    try {
      const result = await callPythonGARCHService(
        currentValue, 
        historicalValues, 
        finalConfig
      );
      
      // 转换Python结果为我们的GarchResult格式
      return convertPythonResult(result);
    } catch (error) {
      console.warn('[GARCH] Python service failed:', error);
      
      if (!finalConfig.fallbackToJS) {
        throw new Error(`Python GARCH service failed: ${error.message}`);
      }
      
      console.log('[GARCH] Falling back to JavaScript implementation');
    }
  }

  // 2. 使用JavaScript实现（增强版）
  return calculateEnhancedGARCH(currentValue, historicalValues);
}

/**
 * 调用Python GARCH服务
 */
async function callPythonGARCHService(
  currentValue: number,
  historicalValues: number[],
  config: GarchConfig
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(`${config.serviceUrl}/anomaly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_value: currentValue,
        historical_values: historicalValues,
        confidence_level: 0.95,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Python service returned error');
    }

    return data;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`GARCH service timeout (${config.timeout}ms)`);
    }
    
    throw error;
  }
}

/**
 * 转换Python结果为统一格式
 */
function convertPythonResult(pythonResult: any): EnhancedGarchResult {
  const zScore = pythonResult.z_score || 0;
  const conditionalVolatility = pythonResult.conditional_volatility || 0;
  const absZ = Math.abs(zScore);
  
  // 使用Python的结果判断严重程度
  let severity: 'normal' | 'warning' | 'critical';
  let isAnomaly: boolean;
  
  if (pythonResult.is_anomaly !== undefined) {
    isAnomaly = pythonResult.is_anomaly;
    severity = absZ > 3 ? 'critical' : absZ > 2 ? 'warning' : 'normal';
  } else {
    // 回退到默认逻辑
    isAnomaly = absZ > 2;
    severity = absZ > 3 ? 'critical' : absZ > 2 ? 'warning' : 'normal';
  }

  return {
    zScore,
    conditionalVolatility,
    persistence: pythonResult.persistence || 0.94, // 默认值
    halfLife: pythonResult.half_life || (Math.log(0.5) / Math.log(0.94)),
    longRunVariance: pythonResult.long_run_variance || conditionalVolatility,
    isAnomaly,
    severity,
    explanation: pythonResult.explanation || `Python GARCH检测: Z-Score=${zScore.toFixed(2)}, 波动率=${conditionalVolatility.toFixed(4)}%`,
    confidence: pythonResult.confidence || 80, // Python服务可能提供置信度
  };
}

/**
 * 健康检查 - 检查Python服务是否可用
 */
export async function checkGARCHServiceHealth(
  config: Partial<GarchConfig> = {}
): Promise<{ available: boolean; latency?: number; error?: string }> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!finalConfig.usePythonService) {
    return { available: false, error: 'Python service disabled' };
  }

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${finalConfig.serviceUrl}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { available: true, latency };
    } else {
      return { available: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    return { 
      available: false, 
      error: error.message || 'Connection failed' 
    };
  }
}

/**
 * 批量分析 - 支持多个指标
 */
export async function batchGARCHAnalysis(
  requests: Array<{
    seriesId: string;
    currentValue: number;
    historicalValues: number[];
  }>,
  config: Partial<GarchConfig> = {}
): Promise<Array<{
  seriesId: string;
  result: GarchResult;
  usedImplementation: 'python' | 'javascript';
  error?: string;
}>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 如果使用Python服务且有多个请求，可以考虑并行处理
  if (finalConfig.usePythonService) {
    try {
      const promises = requests.map(async (req) => {
        try {
          const result = await analyzeWithGARCH(
            req.currentValue, 
            req.historicalValues, 
            config
          );
          return {
            seriesId: req.seriesId,
            result,
            usedImplementation: finalConfig.usePythonService ? 'python' : 'javascript',
          };
        } catch (error) {
          return {
            seriesId: req.seriesId,
            result: null as any,
            usedImplementation: 'javascript',
            error: error.message,
          };
        }
      });
      
      return await Promise.all(promises);
      
    } catch (error) {
      console.error('[GARCH] Batch processing failed:', error);
    }
  }
  
  // 回退到JavaScript批量处理
  return requests.map((req) => ({
    seriesId: req.seriesId,
    result: calculateEnhancedGARCH(req.currentValue, req.historicalValues),
    usedImplementation: 'javascript',
  }));
}

/**
 * 获取服务状态
 */
export async function getGARCHServiceStatus() {
  const health = await checkGARCHServiceHealth();
  
  return {
    pythonEnabled: DEFAULT_CONFIG.usePythonService,
    pythonUrl: DEFAULT_CONFIG.serviceUrl,
    pythonAvailable: health.available,
    pythonLatency: health.latency,
    pythonError: health.error,
    fallbackEnabled: DEFAULT_CONFIG.fallbackToJS,
    defaultImplementation: DEFAULT_CONFIG.usePythonService ? 'python' : 'javascript',
  };
}