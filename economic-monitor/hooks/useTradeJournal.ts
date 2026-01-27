// 交易日记专用 Hook
// 完整的交易记录管理，支持情绪、宏观判断、截图等

import { useCallback, useMemo } from 'react';
import { useLocalStorage, exportAsCSV, downloadFile } from './useLocalStorage';

// ========== 类型定义 ==========

/** 交易情绪 */
export type TradeEmotion =
    | 'fear'        // 恐惧 - 犹豫不决，担心亏损
    | 'greed'       // 贪婪 - 想要更多收益
    | 'fomo'        // 错失恐惧 - 怕错过机会
    | 'confident'   // 自信 - 基于分析的确信
    | 'uncertain'   // 不确定 - 信息不足
    | 'neutral'     // 中性 - 按计划执行
    | 'euphoria'    // 狂喜 - 过度乐观
    | 'panic';      // 恐慌 - 急于止损

/** 交易类型 */
export type TradeType = 'buy' | 'sell' | 'hold' | 'watchlist';

/** 交易状态 */
export type TradeStatus = 'planned' | 'executed' | 'partial' | 'cancelled';

/** 市场环境 */
export type MarketCondition =
    | 'bull'        // 牛市
    | 'bear'        // 熊市
    | 'sideways'    // 震荡
    | 'volatile'    // 高波动
    | 'uncertain';  // 不确定

/** 关联的经济指标快照 */
export interface LinkedIndicator {
    seriesId: string;
    seriesTitle: string;
    value: number;
    zScore: number;
    severity: 'normal' | 'warning' | 'critical';
    date: string;
}

/** 交易日记条目 */
export interface TradeEntry {
    id: string;
    createdAt: string;
    updatedAt: string;

    // ========== 基础交易信息 ==========
    type: TradeType;
    asset: string;
    assetType?: 'stock' | 'etf' | 'crypto' | 'forex' | 'futures' | 'options' | 'other';
    price?: number;
    quantity?: number;
    totalValue?: number;
    status: TradeStatus;

    // ========== 情绪与心理 ==========
    emotion: TradeEmotion;
    emotionIntensity: 1 | 2 | 3 | 4 | 5;  // 1=微弱, 5=强烈
    emotionNotes?: string;                // 情绪备注

    // ========== 宏观经济判断 ==========
    macroContext: string;                 // 宏观背景描述
    marketCondition: MarketCondition;
    keyDrivers?: string[];                // 关键驱动因素

    // ========== 投资逻辑 ==========
    reasoning: string;                    // 交易理由
    thesis?: string;                      // 投资论点
    catalysts?: string[];                 // 催化剂
    risks?: string[];                     // 风险因素

    // ========== 目标与止损 ==========
    targetPrice?: number;
    stopLoss?: number;
    timeHorizon?: 'intraday' | 'days' | 'weeks' | 'months' | 'years';

    // ========== 关联数据 ==========
    linkedIndicators?: LinkedIndicator[]; // 关联的经济指标快照
    screenshotUrls?: string[];            // 截图（base64 或 URL）
    externalLinks?: string[];             // 外部链接（新闻、研报等）
    tags?: string[];                      // 标签

    // ========== 复盘 ==========
    retrospective?: {
        date: string;
        outcome: 'profit' | 'loss' | 'breakeven' | 'ongoing';
        profitLoss?: number;
        profitLossPercent?: number;
        lessonsLearned: string;
        wouldDoAgain: boolean;
        rating: 1 | 2 | 3 | 4 | 5;         // 复盘评分
    };
}

// ========== 常量 ==========

export const EMOTION_LABELS: Record<TradeEmotion, { zh: string; en: string; emoji: string; color: string }> = {
    fear: { zh: '恐惧', en: 'Fear', emoji: '😰', color: '#f7768e' },
    greed: { zh: '贪婪', en: 'Greed', emoji: '🤑', color: '#e0af68' },
    fomo: { zh: 'FOMO', en: 'FOMO', emoji: '😱', color: '#bb9af7' },
    confident: { zh: '自信', en: 'Confident', emoji: '😎', color: '#9ece6a' },
    uncertain: { zh: '迷茫', en: 'Uncertain', emoji: '🤔', color: '#565f89' },
    neutral: { zh: '中性', en: 'Neutral', emoji: '😐', color: '#7aa2f7' },
    euphoria: { zh: '狂喜', en: 'Euphoria', emoji: '🚀', color: '#ff9e64' },
    panic: { zh: '恐慌', en: 'Panic', emoji: '😨', color: '#f7768e' },
};

export const MARKET_CONDITION_LABELS: Record<MarketCondition, { zh: string; en: string; emoji: string }> = {
    bull: { zh: '牛市', en: 'Bull', emoji: '🐂' },
    bear: { zh: '熊市', en: 'Bear', emoji: '🐻' },
    sideways: { zh: '震荡', en: 'Sideways', emoji: '↔️' },
    volatile: { zh: '高波动', en: 'Volatile', emoji: '🎢' },
    uncertain: { zh: '不确定', en: 'Uncertain', emoji: '❓' },
};

// ========== Hook ==========

const TRADE_JOURNAL_KEY = 'zen-trade-journal';

export function useTradeJournal() {
    const [entries, setEntries, clearAll] = useLocalStorage<TradeEntry[]>(TRADE_JOURNAL_KEY, []);

    // 添加新条目
    const addEntry = useCallback((entry: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date().toISOString();
        const newEntry: TradeEntry = {
            ...entry,
            id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: now,
            updatedAt: now,
        };

        setEntries(prev => [newEntry, ...prev]);
        return newEntry;
    }, [setEntries]);

    // 更新条目
    const updateEntry = useCallback((id: string, updates: Partial<TradeEntry>) => {
        setEntries(prev => prev.map(entry =>
            entry.id === id
                ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                : entry
        ));
    }, [setEntries]);

    // 删除条目
    const deleteEntry = useCallback((id: string) => {
        setEntries(prev => prev.filter(entry => entry.id !== id));
    }, [setEntries]);

    // 添加复盘
    const addRetrospective = useCallback((id: string, retrospective: TradeEntry['retrospective']) => {
        updateEntry(id, { retrospective });
    }, [updateEntry]);

    // 搜索和过滤
    const filterEntries = useCallback((filters: {
        type?: TradeType;
        emotion?: TradeEmotion;
        marketCondition?: MarketCondition;
        asset?: string;
        tags?: string[];
        dateFrom?: string;
        dateTo?: string;
        hasRetrospective?: boolean;
    }) => {
        return entries.filter(entry => {
            if (filters.type && entry.type !== filters.type) return false;
            if (filters.emotion && entry.emotion !== filters.emotion) return false;
            if (filters.marketCondition && entry.marketCondition !== filters.marketCondition) return false;
            if (filters.asset && !entry.asset.toLowerCase().includes(filters.asset.toLowerCase())) return false;
            if (filters.tags && filters.tags.length && !filters.tags.some(tag => entry.tags?.includes(tag))) return false;
            if (filters.dateFrom && entry.createdAt < filters.dateFrom) return false;
            if (filters.dateTo && entry.createdAt > filters.dateTo) return false;
            if (filters.hasRetrospective !== undefined && !!entry.retrospective !== filters.hasRetrospective) return false;
            return true;
        });
    }, [entries]);

    // 统计分析
    const stats = useMemo(() => {
        const total = entries.length;
        const withRetrospective = entries.filter(e => e.retrospective).length;

        const emotionCounts = entries.reduce((acc, entry) => {
            acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
            return acc;
        }, {} as Record<TradeEmotion, number>);

        const typeCounts = entries.reduce((acc, entry) => {
            acc[entry.type] = (acc[entry.type] || 0) + 1;
            return acc;
        }, {} as Record<TradeType, number>);

        const retroStats = entries
            .filter(e => e.retrospective)
            .reduce((acc, entry) => {
                const retro = entry.retrospective!;
                if (retro.outcome === 'profit') acc.profits++;
                else if (retro.outcome === 'loss') acc.losses++;
                if (retro.profitLoss) acc.totalPnL += retro.profitLoss;
                if (retro.rating) {
                    acc.totalRating += retro.rating;
                    acc.ratingCount++;
                }
                return acc;
            }, { profits: 0, losses: 0, totalPnL: 0, totalRating: 0, ratingCount: 0 });

        return {
            total,
            withRetrospective,
            emotionCounts,
            typeCounts,
            winRate: retroStats.profits + retroStats.losses > 0
                ? retroStats.profits / (retroStats.profits + retroStats.losses)
                : 0,
            totalPnL: retroStats.totalPnL,
            avgRating: retroStats.ratingCount > 0
                ? retroStats.totalRating / retroStats.ratingCount
                : 0,
        };
    }, [entries]);

    // 导出为 CSV
    const exportToCSV = useCallback(() => {
        const flatEntries = entries.map(entry => ({
            id: entry.id,
            date: entry.createdAt,
            type: entry.type,
            asset: entry.asset,
            assetType: entry.assetType || '',
            price: entry.price || '',
            quantity: entry.quantity || '',
            totalValue: entry.totalValue || '',
            status: entry.status,
            emotion: entry.emotion,
            emotionIntensity: entry.emotionIntensity,
            macroContext: entry.macroContext,
            marketCondition: entry.marketCondition,
            reasoning: entry.reasoning,
            thesis: entry.thesis || '',
            targetPrice: entry.targetPrice || '',
            stopLoss: entry.stopLoss || '',
            timeHorizon: entry.timeHorizon || '',
            tags: entry.tags?.join('; ') || '',
            retrospective_outcome: entry.retrospective?.outcome || '',
            retrospective_pnl: entry.retrospective?.profitLoss || '',
            retrospective_lessons: entry.retrospective?.lessonsLearned || '',
            retrospective_rating: entry.retrospective?.rating || '',
        }));

        const csv = exportAsCSV(flatEntries);
        const filename = `trade-journal-${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(csv, filename, 'text/csv');
    }, [entries]);

    // 导出为 JSON（完整备份）
    const exportToJSON = useCallback(() => {
        const json = JSON.stringify(entries, null, 2);
        const filename = `trade-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
        downloadFile(json, filename, 'application/json');
    }, [entries]);

    // 从 JSON 导入
    const importFromJSON = useCallback((jsonString: string) => {
        try {
            const imported = JSON.parse(jsonString) as TradeEntry[];
            if (!Array.isArray(imported)) throw new Error('Invalid format');

            // 合并，避免重复
            setEntries(prev => {
                const existingIds = new Set(prev.map(e => e.id));
                const newEntries = imported.filter(e => !existingIds.has(e.id));
                return [...newEntries, ...prev].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            });

            return { success: true, count: imported.length };
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, error: String(error) };
        }
    }, [setEntries]);

    return {
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        addRetrospective,
        filterEntries,
        stats,
        exportToCSV,
        exportToJSON,
        importFromJSON,
        clearAll,
    };
}

// 辅助函数：生成唯一ID
export function generateTradeId(): string {
    return `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
