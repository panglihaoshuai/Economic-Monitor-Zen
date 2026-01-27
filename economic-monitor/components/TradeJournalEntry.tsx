'use client';

import { useState } from 'react';
import { TradeEntry, EMOTION_LABELS, MARKET_CONDITION_LABELS, LinkedIndicator } from '@/hooks/useTradeJournal';
import { ZenCard, ZenBadge, ZenButton } from './ui/ZenUI';
import { ChevronDown, ChevronUp, Edit2, Trash2, ExternalLink, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/language-context';

interface TradeJournalEntryProps {
    entry: TradeEntry;
    onEdit?: (entry: TradeEntry) => void;
    onDelete?: (id: string) => void;
}

export function TradeJournalEntry({ entry, onEdit, onDelete }: TradeJournalEntryProps) {
    const [expanded, setExpanded] = useState(false);
    const { t } = useTranslation();

    const emotionLabel = EMOTION_LABELS[entry.emotion];
    const marketLabel = MARKET_CONDITION_LABELS[entry.marketCondition];

    // Safe access to labels in case key is missing or mismatched
    const emotionEmoji = emotionLabel?.emoji || '😐';
    const emotionColor = emotionLabel?.color || '#999';
    const emotionText = t(`zen.emotions.${entry.emotion?.toLowerCase()}`) || entry.emotion;

    const marketEmoji = marketLabel?.emoji || '🌊';
    const marketText = t(`zen.marketConditions.${entry.marketCondition?.toLowerCase()}`) || entry.marketCondition;

    const isProfit = entry.retrospective?.outcome === 'profit';
    const isLoss = entry.retrospective?.outcome === 'loss';

    const getOutcomeLabel = () => {
        if (isProfit) return `✅ ${t('zen.journal.entry.outcome.profit')}`;
        if (isLoss) return `❌ ${t('zen.journal.entry.outcome.loss')}`;
        return `⚖️ ${t('zen.journal.entry.outcome.breakeven')}`;
    };

    const typeColorClass = entry.type === 'buy' ? 'bg-[#E4F2E4] text-[#4A5D43]' :
        entry.type === 'sell' ? 'bg-[#FFF4E5] text-[#B06A4B]' : 'bg-[#E5E4E1] text-[#6B6B6B]';

    return (
        <ZenCard className="relative overflow-hidden group">
            {/* Top Row: Header Info */}
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${typeColorClass}`}>
                            {t(`zen.journal.options.${entry.type}`) || entry.type}
                        </span>
                        <h3 className="text-lg font-serif font-medium truncate">{entry.asset}</h3>
                        <span className="text-xs text-[var(--text-muted)]">
                            {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                    </div>

                    <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                        {entry.reasoning}
                    </p>
                </div>

                {/* Emotion & Status */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2" title={`${t('zen.journal.form.intensity')}: ${entry.emotionIntensity}/5`}>
                        <span className="text-xl" role="img" aria-label={emotionText}>{emotionEmoji}</span>
                        <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:inline">{emotionText}</span>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-3 rounded-full ${i < entry.emotionIntensity ? 'opacity-100' : 'opacity-20'}`}
                                    style={{ backgroundColor: emotionColor }}
                                />
                            ))}
                        </div>
                    </div>
                    <ZenBadge variant="neutral">{marketEmoji} {marketText}</ZenBadge>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="mt-6 pt-4 border-t border-[var(--stroke-light)] space-y-6 animate-fade-in">

                    {/* 1. Macro Context */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t('zen.journal.entry.macroAndLogic')}</h4>
                        <div className="bg-[var(--bg-subtle)] p-3 rounded-lg text-sm text-[var(--text-primary)]">
                            <p className="mb-2"><span className="font-semibold text-[var(--text-secondary)]">{t('zen.journal.entry.labels.macro')}:</span> {entry.macroContext}</p>
                            <p><span className="font-semibold text-[var(--text-secondary)]">{t('zen.journal.entry.labels.logic')}:</span> {entry.reasoning}</p>
                        </div>
                    </div>

                    {/* 2. Key Indicators Snapshot */}
                    {entry.linkedIndicators && entry.linkedIndicators.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t('zen.journal.entry.keyIndicators')}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {entry.linkedIndicators.map(ind => (
                                    <div key={ind.seriesId} className="border border-[var(--stroke-light)] rounded-lg p-2 flex flex-col">
                                        <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                                            <span>{ind.seriesId}</span>
                                            {ind.severity !== 'normal' && (
                                                <span className="text-[var(--status-warning)]">⚠️</span>
                                            )}
                                        </div>
                                        <div className="mt-1 font-mono text-sm">
                                            {ind.value.toFixed(2)}
                                            <span className="text-[10px] text-[var(--text-muted)] ml-1">(Z: {ind.zScore.toFixed(1)})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Retrospective (If any) */}
                    {entry.retrospective && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{t('zen.journal.entry.retrospective')}</h4>
                            <div className={`p-4 rounded-lg border ${isProfit ? 'bg-[#E4F2E4]/30 border-[#E4F2E4]' :
                                isLoss ? 'bg-[#FFF4E5]/30 border-[#FFF4E5]' : 'bg-[var(--bg-subtle)] border-[var(--stroke-light)]'
                                }`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`font-bold ${isProfit ? 'text-[var(--status-success)]' : isLoss ? 'text-[var(--status-error)]' : ''}`}>
                                        {getOutcomeLabel()}
                                        {entry.retrospective.profitLoss && ` (${entry.retrospective.profitLoss > 0 ? '+' : ''}${entry.retrospective.profitLoss})`}
                                    </span>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={`text-xs ${i < (entry.retrospective?.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm italic text-[var(--text-secondary)]">"{entry.retrospective.lessonsLearned}"</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        {onDelete && (
                            <ZenButton variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} className="text-[var(--status-error)] hover:bg-[var(--status-error)]/10">
                                <Trash2 className="w-4 h-4 mr-1" /> {t('common.delete')}
                            </ZenButton>
                        )}
                        {onEdit && (
                            <ZenButton variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>
                                <Edit2 className="w-4 h-4 mr-1" /> {t('common.edit')}
                            </ZenButton>
                        )}
                    </div>

                </div>
            )}

            {/* Expand Toggle area */}
            <div
                className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-[var(--bg-card)] to-transparent flex items-end justify-center cursor-pointer hover:bg-[var(--bg-subtle)]/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
        </ZenCard>
    );
}
