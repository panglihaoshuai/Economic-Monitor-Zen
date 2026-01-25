// Volatility Analyzer Configuration
// 波动率分析器配置 - 决定每个指标使用 GARCH 还是 Z-Score
// 包含投资含义解读

import { AnalyzerType, FREDSeriesInfo } from './fred';

// 指标分类常量
export const ANALYZER_GARCH = 'garch' as const;
export const ANALYZER_ZSCORE = 'zscore' as const;

// ========== 投资含义配置 ==========

export interface InvestmentInsight {
  summary: string;       // 一句话总结
  interpretation: string; // 详细解读
  impactOnStocks: string; // 对股市影响
  impactOnBonds: string;  // 对债市影响
  suggestion: string;     // 投资建议
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
      summary: '银行间拆借利率，反映市场流动性',
      interpretation: 'SOFR 是银行间无风险拆借利率，是美联储政策传导的关键指标。当 SOFR 飙升时，说明银行间流动性紧张。',
      impactOnStocks: '偏空。流动性紧缩通常导致股市下跌，尤其是成长股和高估值股票。',
      impactOnBonds: '偏多。短期利率上升，但长期影响取决于市场对美联储政策的预期。',
      suggestion: '减少科技股和成长股敞口，增加防御性板块配置，关注优质蓝筹股。',
    },
  },
  DGS2: {
    type: 'garch',
    name: '2-Year Treasury Rate',
    reason: '短期国债，货币政策敏感，高频波动',
    recommendedWindow: 60,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '短期国债收益率，反映市场对美联储政策的预期',
      interpretation: '2年期国债收益率对美联储利率政策最敏感，常被用来预测美联储下一步行动。',
      impactOnStocks: '偏空。收益率上升意味着借贷成本增加，对高杠杆行业不利。',
      impactOnBonds: '直接影响短期债券价格。收益率上升会导致短期债券价格下跌。',
      suggestion: '关注收益率曲线形态，如果倒挂可能预示经济衰退风险。',
    },
  },
  DGS10: {
    type: 'garch',
    name: '10-Year Treasury Rate',
    reason: '市场基准利率，高频数据，波动聚集',
    recommendedWindow: 90,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '10年期国债收益率，全球资产定价之锚',
      interpretation: '10年期国债是全球最重要的无风险利率，影响所有风险资产的定价。收益率上升意味着无风险利率上升，压缩股票估值。',
      impactOnStocks: '偏空。收益率上升会导致股票估值（PE）压缩，尤其是成长股。',
      impactOnBonds: '偏空。债券价格与收益率成反比，收益率上升导致债券价格下跌。',
      suggestion: '关注收益率上升速度和原因。如果是通胀预期上升，应减持长久期债券。',
    },
  },
  MORTGAGE30US: {
    type: 'garch',
    name: '30-Year Mortgage Rate',
    reason: '抵押贷款利率，对利率变化敏感，波动聚集',
    recommendedWindow: 52,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '30年期抵押贷款利率，影响房地产市场',
      interpretation: '30年期抵押贷款利率直接影响购房者成本，是房地产市场的关键指标。',
      impactOnStocks: '偏空。高利率会增加购房成本，打压房地产相关股票。',
      impactOnBonds: '偏空。房贷利率上升通常伴随国债收益率上升。',
      suggestion: '减持房地产开发商和房屋建筑商股票，关注租金收入型REITs。',
    },
  },
  TEDRATE: {
    type: 'garch',
    name: 'TED Spread',
    reason: '信用风险先行指标，流动性危机时波动剧增',
    recommendedWindow: 60,
    thresholds: { warning: 2.5, critical: 4 },
    investmentInsight: {
      summary: 'TED利差，银行间信用风险指标',
      interpretation: 'TED利差是3个月LIBOR与3个月国债收益率之差。利差扩大说明银行间信任度下降，信用风险上升。',
      impactOnStocks: '强烈偏空。TED利差是金融市场压力的领先指标，利差扩大往往预示股市下跌。',
      impactOnBonds: '偏空。信用利差扩大意味着企业债与国债的利差也会扩大。',
      suggestion: 'TED利差 > 1% 时应减仓或持有现金；> 2% 时应考虑买入黄金避险。',
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
      summary: '实际GDP，经济产出总量',
      interpretation: 'GDP增长率反映经济增长速度。正增长表示经济扩张，负增长表示经济萎缩。',
      impactOnStocks: '偏多。经济增长支撑企业盈利，对股市有利。',
      impactOnBonds: '偏空。经济增长可能推高通胀和利率，对债券不利。',
      suggestion: 'GDP > 3% 可适度增配股票；GDP < 0% 应增加债券和现金配置。',
    },
  },
  UNRATE: {
    type: 'zscore',
    name: 'Unemployment Rate',
    reason: '月度数据，劳动力市场相对稳定，季节性可预测',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '失业率，劳动力市场健康度指标',
      interpretation: '失业率是滞后指标，但能反映经济周期位置。失业率处于历史低位通常意味着经济扩张后期。',
      impactOnStocks: '短期中性，长期偏多。低失业率支撑消费和企业盈利。',
      impactOnBonds: '偏空。低失业率可能推高工资和通胀，支撑加息预期。',
      suggestion: '失业率 < 4% 时应关注通胀风险；失业率突然上升时应减仓。',
    },
  },
  PCEPI: {
    type: 'zscore',
    name: 'PCE Price Index',
    reason: '通胀指标，月度频率，趋势为主',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: 'PCE通胀指数，美联储最关注的通胀指标',
      interpretation: 'PCE（个人消费支出）价格指数是美联储首选的通胀指标。相比CPI，PCE更广泛且波动较小。',
      impactOnStocks: '偏空。高通胀导致美联储加息，压缩股票估值。',
      impactOnBonds: '偏空。高通胀推高收益率，导致债券价格下跌。',
      suggestion: 'PCE > 3% 时应减持长久期债券；PCE < 2% 时可适度增配成长股。',
    },
  },
  PCE: {
    type: 'zscore',
    name: 'Personal Consumption',
    reason: '消费数据，月度频率，相对稳定',
    recommendedWindow: 24,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '个人消费支出，消费占美国GDP约70%',
      interpretation: '消费是美国经济的最大组成部分，消费增长支撑GDP。',
      impactOnStocks: '偏多。消费增长利好零售、必需消费品和服务业股票。',
      impactOnBonds: '偏多。消费强劲可能推高通胀和利率。',
      suggestion: '关注消费结构变化，必需消费和可选消费的配置比例应有所调整。',
    },
  },
  RSAFS: {
    type: 'zscore',
    name: 'Retail Sales',
    reason: '零售数据，有季节性，调整后波动稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '零售销售，消费者需求的直接指标',
      interpretation: '零售销售反映消费者在商品上的支出，是判断消费者信心的重要窗口。',
      impactOnStocks: '偏多。零售增长利好零售股和消费相关板块。',
      impactOnBonds: '中性。零售数据影响有限。',
      suggestion: '关注同比变化，连续下降可能预示经济放缓。',
    },
  },
  HOUST: {
    type: 'zscore',
    name: 'Housing Starts',
    reason: '房地产市场，周期长，波动可预测',
    recommendedWindow: 48,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '新屋开工数，房地产领先指标',
      interpretation: '新屋开工数领先于房地产市场活动，是房地产周期的早期信号。',
      impactOnStocks: '偏空。开工下降意味着房地产活动减少，影响相关股票。',
      impactOnBonds: '偏多。房地产放缓可能推迟美联储加息。',
      suggestion: '新屋开工连续下降时应减持房地产开发商股票。',
    },
  },
  CSUSHPISA: {
    type: 'zscore',
    name: 'Home Price Index',
    reason: '房价指数，长期趋势，季度/月度数据',
    recommendedWindow: 60,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: 'Case-Shiller 房价指数',
      interpretation: '房价指数反映住宅房地产价格变化，是财富效应的直接体现。',
      impactOnStocks: '偏多。房价上涨创造财富效应，支撑消费。',
      impactOnBonds: '中性。房价对债市影响有限。',
      suggestion: '房价涨幅过高时需警惕泡沫风险。',
    },
  },
  BOPGSTB: {
    type: 'zscore',
    name: 'Trade Balance',
    reason: '贸易平衡，国际贸易数据，相对稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '贸易逆差，进出口差额',
      interpretation: '贸易逆差反映美国消费超过生产，资本流入弥补逆差。',
      impactOnStocks: '中性。贸易数据对股市直接影响有限。',
      impactOnBonds: '中性。长期影响美元汇率。',
      suggestion: '贸易战期间需特别关注进出口变化对特定行业的影响。',
    },
  },
  IMPGS: {
    type: 'zscore',
    name: 'Imports',
    reason: '进口数据，贸易数据相对稳定',
    recommendedWindow: 36,
    thresholds: { warning: 2, critical: 3 },
    investmentInsight: {
      summary: '进口总额',
      interpretation: '进口反映国内需求强度，也是美元强弱的风向标。',
      impactOnStocks: '中性。需结合出口一起分析贸易平衡。',
      impactOnBonds: '中性。影响美元汇率。',
      suggestion: '进口激增可能预示美元贬值压力。',
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

export function getIndicatorExplanation(seriesId: string, zScore: number, value: number): string {
  const category = INDICATOR_CATEGORIES[seriesId];
  if (!category) {
    return `${seriesId}: 当前值 ${value.toFixed(2)}，Z-Score ${zScore.toFixed(2)}`;
  }

  const analyzerText = category.type === 'garch' ? 'GARCH模型' : 'Z-Score';
  const severity = Math.abs(zScore) < category.thresholds.warning ? '正常' :
                   Math.abs(zScore) < category.thresholds.critical ? '偏离' : '异常';

  return `${category.name} (${seriesId})
分析方法: ${analyzerText}
当前值: ${value.toFixed(2)}
偏离程度: ${zScore.toFixed(2)}σ
状态: ${severity}
原因: ${category.reason}`;
}
