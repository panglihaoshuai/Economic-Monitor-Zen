'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, TrendingUp, TrendingDown, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';
import { ZenButton, ZenCard, ZenBadge, ZenSpinner } from './ui/ZenUI';
import { useLanguage } from '@/lib/language-context';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, ReferenceArea
} from 'recharts';

// ========== Types ==========
interface DataPoint {
    date: string;
    value: number;
    zScore: number;
    severity: 'normal' | 'warning' | 'critical';
}

interface Statistics {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    currentValue: number;
    zScore: number;
    dataPoints: number;
    startDate: string;
    endDate: string;
}

interface IndicatorDetailResponse {
    series: { title: string; units?: string; frequency?: string };
    data: DataPoint[];
    statistics: Statistics;
    anomaly?: {
        severity: string;
        zScore: number;
        analyzer: string;
        category?: {
            investmentInsight?: {
                summary: { en: string; zh: string };
                interpretation: { en: string; zh: string };
                suggestion: { en: string; zh: string };
            };
        };
    };
}

interface Props {
    indicatorId: string;
    indicatorTitle: string;
    onClose: () => void;
}

// ========== Time Range Presets ==========
type TimeRange = '1W' | '3M' | '6M' | '1Y' | '5Y' | '10Y' | 'custom';

function getDateRange(range: TimeRange): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();

    switch (range) {
        case '1W':
            start.setDate(end.getDate() - 7);
            break;
        case '3M':
            start.setMonth(end.getMonth() - 3);
            break;
        case '6M':
            start.setMonth(end.getMonth() - 6);
            break;
        case '1Y':
            start.setFullYear(end.getFullYear() - 1);
            break;
        case '5Y':
            start.setFullYear(end.getFullYear() - 5);
            break;
        case '10Y':
        default:
            start.setFullYear(end.getFullYear() - 10);
            break;
    }

    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ========== Main Component ==========
export function IndicatorDetailModal({ indicatorId, indicatorTitle, onClose }: Props) {
    const { t, language } = useLanguage();
    const [timeRange, setTimeRange] = useState<TimeRange>('10Y');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Build API URL based on time range
    const apiUrl = useMemo(() => {
        const { startDate, endDate } = timeRange === 'custom' && customStart && customEnd
            ? { startDate: customStart, endDate: customEnd }
            : getDateRange(timeRange);
        return `/api/data?seriesId=${indicatorId}&startDate=${startDate}&endDate=${endDate}`;
    }, [indicatorId, timeRange, customStart, customEnd]);

    const { data, error, isLoading } = useSWR<IndicatorDetailResponse>(apiUrl, fetcher);

    // Prepare chart data with anomaly segments
    const chartData = useMemo(() => {
        if (!data?.data) return [];
        return data.data.map(d => ({
            ...d,
            date: new Date(d.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: '2-digit',
                month: 'short'
            }),
            fullDate: d.date,
        }));
    }, [data, language]);

    // Find anomaly regions for highlighting
    const anomalyRegions = useMemo(() => {
        if (!chartData.length) return [];
        const regions: { start: number; end: number; severity: string }[] = [];
        let currentRegion: { start: number; end: number; severity: string } | null = null;

        chartData.forEach((point, idx) => {
            if (point.severity !== 'normal') {
                if (!currentRegion || currentRegion.severity !== point.severity) {
                    if (currentRegion) regions.push(currentRegion);
                    currentRegion = { start: idx, end: idx, severity: point.severity };
                } else {
                    currentRegion.end = idx;
                }
            } else if (currentRegion) {
                regions.push(currentRegion);
                currentRegion = null;
            }
        });
        if (currentRegion) regions.push(currentRegion);
        return regions;
    }, [chartData]);

    const timeRangeButtons: { key: TimeRange; label: string }[] = [
        { key: '1W', label: language === 'zh' ? '1周' : '1W' },
        { key: '3M', label: language === 'zh' ? '3月' : '3M' },
        { key: '6M', label: language === 'zh' ? '6月' : '6M' },
        { key: '1Y', label: language === 'zh' ? '1年' : '1Y' },
        { key: '5Y', label: language === 'zh' ? '5年' : '5Y' },
        { key: '10Y', label: language === 'zh' ? '10年' : '10Y' },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[var(--bg-main)] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[var(--stroke-light)]">
                    <div>
                        <h2 className="text-2xl font-serif text-[var(--text-primary)]">{indicatorTitle}</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            {data?.series?.frequency} • {data?.series?.units}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-subtle)] rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Time Range Selector */}
                <div className="px-6 py-4 border-b border-[var(--stroke-light)] flex flex-wrap items-center gap-3">
                    <span className="text-sm text-[var(--text-muted)] mr-2">
                        {language === 'zh' ? '时间范围:' : 'Time Range:'}
                    </span>
                    {timeRangeButtons.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTimeRange(key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${timeRange === key
                                    ? 'bg-[var(--accent-sage)] text-white'
                                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--stroke-light)]'
                                }`}
                        >
                            {label}
                        </button>
                    ))}

                    {/* Custom Date Picker */}
                    <div className="flex items-center gap-2 ml-4">
                        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => { setCustomStart(e.target.value); setTimeRange('custom'); }}
                            className="px-2 py-1 text-sm border border-[var(--stroke-light)] rounded-lg bg-white"
                        />
                        <span className="text-[var(--text-muted)]">—</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => { setCustomEnd(e.target.value); setTimeRange('custom'); }}
                            className="px-2 py-1 text-sm border border-[var(--stroke-light)] rounded-lg bg-white"
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="h-96 flex items-center justify-center">
                            <ZenSpinner className="w-8 h-8 text-[var(--accent-sage)]" />
                        </div>
                    ) : error ? (
                        <div className="h-96 flex items-center justify-center text-[var(--status-error)]">
                            {language === 'zh' ? '加载数据失败' : 'Failed to load data'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Chart Area */}
                            <div className="lg:col-span-3">
                                <ZenCard className="p-4">
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-light)" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                                    domain={['auto', 'auto']}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--stroke-light)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                    formatter={(value: number, name: string) => [
                                                        value.toFixed(2),
                                                        language === 'zh' ? '数值' : 'Value'
                                                    ]}
                                                    labelFormatter={(label) => label}
                                                />

                                                {/* Mean reference line */}
                                                {data?.statistics && (
                                                    <ReferenceLine
                                                        y={data.statistics.mean}
                                                        stroke="var(--accent-sage)"
                                                        strokeDasharray="5 5"
                                                        label={{
                                                            value: language === 'zh' ? '均值' : 'Mean',
                                                            position: 'right',
                                                            fontSize: 10,
                                                            fill: 'var(--text-muted)'
                                                        }}
                                                    />
                                                )}

                                                {/* Anomaly highlight regions */}
                                                {anomalyRegions.map((region, idx) => (
                                                    <ReferenceArea
                                                        key={idx}
                                                        x1={chartData[region.start]?.date}
                                                        x2={chartData[region.end]?.date}
                                                        fill={region.severity === 'critical' ? '#B0555520' : '#D4845E20'}
                                                        strokeOpacity={0}
                                                    />
                                                ))}

                                                {/* Main line with conditional coloring */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="var(--accent-sage)"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: 'var(--accent-sage)' }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex justify-center gap-6 mt-4 text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-[#B0555540]" />
                                            <span>{language === 'zh' ? '严重异动' : 'Critical'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-[#D4845E40]" />
                                            <span>{language === 'zh' ? '轻度异动' : 'Warning'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-0.5 bg-[var(--accent-sage)]" style={{ borderStyle: 'dashed' }} />
                                            <span>{language === 'zh' ? '均值线' : 'Mean'}</span>
                                        </div>
                                    </div>
                                </ZenCard>
                            </div>

                            {/* Stats Panel */}
                            <div className="space-y-4">
                                {/* Current Status */}
                                <ZenCard className="p-4">
                                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">
                                        {language === 'zh' ? '当前状态' : 'Current Status'}
                                    </h3>
                                    <div className="text-3xl font-serif text-[var(--text-primary)]">
                                        {data?.statistics?.currentValue?.toFixed(2)}
                                    </div>
                                    <div className={`flex items-center gap-1 mt-2 text-sm ${(data?.statistics?.zScore || 0) > 0
                                            ? 'text-[var(--status-success)]'
                                            : 'text-[var(--status-error)]'
                                        }`}>
                                        {(data?.statistics?.zScore || 0) > 0
                                            ? <TrendingUp className="w-4 h-4" />
                                            : <TrendingDown className="w-4 h-4" />
                                        }
                                        <span>Z: {data?.statistics?.zScore?.toFixed(2)}</span>
                                    </div>
                                    {data?.anomaly?.severity !== 'normal' && (
                                        <ZenBadge
                                            variant={data?.anomaly?.severity === 'critical' ? 'terracotta' : 'neutral'}
                                            className="mt-3"
                                        >
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            {data?.anomaly?.severity === 'critical'
                                                ? (language === 'zh' ? '严重异动' : 'Critical')
                                                : (language === 'zh' ? '轻度异动' : 'Warning')
                                            }
                                        </ZenBadge>
                                    )}
                                </ZenCard>

                                {/* Period Statistics */}
                                <ZenCard className="p-4">
                                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1">
                                        <BarChart3 className="w-3 h-3" />
                                        {language === 'zh' ? '区间统计' : 'Period Stats'}
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">{language === 'zh' ? '均值' : 'Mean'}</span>
                                            <span className="font-mono">{data?.statistics?.mean?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">{language === 'zh' ? '标准差' : 'Std Dev'}</span>
                                            <span className="font-mono">{data?.statistics?.stdDev?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">{language === 'zh' ? '最大值' : 'Max'}</span>
                                            <span className="font-mono">{data?.statistics?.max?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">{language === 'zh' ? '最小值' : 'Min'}</span>
                                            <span className="font-mono">{data?.statistics?.min?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">{language === 'zh' ? '数据点' : 'Points'}</span>
                                            <span className="font-mono">{data?.statistics?.dataPoints}</span>
                                        </div>
                                    </div>
                                </ZenCard>

                                {/* Analysis Method */}
                                <ZenCard className="p-4">
                                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">
                                        {language === 'zh' ? '分析方法' : 'Analysis'}
                                    </h3>
                                    <ZenBadge variant="sage">
                                        {data?.anomaly?.analyzer?.toUpperCase() || 'Z-SCORE'}
                                    </ZenBadge>
                                </ZenCard>

                                {/* Investment Insight */}
                                {data?.anomaly?.category?.investmentInsight && (
                                    <ZenCard className="p-4 bg-[var(--bg-subtle)]">
                                        <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                            {language === 'zh' ? '投资洞察' : 'Insight'}
                                        </h3>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {data.anomaly.category.investmentInsight.summary[language]}
                                        </p>
                                        {data.anomaly.category.investmentInsight.suggestion && (
                                            <p className="text-xs text-[var(--accent-terracotta)] mt-2 pt-2 border-t border-[var(--stroke-light)]">
                                                💡 {data.anomaly.category.investmentInsight.suggestion[language]}
                                            </p>
                                        )}
                                    </ZenCard>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
