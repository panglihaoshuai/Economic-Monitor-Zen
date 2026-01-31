'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, Info } from 'lucide-react';

interface CorrelationData {
    series1: string;
    series2: string;
    correlation: number;
    pValue: number;
    significant: boolean;
}

interface HistoricalEvent {
    date: string;
    description: string;
    impact: string;
}

interface CorrelationMatrixProps {
    seriesIds?: string[];
    startDate?: string;
    endDate?: string;
    locale?: string;
}

export default function CorrelationMatrix({
    seriesIds = ['CPIAUCSL', 'UNRATE', 'GDP', 'SP500'],
    startDate,
    endDate,
    locale = 'zh'
}: CorrelationMatrixProps) {
    const [loading, setLoading] = useState(true);
    const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
    const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationData | null>(null);

    const t = {
        title: locale === 'zh' ? '跨资产相关性分析' : 'Cross-Asset Correlation Analysis',
        description: locale === 'zh' ? '分析不同经济指标之间的相关性' : 'Analyze correlations between different economic indicators',
        loading: locale === 'zh' ? '加载中...' : 'Loading...',
        error: locale === 'zh' ? '加载失败' : 'Failed to load',
        strongPositive: locale === 'zh' ? '强正相关' : 'Strong Positive',
        moderatePositive: locale === 'zh' ? '中等正相关' : 'Moderate Positive',
        weakPositive: locale === 'zh' ? '弱正相关' : 'Weak Positive',
        noCorrelation: locale === 'zh' ? '无相关' : 'No Correlation',
        weakNegative: locale === 'zh' ? '弱负相关' : 'Weak Negative',
        moderateNegative: locale === 'zh' ? '中等负相关' : 'Moderate Negative',
        strongNegative: locale === 'zh' ? '强负相关' : 'Strong Negative',
        significant: locale === 'zh' ? '显著' : 'Significant',
        notSignificant: locale === 'zh' ? '不显著' : 'Not Significant',
        historicalEvents: locale === 'zh' ? '历史事件参考' : 'Historical Events',
        noEvents: locale === 'zh' ? '暂无历史事件' : 'No historical events',
        refresh: locale === 'zh' ? '刷新' : 'Refresh',
        details: locale === 'zh' ? '详情' : 'Details',
        close: locale === 'zh' ? '关闭' : 'Close',
        impact: locale === 'zh' ? '影响' : 'Impact',
    };

    useEffect(() => {
        fetchCorrelationData();
    }, [seriesIds, startDate, endDate, locale]);

    const fetchCorrelationData = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            seriesIds.forEach(id => params.append('seriesIds', id));
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('locale', locale);

            const response = await fetch(`/api/correlation-analysis?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch correlation data');
            }

            const data = await response.json();
            setCorrelationData(data.correlations || []);
            setHistoricalEvents(data.historicalEvents || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getCorrelationColor = (correlation: number): string => {
        const abs = Math.abs(correlation);
        if (abs >= 0.7) {
            return correlation > 0 ? 'bg-green-600' : 'bg-red-600';
        } else if (abs >= 0.4) {
            return correlation > 0 ? 'bg-green-400' : 'bg-red-400';
        } else if (abs >= 0.2) {
            return correlation > 0 ? 'bg-green-200' : 'bg-red-200';
        }
        return 'bg-gray-200';
    };

    const getCorrelationIcon = (correlation: number) => {
        const abs = Math.abs(correlation);
        if (abs < 0.2) return <Minus className="w-4 h-4 text-gray-500" />;
        if (correlation > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
        return <TrendingDown className="w-4 h-4 text-red-600" />;
    };

    const getCorrelationLabel = (correlation: number): string => {
        const abs = Math.abs(correlation);
        if (abs >= 0.7) return correlation > 0 ? t.strongPositive : t.strongNegative;
        if (abs >= 0.4) return correlation > 0 ? t.moderatePositive : t.moderateNegative;
        if (abs >= 0.2) return correlation > 0 ? t.weakPositive : t.weakNegative;
        return t.noCorrelation;
    };

    const getImpactColor = (impact: string): string => {
        if (impact.toLowerCase().includes('positive') || impact.toLowerCase().includes('positive')) {
            return 'text-green-600';
        }
        if (impact.toLowerCase().includes('negative') || impact.toLowerCase().includes('negative')) {
            return 'text-red-600';
        }
        return 'text-gray-600';
    };

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <span className="ml-3 text-gray-500">{t.loading}</span>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
                    <p className="text-red-500 mb-4">{t.error}: {error}</p>
                    <Button onClick={fetchCorrelationData} variant="outline">
                        {t.refresh}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t.title}</CardTitle>
                        <CardDescription>{t.description}</CardDescription>
                    </div>
                    <Button onClick={fetchCorrelationData} variant="outline" size="sm">
                        {t.refresh}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Correlation Matrix */}
                    <div className="grid gap-4">
                        {correlationData.map((item, index) => (
                            <div
                                key={index}
                                className="relative group cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg p-4 border border-gray-200 hover:border-gray-300"
                                onClick={() => setSelectedCorrelation(item)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-12 h-12 rounded-lg ${getCorrelationColor(item.correlation)} flex items-center justify-center`}>
                                            {getCorrelationIcon(item.correlation)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {item.series1} ↔ {item.series2}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {getCorrelationLabel(item.correlation)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {item.correlation.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.significant ? (
                                                <span className="text-green-600">{t.significant}</span>
                                            ) : (
                                                <span className="text-gray-400">{t.notSignificant}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 rounded-lg" />
                            </div>
                        ))}
                    </div>

                    {/* Historical Events */}
                    {historicalEvents.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-blue-600" />
                                {t.historicalEvents}
                            </h3>
                            <div className="space-y-3">
                                {historicalEvents.map((event, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="font-medium text-gray-900">{event.date}</div>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                                        <div className={`text-sm ${getImpactColor(event.impact)}`}>
                                            <span className="font-medium">{t.impact}:</span> {event.impact}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No Events Message */}
                    {historicalEvents.length === 0 && (
                        <div className="mt-8 text-center py-8 text-gray-500">
                            {t.noEvents}
                        </div>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedCorrelation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {selectedCorrelation.series1} ↔ {selectedCorrelation.series2}
                                    </h3>
                                    <Button
                                        onClick={() => setSelectedCorrelation(null)}
                                        variant="ghost"
                                        size="sm"
                                    >
                                        {t.close}
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {/* Correlation Value */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{locale === 'zh' ? '相关系数' : 'Correlation Coefficient'}</span>
                                        <span className="text-3xl font-bold text-gray-900">
                                            {selectedCorrelation.correlation.toFixed(3)}
                                        </span>
                                    </div>

                                    {/* Correlation Type */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{locale === 'zh' ? '相关类型' : 'Correlation Type'}</span>
                                        <span className="text-lg font-medium text-gray-900">
                                            {getCorrelationLabel(selectedCorrelation.correlation)}
                                        </span>
                                    </div>

                                    {/* P-Value */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">P-Value</span>
                                        <span className="text-lg font-medium text-gray-900">
                                            {selectedCorrelation.pValue.toFixed(4)}
                                        </span>
                                    </div>

                                    {/* Significance */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="text-gray-700">{locale === 'zh' ? '统计显著性' : 'Statistical Significance'}</span>
                                        <span className={`text-lg font-medium ${selectedCorrelation.significant ? 'text-green-600' : 'text-gray-500'}`}>
                                            {selectedCorrelation.significant ? t.significant : t.notSignificant}
                                        </span>
                                    </div>

                                    {/* Interpretation */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-medium text-blue-900 mb-2">
                                            {locale === 'zh' ? '解释' : 'Interpretation'}
                                        </h4>
                                        <p className="text-sm text-blue-800">
                                            {selectedCorrelation.correlation > 0.7
                                                ? locale === 'zh'
                                                    ? `${selectedCorrelation.series1} 和 ${selectedCorrelation.series2} 之间存在强正相关关系。当一个指标上升时，另一个指标也倾向于上升。`
                                                    : `There is a strong positive correlation between ${selectedCorrelation.series1} and ${selectedCorrelation.series2}. When one indicator rises, the other tends to rise as well.`
                                                : selectedCorrelation.correlation < -0.7
                                                    ? locale === 'zh'
                                                        ? `${selectedCorrelation.series1} 和 ${selectedCorrelation.series2} 之间存在强负相关关系。当一个指标上升时，另一个指标倾向于下降。`
                                                        : `There is a strong negative correlation between ${selectedCorrelation.series1} and ${selectedCorrelation.series2}. When one indicator rises, the other tends to fall.`
                                                    : selectedCorrelation.correlation > 0.4
                                                        ? locale === 'zh'
                                                            ? `${selectedCorrelation.series1} 和 ${selectedCorrelation.series2} 之间存在中等正相关关系。`
                                                            : `There is a moderate positive correlation between ${selectedCorrelation.series1} and ${selectedCorrelation.series2}.`
                                                        : selectedCorrelation.correlation < -0.4
                                                            ? locale === 'zh'
                                                                ? `${selectedCorrelation.series1} 和 ${selectedCorrelation.series2} 之间存在中等负相关关系。`
                                                                : `There is a moderate negative correlation between ${selectedCorrelation.series1} and ${selectedCorrelation.series2}.`
                                                            : locale === 'zh'
                                                                ? `${selectedCorrelation.series1} 和 ${selectedCorrelation.series2} 之间的相关性较弱或不存在。`
                                                                : `The correlation between ${selectedCorrelation.series1} and ${selectedCorrelation.series2} is weak or does not exist.`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
