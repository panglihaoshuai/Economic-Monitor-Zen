'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Brain, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Info, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInvestmentInsight, getIndicatorCategory } from '@/lib/volatility-analyzer';
import { IndicatorEncyclopedia, INDICATOR_INFO } from '@/components/IndicatorEncyclopedia';
import { useLanguage } from '@/lib/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Indicator {
  id: string;
  title: string;
  frequency: string;
  units: string;
  latest: {
    value: number;
    date: string;
    zScore?: {
      zScore: number;
      severity: 'normal' | 'warning' | 'critical';
      displayText: { zh: string; en: string };
    };
  };
  anomaly?: {
    analyzer: string;
    severity: string;
    zScore: number;
    percentile: number;
    trend: string;
    volatility: string;
    displayText: { zh: string; en: string };
  };
}

// 核心指标
const coreIndicators = ['SOFR', 'UNRATE', 'PCEPI', 'GDPC1'];

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { data, error, isLoading, mutate } = useSWR<{ indicators: Indicator[] }>(
    '/api/economic-data',
    fetcher,
    { refreshInterval: 60000 }
  );

  const [encyclopediaIndicator, setEncyclopediaIndicator] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 animate-pulse">
          <div className="h-5 sm:h-6 bg-slate-200 rounded w-1/3 sm:w-1/4 mb-3 sm:mb-4" />
          <div className="h-16 sm:h-24 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 animate-pulse">
              <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/2 mb-2 sm:mb-4" />
              <div className="h-6 sm:h-8 bg-slate-200 rounded w-3/4 mb-1 sm:mb-2" />
              <div className="h-3 sm:h-4 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">{t('common.error')}</h3>
        <p className="text-slate-500">{error.message}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load data</h3>
        <p className="text-slate-500">{error.message}</p>
      </div>
    );
  }

  const coreData = data?.indicators.filter((i) => coreIndicators.includes(i.id)) || [];
  const otherData = data?.indicators.filter((i) => !coreIndicators.includes(i.id)) || [];

  // 计算周期定位
  const cyclePosition = calculateCyclePosition(coreData);

  return (
    <div className="space-y-6">
      {/* ========== 第1层：周期定位概览 ========== */}
      <CyclePositionBanner position={cyclePosition} indicators={coreData} />

      {/* ========== 第2层：核心指标 ========== */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <span>{t('dashboard.coreIndicators')}</span>
        </h2>
        {/* 移动端：单列；平板：2列；桌面：4列 */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {coreData.map((indicator) => (
            <IndicatorCard
              key={indicator.id}
              indicator={indicator}
              onOpenEncyclopedia={setEncyclopediaIndicator}
            />
          ))}
        </div>
      </section>

      {/* ========== 所有指标 ========== */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          <span>{t('dashboard.allIndicators')}</span>
        </h2>
        {/* 移动端：2列；平板：3列；桌面：4列；大屏：6列 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          {otherData.map((indicator) => (
            <SmallIndicatorCard key={indicator.id} indicator={indicator} />
          ))}
        </div>
      </section>

      {/* Encyclopedia Modal */}
      {encyclopediaIndicator && (
        <EncyclopediaModal
          indicatorId={encyclopediaIndicator}
          indicatorTitle={data?.indicators.find(i => i.id === encyclopediaIndicator)?.title || encyclopediaIndicator}
          onClose={() => setEncyclopediaIndicator(null)}
        />
      )}
    </div>
  );
}

// ========== 周期定位组件 ==========

function CyclePositionBanner({
  position,
  indicators
}: {
  position: { phase: string; risk: string; suggestion: string; color: string };
  indicators: Indicator[];
}) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className={cn(
      'bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 text-white',
      'border-l-4',
      position.color === 'blue' ? 'border-l-blue-500' :
        position.color === 'green' ? 'border-l-green-500' :
          position.color === 'amber' ? 'border-l-amber-500' :
            'border-l-red-500'
    )}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs sm:text-sm text-slate-400">📍 经济周期定位 / Economic Cycle Position</span>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{position.phase}</div>
          <div className="text-xs sm:text-sm text-slate-300">
            基于 {indicators.length} 个核心指标综合判断 / Based on {indicators.length} core indicators
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className={cn(
            'px-3 sm:px-4 py-2 rounded-lg border',
            getRiskColor(position.risk)
          )}>
            <div className="text-xs opacity-70">市场风险 / Market Risk</div>
            <div className="font-semibold text-sm sm:text-base">
              {position.risk === 'low' ? '🟢 Low 低' : position.risk === 'medium' ? '🟡 Medium 中' : '🔴 High 高'}
            </div>
          </div>
          <div className="px-3 sm:px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <div className="text-xs opacity-70">投资建议 / Suggestion</div>
            <div className="font-semibold text-sm">{position.suggestion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateCyclePosition(indicators: Indicator[]): {
  phase: string;
  risk: 'low' | 'medium' | 'high';
  suggestion: string;
  color: string;
} {
  // 基于关键指标判断周期位置
  const getValue = (id: string) => indicators.find(i => i.id === id)?.latest?.value || 0;
  const getZScore = (id: string) => indicators.find(i => i.id === id)?.latest?.zScore?.zScore || 0;

  const sofr = getValue('SOFR');
  const unrate = getValue('UNRATE');
  const pce = getValue('PCEPI');
  const gdpgrowth = getValue('GDPC1');

  // 简单规则判断
  let riskScore = 0;
  let suggestions: string[] = [];

  // SOFR 判断
  if (sofr > 5) {
    riskScore += 2;
    suggestions.push('利率高位，防御为主');
  } else if (sofr < 4) {
    suggestions.push('利率正常，可适度增配股票');
  }

  // 失业率判断
  if (unrate < 4) {
    riskScore += 1;
    suggestions.push('劳动力市场紧张，关注通胀');
  } else if (unrate > 5) {
    riskScore += 2;
    suggestions.push('失业率偏高，谨慎操作');
  }

  // 通胀判断
  if (pce > 3) {
    riskScore += 2;
    suggestions.push('通胀压力较大');
  } else if (pce < 2) {
    suggestions.push('通胀温和');
  }

  // GDP 判断
  if (gdpgrowth > 3) {
    suggestions.push('经济强劲');
  } else if (gdpgrowth < 1) {
    riskScore += 1;
    suggestions.push('经济放缓');
  }

  // 综合判断
  if (riskScore >= 3) {
    return {
      phase: '🔴 扩张后期 / 警惕阶段',
      risk: 'high',
      suggestion: '减少风险敞口，增加防御配置',
      color: 'red',
    };
  } else if (riskScore >= 1) {
    return {
      phase: '🟡 扩张中后期',
      risk: 'medium',
      suggestion: '保持均衡配置，关注利率变化',
      color: 'amber',
    };
  } else {
    return {
      phase: '🔵 扩张初中期',
      risk: 'low',
      suggestion: '可适度增配股票和成长板块',
      color: 'blue',
    };
  }
}

// ========== 指标卡片组件 ==========

function IndicatorCard({ indicator, onOpenEncyclopedia }: { indicator: Indicator; onOpenEncyclopedia?: (id: string) => void }) {
  const zScore = indicator.latest?.zScore;
  const insight = getInvestmentInsight(indicator.id);
  const [expanded, setExpanded] = useState(false);

  const isNormal = zScore?.severity === 'normal';
  const isWarning = zScore?.severity === 'warning';
  const isCritical = zScore?.severity === 'critical';

  return (
    <div className={cn(
      'bg-white rounded-lg sm:rounded-xl border p-3 sm:p-6 transition-all',
      isCritical ? 'border-red-200 bg-red-50/30' : 'border-slate-200',
      'hover:shadow-md sm:hover:shadow-lg'
    )}>
      {/* 标题和状态 */}
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div>
          <h3 className="font-medium text-slate-900 text-sm sm:text-base">{indicator.title}</h3>
          <p className="text-xs text-slate-500">{indicator.id}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {onOpenEncyclopedia && (
            <button
              onClick={() => onOpenEncyclopedia(indicator.id)}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Learn more about this indicator"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
          <span
            className={cn(
              'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap',
              isNormal && 'bg-green-100 text-green-700',
              isWarning && 'bg-amber-100 text-amber-700',
              isCritical && 'bg-red-100 text-red-700'
            )}
          >
            {isNormal ? '🟢' : isWarning ? '🟡' : '🔴'} <span className="hidden xs:inline">{zScore?.displayText.zh || '正常'}</span>
          </span>
        </div>
      </div>

      {/* 数值 */}
      <div className="mb-2 sm:mb-4">
        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
          {indicator.latest?.value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <p className="text-xs sm:text-sm text-slate-500">{indicator.units}</p>
      </div>

      {/* 投资含义（展开后显示） */}
      {expanded && insight && (
        <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg text-xs sm:text-sm">
          <div className="font-medium text-blue-900 mb-1">💡 投资含义 / Investment Insight</div>
          <div className="text-blue-800 mb-2">{insight.summary.zh || insight.summary.en}</div>
          <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs">
            <div>
              <span className="text-red-600">📉 股市 / Stocks：</span>
              {insight.impactOnStocks.zh || insight.impactOnStocks.en}
            </div>
            <div>
              <span className="text-blue-600">📊 债市 / Bonds：</span>
              {insight.impactOnBonds.zh || insight.impactOnBonds.en}
            </div>
          </div>
          <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-blue-200">
            <span className="font-medium text-blue-900">💼 建议 / Suggestion：</span>
            <span className="text-blue-800">{insight.suggestion.zh || insight.suggestion.en}</span>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          更新 / Updated: {new Date(indicator.latest?.date || '').toLocaleDateString()}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 transition"
        >
          {expanded ? '收起 / Less' : '详情 / More'}
          {expanded ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
        </button>
      </div>
    </div>
  );
}

function SmallIndicatorCard({ indicator }: { indicator: Indicator }) {
  const zScore = indicator.latest?.zScore;
  const isNormal = zScore?.severity === 'normal';
  const isCritical = zScore?.severity === 'critical';

  return (
    <div
      className={cn(
        'bg-white rounded-lg border p-2 sm:p-3 lg:p-4 hover:shadow-md transition cursor-pointer',
        isCritical ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span className="text-xs text-slate-500">{indicator.id}</span>
        <span className={isNormal ? 'text-green-500' : 'text-amber-500'}>
          {isNormal ? '✓' : '!'}
        </span>
      </div>
      <div className="font-medium text-slate-900 text-xs sm:text-sm truncate">
        {indicator.title}
      </div>
      <div className="text-sm sm:text-lg font-bold text-slate-900 mt-0.5 sm:mt-1">
        {indicator.latest?.value.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        })}
      </div>
      <div className="text-xs text-slate-500 mt-0.5 sm:mt-1">
        {new Date(indicator.latest?.date || '').toLocaleDateString()}
      </div>
    </div>
  );
}

function EncyclopediaModal({
  indicatorId,
  indicatorTitle,
  onClose,
}: {
  indicatorId: string;
  indicatorTitle: string;
  onClose: () => void;
}) {
  const info = INDICATOR_INFO[indicatorId];

  if (!info) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{indicatorTitle}</h2>
              <p className="text-xs sm:text-sm opacity-80">{indicatorId} Economic Encyclopedia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">What is {indicatorTitle}?</h3>
            <p className="text-sm sm:text-slate-600">{info.description}</p>
          </div>

          {/* What it measures */}
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">📊 What It Measures</h3>
            <p className="text-blue-800 text-sm sm:text-base">{info.whatItMeasures}</p>
          </div>

          {/* Why it matters */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">🎯 Why It Matters</h3>
            <p className="text-sm sm:text-slate-600">{info.whyItMatters}</p>
          </div>

          {/* How to interpret */}
          <div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-amber-900 mb-1 sm:mb-2 text-sm sm:text-base">💡 How to Interpret</h3>
            <p className="text-amber-800 text-sm sm:text-base">{info.howToInterpret}</p>
          </div>

          {/* Market impact */}
          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-purple-900 mb-1 sm:mb-2 text-sm sm:text-base">📈 Market Impact</h3>
            <p className="text-purple-800 text-sm sm:text-base">{info.marketImpact}</p>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="p-2 sm:p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500 mb-1 text-xs">Frequency</div>
              <div className="font-medium text-slate-900">{info.frequency}</div>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500 mb-1 text-xs">Source</div>
              <div className="font-medium text-slate-900">{info.source}</div>
            </div>
          </div>

          {/* FRED link */}
          <a
            href={info.fredUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition text-sm"
          >
            <BookOpen className="w-4 h-4" />
            View on FRED (Federal Reserve Economic Data)
          </a>
        </div>
      </div>
    </div>
  );
}
