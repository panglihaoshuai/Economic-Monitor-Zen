'use client';

import { useState } from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicatorEncyclopediaProps {
  indicatorId: string;
  indicatorTitle: string;
  children: React.ReactNode;
}

const INDICATOR_INFO: Record<string, {
  description: string;
  whatItMeasures: string;
  whyItMatters: string;
  howToInterpret: string;
  marketImpact: string;
  frequency: string;
  source: string;
  fredUrl: string;
}> = {
  SOFR: {
    description: 'Secured Overnight Financing Rate',
    whatItMeasures: 'The interest rate banks charge each other for overnight borrowing secured by Treasury securities.',
    whyItMatters: 'The Fed adopted SOFR as the preferred alternative to LIBOR for U.S. dollar derivatives. It reflects the true cost of borrowing cash collateralized by Treasury securities.',
    howToInterpret: 'Higher SOFR = tighter credit conditions. Lower SOFR = easier conditions. Currently around 5.3%, indicating restrictive monetary policy.',
    marketImpact: 'Directly impacts short-term rates, floating-rate loans, and is a key reference rate for derivatives. Affects mortgage rates, corporate borrowing costs.',
    frequency: 'Daily',
    source: 'Federal Reserve Bank of New York',
    fredUrl: 'https://fred.stlouisfed.org/series/SOFR',
  },
  UNRATE: {
    description: 'Unemployment Rate',
    whatItMeasures: 'The percentage of the labor force that is jobless and actively seeking employment.',
    whyItMatters: 'A key indicator of overall economic health. The Fed watches it closely for its dual mandate of maximum employment and price stability.',
    howToInterpret: 'Lower unemployment = stronger labor market. Below 4% historically considered "full employment". Rising unemployment signals economic weakness.',
    marketImpact: 'Lower unemployment generally positive for stocks (consumer spending). Very low unemployment can signal inflation risk, pressuring bonds.',
    frequency: 'Monthly',
    source: 'U.S. Bureau of Labor Statistics',
    fredUrl: 'https://fred.stlouisfed.org/series/UNRATE',
  },
  PCEPI: {
    description: 'Personal Consumption Expenditures Price Index',
    whatItMeasures: 'The price index for all personal consumption expenditures, tracking changes in prices across the broad range of consumer purchases.',
    whyItMatters: 'The Fed\'s preferred inflation measure. More comprehensive than CPI as it includes all consumption, not just out-of-pocket expenses.',
    howToInterpret: 'The Fed targets 2%. Above 2% = inflationary pressure. Below 2% = potential deflation concern. Recent readings around 2.5-3%.',
    marketImpact: 'Higher PCE = hawkish Fed = lower stocks, higher yields. Lower PCE = dovish Fed = higher stocks, lower yields.',
    frequency: 'Monthly',
    source: 'U.S. Bureau of Economic Analysis',
    fredUrl: 'https://fred.stlouisfed.org/series/PCEPI',
  },
  GDPC1: {
    description: 'Real Gross Domestic Product',
    whatItMeasures: 'The total value of all goods and services produced in the U.S. economy, adjusted for inflation.',
    whyItMatters: 'The broadest measure of economic activity and health. Indicates the economy\'s size and growth rate.',
    howToInterpret: 'Positive GDP = expanding economy. Negative GDP = contracting (recession if sustained). Trend growth is ~2%. Above 3% = strong expansion.',
    marketImpact: 'Strong GDP = positive for stocks, can pressure bonds (growth = inflation risk). Weak GDP = negative for stocks, positive for bonds.',
    frequency: 'Quarterly',
    source: 'U.S. Bureau of Economic Analysis',
    fredUrl: 'https://fred.stlouisfed.org/series/GDPC1',
  },
  DGS10: {
    description: '10-Year Treasury Constant Maturity Rate',
    whatItMeasures: 'The yield on 10-year U.S. government bonds. The "benchmark" interest rate for the economy.',
    whyItMatters: 'Influences borrowing costs across the economy. Reflects market expectations for future interest rates and economic growth.',
    howToInterpret: 'Higher yields = higher borrowing costs. Lower yields = cheaper borrowing. Currently 4-5%, historically elevated.',
    marketImpact: 'Affects mortgage rates (30-year mortgage tracks 10Y). Higher yields = lower equity valuations (discount rates rise).',
    frequency: 'Daily',
    source: 'Federal Reserve Board',
    fredUrl: 'https://fred.stlouisfed.org/series/DGS10',
  },
  DGS2: {
    description: '2-Year Treasury Constant Maturity Rate',
    whatItMeasures: 'The yield on 2-year U.S. government bonds. Sensitive to Fed policy expectations.',
    whyItMatters: 'The most sensitive Treasury maturity to Fed policy. Reflects market expectations for the Fed funds rate over the next 2 years.',
    howToInterpret: 'Close to Fed funds rate = markets expect no change. Steep curve = expect cuts. Inverted (below Fed funds) = expect cuts.',
    marketImpact: 'Leading indicator for interest rate moves. Affects short-term borrowing costs, currency valuations.',
    frequency: 'Daily',
    source: 'Federal Reserve Board',
    fredUrl: 'https://fred.stlouisfed.org/series/DGS2',
  },
  MORTGAGE30US: {
    description: '30-Year Fixed Rate Mortgage Average',
    whatItMeasures: 'The average interest rate on 30-year fixed-rate conventional home mortgages.',
    whyItMatters: 'The most common mortgage type in the U.S. Directly affects housing affordability and the housing market.',
    howToInterpret: 'Lower rates = cheaper mortgages = more buying power. Higher rates = less buying power. Currently 6-7%.',
    marketImpact: 'Directly impacts housing stocks (homebuilders, real estate). Housing is ~5% of GDP. High rates constrain spending.',
    frequency: 'Weekly',
    source: 'Federal Housing Finance Agency',
    fredUrl: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
  },
  TEDRATE: {
    description: 'TED Spread',
    whatItMeasures: 'The difference between the 3-month LIBOR and 3-month Treasury bill rate. Measures bank liquidity stress.',
    whyItMatters: 'A key indicator of financial stress. Higher TED = banks lending less = potential credit crunch.',
    howToInterpret: 'Normal range: 0.3-0.5%. Above 1% = stress. Above 2% = crisis levels (as in 2008). Currently elevated.',
    marketImpact: 'Risk sentiment indicator. Rising TED = risk-off. Falling TED = risk-on. Affects all credit markets.',
    frequency: 'Daily',
    source: 'Federal Reserve Bank of St. Louis',
    fredUrl: 'https://fred.stlouisfed.org/series/TEDRATE',
  },
  HOUST: {
    description: 'Housing Starts',
    whatItMeasures: 'The number of new residential construction projects beginning during a particular month.',
    whyItMatters: 'A leading indicator of economic activity. Housing leads the economy by 6-12 months.',
    howToInterpret: 'Higher starts = builder confidence = future economic growth. Lower starts = economic concern. Trend: ~1.5M annual rate.',
    marketImpact: 'Housing is 5% of GDP. Affects homebuilders, building materials, furniture. Positive for economy when rising.',
    frequency: 'Monthly',
    source: 'U.S. Census Bureau',
    fredUrl: 'https://fred.stlouisfed.org/series/HOUST',
  },
  CSUSHPISA: {
    description: 'S&P/Case-Shiller U.S. National Home Price Index',
    whatItMeasures: 'The composite index of home prices across 20 major U.S. metropolitan areas.',
    whyItMatters: 'The most widely recognized measure of U.S. home prices. Tracks housing market trends.',
    howToInterpret: 'Rising prices = housing appreciation. Falling prices = depreciation. Long-term trend ~3-4% annually.',
    marketImpact: 'Wealth effect (rising prices = more consumer spending). Affects mortgage demand. Impacts financial stability.',
    frequency: 'Monthly',
    source: 'S&P Dow Jones Indices',
    fredUrl: 'https://fred.stlouisfed.org/series/CSUSHPISA',
  },
  PCE: {
    description: 'Personal Consumption Expenditures',
    whatItMeasures: 'The total amount of spending by consumers on goods and services. The "P" in GDP.',
    whyItMatters: 'Consumer spending is ~70% of U.S. GDP. The largest driver of economic growth.',
    howToInterpret: 'Higher PCE = stronger consumer. Lower PCE = consumer weakness. Year-over-year growth indicates trend.',
    marketImpact: 'Consumer spending drives corporate earnings. Strong PCE = positive for stocks. Weak PCE = concern.',
    frequency: 'Monthly',
    source: 'U.S. Bureau of Economic Analysis',
    fredUrl: 'https://fred.stlouisfed.org/series/PCE',
  },
  RSAFS: {
    description: 'Retail Sales',
    whatItMeasures: 'The total receipts of retail stores. Monthly measure of consumer spending on goods.',
    whyItMatters: 'A timely indicator of consumer behavior. Shows whether consumers are spending or cutting back.',
    howToInterpret: 'Rising sales = consumer confidence. Falling sales = caution. Excludes services (food, housing).',
    marketImpact: 'Direct impact on retail stocks. Indicator of economic momentum. Affects GDP estimates.',
    frequency: 'Monthly',
    source: 'U.S. Census Bureau',
    fredUrl: 'https://fred.stlouisfed.org/series/RSAFS',
  },
  BOPGSTB: {
    description: 'Balance of Trade - Goods and Services',
    whatItMeasures: 'The difference between exports and imports of goods and services.',
    whyItMatters: 'Trade deficit/surplus affects GDP composition. Large deficits can be a structural vulnerability.',
    howToInterpret: 'Deficit = imports > exports. Surplus = exports > imports. U.S. typically runs large deficits.',
    marketImpact: 'Trade data affects currency. Large deficits can pressure dollar. Impact on specific sectors (import/export).',
    frequency: 'Monthly',
    source: 'U.S. Bureau of Economic Analysis',
    fredUrl: 'https://fred.stlouisfed.org/series/BOPGSTB',
  },
  IMPGS: {
    description: 'Imports of Goods and Services',
    whatItMeasures: 'The value of all goods and services imported into the U.S.',
    whyItMatters: 'Indicates domestic demand for foreign products. Higher imports = stronger domestic economy.',
    howToInterpret: 'Rising imports = domestic strength. Falling imports = domestic weakness. Also reflects dollar strength.',
    marketImpact: 'Import prices affect inflation. Trade tensions impact specific sectors. Currency implications.',
    frequency: 'Monthly',
    source: 'U.S. Bureau of Economic Analysis',
    fredUrl: 'https://fred.stlouisfed.org/series/IMPGS',
  },
};

// Export the indicator info for use in other components
export { INDICATOR_INFO };

export function IndicatorEncyclopedia({ indicatorId, indicatorTitle, children }: IndicatorEncyclopediaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const info = INDICATOR_INFO[indicatorId];

  if (!info) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">{indicatorTitle}</h2>
                  <p className="text-sm opacity-80">{indicatorId} Economic Encyclopedia</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">What is {indicatorTitle}?</h3>
                <p className="text-slate-600">{info.description}</p>
              </div>

              {/* What it measures */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">📊 What It Measures</h3>
                <p className="text-blue-800">{info.whatItMeasures}</p>
              </div>

              {/* Why it matters */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">🎯 Why It Matters</h3>
                <p className="text-slate-600">{info.whyItMatters}</p>
              </div>

              {/* How to interpret */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-medium text-amber-900 mb-2">💡 How to Interpret</h3>
                <p className="text-amber-800">{info.howToInterpret}</p>
              </div>

              {/* Market impact */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">📈 Market Impact</h3>
                <p className="text-purple-800">{info.marketImpact}</p>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 mb-1">Frequency</div>
                  <div className="font-medium text-slate-900">{info.frequency}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 mb-1">Source</div>
                  <div className="font-medium text-slate-900">{info.source}</div>
                </div>
              </div>

              {/* FRED link */}
              <a
                href={info.fredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
              >
                <ExternalLink className="w-4 h-4" />
                View on FRED (Federal Reserve Economic Data)
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for using the encyclopedia
export function useIndicatorEncyclopedia(indicatorId: string) {
  const info = INDICATOR_INFO[indicatorId];
  return {
    info,
    hasInfo: !!info,
  };
}
