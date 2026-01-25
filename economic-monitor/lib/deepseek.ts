// DeepSeek AI analysis module

export type AnalysisMode = 'simple' | 'deep';

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
  mode?: AnalysisMode; // 添加 mode 参数
}

export interface AnalysisResult {
  content: string;
  model: string;
  success: boolean;
  error?: string;
}

const MODEL_CONFIGS = {
  simple: {
    model: 'deepseek-chat',
    maxTokens: 150,
    temperature: 0.7,
  },
  deep: {
    model: 'deepseek-reasoner',
    maxTokens: 500,
    temperature: 0.5,
  },
};

export async function generateAnalysis(
  request: AnalysisRequest,
  apiKey: string
): Promise<AnalysisResult> {
  // 根据 mode 参数选择模型配置，默认使用 simple
  const mode: AnalysisMode = request.mode || 'simple';
  const config = MODEL_CONFIGS[mode];
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
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
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

export async function generateDeepAnalysis(
  request: AnalysisRequest,
  apiKey: string
): Promise<AnalysisResult> {
  const config = MODEL_CONFIGS.deep;
  const lang = request.lang || 'zh';

  const prompt =
    lang === 'zh'
      ? `作为资深经济学家，对以下经济指标进行深度分析（约200字）：

**指标**: ${request.seriesTitle} (${request.seriesId})
**当前值**: ${request.value.toFixed(2)}
**当前偏离程度**: ${request.displayText} (Z-score: ${request.zScore.toFixed(2)})
**历史统计**: 均值=${request.mean.toFixed(2)}，标准差=${request.stdDev.toFixed(2)}
**最近12期数据**: ${request.historicalValues.slice(-12).map((v) => v.toFixed(2)).join(', ')}

请从以下角度深入分析：
1. 当前经济状况评估
2. 可能的原因和政策影响
3. 未来走势展望
4. 对投资者/决策者的建议`
      : `As a senior economist, provide an in-depth analysis (about 200 words) of the following economic indicator:

**Indicator**: ${request.seriesTitle} (${request.seriesId})
**Current Value**: ${request.value.toFixed(2)}
**Deviation Status**: ${request.displayText} (Z-score: ${request.zScore.toFixed(2)})
**Historical Stats**: Mean=${request.mean.toFixed(2)}, StdDev=${request.stdDev.toFixed(2)}
**Recent 12 Data Points**: ${request.historicalValues.slice(-12).map((v) => v.toFixed(2)).join(', ')}

Please analyze in depth from the following perspectives:
1. Current economic condition assessment
2. Possible causes and policy impacts
3. Future outlook
4. Recommendations for investors/policymakers`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
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
      content: data.choices[0]?.message?.content || 'Deep analysis generation failed',
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
