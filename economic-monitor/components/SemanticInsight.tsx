'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Info, RefreshCw } from 'lucide-react';

interface SemanticAnalysisData {
    trend: {
        direction: 'up' | 'down' | 'stable';
        description: string;
        confidence: number;
    };
    volatility: {
        level: 'low' | 'medium' | 'high';
        description: string;
        trend: 'increasing' | 'decreasing' | 'stable';
    };
    change: {
        absolute: number;
        percentage: number;
        significance: 'low' | 'medium' | 'high';
        description: string;
    };
    keyInsights: string[];
    summary: string;
    recommendations: string[];
}

interface SemanticInsightProps {
    seriesId?: string;
    startDate?: string;
    endDate?: string;
    locale?: string;
}

export default function SemanticInsight({
    seriesId = 'CPIAUCSL',
    startDate,
    endDate,
    locale = 'zh'
}: SemanticInsightProps) {
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState<SemanticAnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const t = {
        title: locale === 'zh' ? '深度洞察' : 'Deep Insights',
        description: locale === 'zh' ? '基于统计模型的智能分析' : 'Intelligent analysis based on statistical models',
        loading: locale === 'zh' ? '分析中...' : 'Analyzing...',
        error: locale === 'zh' ? '分析失败' : 'Analysis failed',
        refresh: locale === 'zh' ? '刷新' : 'Refresh',
        trend: locale === 'zh' ? '趋势分析' : 'Trend Analysis',
        volatility: locale === 'zh' ? '波动率分析' : 'Volatility Analysis',
        change: locale === 'zh' ? '变化分析' : 'Change Analysis',
        keyInsights: locale === 'zh' ? '关键洞察' : 'Key Insights',
        summary: locale === 'zh' ? '总结' : 'Summary',
        recommendations: locale === 'zh' ? '投资建议' : 'Investment Recommendations',
        confidence: locale === 'zh' ? '置信度' : 'Confidence',
        significance: locale === 'zh' ? '显著性' : 'Significance',
        showMore: locale === 'zh' ? '查看更多' : 'Show More',
        showLess: locale === 'zh' ? '收起' : 'Show Less',
    };

    useEffect(() => {
        fetchSemanticAnalysis();
    }, [seriesId, startDate, endDate, locale]);

    const fetchSemanticAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append('seriesId', seriesId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('locale', locale);

            const response = await fetch(`/api/semantic-analysis?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch semantic analysis');
            }

            const data = await response.json();
            setAnalysis(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = (direction: string) => {
        if (direction === 'up') return <TrendingUp className="w-5 h-5 text-green-600" />;
        if (direction === 'down') return <TrendingDown className="w-5 h-5 text-red-600" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    };

    const getTrendColor = (direction: string): string => {
        if (direction === 'up') return 'text-green-600';
        if (direction === 'down') return 'text-red-600';
        return 'text-yellow-600';
    };

    const getVolatilityColor = (level: string): string => {
        if (level === 'low') return 'text-green-600';
        if (level === 'medium') return 'text-yellow-600';
        return 'text-red-600';
    };

    const getVolatilityIcon = (level: string) => {
        if (level === 'low') return <TrendingUp className="w-5 h-5 text-green-600" />;
        if (level === 'medium') return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    };

    const getSignificanceColor = (significance: string): string => {
        if (significance === 'high') return 'text-red-600';
        if (significance === 'medium') return 'text-yellow-600';
        return 'text-green-600';
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
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
                    <p className="text-red-500 mb-4">{t.error}: {error}</p>
                    <Button onClick={fetchSemanticAnalysis} variant="outline">
                        {t.refresh}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!analysis) {
        return null;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center">
                            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                            {t.title}
                        </CardTitle>
                        <CardDescription>{t.description}</CardDescription>
                    </div>
                    <Button onClick={fetchSemanticAnalysis} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t.refresh}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Trend Analysis */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                {getTrendIcon(analysis.trend.direction)}
                                <span className="ml-2">{t.trend}</span>
                            </h3>
                            <span className={`text-sm font-medium ${getTrendColor(analysis.trend.direction)}`}>
                                {analysis.trend.direction === 'up' && (locale === 'zh' ? '上升' : 'Rising')}
                                {analysis.trend.direction === 'down' && (locale === 'zh' ? '下降' : 'Falling')}
                                {analysis.trend.direction === 'stable' && (locale === 'zh' ? '稳定' : 'Stable')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{analysis.trend.description}</p>
                        <div className="flex items-center text-xs text-gray-500">
                            <span className="mr-4">{t.confidence}: {(analysis.trend.confidence * 100).toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Volatility Analysis */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                {getVolatilityIcon(analysis.volatility.level)}
                                <span className="ml-2">{t.volatility}</span>
                            </h3>
                            <span className={`text-sm font-medium ${getVolatilityColor(analysis.volatility.level)}`}>
                                {analysis.volatility.level === 'low' && (locale === 'zh' ? '低波动' : 'Low Volatility')}
                                {analysis.volatility.level === 'medium' && (locale === 'zh' ? '中等波动' : 'Medium Volatility')}
                                {analysis.volatility.level === 'high' && (locale === 'zh' ? '高波动' : 'High Volatility')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{analysis.volatility.description}</p>
                        <div className="flex items-center text-xs text-gray-500">
                            <span>
                                {analysis.volatility.trend === 'increasing' && (locale === 'zh' ? '波动率上升' : 'Volatility Increasing')}
                                {analysis.volatility.trend === 'decreasing' && (locale === 'zh' ? '波动率下降' : 'Volatility Decreasing')}
                                {analysis.volatility.trend === 'stable' && (locale === 'zh' ? '波动率稳定' : 'Volatility Stable')}
                            </span>
                        </div>
                    </div>

                    {/* Change Analysis */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <Info className="w-5 h-5 text-green-600" />
                                <span className="ml-2">{t.change}</span>
                            </h3>
                            <span className={`text-sm font-medium ${getSignificanceColor(analysis.change.significance)}`}>
                                {analysis.change.significance === 'high' && (locale === 'zh' ? '高显著性' : 'High Significance')}
                                {analysis.change.significance === 'medium' && (locale === 'zh' ? '中等显著性' : 'Medium Significance')}
                                {analysis.change.significance === 'low' && (locale === 'zh' ? '低显著性' : 'Low Significance')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{analysis.change.description}</p>
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>
                                {locale === 'zh' ? '绝对变化' : 'Absolute Change'}: {analysis.change.absolute.toFixed(2)}
                            </span>
                            <span>
                                {locale === 'zh' ? '百分比变化' : 'Percentage Change'}: {analysis.change.percentage.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                            {t.keyInsights}
                        </h3>
                        <ul className="space-y-2">
                            {analysis.keyInsights.map((insight, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Info className="w-5 h-5 mr-2 text-gray-600" />
                            {t.summary}
                        </h3>
                        <p className="text-sm text-gray-700">{analysis.summary}</p>
                    </div>

                    {/* Recommendations */}
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Target className="w-5 h-5 mr-2 text-indigo-600" />
                            {t.recommendations}
                        </h3>
                        <ul className="space-y-2">
                            {analysis.recommendations.map((recommendation, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start">
                                    <span className="text-indigo-600 mr-2">•</span>
                                    <span>{recommendation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
