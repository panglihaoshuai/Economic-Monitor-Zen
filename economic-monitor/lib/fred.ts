// FRED API integration module

export type AnalyzerType = 'garch' | 'zscore';

export interface FREDSeries {
  series_id: string;
  observations: Array<{
    date: string;
    value: string;
  }>;
}

export interface FREDSeriesInfo {
  id: string;
  title: string;
  frequency: string;
  units: string;
  description: string;
  analyzer: AnalyzerType;  // 使用 GARCH 还是 Z-Score 分析
  deprecated?: boolean;  // 是否已弃用
}

// ========== 指标分类 ==========

// GARCH 指标：高频金融数据，波动聚集效应强
export const GARCH_INDICATORS = ['SOFR', 'DGS2', 'DGS10', 'MORTGAGE30US', 'TEDRATE'] as const;

// Z-Score 指标：实体经济数据，低频波动稳定
export const ZSCORE_INDICATORS = ['GDPC1', 'UNRATE', 'PCEPI', 'PCE', 'RSAFS', 'HOUST', 'CSUSHPISA', 'BOPGSTB', 'IMPGS'] as const;

// Default economic indicators to monitor
export const INDICATORS: Record<string, FREDSeriesInfo> = {
  // ========== GARCH 指标（高频金融） ==========
  SOFR: {
    id: 'SOFR',
    title: 'Secured Overnight Financing Rate',
    frequency: 'Daily',
    units: 'Percent',
    description: 'Secured Overnight Financing Rate is a broad measure of the cost of borrowing cash overnight collateralized by Treasury securities.',
    analyzer: 'garch',
  },
  DGS2: {
    id: 'DGS2',
    title: '2-Year Treasury Constant Maturity Rate',
    frequency: 'Daily',
    units: 'Percent',
    description: 'The 2-year Treasury yield reflects short-term monetary policy expectations',
    analyzer: 'garch',
  },
  DGS10: {
    id: 'DGS10',
    title: '10-Year Treasury Constant Maturity Rate',
    frequency: 'Daily',
    units: 'Percent',
    description: 'The 10-year Treasury yield is a key indicator of borrowing costs',
    analyzer: 'garch',
  },
  MORTGAGE30US: {
    id: 'MORTGAGE30US',
    title: '30-Year Fixed Rate Mortgage Average',
    frequency: 'Weekly',
    units: 'Percent',
    description: 'Average rate for 30-year fixed mortgage loans',
    analyzer: 'garch',
  },
  TEDRATE: {
    id: 'TEDRATE',
    title: 'TED Spread',
    frequency: 'Daily',
    units: 'Percent',
    description: 'TED Spread is the difference between the 3-month LIBOR and the 3-month Treasury bill rate. A key indicator of credit risk.',
    analyzer: 'garch',
    deprecated: true,  // 已弃用：FRED API在2022年后停止更新
  },
  // ========== Z-Score 指标（实体经济） ==========
  GDPC1: {
    id: 'GDPC1',
    title: 'Real Gross Domestic Product',
    frequency: 'Quarterly',
    units: 'Billions of Chained 2017 Dollars',
    description: 'Real GDP measures the value of economic output adjusted for price changes',
    analyzer: 'zscore',
  },
  UNRATE: {
    id: 'UNRATE',
    title: 'Unemployment Rate',
    frequency: 'Monthly',
    units: 'Percent',
    description: 'The unemployment rate represents the percentage of the labor force that is jobless',
    analyzer: 'zscore',
  },
  PCEPI: {
    id: 'PCEPI',
    title: 'Personal Consumption Expenditures Price Index',
    frequency: 'Monthly',
    units: 'Index 2017=100',
    description: 'PCE price index measures the prices paid by consumers for goods and services',
    analyzer: 'zscore',
  },
  PCE: {
    id: 'PCE',
    title: 'Personal Consumption Expenditures',
    frequency: 'Monthly',
    units: 'Billions of Dollars',
    description: 'Total consumer spending is a major component of GDP',
    analyzer: 'zscore',
  },
  RSAFS: {
    id: 'RSAFS',
    title: 'Advance Retail Sales',
    frequency: 'Monthly',
    units: 'Millions of Dollars',
    description: 'Retail sales measure consumer demand for finished goods',
    analyzer: 'zscore',
  },
  HOUST: {
    id: 'HOUST',
    title: 'New Privately-Owned Housing Units Started',
    frequency: 'Monthly',
    units: 'Thousands of Units',
    description: 'Housing starts indicate the construction of new residential buildings',
    analyzer: 'zscore',
  },
  CSUSHPISA: {
    id: 'CSUSHPISA',
    title: 'S&P CoreLogic Case-Shiller U.S. National Home Price Index',
    frequency: 'Monthly',
    units: 'Index Dec 2000=100',
    description: 'Home price index measures residential housing market trends',
    analyzer: 'zscore',
  },
  BOPGSTB: {
    id: 'BOPGSTB',
    title: 'U.S. Trade Balance: Goods and Services',
    frequency: 'Monthly',
    units: 'Billions of Dollars',
    description: 'Trade balance shows the difference between exports and imports',
    analyzer: 'zscore',
  },
  IMPGS: {
    id: 'IMPGS',
    title: 'Imports of Goods and Services',
    frequency: 'Monthly',
    units: 'Billons of Dollars',
    description: 'Total value of imported goods and services',
    analyzer: 'zscore',
  },
};

export async function fetchFREDData(
  seriesId: string,
  observationStart: string
): Promise<FREDSeries> {
  const url = 'https://api.stlouisfed.org/fred/series/observations';
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: process.env.FRED_API_KEY!,
    observation_start: observationStart,
    file_type: 'json',
    limit: '100000',
  });

  const response = await fetch(`${url}?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FRED API error for ${seriesId}: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function fetchMultipleIndicators(
  seriesIds: string[],
  daysBack: number = 365
): Promise<Map<string, FREDSeries>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const observationStart = startDate.toISOString().split('T')[0];

  const results = new Map<string, FREDSeries>();

  // Fetch all indicators in parallel with rate limiting
  const fetchPromises = seriesIds.map(async (seriesId) => {
    try {
      const data = await fetchFREDData(seriesId, observationStart);
      results.set(seriesId, data);
    } catch (error) {
      console.error(`Failed to fetch ${seriesId}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  return results;
}

export function getIndicatorInfo(seriesId: string): FREDSeriesInfo | undefined {
  return INDICATORS[seriesId];
}

export function getAllIndicators(): FREDSeriesInfo[] {
  return Object.values(INDICATORS);
}

// 获取指标的分析器类型
export function getAnalyzerType(seriesId: string): AnalyzerType {
  return INDICATORS[seriesId]?.analyzer || 'zscore';
}

// 判断是否使用 GARCH
export function isGARCHIndicator(seriesId: string): boolean {
  return GARCH_INDICATORS.includes(seriesId as typeof GARCH_INDICATORS[number]);
}

// 判断是否使用 Z-Score
export function isZScoreIndicator(seriesId: string): boolean {
  return ZSCORE_INDICATORS.includes(seriesId as typeof ZSCORE_INDICATORS[number]);
}

// 获取所有 GARCH 指标
export function getGARCHIndicators(): FREDSeriesInfo[] {
  return Object.values(INDICATORS).filter(ind => ind.analyzer === 'garch');
}

// 获取所有 Z-Score 指标
export function getZScoreIndicators(): FREDSeriesInfo[] {
  return Object.values(INDICATORS).filter(ind => ind.analyzer === 'zscore');
}
