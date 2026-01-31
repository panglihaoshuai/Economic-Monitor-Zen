'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { TrendingUp, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import { ZenCard, ZenBadge, ZenSpinner } from './ui/ZenUI';
import { useLanguage } from '@/lib/language-context';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Area, AreaChart
} from 'recharts';

// ========== Types ==========
interface VolatilityTrendPoint {
    date: string;
    volatility: number;
    upperBand: number;
    lowerBand: number;
}

interface BreakoutPoint {
    date: string;
    value: number;
    volatility: number;
    type: 'upward' | 'downward';
    magnitude: number;
}

interface VolatilityCluster {
    startDate: string;
    endDate: string;
    averageVolatility: number;
    clusterType: 'low' | 'medium' | 'high';
    dataPoints: number;
}

interface VolatilityAnalysisResult {
    volatilityTrend: VolatilityTrendPoint[];
    breakouts: BreakoutPoint[];
    clusters: VolatilityCluster[];
    summary: {
        currentVolatility: number;
        volatilityTrend: 'rising' | 'falling' | 'stable';
        breakoutCount: number;
        dominantCluster: 'low' | 'medium' | 'high';
    };
}

interface Props {
    indicatorId: string;
    startDate?: string;
    endDate?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ========== Main Component ==========
export function VolatilityTrendAnalysis({ indicatorId, startDate, endDate }: Props) {
    const { t, language } = useLanguage();
    const [showBreakouts, setShowBreakouts] = useState(true);
    const [showClusters, setShowClusters] = useState(true);

    // Build API URL
    const apiUrl = useMemo(() => {
        const params = new URLSearchParams({ seriesId: indicatorId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return `/api/volatility-analysis?${params.toString()}`;
    }, [indicatorId, startDate, endDate]);

    const { data, error, isLoading } = useSWR<VolatilityAnalysisResult>(apiUrl, fetcher);

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!data?.volatilityTrend) return [];
        return data.volatilityTrend.map(d => ({
            ...d,
            date: new Date(d.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: '2-digit',
                month: 'short'
            }),
            fullDate: d.date,
        }));
    }, [data, language]);

    // Prepare breakout data for chart
    const breakoutData = useMemo(() => {
        if (!data?.breakouts) return [];
        return data.breakouts.map(b => ({
            ...b,
            date: new Date(b.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: '2-digit',
                month: 'short'
            }),
            fullDate: b.date,
        }));
    }, [data, language]);

    if (isLoading) {
        return (
            <ZenCard className="p-6">
                <div className="h-64 flex items-center justify-center">
                    <ZenSpinner className="w-8 h-8 text-[var(--accent-sage)]" />
                </div>
            </ZenCard>
        );
    }

    if (error) {
        return (
            <ZenCard className="p-6">
                <div className="h-64 flex items-center justify-center text-[var(--status-error)]">
                    {language === 'zh' ? '加载波动率分析失败' : 'Failed to load volatility analysis'}
                </div>
            </ZenCard>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ZenCard className="p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2">
                        <Activity className="w-3 h-3" />
                        {language === 'zh' ? '当前波动率' : 'Current Volatility'}
                    </div>
                    <div className="text-2xl font-serif text-[var(--text-primary)]">
                        {(data.summary.currentVolatility * 100).toFixed(2)}%
                    </div>
                    <ZenBadge
                        variant={data.summary.volatilityTrend === 'rising' ? 'terracotta' : data.summary.volatilityTrend === 'falling' ? 'sage' : 'neutral'}
                        className="mt-2"
                    >
                        {data.summary.volatilityTrend === 'rising' && <TrendingUp className="w-3 h-3 mr-1" />}
                        {data.summary.volatilityTrend === 'rising' ? (language === 'zh' ? '上升' : 'Rising') :
                            data.summary.volatilityTrend === 'falling' ? (language === 'zh' ? '下降' : 'Falling') :
                                (language === 'zh' ? '稳定' : 'Stable')}
                    </ZenBadge>
                </ZenCard>

                <ZenCard className="p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2">
                        <AlertCircle className="w-3 h-3" />
                        {language === 'zh' ? '突破点' : 'Breakouts'}
                    </div>
                    <div className="text-2xl font-serif text-[var(--text-primary)]">
                        {data.summary.breakoutCount}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                        {language === 'zh' ? '个突破点' : 'breakout points'}
                    </div>
                </ZenCard>

                <ZenCard className="p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2">
                        <BarChart3 className="w-3 h-3" />
                        {language === 'zh' ? '波动率聚类' : 'Volatility Cluster'}
                    </div>
                    <div className="text-2xl font-serif text-[var(--text-primary)]">
                        {data.summary.dominantCluster === 'high' ? (language === 'zh' ? '高' : 'High') :
                            data.summary.dominantCluster === 'medium' ? (language === 'zh' ? '中' : 'Medium') :
                                (language === 'zh' ? '低' : 'Low')}
                    </div>
                    <ZenBadge
                        variant={data.summary.dominantCluster === 'high' ? 'terracotta' : data.summary.dominantCluster === 'medium' ? 'neutral' : 'sage'}
                        className="mt-2"
                    >
                        {data.summary.dominantCluster === 'high' ? (language === 'zh' ? '高波动期' : 'High Volatility') :
                            data.summary.dominantCluster === 'medium' ? (language === 'zh' ? '中波动期' : 'Medium Volatility') :
                                (language === 'zh' ? '低波动期' : 'Low Volatility')}
                    </ZenBadge>
                </ZenCard>

                <ZenCard className="p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wider mb-2">
                        <Activity className="w-3 h-3" />
                        {language === 'zh' ? '聚类数量' : 'Clusters'}
                    </div>
                    <div className="text-2xl font-serif text-[var(--text-primary)]">
                        {data.clusters.length}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                        {language === 'zh' ? '个波动率聚类' : 'volatility clusters'}
                    </div>
                </ZenCard>
            </div>

            {/* Volatility Trend Chart */}
            <ZenCard className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-serif text-[var(--text-primary)]">
                        {language === 'zh' ? '波动率趋势' : 'Volatility Trend'}
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowBreakouts(!showBreakouts)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                ${showBreakouts ? 'bg-[var(--accent-sage)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'}`}
                        >
                            {language === 'zh' ? '突破点' : 'Breakouts'}
                        </button>
                        <button
                            onClick={() => setShowClusters(!showClusters)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                ${showClusters ? 'bg-[var(--accent-sage)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'}`}
                        >
                            {language === 'zh' ? '波动率聚类' : 'Clusters'}
                        </button>
                    </div>
                </div>

                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <defs>
                                <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-sage)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-sage)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-light)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--stroke-light)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number) => [
                                    `${(value * 100).toFixed(2)}%`,
                                    language === 'zh' ? '波动率' : 'Volatility'
                                ]}
                                labelFormatter={(label) => label}
                            />

                            {/* Upper and lower bands */}
                            {showClusters && (
                                <>
                                    <Area
                                        type="monotone"
                                        dataKey="upperBand"
                                        stroke="var(--accent-terracotta)"
                                        strokeOpacity={0.3}
                                        fill="var(--accent-terracotta)"
                                        fillOpacity={0.1}
                                        strokeWidth={1}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="lowerBand"
                                        stroke="var(--accent-sage)"
                                        strokeOpacity={0.3}
                                        fill="var(--accent-sage)"
                                        fillOpacity={0.1}
                                        strokeWidth={1}
                                    />
                                </>
                            )}

                            {/* Main volatility line */}
                            <Area
                                type="monotone"
                                dataKey="volatility"
                                stroke="var(--accent-sage)"
                                strokeWidth={2}
                                fill="url(#volatilityGradient)"
                            />

                            {/* Breakout points */}
                            {showBreakouts && breakoutData.map((breakout, idx) => (
                                <ReferenceLine
                                    key={idx}
                                    x={breakout.date}
                                    stroke={breakout.type === 'upward' ? 'var(--status-error)' : 'var(--status-success)'}
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    label={{
                                        value: breakout.type === 'upward' ? '↑' : '↓',
                                        position: 'top',
                                        fontSize: 12,
                                        fill: breakout.type === 'upward' ? 'var(--status-error)' : 'var(--status-success)'
                                    }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-[var(--accent-sage)]" />
                        <span>{language === 'zh' ? '波动率' : 'Volatility'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-[var(--accent-terracotta)] opacity-30" />
                        <span>{language === 'zh' ? '上界' : 'Upper Band'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-[var(--accent-sage)] opacity-30" />
                        <span>{language === 'zh' ? '下界' : 'Lower Band'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-[var(--status-error)]" style={{ borderStyle: 'dashed' }} />
                        <span>{language === 'zh' ? '向上突破' : 'Upward Breakout'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-[var(--status-success)]" style={{ borderStyle: 'dashed' }} />
                        <span>{language === 'zh' ? '向下突破' : 'Downward Breakout'}</span>
                    </div>
                </div>
            </ZenCard>

            {/* Breakouts List */}
            {data.breakouts.length > 0 && (
                <ZenCard className="p-6">
                    <h3 className="text-lg font-serif text-[var(--text-primary)] mb-4">
                        {language === 'zh' ? '突破点详情' : 'Breakout Details'}
                    </h3>
                    <div className="space-y-3">
                        {data.breakouts.map((breakout, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                        ${breakout.type === 'upward' ? 'bg-[var(--status-error)]/10 text-[var(--status-error)]' : 'bg-[var(--status-success)]/10 text-[var(--status-success)]'}`}>
                                        {breakout.type === 'upward' ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text-primary)]">
                                            {new Date(breakout.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {language === 'zh' ? '波动率' : 'Volatility'}: {(breakout.volatility * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <ZenBadge variant={breakout.type === 'upward' ? 'terracotta' : 'sage'}>
                                    {breakout.type === 'upward' ? (language === 'zh' ? '向上突破' : 'Upward') : (language === 'zh' ? '向下突破' : 'Downward')}
                                </ZenBadge>
                            </div>
                        ))}
                    </div>
                </ZenCard>
            )}

            {/* Volatility Clusters */}
            {data.clusters.length > 0 && (
                <ZenCard className="p-6">
                    <h3 className="text-lg font-serif text-[var(--text-primary)] mb-4">
                        {language === 'zh' ? '波动率聚类' : 'Volatility Clusters'}
                    </h3>
                    <div className="space-y-3">
                        {data.clusters.map((cluster, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                        ${cluster.clusterType === 'high' ? 'bg-[var(--status-error)]/10 text-[var(--status-error)]' :
                                            cluster.clusterType === 'medium' ? 'bg-[var(--accent-terracotta)]/10 text-[var(--accent-terracotta)]' :
                                                'bg-[var(--accent-sage)]/10 text-[var(--accent-sage)]'}`}>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text-primary)]">
                                            {new Date(cluster.startDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                            {' - '}
                                            {new Date(cluster.endDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {language === 'zh' ? '平均波动率' : 'Avg Volatility'}: {(cluster.averageVolatility * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ZenBadge
                                        variant={cluster.clusterType === 'high' ? 'terracotta' : cluster.clusterType === 'medium' ? 'neutral' : 'sage'}
                                    >
                                        {cluster.clusterType === 'high' ? (language === 'zh' ? '高波动' : 'High') :
                                            cluster.clusterType === 'medium' ? (language === 'zh' ? '中波动' : 'Medium') :
                                                (language === 'zh' ? '低波动' : 'Low')}
                                    </ZenBadge>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {cluster.dataPoints} {language === 'zh' ? '天' : 'days'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ZenCard>
            )}
        </div>
    );
}
