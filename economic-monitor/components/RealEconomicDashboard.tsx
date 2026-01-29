'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { ZenCard, ZenBadge, ZenButton, ZenSpinner } from './ui/ZenUI';
import { ZenSparkline } from './ui/ZenSparkline';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { IndicatorDetailModal } from './IndicatorDetailModal';

// ========== Types ==========

interface AnomalyResult {
    seriesId: string;
    seriesTitle: string;
    currentValue: number;
    analyzer: 'garch' | 'zscore' | 'error' | 'insufficient_data';
    severity: 'normal' | 'warning' | 'critical';
    zScore: number;
    description: string;
    category?: {
        type: 'garch' | 'zscore';
        name: string;
        reason: string;
        investmentInsight?: {
            summary: { en: string; zh: string };
            interpretation: { en: string; zh: string };
            impactOnStocks: { en: string; zh: string };
            impactOnBonds: { en: string; zh: string };
            suggestion: { en: string; zh: string };
        };
    };
}

interface IndicatorSummary {
    id: string; // FRED ID
    title: string;
    frequency: string;
    units: string;
    analyzer: string;
    latest?: {
        value: number;
        date: string;
    };
    anomaly?: AnomalyResult;
}

interface DashboardResponse {
    indicators: IndicatorSummary[];
    anomalies: AnomalyResult[];
    summary: {
        totalIndicators: number;
        anomalyCount: number;
        criticalCount: number;
        warningCount: number;
    };
}

// ========== Fetcher ==========
const fetcher = (url: string) => fetch(url).then(r => r.json());

// API base path - use new route
const API_BASE = '/api/economic-data';

// ========== Sub-component: Indicator Card ==========

interface IndicatorCardProps {
    indicator: IndicatorSummary;
    onClick: () => void;
}

function IndicatorCard({ indicator, onClick }: IndicatorCardProps) {
    const { t, language } = useLanguage();
    // Fetch history for sparkline
    const { data: historyData } = useSWR<{ data: { value: number }[] }>(
        `${API_BASE}?seriesId=${indicator.id}&limit=50`,
        fetcher
    );

    const values = historyData?.data?.map(d => d.value).reverse() || [];
    const currentValue = indicator.latest?.value || 0;
    const isPositive = values.length > 1 ? currentValue > values[values.length - 2] : false;

    const anomaly = indicator.anomaly;
    const severity = anomaly?.severity || 'normal';

    // Color logic
    const isCritical = severity === 'critical';
    const isWarning = severity === 'warning';

    const borderColorClass = isCritical
        ? 'border-[var(--status-error)]'
        : isWarning
            ? 'border-[var(--status-warning)]'
            : '';

    const bgStyle = isCritical
        ? { backgroundColor: 'rgba(176, 85, 85, 0.05)' }
        : isWarning
            ? { backgroundColor: 'rgba(212, 132, 94, 0.05)' }
            : undefined;

    return (
        <ZenCard
            className={`flex flex-col gap-4 h-full ${borderColorClass} cursor-pointer hover:shadow-lg hover:border-[var(--accent-sage)] transition-all duration-200`}
            style={bgStyle}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        {indicator.title}
                    </h3>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                        {indicator.frequency} • {indicator.units}
                    </div>
                </div>
                {severity !== 'normal' && (
                    <ZenBadge variant={isCritical ? 'terracotta' : 'neutral'}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {isCritical ? t('zen.status.abnormal') : t('zen.status.warning')}
                    </ZenBadge>
                )}
            </div>

            {/* Main Value */}
            <div className="mt-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-serif text-[var(--text-primary)]">
                        {currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    {indicator.units === 'Percent' && <span className="text-sm text-[var(--text-muted)]">%</span>}
                </div>

                {/* Change indicator (simple) */}
                {values.length > 1 && (
                    <div className={`flex items-center text-xs mt-1 ${isPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(currentValue - values[values.length - 2]).toFixed(2)} {t('zen.card.vsLast')}
                    </div>
                )}
            </div>

            {/* Logic / Insight */}
            {anomaly?.category?.investmentInsight && (
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-3 rounded-lg mt-auto">
                    <div className="font-medium mb-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {t('zen.dashboard.insight')}
                    </div>
                    {anomaly.category.investmentInsight.summary[language]}
                </div>
            )}

            {/* Sparkline */}
            <div className="h-16 -mx-2 mt-4 translate-y-2">
                {values.length > 0 ? (
                    <ZenSparkline
                        data={values}
                        color={severity === 'critical' ? '#B05555' : isWarning ? '#D4845E' : '#7C9070'}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)] opacity-50">
                        {t('zen.card.loading')}
                    </div>
                )}
            </div>
        </ZenCard>
    );
}

// ========== Main Dashboard Component ==========

export function RealEconomicDashboard() {
    const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(API_BASE, fetcher);
    const { t, language } = useLanguage();

    // Modal state
    const [selectedIndicator, setSelectedIndicator] = useState<{ id: string; title: string } | null>(null);

    if (error) return (
        <div className="p-10 text-center text-[var(--status-error)]">
            {t('zen.dashboard.error')}
        </div>
    );

    if (isLoading) return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <ZenSpinner className="w-8 h-8 text-[var(--accent-sage)]" />
            <p className="text-[var(--text-secondary)] text-sm animate-pulse">{t('zen.dashboard.loading')}</p>
        </div>
    );

    if (!data || data.indicators.length === 0) return (
        <div className="p-10 text-center text-[var(--text-secondary)]">
            {t('zen.dashboard.error')}
        </div>
    );

    // Categorize indicators by Priority
    const criticalIndicators = data.indicators.filter(i => i.anomaly?.severity === 'critical');
    const warningIndicators = data.indicators.filter(i => i.anomaly?.severity === 'warning');
    const normalIndicators = data.indicators.filter(i => i.anomaly?.severity === 'normal' || !i.anomaly);

    const sortedNormal = [...normalIndicators].sort((a, b) => {
        if (a.analyzer === 'garch' && b.analyzer !== 'garch') return -1;
        if (a.analyzer !== 'garch' && b.analyzer === 'garch') return 1;
        return 0;
    });

    const methodLabel = data.summary.anomalyCount > 0
        ? (language === 'zh' ? '异常检测' : 'Anomaly Detection')
        : (language === 'zh' ? '标准分析' : 'Standard Analysis');

    const handleIndicatorClick = (indicator: IndicatorSummary) => {
        setSelectedIndicator({ id: indicator.id, title: indicator.title });
    };

    return (
        <>
            <div className="space-y-12 animate-fade-in">
                {/* Header */}
                <header className="flex justify-between items-end pb-6 border-b border-[var(--stroke-light)]">
                    <div>
                        <h1 className="text-3xl font-serif text-[var(--text-primary)]">{t('zen.dashboard.title')}</h1>
                        <p className="text-[var(--text-secondary)] mt-2 max-w-xl">
                            {t('zen.dashboard.subtitle', {
                                count: data.summary.totalIndicators,
                                method: methodLabel
                            })}
                        </p>
                    </div>
                    <ZenButton variant="ghost" size="sm" onClick={() => mutate()} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {t('zen.dashboard.refresh')}
                    </ZenButton>
                </header>

                {/* Critical Section */}
                {(criticalIndicators.length > 0 || warningIndicators.length > 0) && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--status-warning)]">
                                {t('zen.dashboard.anomalies')} ({criticalIndicators.length + warningIndicators.length})
                            </h2>
                            <div className="h-px bg-[var(--status-warning)]/20 flex-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {criticalIndicators.map(ind => (
                                <IndicatorCard
                                    key={ind.id}
                                    indicator={ind}
                                    onClick={() => handleIndicatorClick(ind)}
                                />
                            ))}
                            {warningIndicators.map(ind => (
                                <IndicatorCard
                                    key={ind.id}
                                    indicator={ind}
                                    onClick={() => handleIndicatorClick(ind)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Main Grid */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                            {t('zen.dashboard.marketOverview')}
                        </h2>
                        <div className="h-px bg-[var(--stroke-light)] flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedNormal.map(ind => (
                            <IndicatorCard
                                key={ind.id}
                                indicator={ind}
                                onClick={() => handleIndicatorClick(ind)}
                            />
                        ))}
                    </div>
                </section>
            </div>

            {/* Detail Modal */}
            {selectedIndicator && (
                <IndicatorDetailModal
                    indicatorId={selectedIndicator.id}
                    indicatorTitle={selectedIndicator.title}
                    onClose={() => setSelectedIndicator(null)}
                />
            )}
        </>
    );
}
