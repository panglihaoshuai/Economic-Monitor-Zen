'use client';

import { useState, useEffect } from 'react';
import { ZenCard } from '@/components/ui/ZenUI';
import { VolatilityTrendAnalysis } from '@/components/VolatilityTrendAnalysis';
import CorrelationMatrix from '@/components/CorrelationMatrix';
import SemanticInsight from '@/components/SemanticInsight';
import { HistoricalEvents } from '@/components/HistoricalEvents';
import { useTranslation } from '@/lib/language-context';
import { TrendingUp, Network, BrainCircuit, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface AnalysisPageProps {
    indicatorId?: string;
    startDate?: string;
    endDate?: string;
}

export default function AnalysisPage({ indicatorId = 'CPIAUCSL', startDate, endDate }: AnalysisPageProps) {
    const { t } = useTranslation();
    const [selectedIndicator, setSelectedIndicator] = useState(indicatorId);
    const [selectedStartDate, setSelectedStartDate] = useState(startDate);
    const [selectedEndDate, setSelectedEndDate] = useState(endDate);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['volatility', 'semantic']));

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-2">
                        {t('analysis.title', '深度分析')}
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('analysis.subtitle', '探索数据背后的深层洞察')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-4 py-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                        <select
                            value={selectedIndicator}
                            onChange={(e) => setSelectedIndicator(e.target.value)}
                            className="bg-transparent text-[var(--text-primary)] text-sm font-medium focus:outline-none cursor-pointer"
                        >
                            <option value="CPIAUCSL">CPI (消费者物价指数)</option>
                            <option value="UNRATE">失业率</option>
                            <option value="GDP">GDP</option>
                            <option value="FEDFUNDS">联邦利率</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Summary */}
            <ZenCard className="bg-gradient-to-br from-[var(--accent-sage)]/10 to-[var(--accent-blue)]/10 border-[var(--accent-sage)]/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent-sage)]/20 flex items-center justify-center flex-shrink-0">
                        <BrainCircuit className="w-6 h-6 text-[var(--accent-sage)]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            {t('analysis.quickSummary', '快速概览')}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                            {t('analysis.quickSummaryText', '当前经济指标显示通胀压力持续上升，波动率处于高位。与失业率呈强负相关，建议关注美联储政策动向。')}
                        </p>
                    </div>
                </div>
            </ZenCard>

            {/* Volatility Trend Analysis */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('volatility')}
                    className="w-full flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-lg hover:bg-[var(--bg-subtle)]/80 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-[var(--accent-blue)]" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {t('analysis.volatilityTrend', '波动率趋势分析')}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {t('analysis.volatilityTrendDesc', '识别波动率变化和突破点')}
                            </p>
                        </div>
                    </div>
                    {expandedSections.has('volatility') ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                </button>

                {expandedSections.has('volatility') && (
                    <div className="animate-fade-in">
                        <VolatilityTrendAnalysis
                            indicatorId={selectedIndicator}
                            startDate={selectedStartDate}
                            endDate={selectedEndDate}
                        />
                    </div>
                )}
            </div>

            {/* Semantic Insight */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('semantic')}
                    className="w-full flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-lg hover:bg-[var(--bg-subtle)]/80 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-sage)]/10 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-[var(--accent-sage)]" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {t('analysis.semanticInsight', '语义洞察')}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {t('analysis.semanticInsightDesc', 'AI驱动的深度解读和投资建议')}
                            </p>
                        </div>
                    </div>
                    {expandedSections.has('semantic') ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                </button>

                {expandedSections.has('semantic') && (
                    <div className="animate-fade-in">
                        <SemanticInsight
                            seriesId={selectedIndicator}
                            startDate={selectedStartDate}
                            endDate={selectedEndDate}
                        />
                    </div>
                )}
            </div>

            {/* Correlation Matrix */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('correlation')}
                    className="w-full flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-lg hover:bg-[var(--bg-subtle)]/80 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center">
                            <Network className="w-5 h-5 text-[var(--accent-blue)]" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {t('analysis.correlationMatrix', '跨资产相关性矩阵')}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {t('analysis.correlationMatrixDesc', '探索不同经济指标之间的关系')}
                            </p>
                        </div>
                    </div>
                    {expandedSections.has('correlation') ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                </button>

                {expandedSections.has('correlation') && (
                    <div className="animate-fade-in">
                        <CorrelationMatrix
                            seriesIds={['CPIAUCSL', 'UNRATE', 'GDP', 'FEDFUNDS']}
                            startDate={selectedStartDate}
                            endDate={selectedEndDate}
                        />
                    </div>
                )}
            </div>

            {/* Historical Events */}
            <div className="space-y-3">
                <button
                    onClick={() => toggleSection('historical')}
                    className="w-full flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-lg hover:bg-[var(--bg-subtle)]/80 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-sage)]/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[var(--accent-sage)]" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {t('analysis.historicalEvents', '历史相似事件')}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {t('analysis.historicalEventsDesc', '参考历史，洞察未来')}
                            </p>
                        </div>
                    </div>
                    {expandedSections.has('historical') ? (
                        <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                </button>

                {expandedSections.has('historical') && (
                    <div className="animate-fade-in">
                        <HistoricalEvents
                            indicatorId={selectedIndicator}
                            startDate={selectedStartDate}
                            endDate={selectedEndDate}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
