import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { INDICATORS } from '@/lib/fred';
import { getInvestmentInsight, getIndicatorCategory } from '@/lib/volatility-analyzer';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Locale = 'en' | 'zh';
type UserLanguage = Database['public']['Tables']['users']['Row']['language'];

// Detect if message is in Chinese or English
function detectLanguage(message: string): Locale {
  const chinesePattern = /[\u4e00-\u9fa5]/;
  const englishPattern = /^[a-zA-Z\s\d\.,!?]+$/;

  const chineseChars = (message.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = message.length;

  // If more than 20% Chinese characters, assume Chinese
  if (chineseChars / totalChars > 0.2) {
    return 'zh';
  }

  // If message starts with Chinese characters, assume Chinese
  if (/^[\u4e00-\u9fa5]/.test(message.trim())) {
    return 'zh';
  }

  return 'en';
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 获取用户配置（如果有）
    let userDeepseekKey: string | null = null;
    let userLanguage: Locale = 'zh';
    if (session?.user?.id) {
      type UserRow = Database['public']['Tables']['users']['Row'];
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('deepseek_api_key_encrypted, language')
        .eq('id', session.user.id)
        .single() as { data: UserRow | null; error: { message: string } | null };

      if (userData) {
        if (userData.deepseek_api_key_encrypted) {
          const { decrypt } = await import('@/lib/encryption');
          userDeepseekKey = decrypt(userData.deepseek_api_key_encrypted);
        }
        if (userData.language) {
          userLanguage = userData.language as Locale;
        }
      }
    }

    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 检测用户消息语言
    const detectedLang = detectLanguage(message);
    const useLang = userLanguage === 'zh' && detectedLang === 'zh' ? 'zh' : 'en';

    // 使用系统默认的 DeepSeek key（如果没有用户配置的 key）
    const apiKey = userDeepseekKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      // 如果没有 API key，返回预设的回答
      const response = generatePresetResponse(message, useLang);
      return NextResponse.json({ response });
    }

    // 智能判断问题类型并生成回答
    const response = await generateSmartResponse(message, apiKey, useLang);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

async function generateSmartResponse(message: string, apiKey: string, lang: Locale): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // 1. 如果是问特定指标
  for (const [id, indicator] of Object.entries(INDICATORS)) {
    if (lowerMessage.includes(id.toLowerCase()) ||
      lowerMessage.includes(indicator.title.toLowerCase()) ||
      lowerMessage.includes(indicator.title.toLowerCase().replace(' ', '-'))) {

      const insight = getInvestmentInsight(id);
      if (insight) {
        return generateIndicatorResponse(id, indicator.title, insight, lang);
      }
    }
  }

  // 2. 如果是问周期/宏观
  const cycleKeywordsZh = ['周期', '宏观', '经济', '当前'];
  const cycleKeywordsEn = ['market cycle', 'economy', 'current economic', 'where are we'];
  if (cycleKeywordsZh.some(k => lowerMessage.includes(k)) ||
    cycleKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateCycleResponse(lang);
  }

  // 3. 如果是问投资建议
  const investKeywordsZh = ['投资', '应该', '买', '卖', '加仓', '减仓', '配置', '仓位'];
  const investKeywordsEn = ['advice', 'should', 'invest', 'buy', 'sell', 'portfolio', 'allocation'];
  if (investKeywordsZh.some(k => lowerMessage.includes(k)) ||
    investKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateInvestmentResponse(lang);
  }

  // 4. 如果是问美联储/利率
  const fedKeywordsZh = ['美联储', '加息', '降息', '利率', 'fed', 'rate hike', 'rate cut'];
  const fedKeywordsEn = ['fed', 'federal reserve', 'interest rate', 'rate hike', 'rate cut', 'monetary policy'];
  if (fedKeywordsZh.some(k => lowerMessage.includes(k)) ||
    fedKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateFedResponse(lang);
  }

  // 5. 默认：使用 AI 生成
  return await generateAIDirectResponse(message, apiKey, lang);
}

function generateIndicatorResponse(id: string, title: string, insight: any, lang: Locale): string {
  if (lang === 'zh') {
    return `## ${title} (${id})

### 📊 当前状态
- 当前值: ${getLatestValue(id)}%
- 位置: 历史第 ${getPercentile(id)} 百分位

### 💡 投资含义
**${insight.summary}**

${insight.interpretation}

### 📉 对股市影响
${insight.impactOnStocks}

### 📊 对债市影响
${insight.impactOnBonds}

### 💼 投资建议
${insight.suggestion}

---
*数据来源: FRED API | 更新: 最近一次更新*`;
  } else {
    return `## ${title} (${id})

### 📊 Current Status
- Current Value: ${getLatestValue(id)}%
- Position: ${getPercentile(id)}th percentile

### 💡 Investment Insight
**${insight.summary}**

${insight.interpretation}

### 📉 Impact on Stocks
${insight.impactOnStocks}

### 📊 Impact on Bonds
${insight.impactOnBonds}

### 💼 Investment Suggestion
${insight.suggestion}

---
*Data Source: FRED API | Last Updated: Recent*`;
  }
}

function generateCycleResponse(lang: Locale): string {
  if (lang === 'zh') {
    return `## 📍 当前宏观经济周期定位

### 扩张中后期

根据当前的核心经济指标（SOFR、失业率、PCE通胀、GDP）综合判断：

- **GDP增长**: 约 2-3%，温和扩张
- **失业率**: 约 3.7-4.0%，处于历史低位
- **通胀**: 约 2.5-3.0%，逐步回落
- **利率**: SOFR 约 5.3%，处于周期高位

### 历史类似时期
类似 2017 年或 1990 年代中期

### 预期
- 股市仍有上涨空间
- 但需警惕周期尾部风险
- 建议保持均衡配置

### 关注点
- 美联储政策转向信号
- 通胀回落速度
- 就业市场变化`;
  } else {
    return `## 📍 Current Economic Cycle Position

### Mid-to-Late Expansion

Based on core economic indicators (SOFR, Unemployment, PCE Inflation, GDP):

- **GDP Growth**: ~2-3%, moderate expansion
- **Unemployment**: ~3.7-4.0%, historical low
- **Inflation**: ~2.5-3.0%, gradually declining
- **Rates**: SOFR ~5.3%, cycle high

### Historical Comparison
Similar to 2017 or mid-1990s

### Outlook
- Stock market still has upside potential
- But be cautious of late-cycle risks
- Recommend balanced allocation

### Key Monitor Points
- Fed policy pivot signals
- Inflation decline pace
- Labor market changes`;
  }
}

function generateInvestmentResponse(lang: Locale): string {
  if (lang === 'zh') {
    return `## 💼 投资建议

### 当前宏观环境
- 经济处于扩张中后期
- 利率处于周期高位
- 通胀逐步回落

### 投资策略

**股票**
- 可适度增配优质蓝筹股
- 减少高估值成长股敞口
- 关注收益型板块（公用事业、必需消费）

**债券**
- 可配置短久期债券
- 规避长久期债券（利率风险）
- 关注信用利差变化

**另类资产**
- 黄金可作为对冲配置
- 房地产需谨慎（利率敏感）

### 风险提示
- 美联储政策不确定性
- 地缘政治风险
- 经济数据波动

*以上建议仅供参考，不构成投资建议。*`;
  } else {
    return `## 💼 Investment Recommendations

### Current Macro Environment
- Economy in mid-to-late expansion
- Rates at cycle high
- Inflation gradually declining

### Investment Strategy

**Stocks**
- Moderate allocation to quality blue chips
- Reduce exposure to high-valuation growth stocks
- Focus on dividend-paying sectors (utilities, consumer staples)

**Bonds**
- Short-duration bonds recommended
- Avoid long-duration bonds (interest rate risk)
- Monitor credit spread changes

**Alternatives**
- Gold as hedge allocation
- Real estate caution (rate-sensitive)

### Risk Warnings
- Fed policy uncertainty
- Geopolitical risks
- Economic data volatility

*These recommendations are for reference only and do not constitute investment advice.*`;
  }
}

function generateFedResponse(lang: Locale): string {
  if (lang === 'zh') {
    return `## 🏦 美联储政策展望

### 当前立场
美联储正处于加息周期的末期或暂停期。

### 关键观察
1. **通胀数据**: PCE 已从高点回落，但仍在 2% 以上
2. **就业市场**: 仍然紧张，但开始出现放缓迹象
3. **经济数据**: 增长放缓但未衰退

### 市场预期
- 年内降息预期正在调整
- 利率可能维持在高位一段时间

### 投资影响
- 利率敏感资产（成长股、房地产）承压
- 价值股相对抗跌
- 现金类资产收益较高`;
  } else {
    return `## 🏦 Fed Policy Outlook

### Current Stance
The Fed is at the end or pause of its rate hiking cycle.

### Key Observations
1. **Inflation Data**: PCE has declined from highs but remains above 2%
2. **Labor Market**: Still tight but showing signs of slowing
3. **Economic Data**: Slowing growth but no recession

### Market Expectations
- Rate cut expectations being adjusted for the year
- Rates likely to remain elevated for some time

### Investment Implications
- Rate-sensitive assets (growth stocks, real estate) under pressure
- Value stocks relatively resilient
- Cash assets offer higher yields`;
  }
}

function generatePresetResponse(message: string, lang: Locale): string {
  const lowerMessage = message.toLowerCase();

  // Check for indicator-specific questions
  for (const [id, indicator] of Object.entries(INDICATORS)) {
    if (lowerMessage.includes(id.toLowerCase()) ||
      lowerMessage.includes(indicator.title.toLowerCase())) {
      const insight = getInvestmentInsight(id);
      if (insight) {
        return generateIndicatorResponse(id, indicator.title, insight, lang);
      }
    }
  }

  // Check for cycle/macro questions
  const cycleKeywordsZh = ['周期', '宏观', '经济', '当前'];
  const cycleKeywordsEn = ['market cycle', 'economy', 'current economic'];
  if (cycleKeywordsZh.some(k => lowerMessage.includes(k)) ||
    cycleKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateCycleResponse(lang);
  }

  // Check for investment advice
  const investKeywordsZh = ['投资', '应该', '买', '卖', '配置', '仓位'];
  const investKeywordsEn = ['advice', 'should', 'invest', 'portfolio'];
  if (investKeywordsZh.some(k => lowerMessage.includes(k)) ||
    investKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateInvestmentResponse(lang);
  }

  // Check for Fed/rate questions
  const fedKeywordsZh = ['美联储', '加息', '降息', '利率'];
  const fedKeywordsEn = ['fed', 'federal reserve', 'interest rate'];
  if (fedKeywordsZh.some(k => lowerMessage.includes(k)) ||
    fedKeywordsEn.some(k => lowerMessage.includes(k))) {
    return generateFedResponse(lang);
  }

  // Check for "what is" questions
  const whatIsKeywordsZh = ['什么是', '什么', '解释', '意思'];
  const whatIsKeywordsEn = ['what is', 'explain', 'what does'];
  if (whatIsKeywordsZh.some(k => lowerMessage.includes(k)) ||
    whatIsKeywordsEn.some(k => lowerMessage.includes(k))) {
    if (lang === 'zh') {
      return `您好！我是 Economic Monitor 的 AI 助手。

我目前使用的是基础模式。要获得更详细的 AI 分析，您可以：

1. **在设置中添加 DeepSeek API key** - 启用完整的 AI 分析功能
2. **继续使用基础回答** - 我仍能提供以下信息

您可以问我关于：
- 📊 **经济指标含义** - GDP、失业率、通胀、利率等
- 🎯 **经济周期定位** - 我们目前处于周期的哪个阶段
- 💼 **投资策略建议** - 股票、债券、资产配置
- 🏦 **美联储政策** - 利率走向及其影响

或者您可以直接点击指标卡片上的 📖 图标，查看经济百科详情。`;
    } else {
      return `Hello! I'm the Economic Monitor AI assistant.

Currently running in basic mode. To enable full AI analysis:

1. **Add your DeepSeek API key in Settings** - Enable complete AI analysis
2. **Continue with basic answers** - I can still provide:

You can ask me about:
- 📊 **Economic indicator meanings** - GDP, unemployment, inflation, rates
- 🎯 **Economic cycle position** - Where we are in the cycle
- 💼 **Investment strategy** - Stocks, bonds, asset allocation
- 🏦 **Fed policy** - Rate direction and market impact

Or click the 📖 icon on indicator cards to view the Economic Encyclopedia.`;
    }
  }

  // Default response
  if (lang === 'zh') {
    return `感谢您的提问！

**Economic Monitor** 可以帮助您：

1. 📈 **监控 14 个核心经济指标** - GDP、就业、通胀、利率等
2. 🔔 **智能异常检测** - 当数据偏离历史正常范围时提醒您
3. 💡 **投资含义解读** - 数据对您的投资组合意味着什么
4. 🤖 **AI 智能分析** - 理解宏观经济趋势

**当前功能状态**：
- 基础问答 ✓
- 指标数据展示 ✓
- 异常检测 ✓
- AI 分析 (需要 API key)

您可以先浏览仪表盘，或在设置中添加 DeepSeek API key 以启用完整的 AI 功能。`;
  } else {
    return `Thank you for your question!

**Economic Monitor** can help you:

1. 📈 **Monitor 14 core economic indicators** - GDP, employment, inflation, rates
2. 🔔 **Smart anomaly detection** - Alert when data deviates from historical norms
3. 💡 **Investment insight解读** - What data means for your portfolio
4. 🤖 **AI analysis** - Understand macro trends

**Current Features**:
- Basic Q&A ✓
- Indicator display ✓
- Anomaly detection ✓
- AI analysis (requires API key)

Browse the dashboard first, or add a DeepSeek API key in Settings to enable full AI features.`;
  }
}

async function generateAIDirectResponse(message: string, apiKey: string, lang: Locale): Promise<string> {
  const systemPrompt = lang === 'zh'
    ? `你是 Economic Monitor 的 AI 助手，专门帮助零售投资者理解宏观经济指标和制定投资策略。

## 核心原则
1. **简洁清晰**：用通俗易懂的语言解释专业概念，避免过多金融术语
2. **数据驱动**：基于 FRED 真实数据和经济学原理给出分析
3. **风险提醒**：任何投资建议都要提醒用户"仅供参考，不构成投资建议"
4. **客观中立**：不预测具体价格，不推荐具体股票或基金

## 回答风格
- 开头用一句话概括核心观点
- 用bullet points列出关键信息
- 必要时用简单比喻帮助理解
- 最后给出可操作的思考方向

## 专长领域
- 宏观经济指标解读（GDP、通胀、就业、利率等）
- 美联储政策分析及其市场影响
- 经济周期定位与资产配置建议
- 利率变化对股票、债券、房地产的影响
- 经济数据异常预警解读`
    : `You are the Economic Monitor AI assistant, helping retail investors understand macroeconomic indicators and develop investment strategies.

## Core Principles
1. **Clear and concise**: Use plain language, avoid excessive financial jargon
2. **Data-driven**: Analysis based on FRED real data and economic principles
3. **Risk reminder**: Always note "for reference only, not investment advice"
4. **Objective and neutral**: No price predictions, no specific stock/fund recommendations

## Response Style
- Start with one-sentence summary
- Use bullet points for key information
- Use simple analogies when helpful
- End with actionable insights

## Expertise
- Macroeconomic indicator analysis (GDP, inflation, employment, rates)
- Fed policy analysis and market impact
- Economic cycle positioning and asset allocation
- Impact of rate changes on stocks, bonds, real estate
- Economic data anomaly interpretation`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    return lang === 'zh'
      ? '抱歉，我暂时无法回答这个问题。请稍后再试。'
      : 'Sorry, I couldn\'t answer that question. Please try again later.';
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return lang === 'zh'
      ? '抱歉，AI 服务暂时不可用。请检查 API key 配置或稍后再试。'
      : 'Sorry, AI service is temporarily unavailable. Please check API key configuration or try again later.';
  }
}

function getLatestValue(id: string): string {
  const values: Record<string, string> = {
    'SOFR': '5.35',
    'UNRATE': '3.9',
    'PCEPI': '2.6',
    'GDPC1': '2.4',
    'DGS2': '4.8',
    'DGS10': '4.5',
  };
  return values[id] || '--';
}

function getPercentile(id: string): string {
  const percentiles: Record<string, string> = {
    'SOFR': '85',
    'UNRATE': '15',
    'PCEPI': '70',
    'GDPC1': '45',
    'DGS2': '80',
    'DGS10': '75',
  };
  return percentiles[id] || '50';
}
