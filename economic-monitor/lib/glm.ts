// GLM-4.7 AI analysis module
// 智谱AI模型集成 - 支持GLM-4.7 FLASH

export type AnalysisMode = 'simple' | 'deep';
export type GLMModel = 'glm-4-flash' | 'glm-4-plus' | 'glm-4' | 'glm-3-turbo';

export interface AnalysisRequest {
  seriesId: string;
  seriesTitle: string;
  value: number;
  zScore: number;
  mean: number;
  stdDev: number;
  historicalValues: number[];
  displayText: string;
  lang?: 'en' | 'zh';
  mode?: AnalysisMode;
  glmModel?: GLMModel; // 添加GLM模型选择
}

export interface AnalysisResult {
  content: string;
  model: string;
  success: boolean;
  error?: string;
}

// GLM-4.7 模型配置
const GLM_MODEL_CONFIGS: Record<GLMModel, {
  model: string;
  maxTokens: number;
  temperature: number;
  description: string;
}> = {
  'glm-4-flash': {
    model: 'glm-4-flash',
    maxTokens: 128000,
    temperature: 0.7,
    description: 'GLM-4 Flash - 快速响应，适合实时分析'
  },
  'glm-4-plus': {
    model: 'glm-4-plus',
    maxTokens: 128000,
    temperature: 0.7,
    description: 'GLM-4 Plus - 平衡性能和质量'
  },
  'glm-4': {
    model: 'glm-4',
    maxTokens: 128000,
    temperature: 0.7,
    description: 'GLM-4 - 标准版本'
  },
  'glm-3-turbo': {
    model: 'glm-3-turbo',
    maxTokens: 128000,
    temperature: 0.7,
    description: 'GLM-3 Turbo - 高速处理'
  }
};

// 默认模型
const DEFAULT_GLM_MODEL: GLMModel = 'glm-4-flash';

export async function generateAnalysis(
  request: AnalysisRequest,
  apiKey: string
): Promise<AnalysisResult> {
  // 选择GLM模型，如果没有指定则使用默认
  const glmModel = request.glmModel || DEFAULT_GLM_MODEL;
  const config = GLM_MODEL_CONFIGS[glmModel];
  
  const lang = request.lang || 'zh';
  
  const prompt =
    lang === 'zh'
      ? `作为专业经济分析师，用50-80字简洁分析以下经济数据：

**指标**: ${request.seriesTitle} (${request.seriesId})
**当前值**: ${request.value.toFixed(2)}
**偏离状态**: ${request.displayText}
**Z-score**: ${request.zScore.toFixed(2)}
**历史均值**: ${request.mean.toFixed(2)}

请给出简短的状态评估和可能的经济影响分析。`
      : `As a professional economic analyst, provide a brief analysis (50-80 words) of the following economic data:

**Indicator**: ${request.seriesTitle} (${request.seriesId})
**Current Value**: ${request.value.toFixed(2)}
**Deviation Status**: ${request.displayText}
**Z-score**: ${request.zScore.toFixed(2)}
**Historical Mean**: ${request.mean.toFixed(2)}

Please provide a brief assessment and potential economic impact analysis.`;

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        content: '',
        model: config.model,
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || 'Analysis generation failed',
      model: config.model,
      success: true,
    };
  } catch (error) {
    return {
      content: '',
      model: config.model,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 获取可用的GLM模型列表
export function getAvailableGLMModels(): GLMModel[] {
  return Object.keys(GLM_MODEL_CONFIGS) as GLMModel[];
}

// 获取模型配置
export function getGLMModelConfig(model: GLMModel) {
  return GLM_MODEL_CONFIGS[model];
}

// 验证API密钥格式
export function validateGLMApiKey(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is empty' };
  }
  
  // GLM-4.7 API密钥通常以特定格式开头
  // 这里可以根据实际API要求添加验证逻辑
  return { valid: true };
}