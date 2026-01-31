'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

interface HistoricalEvent {
    date: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    similarity: number;
    relatedIndicators: string[];
}

interface HistoricalSimilarEventsProps {
    indicatorId: string;
    indicatorName: string;
    startDate?: string;
    endDate?: string;
    locale?: string;
}

export function HistoricalSimilarEvents({
    indicatorId,
    indicatorName,
    startDate,
    endDate,
    locale = 'zh'
}: HistoricalSimilarEventsProps) {
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
                locale
            });

            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/historical-events?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch historical events');
            }

            const data = await response.json();
            setEvents(data.events || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
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
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'negative':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        }
    };

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.8) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        if (similarity >= 0.6) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const translations = {
        zh: {
            title: '历史相似事件',
            description: '基于当前市场状况，发现以下历史相似事件',
            loading: '加载中...',
            error: '加载失败',
            retry: '重试',
            noEvents: '未找到相似的历史事件',
            similarity: '相似度',
            impact: '影响',
            relatedIndicators: '相关指标',
            positive: '正面',
            negative: '负面',
            neutral: '中性',
            close: '关闭',
            viewDetails: '查看详情'
        },
        en: {
            title: 'Historical Similar Events',
            description: 'Based on current market conditions, the following similar historical events were found',
            loading: 'Loading...',
            error: 'Failed to load',
            retry: 'Retry',
            noEvents: 'No similar historical events found',
            similarity: 'Similarity',
            impact: 'Impact',
            relatedIndicators: 'Related Indicators',
            positive: 'Positive',
            negative: 'Negative',
            neutral: 'Neutral',
            close: 'Close',
            viewDetails: 'View Details'
        }
    };

    const t = translations[locale as keyof typeof translations] || translations.en;

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">{t.loading}</div>
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
                        {t.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                        <div className="text-destructive">{t.error}: {error}</div>
                        <Button onClick={fetchHistoricalEvents} variant="outline">
                            {t.retry}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (events.length === 0) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t.title}
                    </CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">{t.noEvents}</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t.title}
                    </CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {events.map((event, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedEvent(event)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className={getSimilarityColor(event.similarity)}>
                                                {t.similarity}: {(event.similarity * 100).toFixed(0)}%
                                            </Badge>
                                            <Badge className={getImpactColor(event.impact)}>
                                                {getImpactIcon(event.impact)}
                                                <span className="ml-1">
                                                    {t[event.impact as keyof typeof t] || t.neutral}
                                                </span>
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold mb-1">{event.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {formatDate(event.date)}
                                        </p>
                                        <p className="text-sm line-clamp-2">{event.description}</p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        {t.viewDetails}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedEvent(null)}
                >
                    <Card
                        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-2xl mb-2">{selectedEvent.title}</CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(selectedEvent.date)}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedEvent(null)}
                                >
                                    ×
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-2">
                                <Badge className={getSimilarityColor(selectedEvent.similarity)}>
                                    {t.similarity}: {(selectedEvent.similarity * 100).toFixed(0)}%
                                </Badge>
                                <Badge className={getImpactColor(selectedEvent.impact)}>
                                    {getImpactIcon(selectedEvent.impact)}
                                    <span className="ml-1">
                                        {t[selectedEvent.impact as keyof typeof t] || t.neutral}
                                    </span>
                                </Badge>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">事件描述</h4>
                                <p className="text-muted-foreground">{selectedEvent.description}</p>
                            </div>

                            {selectedEvent.relatedIndicators.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">{t.relatedIndicators}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEvent.relatedIndicators.map((indicator, idx) => (
                                            <Badge key={idx} variant="outline">
                                                {indicator}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setSelectedEvent(null)}
                                >
                                    {t.close}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
