'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface HistoricalEvent {
    date: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    similarity: number;
    relatedIndicators: string[];
}

interface HistoricalEventsProps {
    indicatorId: string;
    startDate?: string;
    endDate?: string;
}

export function HistoricalEvents({ indicatorId, startDate, endDate }: HistoricalEventsProps) {
    const { t, locale } = useLanguage();
    const [events, setEvents] = useState<HistoricalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

    useEffect(() => {
        fetchHistoricalEvents();
    }, [indicatorId, startDate, endDate]);

    const fetchHistoricalEvents = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                indicatorId,
                startDate: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0],
            });

            const response = await fetch(`/api/historical-events?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch historical events');
            }

            const data = await response.json();
            setEvents(data.events || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            console.error('Error fetching historical events:', err);
        } finally {
            setLoading(false);
        }
    };

    const getImpactIcon = (impact: string) => {
        switch (impact) {
            case 'positive':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'negative':
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'positive':
                return 'border-green-500 bg-green-50 dark:bg-green-950';
            case 'negative':
                return 'border-red-500 bg-red-50 dark:bg-red-950';
            default:
                return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
        }
    };

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.8) return 'text-green-600 dark:text-green-400';
        if (similarity >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-gray-600 dark:text-gray-400';
    };

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {locale === 'zh' ? '历史相似事件' : 'Historical Similar Events'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {locale === 'zh' ? '历史相似事件' : 'Historical Similar Events'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {locale === 'zh' ? '历史相似事件' : 'Historical Similar Events'}
                </CardTitle>
                <CardDescription>
                    {locale === 'zh'
                        ? '基于当前市场状况的历史相似事件分析'
                        : 'Analysis of historical events similar to current market conditions'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {locale === 'zh' ? '暂无历史相似事件' : 'No historical similar events found'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* 时间线 */}
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                            {events.map((event, index) => (
                                <div
                                    key={index}
                                    className={`relative pl-10 pb-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${selectedEvent === event ? 'scale-[1.02]' : ''
                                        }`}
                                    onClick={() => setSelectedEvent(event)}
                                >
                                    {/* 时间线节点 */}
                                    <div
                                        className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${selectedEvent === event
                                                ? 'bg-primary border-primary scale-125'
                                                : getImpactColor(event.impact).split(' ')[0]
                                            }`}
                                    ></div>

                                    {/* 事件卡片 */}
                                    <div
                                        className={`p-4 rounded-lg border-l-4 ${getImpactColor(event.impact)} transition-all duration-200 hover:shadow-md`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {getImpactIcon(event.impact)}
                                                <span className="font-semibold text-sm">
                                                    {new Date(event.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            <div className={`text-sm font-medium ${getSimilarityColor(event.similarity)}`}>
                                                {locale === 'zh' ? '相似度' : 'Similarity'}: {(event.similarity * 100).toFixed(0)}%
                                            </div>
                                        </div>

                                        <h4 className="font-semibold mb-1">{event.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                            {event.description}
                                        </p>

                                        {event.relatedIndicators.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {event.relatedIndicators.map((indicator, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700"
                                                    >
                                                        {indicator}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 选中事件详情 */}
                        {selectedEvent && (
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    {locale === 'zh' ? '事件详情' : 'Event Details'}
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium">
                                            {locale === 'zh' ? '日期：' : 'Date: '}
                                        </span>
                                        {new Date(selectedEvent.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {locale === 'zh' ? '影响：' : 'Impact: '}
                                        </span>
                                        <span className={`capitalize ${getSimilarityColor(selectedEvent.similarity)}`}>
                                            {selectedEvent.impact}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {locale === 'zh' ? '相似度：' : 'Similarity: '}
                                        </span>
                                        <span className={getSimilarityColor(selectedEvent.similarity)}>
                                            {(selectedEvent.similarity * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            {locale === 'zh' ? '相关指标：' : 'Related Indicators: '}
                                        </span>
                                        {selectedEvent.relatedIndicators.join(', ')}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 刷新按钮 */}
                        <div className="flex justify-center mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchHistoricalEvents}
                                disabled={loading}
                            >
                                {locale === 'zh' ? '刷新' : 'Refresh'}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
