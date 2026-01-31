'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ZenButton } from '@/components/ui/ZenUI';
import {
    TrendingUp,
    Activity,
    Network,
    Lightbulb,
    History,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle,
    Info
} from 'lucide-react';
import { useTranslation } from '@/lib/language-context';

// Types
interface VolatilityTrendPoint {
    date: string;
    volatility: number;
    upperBand: number;
    lowerBand: number;
    isBreakout: boolean;
}

interface BreakoutPoint {
    date: string;
    value: number;
    volatility: number;
    type: 'upward' | 'downward';
    significance: number;
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
        averageVolatility: number;
        maxVolatility: number;
        minVolatility: number;
        breakoutCount: number;
        dominantCluster: 'low' | 'medium' | 'high';
    };
}

interface SemanticAnalysisResult {
    trend: {
        direction: 'up' | 'down' | 'stable';
        strength: 'strong' | 'moderate' | 'weak';
        description: string;
    };
    volatility: {
        level: 'low' | 'medium' | 'high';
        trend: 'rising' | 'falling' | 'stable';
        description: string;
    };
    change: {
        absolute: number;
        percentage: number;
        significance: 'significant' | 'moderate' | 'minor';
        description: string;
    };
    keyInsights: string[];
    summary: string;
    recommendations: string[];
}

interface CorrelationMatrix {
    seriesIds: string[];
    matrix: number[][];
    significantCorrelations: Array<{
        series1: string;
        series2: string;
        correlation: number;
        pValue: number;
        significance: 'strong' | 'moderate' | 'weak';
    }>;
}

interface HistoricalEvent {
    date: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    relatedIndicators: string[];
}

interface SimilarEvent {
    event: HistoricalEvent;
    similarity: number;
    currentContext: string;
    lessons: string[];
}

interface SimilarEventsResult {
    currentSituation: string;
    similarEvents: SimilarEvent[];
    overallInsight: string;
}

export function DeepAnalysisDashboard() {
    const { t } = useTranslation();
    const [selectedIndicator, setSelectedIndicator] = useState<string>('CPIAUCSL');
    const [timeRange, setTimeRange] = useState<string>('1Y');
    const [loading, setLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['volatility', 'semantic']));

    // Analysis data
    const [volatilityAnalysis, setVolatilityAnalysis] = useState<VolatilityAnalysisResult | null>(null);
    const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticAnalysisResult | null>(null);
    const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
    const [similarEvents, setSimilarEvents] = useState<SimilarEventsResult | null>(null);

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const fetchAllAnalysis = async () => {
        setLoading(true);
        try {
            // Fetch volatility analysis
            const volatilityRes = await fetch(
                `/api/volatility-analysis?seriesId=${selectedIndicator}&startDate=${getStartDate(timeRange)}&endDate=${getEndDate()}`
            );
            if (volatilityRes.ok) {
                const volatilityData = await volatilityRes.json();
                setVolatilityAnalysis(volatilityData);
            }

            // Fetch semantic analysis
            const semanticRes = await fetch(
                `/api/semantic-analysis?seriesId=${selectedIndicator}&startDate=${getStartDate(timeRange)}&endDate=${getEndDate()}`
            );
            if (semanticRes.ok) {
                const semanticData = await semanticRes.json();
                setSemanticAnalysis(semanticData);
            }

            // Fetch correlation analysis
            const correlationRes = await fetch(
                `/api/correlation-analysis?seriesIds=${selectedIndicator},UNRATE,GDP&startDate=${getStartDate(timeRange)}&endDate=${getEndDate()}`
            );
            if (correlationRes.ok) {
                const correlationData = await correlationRes.json();
                setCorrelationMatrix(correlationData);
            }

            // Fetch similar events
            const eventsRes = await fetch(
                `/api/similar-events?seriesId=${selectedIndicator}&startDate=${getStartDate(timeRange)}&endDate=${getEndDate()}`
            );
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                setSimilarEvents(eventsData);
            }
        } catch (error) {
            console.error('Error fetching analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllAnalysis();
    }, [selectedIndicator, timeRange]);

    const getStartDate = (range: string): string => {
        const endDate = new Date();
        const startDate = new Date();

        switch (range) {
            case '1W':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '1M':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3M':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6M':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1Y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            case '5Y':
                startDate.setFullYear(endDate.getFullYear() - 5);
                break;
            case '10Y':
                startDate.setFullYear(endDate.getFullYear() - 10);
                break;
            default:
                startDate.setFullYear(endDate.getFullYear() - 1);
        }

        return startDate.toISOString().split('T')[0];
    };

    const getEndDate = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up':
            case 'rising':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'down':
            case 'falling':
                return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
            default:
                return <Activity className="h-4 w-4 text-blue-500" />;
        }
    };

    const getVolatilityColor = (level: string) => {
        switch (level) {
            case 'low':
                return 'text-green-500';
            case 'medium':
                return 'text-yellow-500';
            case 'high':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const getCorrelationColor = (correlation: number) => {
        const abs = Math.abs(correlation);
        if (abs >= 0.7) return 'text-red-500';
        if (abs >= 0.4) return 'text-orange-500';
        if (abs >= 0.2) return 'text-yellow-500';
        return 'text-gray-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {t('deepAnalysis.title', '深度分析')}
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {t('deepAnalysis.subtitle', '基于统计模型的深度洞察')}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedIndicator}
                                onChange={(e) => setSelectedIndicator(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="CPIAUCSL">CPI (消费者物价指数)</option>
                                <option value="UNRATE">失业率</option>
                                <option value="GDP">GDP</option>
                                <option value="FEDFUNDS">联邦基金利率</option>
                            </select>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="1W">1周</option>
                                <option value="1M">1个月</option>
                                <option value="3M">3个月</option>
                                <option value="6M">6个月</option>
                                <option value="1Y">1年</option>
                                <option value="5Y">5年</option>
                                <option value="10Y">10年</option>
                            </select>
                            <ZenButton
                                onClick={fetchAllAnalysis}
                                disabled={loading}
                                variant="outline"
                                size="sm"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                {t('common.refresh', '刷新')}
                            </ZenButton>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* Quick Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                {t('deepAnalysis.currentVolatility', '当前波动率')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {volatilityAnalysis?.summary.currentVolatility
                                    ? `${(volatilityAnalysis.summary.currentVolatility * 100).toFixed(2)}%`
                                    : '--'}
                            </div>
                            <div className="flex items-center mt-2 text-sm text-blue-700 dark:text-blue-300">
                                {getTrendIcon(volatilityAnalysis?.summary.volatilityTrend || 'stable')}
                                <span className="ml-2">
                                    {t(`deepAnalysis.${volatilityAnalysis?.summary.volatilityTrend || 'stable'}`,
                                        volatilityAnalysis?.summary.volatilityTrend || 'stable')}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
                                {t('deepAnalysis.trend', '趋势')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {semanticAnalysis?.trend.direction === 'up' && '↑'}
                                {semanticAnalysis?.trend.direction === 'down' && '↓'}
                                {semanticAnalysis?.trend.direction === 'stable' && '→'}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                                {semanticAnalysis?.trend.description || '--'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                {t('deepAnalysis.breakouts', '突破点')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                {volatilityAnalysis?.summary.breakoutCount || 0}
                            </div>
                            <div className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                                {t('deepAnalysis.detectedInPeriod', '检测期间')}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                {t('deepAnalysis.volatilityLevel', '波动率水平')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getVolatilityColor(volatilityAnalysis?.summary.dominantCluster || 'medium')}`}>
                                {t(`deepAnalysis.${volatilityAnalysis?.summary.dominantCluster || 'medium'}`,
                                    volatilityAnalysis?.summary.dominantCluster || 'medium')}
                            </div>
                            <div className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                                {t('deepAnalysis.dominantCluster', '主导聚类')}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Volatility Analysis Section */}
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => toggleSection('volatility')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity className="h-5 w-5 text-blue-500" />
                                <CardTitle>{t('deepAnalysis.volatilityTrend', '波动率趋势分析')}</CardTitle>
                            </div>
                            {expandedSections.has('volatility') ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <CardDescription>
                            {t('deepAnalysis.volatilityTrendDesc', '分析波动率变化趋势、突破点和波动率聚类')}
                        </CardDescription>
                    </CardHeader>
                    {expandedSections.has('volatility') && (
                        <CardContent className="space-y-4">
                            {/* Volatility Trend Chart Placeholder */}
                            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <div className="text-center text-slate-500">
                                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>{t('deepAnalysis.volatilityChartPlaceholder', '波动率趋势图')}</p>
                                    <p className="text-sm mt-1">
                                        {t('deepAnalysis.dataPoints', '数据点')}: {volatilityAnalysis?.volatilityTrend.length || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Breakouts */}
                            {volatilityAnalysis?.breakouts && volatilityAnalysis.breakouts.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        {t('deepAnalysis.detectedBreakouts', '检测到的突破点')}
                                    </h4>
                                    <div className="space-y-2">
                                        {volatilityAnalysis.breakouts.slice(0, 5).map((breakout, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${breakout.type === 'upward'
                                                            ? 'bg-green-100 dark:bg-green-900/30'
                                                            : 'bg-red-100 dark:bg-red-900/30'
                                                        }`}>
                                                        {breakout.type === 'upward' ? (
                                                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 rotate-180" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {breakout.date}
                                                        </div>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                                            {t('deepAnalysis.value', '数值')}: {breakout.value.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {t('deepAnalysis.volatility', '波动率')}: {(breakout.volatility * 100).toFixed(2)}%
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                                        {t('deepAnalysis.significance', '显著性')}: {breakout.significance.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Volatility Clusters */}
                            {volatilityAnalysis?.clusters && volatilityAnalysis.clusters.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Network className="h-4 w-4 text-purple-500" />
                                        {t('deepAnalysis.volatilityClusters', '波动率聚类')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {volatilityAnalysis.clusters.map((cluster, index) => (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-lg border ${cluster.clusterType === 'low'
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                        : cluster.clusterType === 'medium'
                                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                    }`}
                                            >
                                                <div className="font-semibold text-slate-900 dark:text-white mb-2">
                                                    {t(`deepAnalysis.${cluster.clusterType}`, cluster.clusterType)}
                                                </div>
                                                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                                    <div>{t('deepAnalysis.period', '期间')}: {cluster.startDate} - {cluster.endDate}</div>
                                                    <div>{t('deepAnalysis.avgVolatility', '平均波动率')}: {(cluster.averageVolatility * 100).toFixed(2)}%</div>
                                                    <div>{t('deepAnalysis.dataPoints', '数据点')}: {cluster.dataPoints}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {/* Semantic Analysis Section */}
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => toggleSection('semantic')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Lightbulb className="h-5 w-5 text-yellow-500" />
                                <CardTitle>{t('deepAnalysis.semanticInsights', '语义洞察')}</CardTitle>
                            </div>
                            {expandedSections.has('semantic') ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <CardDescription>
                            {t('deepAnalysis.semanticInsightsDesc', '基于上下文的深度解释和投资建议')}
                        </CardDescription>
                    </CardHeader>
                    {expandedSections.has('semantic') && semanticAnalysis && (
                        <CardContent className="space-y-4">
                            {/* Summary */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-blue-500" />
                                    {t('deepAnalysis.summary', '总结')}
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300">{semanticAnalysis.summary}</p>
                            </div>

                            {/* Trend Analysis */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">
                                        {t('deepAnalysis.trend', '趋势')}
                                    </h4>
                                    <div className="flex items-center gap-2 mb-2">
                                        {getTrendIcon(semanticAnalysis.trend.direction)}
                                        <span className={`font-medium ${semanticAnalysis.trend.direction === 'up' ? 'text-green-600 dark:text-green-400' :
                                                semanticAnalysis.trend.direction === 'down' ? 'text-red-600 dark:text-red-400' :
                                                    'text-blue-600 dark:text-blue-400'
                                            }`}>
                                            {t(`deepAnalysis.${semanticAnalysis.trend.direction}`, semanticAnalysis.trend.direction)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {semanticAnalysis.trend.description}
                                    </p>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">
                                        {t('deepAnalysis.volatility', '波动率')}
                                    </h4>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="h-4 w-4" />
                                        <span className={`font-medium ${getVolatilityColor(semanticAnalysis.volatility.level)}`}>
                                            {t(`deepAnalysis.${semanticAnalysis.volatility.level}`, semanticAnalysis.volatility.level)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {semanticAnalysis.volatility.description}
                                    </p>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">
                                        {t('deepAnalysis.change', '变化')}
                                    </h4>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`font-medium ${semanticAnalysis.change.significance === 'significant' ? 'text-red-600 dark:text-red-400' :
                                                semanticAnalysis.change.significance === 'moderate' ? 'text-orange-600 dark:text-orange-400' :
                                                    'text-green-600 dark:text-green-400'
                                            }`}>
                                            {semanticAnalysis.change.percentage > 0 ? '+' : ''}{semanticAnalysis.change.percentage.toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {semanticAnalysis.change.description}
                                    </p>
                                </div>
                            </div>

                            {/* Key Insights */}
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    {t('deepAnalysis.keyInsights', '关键洞察')}
                                </h4>
                                <div className="space-y-2">
                                    {semanticAnalysis.keyInsights.map((insight, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                                        >
                                            <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-slate-700 dark:text-slate-300">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    {t('deepAnalysis.recommendations', '投资建议')}
                                </h4>
                                <div className="space-y-2">
                                    {semanticAnalysis.recommendations.map((recommendation, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                                        >
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 dark:text-green-300 text-sm font-medium">
                                                {index + 1}
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300">{recommendation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Correlation Analysis Section */}
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => toggleSection('correlation')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Network className="h-5 w-5 text-purple-500" />
                                <CardTitle>{t('deepAnalysis.correlationAnalysis', '相关性分析')}</CardTitle>
                            </div>
                            {expandedSections.has('correlation') ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <CardDescription>
                            {t('deepAnalysis.correlationAnalysisDesc', '跨资产相关性矩阵和统计显著性')}
                        </CardDescription>
                    </CardHeader>
                    {expandedSections.has('correlation') && correlationMatrix && (
                        <CardContent className="space-y-4">
                            {/* Correlation Matrix Placeholder */}
                            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                <div className="text-center text-slate-500">
                                    <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>{t('deepAnalysis.correlationMatrixPlaceholder', '相关性矩阵热力图')}</p>
                                    <p className="text-sm mt-1">
                                        {t('deepAnalysis.indicators', '指标')}: {correlationMatrix.seriesIds.length}
                                    </p>
                                </div>
                            </div>

                            {/* Significant Correlations */}
                            {correlationMatrix.significantCorrelations && correlationMatrix.significantCorrelations.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Network className="h-4 w-4 text-purple-500" />
                                        {t('deepAnalysis.significantCorrelations', '显著相关性')}
                                    </h4>
                                    <div className="space-y-2">
                                        {correlationMatrix.significantCorrelations.map((corr, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${corr.correlation > 0
                                                            ? 'bg-green-100 dark:bg-green-900/30'
                                                            : 'bg-red-100 dark:bg-red-900/30'
                                                        }`}>
                                                        {corr.correlation > 0 ? (
                                                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 rotate-180" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {corr.series1} ↔ {corr.series2}
                                                        </div>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                                            {t(`deepAnalysis.${corr.significance}`, corr.significance)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${getCorrelationColor(corr.correlation)}`}>
                                                        {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                                        p-value: {corr.pValue.toFixed(4)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {/* Similar Events Section */}
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => toggleSection('events')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History className="h-5 w-5 text-orange-500" />
                                <CardTitle>{t('deepAnalysis.similarEvents', '历史相似事件')}</CardTitle>
                            </div>
                            {expandedSections.has('events') ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <CardDescription>
                            {t('deepAnalysis.similarEventsDesc', '历史相似事件和经验教训')}
                        </CardDescription>
                    </CardHeader>
                    {expandedSections.has('events') && similarEvents && (
                        <CardContent className="space-y-4">
                            {/* Current Situation */}
                            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-orange-500" />
                                    {t('deepAnalysis.currentSituation', '当前情况')}
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300">{similarEvents.currentSituation}</p>
                            </div>

                            {/* Similar Events */}
                            {similarEvents.similarEvents && similarEvents.similarEvents.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <History className="h-4 w-4 text-orange-500" />
                                        {t('deepAnalysis.similarEvents', '相似事件')}
                                    </h4>
                                    <div className="space-y-4">
                                        {similarEvents.similarEvents.map((event, index) => (
                                            <div
                                                key={index}
                                                className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white">
                                                            {event.event.title}
                                                        </div>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                                            {event.event.date}
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
                                                        {t('deepAnalysis.similarity', '相似度')}: {(event.similarity * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                                                    {event.event.description}
                                                </p>
                                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                    <h5 className="font-medium text-sm text-slate-900 dark:text-white mb-2">
                                                        {t('deepAnalysis.lessons', '经验教训')}
                                                    </h5>
                                                    <ul className="space-y-1">
                                                        {event.lessons.map((lesson, lessonIndex) => (
                                                            <li
                                                                key={lessonIndex}
                                                                className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                                                            >
                                                                <span className="text-orange-500">•</span>
                                                                <span>{lesson}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overall Insight */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-blue-500" />
                                    {t('deepAnalysis.overallInsight', '整体洞察')}
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300">{similarEvents.overallInsight}</p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
