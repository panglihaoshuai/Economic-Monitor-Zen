'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CorrelationMatrix {
    seriesIds: string[];
    matrix: number[][];
    significantPairs: Array<{
        series1: string;
        series2: string;
        correlation: number;
        pValue: number;
        significance: 'high' | 'medium' | 'low';
    }>;
}

interface CorrelationAnalysisProps {
    seriesIds: string[];
    startDate?: string;
    endDate?: string;
}

export function CorrelationAnalysis({ seriesIds, startDate, endDate }: CorrelationAnalysisProps) {
    const [matrix, setMatrix] = useState<CorrelationMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations('correlation');

    useEffect(() => {
        async function fetchAnalysis() {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    seriesIds: seriesIds.join(','),
                    startDate: startDate || '',
                    endDate: endDate || '',
                });

                const response = await fetch(`/api/correlation-analysis?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch correlation analysis');
                }

                const data = await response.json();
                setMatrix(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }

        fetchAnalysis();
    }, [seriesIds, startDate, endDate]);

    if (loading) {
        return (
            <div className="p-6 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!matrix) {
        return null;
    }

    const getCorrelationColor = (correlation: number) => {
        const absCorrelation = Math.abs(correlation);
        if (absCorrelation >= 0.7) {
            return correlation > 0 ? 'bg-red-500' : 'bg-green-500';
        } else if (absCorrelation >= 0.4) {
            return correlation > 0 ? 'bg-orange-400' : 'bg-blue-400';
        } else {
            return 'bg-gray-300';
        }
    };

    const getSignificanceLabel = (significance: string) => {
        switch (significance) {
            case 'high':
                return t('significance.high');
            case 'medium':
                return t('significance.medium');
            case 'low':
                return t('significance.low');
            default:
                return '';
        }
    };

    return (
        <div className="p-6 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t('title')}
            </h3>

            {/* Correlation Matrix Heatmap */}
            <div className="mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-xs text-gray-500"></th>
                                {matrix.seriesIds.map((id) => (
                                    <th key={id} className="p-2 text-xs text-gray-500 font-medium">
                                        {id}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.seriesIds.map((rowId, rowIndex) => (
                                <tr key={rowId}>
                                    <td className="p-2 text-xs text-gray-500 font-medium">
                                        {rowId}
                                    </td>
                                    {matrix.seriesIds.map((colId, colIndex) => {
                                        const correlation = matrix.matrix[rowIndex][colIndex];
                                        const isDiagonal = rowIndex === colIndex;
                                        return (
                                            <td
                                                key={colId}
                                                className={`p-2 text-center text-xs font-medium ${isDiagonal ? 'bg-gray-100' : getCorrelationColor(correlation)
                                                    }`}
                                            >
                                                {isDiagonal ? '1.00' : correlation.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-6 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>{t('legend.strongPositive')}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-400 rounded"></div>
                    <span>{t('legend.moderatePositive')}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <span>{t('legend.weak')}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    <span>{t('legend.moderateNegative')}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>{t('legend.strongNegative')}</span>
                </div>
            </div>

            {/* Significant Pairs */}
            {matrix.significantPairs.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                        {t('significantPairs')}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {matrix.significantPairs.map((pair, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg ${pair.correlation > 0 ? 'bg-red-50' : 'bg-green-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${pair.correlation > 0 ? 'bg-red-500' : 'bg-green-500'
                                            }`} />
                                        <span className="text-sm font-medium text-gray-800">
                                            {pair.series1} ↔ {pair.series2}
                                        </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pair.significance === 'high' ? 'bg-red-100 text-red-700' :
                                            pair.significance === 'medium' ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {getSignificanceLabel(pair.significance)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>
                                        {t('correlation')}: {pair.correlation.toFixed(2)}
                                    </span>
                                    <span>
                                        {t('pValue')}: {pair.pValue.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
