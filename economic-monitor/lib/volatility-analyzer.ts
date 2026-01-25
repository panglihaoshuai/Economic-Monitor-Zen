// 简化的波动率分析器

export function getInvestmentInsight(indicatorId: string, currentValue: number, changePercent: number): string {
  // 根据指标类型和变化率提供投资见解
  if (indicatorId.includes('RATE') || indicatorId.includes('FEDFUNDS')) {
    if (changePercent > 2) {
      return '利率大幅上升，债券价格可能下跌，建议谨慎投资固定收益产品。';
    } else if (changePercent < -2) {
      return '利率下降，利好债券市场，可考虑增加固收配置。';
    }
    return '利率稳定，市场预期明确，适合均衡配置。';
  }
  
  if (indicatorId.includes('GDP')) {
    if (changePercent > 1) {
      return '经济增长强劲，股市通常表现良好，可适度增加股票配置。';
    } else if (changePercent < 0) {
      return '经济增长放缓，建议增加防御性资产配置。';
    }
    return '经济平稳增长，适合长期投资策略。';
  }
  
  if (indicatorId.includes('CPI') || indicatorId.includes('INFLATION')) {
    if (changePercent > 3) {
      return '通胀压力较大，建议配置通胀保值资产如TIPS、商品等。';
    } else if (changePercent < 1) {
      return '通胀温和，有利于债券和股票市场。';
    }
    return '通胀水平适中，保持现有资产配置。';
  }
  
  if (indicatorId.includes('UNRATE')) {
    if (changePercent > 5) {
      return '失业率上升，经济增长可能放缓，建议增加防御性配置。';
    } else if (changePercent < 3) {
      return '就业市场强劲，经济前景良好，可适度增加风险资产。';
    }
    return '就业市场稳定，适合均衡投资策略。';
  }
  
  if (indicatorId.includes('SP500') || indicatorId.includes('MARKET')) {
    if (changePercent > 3) {
      return '股市大幅上涨，注意估值风险，避免追高。';
    } else if (changePercent < -3) {
      return '股市下跌，可考虑分批建仓优质资产。';
    }
    return '股市平稳波动，保持长期投资视角。';
  }
  
  return '数据正常，建议保持现有投资策略。';
}

export function getIndicatorCategory(indicatorId: string): string {
  if (indicatorId.includes('RATE') || indicatorId.includes('FEDFUNDS') || indicatorId.includes('DGS')) {
    return 'interest_rates';
  }
  if (indicatorId.includes('GDP') || indicatorId.includes('OUTPUT')) {
    return 'economic_growth';
  }
  if (indicatorId.includes('CPI') || indicatorId.includes('INFLATION') || indicatorId.includes('PCE')) {
    return 'inflation';
  }
  if (indicatorId.includes('UNRATE') || indicatorId.includes('EMPLOYMENT') || indicatorId.includes('PAYEMS')) {
    return 'employment';
  }
  if (indicatorId.includes('SP500') || indicatorId.includes('MARKET') || indicatorId.includes('INDEX')) {
    return 'financial_markets';
  }
  if (indicatorId.includes('MONEY') || indicatorId.includes('M2') || indicatorId.includes('MONETARY')) {
    return 'monetary_policy';
  }
  if (indicatorId.includes('HOUSING') || indicatorId.includes('HOME') || indicatorId.includes('HOUST')) {
    return 'housing_market';
  }
  if (indicatorId.includes('TRADE') || indicatorId.includes('EXPORT') || indicatorId.includes('IMPORT')) {
    return 'international_trade';
  }
  
  return 'general_economy';
}

export function getRecommendedWindow(indicatorId: string): number {
  // 根据指标类型推荐分析窗口
  if (indicatorId.includes('RATE')) return 90; // 利率用3个月
  if (indicatorId.includes('GDP')) return 365; // GDP用1年
  if (indicatorId.includes('CPI')) return 180; // CPI用6个月
  if (indicatorId.includes('UNRATE')) return 120; // 失业率用4个月
  if (indicatorId.includes('SP500')) return 60; // 股市用2个月
  
  return 90; // 默认3个月
}