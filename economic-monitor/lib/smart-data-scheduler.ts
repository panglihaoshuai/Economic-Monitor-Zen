// Smart Data Scheduler with Publication Detection
// 智能数据调度系统 - 支持指标发布检测和按需更新
//
// 核心功能：
// 1. 指标发布检测 - 监控FRED API数据更新
// 2. 按需更新调度 - 数据发布后立即采集
// 3. 缺失数据检测 - 全面的数据缺口分析
// 4. 修复建议引擎 - 自动化的修复方案生成

import { FREDSeriesInfo, INDICATORS, getAllIndicators } from './fred';
import type { Database } from './database.types';

// ========== 类型定义 ==========

export type DataFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface PublicationSchedule {
    seriesId: string;
    typicalReleaseDay: number; // 每月/每周的第几天发布（1-31）
    typicalReleaseTime: string; // 发布时间（HH:MM，UTC）
    releaseLagDays: number; // 数据发布后延迟多少天可用
    lastKnownPublication: string | null; // 上次已知发布日期
    nextExpectedPublication: string | null; // 下次预期发布日期
}

export interface DataGap {
    seriesId: string;
    seriesName: string;
    frequency: DataFrequency;
    gapStart: string;
    gapEnd: string;
    gapDays: number;
    expectedPoints: number;
    actualPoints: number;
    missingPoints: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediationSuggestion: string;
}

export interface GapAnalysisReport {
    generatedAt: string;
    totalIndicators: number;
    indicatorsWithGaps: number;
    totalGaps: number;
    criticalGaps: number;
    highGaps: number;
    mediumGaps: number;
    lowGaps: number;
    gapsByFrequency: Record<DataFrequency, DataGap[]>;
    remediationPlan: RemediationAction[];
}

export interface RemediationAction {
    priority: number;
    seriesId: string;
    action: 'immediate_fetch' | 'scheduled_fetch' | 'backfill' | 'manual_review';
    description: string;
    estimatedRecords: number;
    timeRange: { start: string; end: string };
}

export interface PublicationCheckResult {
    seriesId: string;
    hasNewData: boolean;
    lastLocalDate: string | null;
    lastRemoteDate: string | null;
    newDataPoints: number;
    shouldFetch: boolean;
    priority: 'high' | 'normal' | 'low';
}

// ========== 指标发布时间表配置 ==========

export const PUBLICATION_SCHEDULES: Record<string, PublicationSchedule> = {
    // 日度指标 - 通常下一个工作日发布
    SOFR: {
        seriesId: 'SOFR',
        typicalReleaseDay: 1, // 每日
        typicalReleaseTime: '16:00', // 美东时间下午4点（UTC 21:00）
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    DGS2: {
        seriesId: 'DGS2',
        typicalReleaseDay: 1,
        typicalReleaseTime: '16:00',
        releaseLagDays: 0, // 实时数据
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    DGS10: {
        seriesId: 'DGS10',
        typicalReleaseDay: 1,
        typicalReleaseTime: '16:00',
        releaseLagDays: 0,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    TEDRATE: {
        seriesId: 'TEDRATE',
        typicalReleaseDay: 1,
        typicalReleaseTime: '16:00',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },

    // 周度指标
    MORTGAGE30US: {
        seriesId: 'MORTGAGE30US',
        typicalReleaseDay: 4, // 周四
        typicalReleaseTime: '14:00',
        releaseLagDays: 0,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },

    // 月度指标
    UNRATE: {
        seriesId: 'UNRATE',
        typicalReleaseDay: 1, // 每月第一个周五
        typicalReleaseTime: '12:30',
        releaseLagDays: 0,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    PCEPI: {
        seriesId: 'PCEPI',
        typicalReleaseDay: 15, // 月中
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    PCE: {
        seriesId: 'PCE',
        typicalReleaseDay: 15,
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    RSAFS: {
        seriesId: 'RSAFS',
        typicalReleaseDay: 15,
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    HOUST: {
        seriesId: 'HOUST',
        typicalReleaseDay: 17,
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    CSUSHPISA: {
        seriesId: 'CSUSHPISA',
        typicalReleaseDay: 25, // 月末
        typicalReleaseTime: '13:00',
        releaseLagDays: 2,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    BOPGSTB: {
        seriesId: 'BOPGSTB',
        typicalReleaseDay: 5,
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
    IMPGS: {
        seriesId: 'IMPGS',
        typicalReleaseDay: 5,
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },

    // 季度指标
    GDPC1: {
        seriesId: 'GDPC1',
        typicalReleaseDay: 30, // 季度末后约30天
        typicalReleaseTime: '12:30',
        releaseLagDays: 1,
        lastKnownPublication: null,
        nextExpectedPublication: null,
    },
};

// ========== 智能发布检测 ==========

/**
 * 检查指标是否有新数据发布
 * 通过比较本地最新数据和FRED API的最新数据日期
 */
export async function checkPublicationStatus(
    supabase: any,
    apiKey: string,
    seriesId: string
): Promise<PublicationCheckResult> {
    // 获取本地最新数据日期
    const { data: localData } = await supabase
        .from('economic_data')
        .select('date')
        .eq('series_id', seriesId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    const lastLocalDate = localData?.date || null;

    try {
        // 查询FRED API获取最新数据
        const url = 'https://api.stlouisfed.org/fred/series/observations';
        const params = new URLSearchParams({
            series_id: seriesId,
            api_key: apiKey,
            sort_order: 'desc',
            limit: '1',
            file_type: 'json',
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status}`);
        }

        const remoteData = await response.json();
        const lastRemoteDate = remoteData.observations?.[0]?.date || null;

        // 判断是否有新数据
        let hasNewData = false;
        let newDataPoints = 0;

        if (lastRemoteDate && lastLocalDate) {
            const remoteDate = new Date(lastRemoteDate);
            const localDate = new Date(lastLocalDate);
            hasNewData = remoteDate > localDate;

            // 估算新数据点数
            if (hasNewData) {
                const diffTime = remoteDate.getTime() - localDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                newDataPoints = estimateDataPoints(seriesId, diffDays);
            }
        } else if (lastRemoteDate && !lastLocalDate) {
            hasNewData = true;
            newDataPoints = 10; // 默认值
        }

        // 确定优先级
        const priority = determineFetchPriority(seriesId, hasNewData, newDataPoints);

        return {
            seriesId,
            hasNewData,
            lastLocalDate,
            lastRemoteDate,
            newDataPoints,
            shouldFetch: hasNewData,
            priority,
        };
    } catch (error) {
        console.error(`[Publication Check] Error checking ${seriesId}:`, error);
        return {
            seriesId,
            hasNewData: false,
            lastLocalDate,
            lastRemoteDate: null,
            newDataPoints: 0,
            shouldFetch: false,
            priority: 'low',
        };
    }
}

/**
 * 批量检查所有指标的发布状态
 */
export async function checkAllPublications(
    supabase: any,
    apiKey: string,
    seriesIds?: string[]
): Promise<PublicationCheckResult[]> {
    const indicators = seriesIds || Object.keys(INDICATORS);
    const results: PublicationCheckResult[] = [];

    // 串行检查以避免API限流
    for (const seriesId of indicators) {
        const result = await checkPublicationStatus(supabase, apiKey, seriesId);
        results.push(result);

        // 限速：每秒最多10次检查
        await sleep(100);
    }

    return results;
}

// ========== 按需更新调度器 ==========

/**
 * 智能调度配置
 */
export interface SmartScheduleConfig {
    enableRealtime: boolean; // 启用实时检测
    checkIntervalMinutes: number; // 检测间隔（分钟）
    batchSize: number; // 每批处理的指标数
    priorityFetchThreshold: number; // 优先获取阈值（新数据点数）
}

const DEFAULT_SMART_CONFIG: SmartScheduleConfig = {
    enableRealtime: true,
    checkIntervalMinutes: 60,
    batchSize: 5,
    priorityFetchThreshold: 5,
};

/**
 * 执行按需更新
 * 只获取有更新的指标数据
 */
export async function executeOnDemandUpdate(
    supabase: any,
    apiKey: string,
    config: Partial<SmartScheduleConfig> = {}
): Promise<{
    updated: string[];
    skipped: string[];
    failed: string[];
    totalNewRecords: number;
}> {
    const fullConfig = { ...DEFAULT_SMART_CONFIG, ...config };

    // 检查所有指标的发布状态
    const checkResults = await checkAllPublications(supabase, apiKey);

    // 筛选需要更新的指标
    const toUpdate = checkResults.filter(r => r.shouldFetch);
    const toSkip = checkResults.filter(r => !r.shouldFetch);

    // 按优先级排序
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    toUpdate.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const updated: string[] = [];
    const failed: string[] = [];
    let totalNewRecords = 0;

    // 分批处理更新
    for (let i = 0; i < toUpdate.length; i += fullConfig.batchSize) {
        const batch = toUpdate.slice(i, i + fullConfig.batchSize);

        await Promise.all(
            batch.map(async (item) => {
                try {
                    const result = await fetchAndUpdateIndicator(
                        supabase,
                        apiKey,
                        item.seriesId,
                        item.lastLocalDate
                    );

                    if (result.success) {
                        updated.push(item.seriesId);
                        totalNewRecords += result.recordsInserted;
                    } else {
                        failed.push(item.seriesId);
                    }
                } catch (error) {
                    console.error(`[OnDemand Update] Failed to update ${item.seriesId}:`, error);
                    failed.push(item.seriesId);
                }
            })
        );

        // 批次间延迟
        if (i + fullConfig.batchSize < toUpdate.length) {
            await sleep(1000);
        }
    }

    return {
        updated,
        skipped: toSkip.map(s => s.seriesId),
        failed,
        totalNewRecords,
    };
}

/**
 * 获取并更新单个指标数据
 */
async function fetchAndUpdateIndicator(
    supabase: any,
    apiKey: string,
    seriesId: string,
    lastLocalDate: string | null
): Promise<{ success: boolean; recordsInserted: number }> {
    const startDate = lastLocalDate
        ? new Date(lastLocalDate)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 默认1年

    // 向前推一天以确保覆盖
    startDate.setDate(startDate.getDate() - 1);

    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: apiKey,
        observation_start: startDate.toISOString().split('T')[0],
        file_type: 'json',
        limit: '10000',
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    // 过滤并转换数据
    const records = data.observations
        .filter((obs: { value: string; date: string }) => {
            // 排除无效值
            if (!obs.value || obs.value === '.' || obs.value === '-') return false;
            // 排除已存在的数据
            if (lastLocalDate && obs.date <= lastLocalDate) return false;
            return true;
        })
        .map((obs: { date: string; value: string }) => ({
            series_id: seriesId,
            date: obs.date,
            value: parseFloat(obs.value),
            vintage_date: new Date().toISOString().split('T')[0],
        }));

    if (records.length === 0) {
        return { success: true, recordsInserted: 0 };
    }

    // 批量插入
    const { error } = await supabase
        .from('economic_data')
        .upsert(records, { onConflict: 'series_id,date' });

    if (error) {
        throw new Error(`Insert error: ${error.message}`);
    }

    return { success: true, recordsInserted: records.length };
}

// ========== 缺失数据检测服务 ==========

/**
 * 执行全面的数据缺口分析
 */
export async function analyzeDataGaps(
    supabase: any,
    options: {
        checkRangeDays?: number;
        minGapDays?: number;
        seriesIds?: string[];
    } = {}
): Promise<GapAnalysisReport> {
    const {
        checkRangeDays = 365 * 2, // 默认检查2年
        minGapDays = 7,
        seriesIds,
    } = options;

    const indicators = seriesIds
        ? seriesIds.map(id => INDICATORS[id]).filter(Boolean).map(info => ({ ...info }))
        : getAllIndicators().map(info => ({ ...info }));

    const gaps: DataGap[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - checkRangeDays);

    for (const indicator of indicators) {
        // 获取该指标在时间范围内的所有数据
        const { data: existingData } = await supabase
            .from('economic_data')
            .select('date')
            .eq('series_id', indicator.id)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        const frequency = getFrequency(indicator.id);
        const indicatorGaps = detectGapsForIndicator(
            indicator.id,
            indicator.title || indicator.id,
            frequency,
            existingData?.map((d: { date: string }) => d.date) || [],
            startDate,
            endDate,
            minGapDays
        );

        gaps.push(...indicatorGaps);
    }

    // 生成修复计划
    const remediationPlan = generateRemediationPlan(gaps);

    // 按严重程度统计
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const highGaps = gaps.filter(g => g.severity === 'high').length;
    const mediumGaps = gaps.filter(g => g.severity === 'medium').length;
    const lowGaps = gaps.filter(g => g.severity === 'low').length;

    // 按频率分组
    const gapsByFrequency: Record<DataFrequency, DataGap[]> = {
        daily: gaps.filter(g => g.frequency === 'daily'),
        weekly: gaps.filter(g => g.frequency === 'weekly'),
        monthly: gaps.filter(g => g.frequency === 'monthly'),
        quarterly: gaps.filter(g => g.frequency === 'quarterly'),
    };

    return {
        generatedAt: new Date().toISOString(),
        totalIndicators: indicators.length,
        indicatorsWithGaps: new Set(gaps.map(g => g.seriesId)).size,
        totalGaps: gaps.length,
        criticalGaps,
        highGaps,
        mediumGaps,
        lowGaps,
        gapsByFrequency,
        remediationPlan,
    };
}

/**
 * 检测单个指标的数据缺口
 */
function detectGapsForIndicator(
    seriesId: string,
    seriesName: string,
    frequency: DataFrequency,
    existingDates: string[],
    startDate: Date,
    endDate: Date,
    minGapDays: number
): DataGap[] {
    const gaps: DataGap[] = [];
    const existingSet = new Set(existingDates);

    // 生成预期日期序列
    const expectedDates = generateExpectedDates(startDate, endDate, frequency);

    // 找出缺失的日期
    let gapStart: string | null = null;
    let missingCount = 0;

    for (const date of expectedDates) {
        if (!existingSet.has(date)) {
            if (!gapStart) {
                gapStart = date;
            }
            missingCount++;
        } else {
            // 发现缺口结束
            if (gapStart && missingCount > 0) {
                const gapEnd = date;
                const gapDays = calculateDaysBetween(gapStart, gapEnd);

                if (gapDays >= minGapDays) {
                    const severity = determineGapSeverity(frequency, gapDays, missingCount);
                    gaps.push({
                        seriesId,
                        seriesName,
                        frequency,
                        gapStart,
                        gapEnd,
                        gapDays,
                        expectedPoints: calculateExpectedPoints(frequency, gapStart, gapEnd),
                        actualPoints: calculateExpectedPoints(frequency, gapStart, gapEnd) - missingCount,
                        missingPoints: missingCount,
                        severity,
                        remediationSuggestion: generateRemediationSuggestion(seriesId, frequency, gapDays, missingCount),
                    });
                }

                gapStart = null;
                missingCount = 0;
            }
        }
    }

    // 处理末尾的缺口
    if (gapStart && missingCount > 0) {
        const gapEnd = expectedDates[expectedDates.length - 1];
        const gapDays = calculateDaysBetween(gapStart, gapEnd);

        if (gapDays >= minGapDays) {
            const severity = determineGapSeverity(frequency, gapDays, missingCount);
            gaps.push({
                seriesId,
                seriesName,
                frequency,
                gapStart,
                gapEnd,
                gapDays,
                expectedPoints: calculateExpectedPoints(frequency, gapStart, gapEnd),
                actualPoints: calculateExpectedPoints(frequency, gapStart, gapEnd) - missingCount,
                missingPoints: missingCount,
                severity,
                remediationSuggestion: generateRemediationSuggestion(seriesId, frequency, gapDays, missingCount),
            });
        }
    }

    return gaps;
}

// ========== 修复建议引擎 ==========

function generateRemediationPlan(gaps: DataGap[]): RemediationAction[] {
    const actions: RemediationAction[] = [];

    // 按严重程度排序
    const sortedGaps = [...gaps].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    for (let i = 0; i < sortedGaps.length; i++) {
        const gap = sortedGaps[i];
        let action: RemediationAction['action'];
        let description: string;

        // 根据缺口特征决定修复策略
        if (gap.severity === 'critical') {
            action = 'immediate_fetch';
            description = `立即获取 ${gap.seriesId} 的缺失数据（${gap.missingPoints} 个数据点）`;
        } else if (gap.severity === 'high' && gap.gapDays > 30) {
            action = 'backfill';
            description = `回溯填充 ${gap.seriesId} 的历史数据缺口`;
        } else if (gap.frequency === 'daily' && gap.gapDays <= 7) {
            action = 'scheduled_fetch';
            description = `在下次调度时获取 ${gap.seriesId} 的最新数据`;
        } else {
            action = 'manual_review';
            description = `人工审核 ${gap.seriesId} 的数据缺口（可能是数据源问题）`;
        }

        actions.push({
            priority: i + 1,
            seriesId: gap.seriesId,
            action,
            description,
            estimatedRecords: gap.missingPoints,
            timeRange: { start: gap.gapStart, end: gap.gapEnd },
        });
    }

    return actions;
}

function generateRemediationSuggestion(
    seriesId: string,
    frequency: DataFrequency,
    gapDays: number,
    missingPoints: number
): string {
    const suggestions: string[] = [];

    if (gapDays > 90) {
        suggestions.push('建议使用全量同步模式重新获取数据');
    } else if (gapDays > 30) {
        suggestions.push('建议使用回溯填充模式获取历史数据');
    } else {
        suggestions.push('建议在下次调度时自动获取最新数据');
    }

    if (frequency === 'daily' && missingPoints > 20) {
        suggestions.push('日度数据缺口较大，可能是数据源中断');
    }

    if (missingPoints === 0) {
        suggestions.push('该时间段内无预期数据点，可能是正常的数据稀疏');
    }

    return suggestions.join('；');
}

// ========== 辅助函数 ==========

function getFrequency(seriesId: string): DataFrequency {
    const info = INDICATORS[seriesId];
    if (!info) return 'daily';

    const freq = info.frequency.toLowerCase();
    if (freq.includes('quarter')) return 'quarterly';
    if (freq.includes('week')) return 'weekly';
    if (freq.includes('month')) return 'monthly';
    return 'daily';
}

function generateExpectedDates(
    startDate: Date,
    endDate: Date,
    frequency: DataFrequency
): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);

        switch (frequency) {
            case 'daily':
                current.setDate(current.getDate() + 1);
                break;
            case 'weekly':
                current.setDate(current.getDate() + 7);
                break;
            case 'monthly':
                current.setMonth(current.getMonth() + 1);
                break;
            case 'quarterly':
                current.setMonth(current.getMonth() + 3);
                break;
        }
    }

    return dates;
}

function calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateExpectedPoints(
    frequency: DataFrequency,
    start: string,
    end: string
): number {
    const days = calculateDaysBetween(start, end);
    switch (frequency) {
        case 'daily': return days;
        case 'weekly': return Math.floor(days / 7);
        case 'monthly': return Math.floor(days / 30);
        case 'quarterly': return Math.floor(days / 90);
        default: return days;
    }
}

function determineGapSeverity(
    frequency: DataFrequency,
    gapDays: number,
    missingPoints: number
): 'low' | 'medium' | 'high' | 'critical' {
    // 根据频率和缺口大小确定严重程度
    const thresholds = {
        daily: { critical: 30, high: 14, medium: 7 },
        weekly: { critical: 60, high: 30, medium: 14 },
        monthly: { critical: 120, high: 90, medium: 60 },
        quarterly: { critical: 365, high: 270, medium: 180 },
    };

    const t = thresholds[frequency];
    if (gapDays >= t.critical || missingPoints > 50) return 'critical';
    if (gapDays >= t.high || missingPoints > 20) return 'high';
    if (gapDays >= t.medium || missingPoints > 5) return 'medium';
    return 'low';
}

function estimateDataPoints(seriesId: string, days: number): number {
    const frequency = getFrequency(seriesId);
    switch (frequency) {
        case 'daily': return days;
        case 'weekly': return Math.floor(days / 7);
        case 'monthly': return Math.floor(days / 30);
        case 'quarterly': return Math.floor(days / 90);
        default: return days;
    }
}

function determineFetchPriority(
    seriesId: string,
    hasNewData: boolean,
    newDataPoints: number
): 'high' | 'normal' | 'low' {
    if (!hasNewData) return 'low';
    if (newDataPoints > 10) return 'high';
    if (newDataPoints > 3) return 'normal';
    return 'low';
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 导出 ==========

export {
    getFrequency,
    generateExpectedDates,
    calculateDaysBetween,
    sleep,
};
