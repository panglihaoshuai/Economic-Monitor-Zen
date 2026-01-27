// Volatility Analyzer Configuration
// 波动率分析器配置 - 决定每个指标使用 GARCH 还是 Z-Score
// 包含投资含义解读

import { AnalyzerType, FREDSeriesInfo } from './fred';

// 指标分类常量
export const ANALYZER_GARCH = 'garch' as const;
export const ANALYZER_ZSCORE = 'zscore' as const;

// ========== 投资含义配置 ==========

export interface InvestmentInsight {
  summary: { en: string; zh: string };       // 一句话总结
  interpretation: { en: string; zh: string }; // 详细解读
  impactOnStocks: { en: string; zh: string }; // 对股市影响
  impactOnBonds: { en: string; zh: string };  // 对债市影响
  suggestion: { en: string; zh: string };     // 投资建议
}

export interface IndicatorCategory {
  type: 'garch' | 'zscore';
  name: string;
  reason: string;
  recommendedWindow: number;  // 推荐数据窗口
  thresholds: {
    warning: number;
    critical: number;
  };
  // ========== 新增：投资含义 ==========
  investmentInsight?: InvestmentInsight;
}

export const INDICATOR_CATEGORIES: Record<string, IndicatorCategory> = {
  // ========== GARCH 指标（高频金融） ==========
  SOFR: {
    type: 'garch',
    name: 'Secured Overnight Financing Rate',
    reason: '隔夜利率，高频数据，波动聚集效应强，利率飙升预示流动性紧缩',
    recommendedWindow: 90,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Interbank borrowing rate, reflecting market liquidity',
        zh: '银行间拆借利率，反映市场流动性'
      },
      interpretation: {
        en: 'SOFR is the overnight risk-free interbank rate, a key indicator for Fed policy transmission. Spikes indicate interbank liquidity stress.',
        zh: 'SOFR 是银行间无风险拆借利率，是美联储政策传导的关键指标。当 SOFR 飙升时，说明银行间流动性紧张。'
      },
      impactOnStocks: {
        en: 'Bearish. Liquidity tightening usually leads to equity declines, especially growth and high-valuation stocks.',
        zh: '偏空。流动性紧缩通常导致股市下跌，尤其是成长股和高估值股票。'
      },
      impactOnBonds: {
        en: 'Bullish. Short-term rates rise, but long-term impact depends on market expectations of Fed policy.',
        zh: '偏多。短期利率上升，但长期影响取决于市场对美联储政策的预期。'
      },
      suggestion: {
        en: 'Reduce growth stock exposure, increase defensive sector allocation, focus on quality blue-chips.',
        zh: '减少科技股和成长股敞口，增加防御性板块配置，关注优质蓝筹股。'
      },
    },
  },
  DGS2: {
    type: 'garch',
    name: '2-Year Treasury Rate',
    reason: '短期国债，货币政策敏感，高频波动',
    recommendedWindow: 60,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Short-term Treasury yield, reflecting expectations for Fed policy',
        zh: '短期国债收益率，反映市场对美联储政策的预期'
      },
      interpretation: {
        en: 'The 2-year yield is most sensitive to Fed policy and is often used to predict shifts in monetary trajectory.',
        zh: '2年期国债收益率对美联储利率政策最敏感，常被用来预测美联储下一步行动。'
      },
      impactOnStocks: {
        en: 'Bearish. Rising yields mean higher borrowing costs, negative for high-leverage sectors.',
        zh: '偏空。收益率上升意味着借贷成本增加，对高杠杆行业不利。'
      },
      impactOnBonds: {
        en: 'Directly impacts short bond prices. Rising yields drive prices lower.',
        zh: '直接影响短期债券价格。收益率上升会导致短期债券价格下跌。'
      },
      suggestion: {
        en: 'Monitor yield curve shape; inversion may signal recession risks.',
        zh: '关注收益率曲线形态，如果倒挂可能预示经济衰退风险。'
      },
    },
  },
  DGS10: {
    type: 'garch',
    name: '10-Year Treasury Rate',
    reason: '市场基准利率，高频数据，波动聚集',
    recommendedWindow: 90,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: '10-year yield, the global anchor for asset pricing',
        zh: '10年期国债收益率，全球资产定价之锚'
      },
      interpretation: {
        en: 'The 10-year yield is the world\'s premiere risk-free rate, affecting the valuation of all risk assets.',
        zh: '10年期国债是全球最重要的无风险利率，影响所有风险资产的定价。收益率上升意味着无风险利率上升，压缩股票估值。'
      },
      impactOnStocks: {
        en: 'Bearish. Higher yields compress multiples (PE), particularly for growth/tech stocks.',
        zh: '偏空。收益率上升会导致股票估值（PE）压缩，尤其是成长股。'
      },
      impactOnBonds: {
        en: 'Bearish. Bond prices move inversely to yields; rising yields lead to capital losses on existing bonds.',
        zh: '偏空。债券价格与收益率成反比，收益率上升导致债券价格下跌。'
      },
      suggestion: {
        en: 'Watch the rate of change. If caused by inflation expectations, reduce duration in bond portfolios.',
        zh: '关注收益率上升速度和原因。如果是通胀预期上升，应减持长久期债券。'
      },
    },
  },
  MORTGAGE30US: {
    type: 'garch',
    name: '30-Year Mortgage Rate',
    reason: '抵押贷款利率，对利率变化敏感，波动聚集',
    recommendedWindow: 52,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: '30-year fixed mortgage rate, affecting the housing market',
        zh: '30年期抵押贷款利率，影响房地产市场'
      },
      interpretation: {
        en: 'Directly impacts consumer borrowing costs for homes, a key driver for the real estate economy.',
        zh: '30年期抵押贷款利率直接影响购房者成本，是房地产市场的关键指标。'
      },
      impactOnStocks: {
        en: 'Bearish. High rates increase costs for buyers, hurting real estate and construction sectors.',
        zh: '偏空。高利率会增加购房成本，打压房地产相关股票。'
      },
      impactOnBonds: {
        en: 'Bearish. Mortgage rates typically track Treasury yields higher.',
        zh: '偏空。房贷利率上升通常伴随国债收益率上升。'
      },
      suggestion: {
        en: 'Caution on developers and builders; consider rent-collecting REITs with high occupancy.',
        zh: '减持房地产开发商和房屋建筑商股票，关注租金收入型REITs。'
      },
    },
  },
  TEDRATE: {
    type: 'garch',
    name: 'TED Spread',
    reason: '信用风险先行指标，流动性危机时波动剧增',
    recommendedWindow: 60,
    thresholds: { warning: 2.5, critical: 4 },
    investmentInsight: {
      summary: {
        en: 'TED Spread, a measure of interbank credit risk',
        zh: 'TED利差，银行间信用风险指标'
      },
      interpretation: {
        en: 'Difference between the 3-month LIBOR and 3-month Treasury yield. Expansion indicates banking stress.',
        zh: 'TED利差是3个月LIBOR与3个月国债收益率之差。利差扩大说明银行间信任度下降，信用风险上升。'
      },
      impactOnStocks: {
        en: 'Strongly Bearish. A lead indicator for broader financial stress; spread widening often precedes crashes.',
        zh: '强烈偏空。TED利差是金融市场压力的领先指标，利差扩大往往预示股市下跌。'
      },
      impactOnBonds: {
        en: 'Bearish. Credit spreads widen, increasing costs for corporate credit over Treasuries.',
        zh: '偏空。信用利差扩大意味着企业债与国债的利差也会扩大。'
      },
      suggestion: {
        en: 'Hold cash if spread exceeds 1%; consider gold as a hedge if it crosses 2%.',
        zh: 'TED利差 > 1% 时应减仓或持有现金；> 2% 时应考虑买入黄金避险。'
      },
    },
  },

  // ========== Z-Score 指标（实体经济） ==========
  GDPC1: {
    type: 'zscore',
    name: 'Real GDP',
    reason: '季度数据，低频，波动相对稳定',
    recommendedWindow: 20,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Real GDP, total economic output',
        zh: '实际GDP，经济产出总量'
      },
      interpretation: {
        en: 'GDP growth rate reflects economic expansion. Positive signifies growth, negative signifies contraction.',
        zh: 'GDP增长率反映经济增长速度。正增长表示经济扩张，负增长表示经济萎缩。'
      },
      impactOnStocks: {
        en: 'Bullish. Economic growth supports corporate earnings, benefiting equity markets.',
        zh: '偏多。经济增长支撑企业盈利，对股市有利。'
      },
      impactOnBonds: {
        en: 'Bearish. Strong growth can drive inflation and yields higher, negative for bond prices.',
        zh: '偏空。经济增长可能推高通胀和利率，对债券不利。'
      },
      suggestion: {
        en: 'Increase equity exposure if GDP > 3%; rotate to cash/bonds if GDP falls near 0%.',
        zh: 'GDP > 3% 可适度增配股票；GDP < 0% 应增加债券 and 现金配置。'
      },
    },
  },
  UNRATE: {
    type: 'zscore',
    name: 'Unemployment Rate',
    reason: '月度数据，劳动力市场相对稳定，季节性可预测',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Unemployment rate, health of the labor market',
        zh: '失业率，劳动力市场健康度指标'
      },
      interpretation: {
        en: 'A lagging indicator, but key for identifying the peak of the economic cycle. Low rates suggest late-cycle.',
        zh: '失业率是滞后指标，但能反映经济周期位置。失业率处于历史低位通常意味着经济扩张后期。'
      },
      impactOnStocks: {
        en: 'Short-term neutral, long-term bullish. Low rates support consumer spending.',
        zh: '短期中性，长期偏多。低失业率支撑消费和企业盈利。'
      },
      impactOnBonds: {
        en: 'Bearish. Tight labor markets can drive wage inflation and rate hikes.',
        zh: '偏空。低失业率可能推高工资和通胀，支撑加息预期。'
      },
      suggestion: {
        en: 'Watch for inflation if < 4%; sudden spikes in unemployment are a sell signal.',
        zh: '失业率 < 4% 时应关注通胀风险；失业率突然上升时应减仓。'
      },
    },
  },
  PCEPI: {
    type: 'zscore',
    name: 'PCE Price Index',
    reason: '通胀指标，月度频率，趋势为主',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'PCE Inflation Index, the Fed\'s preferred inflation metric',
        zh: 'PCE通胀指数，美联储最关注的通胀指标'
      },
      interpretation: {
        en: 'Preferred over CPI for its broad nature. High readings force central bank hawkishness.',
        zh: 'PCE（个人消费支出）价格指数是美联储首选的通胀指标。相比CPI，PCE更广泛且波动较小。'
      },
      impactOnStocks: {
        en: 'Bearish. High inflation leads to higher rates, compressing equity multiples.',
        zh: '偏空。高通胀导致美联储加息，压缩股票估值。'
      },
      impactOnBonds: {
        en: 'Bearish. High inflation erodes the value of fixed nominal payments.',
        zh: '偏空。高通胀推高收益率，导致债券价格下跌。'
      },
      suggestion: {
        en: 'Reduce long-duration bonds if PCE > 3%; rotate to growth stocks if < 2%.',
        zh: 'PCE > 3% 时应减持长久期债券；PCE < 2% 时可适度增配成长股。'
      },
    },
  },
  PCE: {
    type: 'zscore',
    name: 'Personal Consumption',
    reason: '消费数据，月度频率，相对稳定',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Personal consumption expenditures, ~70% of US GDP',
        zh: '个人消费支出，消费占美国GDP约70%'
      },
      interpretation: {
        en: 'Consumption is the largest engine of the US economy; growth is vital for GDP expansion.',
        zh: '消费是美国经济的最大组成部分，消费增长支撑GDP。'
      },
      impactOnStocks: {
        en: 'Bullish. Spending growth benefits retail, consumer staples, and services.',
        zh: '偏多。消费增长利好零售、必需消费品和服务业股票。'
      },
      impactOnBonds: {
        en: 'Bearish (typically). Strong demand can push inflation and rates higher.',
        zh: '偏多。消费强劲可能推高通胀和利率。'
      },
      suggestion: {
        en: 'Monitor shifts between discretionary and staple spending.',
        zh: '关注消费结构变化，必需消费和可选消费的配置比例应有所调整。'
      },
    },
  },
  RSAFS: {
    type: 'zscore',
    name: 'Retail Sales',
    reason: '零售数据，有季节性，调整后波动稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Retail sales, a direct indicator of consumer demand',
        zh: '零售销售，消费者需求的直接指标'
      },
      interpretation: {
        en: 'Reflects consumer goods spending; a key window into consumer confidence.',
        zh: '零售销售反映消费者在商品上的支出，是判断消费者信心的重要窗口。'
      },
      impactOnStocks: {
        en: 'Bullish. Growth benefits brick-and-mortar and e-commerce retail.',
        zh: '偏多。零售增长利好零售股和消费相关板块。'
      },
      impactOnBonds: {
        en: 'Neutral. Limited direct impact on debt markets.',
        zh: '中性。零售数据影响有限。'
      },
      suggestion: {
        en: 'Watch Y/Y changes; consecutive declines can signal a broad slowdown.',
        zh: '关注同比变化，连续下降可能预示经济放缓。'
      },
    },
  },
  HOUST: {
    type: 'zscore',
    name: 'Housing Starts',
    reason: '房地产市场，周期长，波动可预测',
    recommendedWindow: 48,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Housing starts, a lead real estate indicator',
        zh: '新屋开工数，房地产领先指标'
      },
      interpretation: {
        en: 'Leads real estate activity; an early signal for the broader property cycle.',
        zh: '新屋开工数领先于房地产市场活动，是房地产周期的早期信号。'
      },
      impactOnStocks: {
        en: 'Bearish if declining. Fewer starts means less activity for builders and material suppliers.',
        zh: '偏空。开工下降意味着房地产活动减少，影响相关股票。'
      },
      impactOnBonds: {
        en: 'Bullish. Cooling housing may signal a more dovish central bank stance.',
        zh: '偏多。房地产放缓可能推迟美联储加息。'
      },
      suggestion: {
        en: 'Reduce builder exposure if starts decline for multiple months.',
        zh: '新屋开工连续下降时应减持房地产开发商股票。'
      },
    },
  },
  CSUSHPISA: {
    type: 'zscore',
    name: 'Home Price Index',
    reason: '房价指数，长期趋势，季度/月度数据',
    recommendedWindow: 60,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Case-Shiller Home Price Index',
        zh: 'Case-Shiller 房价指数'
      },
      interpretation: {
        en: 'Reflects changes in residential home values; a primary engine for wealth effect.',
        zh: '房价指数反映住宅房地产价格变化，是财富效应的直接体现。'
      },
      impactOnStocks: {
        en: 'Bullish. Rising values create a wealth effect that supports consumer spending.',
        zh: '偏多。房价上涨创造财富效应，支撑消费。'
      },
      impactOnBonds: {
        en: 'Neutral. Limited direct correlation with bond yields.',
        zh: '中性。房价对债市影响有限。'
      },
      suggestion: {
        en: 'Be wary of bubble risks if index values grow significantly higher than rents/wages.',
        zh: '房价涨幅过高时需警惕泡沫风险。'
      },
    },
  },
  BOPGSTB: {
    type: 'zscore',
    name: 'Trade Balance',
    reason: '贸易平衡，国际贸易数据，相对稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Trade deficit, difference between exports and imports',
        zh: '贸易逆差，进出口差额'
      },
      interpretation: {
        en: 'Reflects that US consumption exceeds domestic production; filled by capital inflows.',
        zh: '贸易逆差反映美国消费超过生产，资本流入弥补逆差。'
      },
      impactOnStocks: {
        en: 'Neutral. Direct impact on equities is typically minor.',
        zh: '中性。贸易数据对股市直接影响有限。'
      },
      impactOnBonds: {
        en: 'Neutral. Long-term impact on USD exchange rates.',
        zh: '中性。长期影响美元汇率。'
      },
      suggestion: {
        en: 'Monitor export changes during trade disputes for specific industry hits.',
        zh: '贸易战期间需特别关注进出口变化对特定行业的影响。'
      },
    },
  },
  IMPGS: {
    type: 'zscore',
    name: 'Imports',
    reason: '进口数据，贸易数据相对稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: {
        en: 'Total imports value',
        zh: '进口总额'
      },
      interpretation: {
        en: 'Reflects internal demand strength and serves as a gauge for USD strength.',
        zh: '进口反映国内需求强度，也是美元强弱的风向标。'
      },
      impactOnStocks: {
        en: 'Neutral. Must be analyzed in conjunction with exports and trade balance.',
        zh: '中性。需结合出口一起分析贸易平衡。'
      },
      impactOnBonds: {
        en: 'Neutral. Primarily affects USD trajectory.',
        zh: '中性。影响美元汇率。'
      },
      suggestion: {
        en: 'Rapid increases in imports can signal downside USD pressure.',
        zh: '进口激增可能预示美元贬值压力。'
      },
    },
  },
};

// ========== 辅助函数 ==========

export function getIndicatorCategory(seriesId: string): IndicatorCategory | undefined {
  return INDICATOR_CATEGORIES[seriesId];
}

export function getAnalyzerType(seriesId: string): AnalyzerType {
  const category = INDICATOR_CATEGORIES[seriesId];
  return category?.type || 'zscore';
}

export function shouldUseGARCH(seriesId: string): boolean {
  return getAnalyzerType(seriesId) === 'garch';
}

export function shouldUseZScore(seriesId: string): boolean {
  return getAnalyzerType(seriesId) === 'zscore';
}

export function getRecommendedWindow(seriesId: string): number {
  return INDICATOR_CATEGORIES[seriesId]?.recommendedWindow || 50;
}

export function getThresholds(seriesId: string): { warning: number; critical: number } {
  return INDICATOR_CATEGORIES[seriesId]?.thresholds || { warning: 2, critical: 3 };
}

export function getGARCHIndicatorsList(): string[] {
  return Object.entries(INDICATOR_CATEGORIES)
    .filter(([_, cat]) => cat.type === 'garch')
    .map(([id, _]) => id);
}

export function getZScoreIndicatorsList(): string[] {
  return Object.entries(INDICATOR_CATEGORIES)
    .filter(([_, cat]) => cat.type === 'zscore')
    .map(([id, _]) => id);
}

export function getInvestmentInsight(seriesId: string): InvestmentInsight | undefined {
  return INDICATOR_CATEGORIES[seriesId]?.investmentInsight;
}

export function getIndicatorExplanation(seriesId: string, zScore: number, value: number, locale: string = 'en'): string {
  const category = INDICATOR_CATEGORIES[seriesId];
  if (!category) {
    return locale === 'zh'
      ? `${seriesId}: 当前值 ${value.toFixed(2)}，Z-Score ${zScore.toFixed(2)}`
      : `${seriesId}: Current ${value.toFixed(2)}, Z-Score ${zScore.toFixed(2)}`;
  }

  const analyzerText = category.type === 'garch'
    ? (locale === 'zh' ? 'GARCH模型' : 'GARCH Model')
    : 'Z-Score';

  const severity = Math.abs(zScore) < category.thresholds.warning
    ? (locale === 'zh' ? '正常' : 'Normal') :
    Math.abs(zScore) < category.thresholds.critical
      ? (locale === 'zh' ? '偏离' : 'Deviation')
      : (locale === 'zh' ? '异常' : 'Anomaly');

  if (locale === 'zh') {
    return `${category.name} (${seriesId})
分析方法: ${analyzerText}
当前值: ${value.toFixed(2)}
偏离程度: ${zScore.toFixed(2)}σ
状态: ${severity}
原因: ${category.reason}`;
  } else {
    return `${category.name} (${seriesId})
Method: ${analyzerText}
Value: ${value.toFixed(2)}
Deviation: ${zScore.toFixed(2)}σ
Status: ${severity}`;
  }
}
