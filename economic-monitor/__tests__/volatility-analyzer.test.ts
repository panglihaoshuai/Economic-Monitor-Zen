// Unit tests for Economic Monitor - Investment Insights

import { describe, it, expect } from 'vitest';
import {
  getInvestmentInsight,
  getIndicatorCategory,
  INDICATOR_CATEGORIES,
} from '@/lib/volatility-analyzer';

describe('Investment Insights', () => {
  it('should return insight for SOFR', () => {
    const insight = getInvestmentInsight('SOFR');
    expect(insight).toBeDefined();
    expect(insight?.summary).toBe('银行间拆借利率，反映市场流动性');
    expect(insight?.interpretation).toBeDefined();
    expect(insight?.impactOnStocks).toBeDefined();
    expect(insight?.impactOnBonds).toBeDefined();
    expect(insight?.suggestion).toBeDefined();
  });

  it('should return insight for UNRATE', () => {
    const insight = getInvestmentInsight('UNRATE');
    expect(insight).toBeDefined();
    expect(insight?.summary).toBeDefined();
    expect(insight?.interpretation).toBeDefined();
  });

  it('should return insight for PCEPI', () => {
    const insight = getInvestmentInsight('PCEPI');
    expect(insight).toBeDefined();
    expect(insight?.summary).toBeDefined();
  });

  it('should return insight for GDPC1', () => {
    const insight = getInvestmentInsight('GDPC1');
    expect(insight).toBeDefined();
    expect(insight?.summary).toBeDefined();
  });

  it('should return insight for DGS10', () => {
    const insight = getInvestmentInsight('DGS10');
    expect(insight).toBeDefined();
    expect(insight?.summary).toBe('10年期国债收益率，全球资产定价之锚');
  });

  it('should return undefined for unknown indicator', () => {
    const insight = getInvestmentInsight('UNKNOWN');
    expect(insight).toBeUndefined();
  });
});

describe('Indicator Categories', () => {
  it('should return garch type for SOFR', () => {
    const category = getIndicatorCategory('SOFR');
    expect(category).toBeDefined();
    expect(category?.type).toBe('garch');
    expect(category?.name).toBe('Secured Overnight Financing Rate');
  });

  it('should return zscore type for GDPC1', () => {
    const category = getIndicatorCategory('GDPC1');
    expect(category).toBeDefined();
    expect(category?.type).toBe('zscore');
    expect(category?.name).toBe('Real GDP');
  });

  it('should return zscore type for UNRATE', () => {
    const category = getIndicatorCategory('UNRATE');
    expect(category).toBeDefined();
    expect(category?.type).toBe('zscore');
  });

  it('should return garch type for DGS10', () => {
    const category = getIndicatorCategory('DGS10');
    expect(category).toBeDefined();
    expect(category?.type).toBe('garch');
  });

  it('should return undefined for unknown indicator', () => {
    const category = getIndicatorCategory('UNKNOWN');
    expect(category).toBeUndefined();
  });
});

describe('Indicator Categories Configuration', () => {
  it('should have all required indicators', () => {
    const requiredIndicators = ['SOFR', 'UNRATE', 'PCEPI', 'GDPC1', 'DGS10', 'DGS2', 'MORTGAGE30US', 'TEDRATE'];
    for (const id of requiredIndicators) {
      expect(INDICATOR_CATEGORIES[id]).toBeDefined();
    }
  });

  it('should have correct thresholds for GARCH indicators', () => {
    const garchIndicators = ['SOFR', 'DGS2', 'DGS10', 'MORTGAGE30US', 'TEDRATE'];
    for (const id of garchIndicators) {
      const category = INDICATOR_CATEGORIES[id];
      expect(category.type).toBe('garch');
      expect(category.thresholds).toBeDefined();
      expect(category.thresholds.warning).toBeGreaterThan(0);
      expect(category.thresholds.critical).toBeGreaterThan(category.thresholds.warning);
    }
  });

  it('should have correct thresholds for Z-Score indicators', () => {
    const zscoreIndicators = ['UNRATE', 'PCEPI', 'GDPC1', 'HOUST', 'CSUSHPISA', 'PCE', 'RSAFS', 'BOPGSTB', 'IMPGS'];
    for (const id of zscoreIndicators) {
      const category = INDICATOR_CATEGORIES[id];
      expect(category.type).toBe('zscore');
      expect(category.thresholds).toBeDefined();
      expect(category.thresholds.warning).toBeGreaterThan(0);
      expect(category.thresholds.critical).toBeGreaterThan(category.thresholds.warning);
    }
  });

  it('should have investment insights for all indicators', () => {
    for (const [id, category] of Object.entries(INDICATOR_CATEGORIES)) {
      expect(category.investmentInsight).toBeDefined();
      expect(category.investmentInsight?.summary).toBeDefined();
      expect(category.investmentInsight?.interpretation).toBeDefined();
      expect(category.investmentInsight?.impactOnStocks).toBeDefined();
      expect(category.investmentInsight?.impactOnBonds).toBeDefined();
      expect(category.investmentInsight?.suggestion).toBeDefined();
    }
  });
});
