'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HistoricalEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    similarity: number; // 0-100
    indicators: {
        name: string;
        value: number;
        change: number;
    }[];
    context: string;
    outcome?: string;
}

interface HistoricalSimilarityProps {
    events: HistoricalEvent[];
    locale?: 'zh' | 'en';
    className?: string;
}

const translations = {
    zh: {
        title: '历史相似事件',
        description: '基于当前市场状态，发现以下历史相似事件',
        similarity: '相似度',
        impact: '影响',
        positive: '正面',
        negative: '负面',
        neutral: '中性',
        indicators: '相关指标',
        context: '背景',
        outcome: '结果',
        viewDetails: '查看详情',
        hideDetails: '收起详情',
        noEvents: '暂无历史相似事件',
        highSimilarity: '高度相似',
        mediumSimilarity: '中度相似',
        lowSimilarity: '低度相似',
    },
    en: {
        title: 'Historical Similar Events',
        description: 'Based on current market conditions, the following similar historical events were found',
        similarity: 'Similarity',
        impact: 'Impact',
        positive: 'Positive',
        negative: 'Negative',
        neutral: 'Neutral',
        indicators: 'Related Indicators',
        context: 'Context',
        outcome: 'Outcome',
        viewDetails: 'View Details',
        hideDetails: 'Hide Details',
        noEvents: 'No similar historical events found',
        highSimilarity: 'High Similarity',
        mediumSimilarity: 'Medium Similarity',
        lowSimilarity: 'Low Similarity',
    },
};

export function HistoricalSimilarity({ events, locale = 'zh', className }: HistoricalSimilarityProps) {
    const t = translations[locale];
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

    const toggleEvent = (eventId: string) => {
        const newExpanded = new Set(expandedEvents);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
        }
        setExpandedEvents(newExpanded);
    };

    const getSimilarityLevel = (similarity: number) => {
        if (similarity >= 80) return { label: t.highSimilarity, color: 'bg-red-100 text-red-800' };
        if (similarity >= 60) return { label: t.mediumSimilarity, color: 'bg-yellow-100 text-yellow-800' };
        return { label: t.lowSimilarity, color: 'bg-blue-100 text-blue-800' };
    };

    const getImpactIcon = (impact: string) => {
        switch (impact) {
            case 'positive':
                return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'negative':
                return <TrendingDown className="h-4 w-4 text-red-600" />;
            default:
                return <Info className="h-4 w-4 text-blue-600" />;
        }
    };

    const getImpactBadge = (impact: string) => {
        switch (impact) {
            case 'positive':
                return <Badge variant="success">{t.positive}</Badge>;
            case 'negative':
                return <Badge variant="destructive">{t.negative}</Badge>;
            default:
                return <Badge variant="secondary">{t.neutral}</Badge>;
        }
    };

    if (!events || events.length === 0) {
        return (
            <Card className={cn('border-slate-200', className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-slate-600" />
                        {t.title}
                    </CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-slate-500">
                        <Info className="h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">{t.noEvents}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('border-slate-200', className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    {t.title}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {events.map((event) => {
                        const isExpanded = expandedEvents.has(event.id);
                        const similarityLevel = getSimilarityLevel(event.similarity);

                        return (
                            <div
                                key={event.id}
                                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Event Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleEvent(event.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm text-slate-500">{event.date}</span>
                                                <Badge className={similarityLevel.color}>
                                                    {similarityLevel.label} ({event.similarity}%)
                                                </Badge>
                                                {getImpactBadge(event.impact)}
                                            </div>
                                            <h4 className="font-semibold text-slate-900 mb-1">{event.title}</h4>
                                            <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Event Details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                                        {/* Context */}
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                <Info className="h-4 w-4" />
                                                {t.context}
                                            </h5>
                                            <p className="text-sm text-slate-700">{event.context}</p>
                                        </div>

                                        {/* Related Indicators */}
                                        <div className="mb-4">
                                            <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                {t.indicators}
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {event.indicators.map((indicator, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
                                                    >
                                                        <span className="text-sm text-slate-700">{indicator.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-900">
                                                                {indicator.value.toFixed(2)}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'text-xs font-medium',
                                                                    indicator.change > 0 ? 'text-green-600' : indicator.change < 0 ? 'text-red-600' : 'text-slate-600'
                                                                )}
                                                            >
                                                                {indicator.change > 0 ? '+' : ''}{indicator.change.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Outcome */}
                                        {event.outcome && (
                                            <div>
                                                <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                    {getImpactIcon(event.impact)}
                                                    {t.outcome}
                                                </h5>
                                                <p className="text-sm text-slate-700">{event.outcome}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
