'use client';

import { useState } from 'react';
import { useTradeJournal, TradeEntry, EMOTION_LABELS, MARKET_CONDITION_LABELS } from '@/hooks/useTradeJournal';
import { TradeJournalEntry } from './TradeJournalEntry';
import { ZenButton, ZenCard, ZenBadge } from './ui/ZenUI';
import { Plus, Download, Upload, Filter, X } from 'lucide-react';
import useSWR from 'swr';
import { RealEconomicDashboard } from './RealEconomicDashboard';
import { SmartAssetInput } from './ui/SmartAssetInput';
import { useTranslation } from '@/lib/language-context';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function TradeJournal() {
    const journal = useTradeJournal();
    const [isAdding, setIsAdding] = useState(false);
    const [activeTab, setActiveTab] = useState<'journal' | 'stats'>('journal');
    const { t } = useTranslation();

    // 获取各种高风险指标，用于自动关联
    const { data: indicatorsData } = useSWR('/api/economic-data', fetcher);

    // New Entry Form State
    const [newEntry, setNewEntry] = useState<Partial<TradeEntry>>({
        type: 'buy',
        status: 'planned',
        emotion: 'neutral',
        emotionIntensity: 3,
        marketCondition: 'uncertain',
        asset: '',
        reasoning: '',
        macroContext: '',
    });

    const handleCreate = () => {
        if (!newEntry.asset || !newEntry.reasoning) return; // Simple validation

        // Auto-link critical indicators if available
        const criticalIndicators = indicatorsData?.anomalies
            ?.filter((a: any) => a.severity === 'critical' || a.severity === 'warning')
            .map((a: any) => ({
                seriesId: a.seriesId,
                seriesTitle: a.seriesTitle,
                value: a.currentValue,
                zScore: a.zScore,
                severity: a.severity,
                date: new Date().toISOString()
            })) || [];

        journal.addEntry({
            ...newEntry as any,
            linkedIndicators: criticalIndicators
        });

        setIsAdding(false);
        setNewEntry({
            type: 'buy',
            status: 'planned',
            emotion: 'neutral',
            emotionIntensity: 3,
            marketCondition: 'uncertain',
            asset: '',
            reasoning: '',
            macroContext: '',
        });
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[var(--text-primary)]">{t('zen.journal.title')}</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {t('zen.journal.subtitle')}
                        <span className="text-[var(--accent-sage)] ml-2 text-xs uppercase font-bold tracking-wider">{t('zen.journal.localStorage')}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <ZenButton variant="secondary" size="sm" onClick={journal.exportToCSV}>
                        <Download className="w-4 h-4 mr-2" /> CSV
                    </ZenButton>
                    <ZenButton onClick={() => setIsAdding(true)}>
                        <Plus className="w-4 h-4 mr-2" /> {t('zen.journal.newEntry')}
                    </ZenButton>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ZenCard className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-serif">{journal.stats.total}</span>
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('zen.journal.stats.total')}</span>
                </ZenCard>
                <ZenCard className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-serif">{(journal.stats.winRate * 100).toFixed(0)}%</span>
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('zen.journal.stats.winRate')}</span>
                </ZenCard>
                <ZenCard className="p-4 flex flex-col items-center justify-center text-center">
                    <span className={`text-2xl font-serif ${journal.stats.totalPnL >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
                        {journal.stats.totalPnL > 0 ? '+' : ''}{journal.stats.totalPnL.toLocaleString()}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('zen.journal.stats.pnl')}</span>
                </ZenCard>
                <ZenCard className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-serif">{journal.stats.avgRating.toFixed(1)}</span>
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('zen.journal.stats.avgRating')}</span>
                </ZenCard>
            </div>

            {/* Add Entry Form (Overlay or Inline) */}
            {isAdding && (
                <ZenCard className="border-[var(--accent-sage)] bg-[var(--bg-main)] shadow-lg animate-fade-in">
                    <div className="flex justify-between mb-6">
                        <h3 className="text-lg font-serif">{t('zen.journal.newEntry')}</h3>
                        <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Col: Basics */}
                        <div className="space-y-4">
                            <div>
                                <label className="zen-label">{t('zen.journal.form.asset')}</label>
                                <div className="relative">
                                    <SmartAssetInput
                                        className="zen-input uppercase font-mono tracking-wide"
                                        placeholder={t('zen.journal.form.placeholder.asset')}
                                        value={newEntry.asset || ''}
                                        onChange={(val) => setNewEntry({ ...newEntry, asset: val })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="zen-label">{t('zen.journal.form.action')}</label>
                                    <select
                                        className="zen-input"
                                        value={newEntry.type}
                                        onChange={e => setNewEntry({ ...newEntry, type: e.target.value as any })}
                                    >
                                        <option value="buy">{t('zen.journal.options.buy') || 'Buy'}</option>
                                        <option value="sell">{t('zen.journal.options.sell') || 'Sell'}</option>
                                        <option value="hold">{t('zen.journal.options.hold') || 'Hold'}</option>
                                        <option value="watchlist">{t('zen.journal.options.watch') || 'Watch'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="zen-label">{t('zen.journal.form.status')}</label>
                                    <select
                                        className="zen-input"
                                        value={newEntry.status}
                                        onChange={e => setNewEntry({ ...newEntry, status: e.target.value as any })}
                                    >
                                        <option value="planned">{t('zen.journal.options.planned') || 'Planned'}</option>
                                        <option value="executed">{t('zen.journal.options.executed') || 'Executed'}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="zen-label">{t('zen.journal.form.rationale')}</label>
                                <textarea
                                    className="zen-input min-h-[100px]"
                                    placeholder={t('zen.journal.form.placeholder.rationale')}
                                    value={newEntry.reasoning}
                                    onChange={e => setNewEntry({ ...newEntry, reasoning: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Right Col: Psychology & Context */}
                        <div className="space-y-4">
                            <div>
                                <label className="zen-label">{t('zen.journal.form.marketCondition')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(MARKET_CONDITION_LABELS).map(([key, label]: any) => (
                                        <button
                                            key={key}
                                            onClick={() => setNewEntry({ ...newEntry, marketCondition: key })}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                          ${newEntry.marketCondition === key
                                                    ? 'bg-[var(--accent-sage)] text-white border-[var(--accent-sage)]'
                                                    : 'bg-white border-[var(--stroke-medium)] text-[var(--text-secondary)] hover:border-[var(--accent-sage)]'}`}
                                        >
                                            {label.emoji} {t(`zen.marketConditions.${key.toLowerCase()}`) || label.en}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="zen-label">{t('zen.journal.form.emotion')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(EMOTION_LABELS).map(([key, label]: any) => (
                                        <button
                                            key={key}
                                            onClick={() => setNewEntry({ ...newEntry, emotion: key })}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1
                          ${newEntry.emotion === key
                                                    ? 'ring-2 ring-offset-1'
                                                    : 'bg-white border-[var(--stroke-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'}`}
                                            style={newEntry.emotion === key ? { borderColor: label.color, backgroundColor: label.color + '20', color: '#2D2D2D' } : {}}
                                        >
                                            <span>{label.emoji}</span> {t(`zen.emotions.${key.toLowerCase()}`) || label.en}
                                        </button>
                                    ))}
                                </div>
                                {/* Intensity Slider */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-muted)]">{t('zen.journal.form.intensity')}:</span>
                                    <input
                                        type="range" min="1" max="5"
                                        value={newEntry.emotionIntensity}
                                        onChange={e => setNewEntry({ ...newEntry, emotionIntensity: parseInt(e.target.value) as any })}
                                        className="flex-1 accent-[var(--accent-sage)] h-1.5 bg-[var(--stroke-medium)] rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-mono w-4">{newEntry.emotionIntensity}</span>
                                </div>
                            </div>

                            <div>
                                <label className="zen-label">{t('zen.journal.form.macro')}</label>
                                <textarea
                                    className="zen-input min-h-[60px]"
                                    placeholder={t('zen.journal.form.placeholder.macro')}
                                    value={newEntry.macroContext}
                                    onChange={e => setNewEntry({ ...newEntry, macroContext: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--stroke-light)]">
                        <ZenButton variant="ghost" onClick={() => setIsAdding(false)}>{t('zen.journal.form.cancel')}</ZenButton>
                        <ZenButton onClick={handleCreate}>{t('zen.journal.form.save')}</ZenButton>
                    </div>
                </ZenCard>
            )}

            {/* Journal List */}
            <div className="space-y-4">
                {journal.entries.length === 0 ? (
                    <div className="text-center py-20 text-[var(--text-muted)]">
                        <div className="mb-4 text-4xl opacity-20">🍃</div>
                        <p>{t('zen.journal.empty')}</p>
                        <p className="text-sm mt-2">{t('zen.journal.emptySub')}</p>
                    </div>
                ) : (
                    journal.entries.map(entry => (
                        <TradeJournalEntry
                            key={entry.id}
                            entry={entry}
                            onDelete={journal.deleteEntry}
                        // onEdit would go here
                        />
                    ))
                )}
            </div>

        </div>
    );
}
