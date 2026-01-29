/**
 * 数据缺口诊断脚本
 * 区分正常休市（周末/节假日）vs 异常缺失
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { format, parseISO, isWeekend, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 美国联邦假日（简化版，主要影响金融数据）
const US_MARKET_HOLIDAYS_2015_2026 = [
    // 2015
    '2015-01-01', '2015-01-19', '2015-02-16', '2015-04-03', '2015-05-25', '2015-07-03', '2015-09-07', '2015-10-12', '2015-11-11', '2015-11-26', '2015-12-25',
    // 2016
    '2016-01-01', '2016-01-18', '2016-02-15', '2016-03-25', '2016-05-30', '2016-07-04', '2016-09-05', '2016-10-10', '2016-11-11', '2016-11-24', '2016-12-26',
    // 2017
    '2017-01-02', '2017-01-16', '2017-02-20', '2017-04-14', '2017-05-29', '2017-07-04', '2017-09-04', '2017-10-09', '2017-11-10', '2017-11-23', '2017-12-25',
    // 2018
    '2018-01-01', '2018-01-15', '2018-02-19', '2018-03-30', '2018-05-28', '2018-07-04', '2018-09-03', '2018-10-08', '2018-11-12', '2018-11-22', '2018-12-25',
    // 2019
    '2019-01-01', '2019-01-21', '2019-02-18', '2019-04-19', '2019-05-27', '2019-07-04', '2019-09-02', '2019-10-14', '2019-11-11', '2019-11-28', '2019-12-25',
    // 2020
    '2020-01-01', '2020-01-20', '2020-02-17', '2020-04-10', '2020-05-25', '2020-07-03', '2020-09-07', '2020-10-12', '2020-11-11', '2020-11-26', '2020-12-25',
    // 2021
    '2021-01-01', '2021-01-18', '2021-02-15', '2021-04-02', '2021-05-31', '2021-07-05', '2021-09-06', '2021-10-11', '2021-11-11', '2021-11-25', '2021-12-24',
    // 2022
    '2022-01-17', '2022-02-21', '2022-04-15', '2022-05-30', '2022-06-20', '2022-07-04', '2022-09-05', '2022-10-10', '2022-11-11', '2022-11-24', '2022-12-26',
    // 2023
    '2023-01-02', '2023-01-16', '2023-02-20', '2023-04-07', '2023-05-29', '2023-06-19', '2023-07-04', '2023-09-04', '2023-10-09', '2023-11-10', '2023-11-23', '2023-12-25',
    // 2024
    '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02', '2024-10-14', '2024-11-11', '2024-11-28', '2024-12-25',
    // 2025
    '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-10-13', '2025-11-11', '2025-11-27', '2025-12-25',
    // 2026
    '2026-01-01', '2026-01-19', '2026-02-16',
];

const holidaySet = new Set(US_MARKET_HOLIDAYS_2015_2026);

interface IndicatorConfig {
    series_id: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    name: string;
    publicationDay?: number; // 周几发布（0=周日，4=周四）
}

const INDICATORS: IndicatorConfig[] = [
    { series_id: 'SOFR', frequency: 'daily', name: 'Secured Overnight Financing Rate' },
    { series_id: 'DGS2', frequency: 'daily', name: '2-Year Treasury Rate' },
    { series_id: 'DGS10', frequency: 'daily', name: '10-Year Treasury Rate' },
    { series_id: 'TEDRATE', frequency: 'daily', name: 'TED Spread' },
    { series_id: 'MORTGAGE30US', frequency: 'weekly', name: '30-Year Mortgage Rate', publicationDay: 4 }, // 周四发布
    { series_id: 'CPIAUCSL', frequency: 'monthly', name: 'Consumer Price Index' },
    { series_id: 'UNRATE', frequency: 'monthly', name: 'Unemployment Rate' },
    { series_id: 'PPIACO', frequency: 'monthly', name: 'Producer Price Index' },
    { series_id: 'IMPGS', frequency: 'quarterly', name: 'Imports of Goods and Services' }, // 修正：FRED API只返回季度数据
    { series_id: 'EXPGSC1', frequency: 'quarterly', name: 'Exports of Goods and Services' }, // 修正：FRED API只返回季度数据
    { series_id: 'INDPRO', frequency: 'monthly', name: 'Industrial Production' },
    { series_id: 'PCEC1', frequency: 'monthly', name: 'Personal Consumption Expenditures' },
    { series_id: 'GDPC1', frequency: 'quarterly', name: 'Real Gross Domestic Product' },
    { series_id: 'USREC', frequency: 'monthly', name: 'US Recession Indicator' }, // 修正：FRED API只返回每月数据
];

function isMarketHoliday(date: Date): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidaySet.has(dateStr);
}

function isTradingDay(date: Date): boolean {
    // 周末
    if (isWeekend(date)) return false;
    // 假日
    if (isMarketHoliday(date)) return false;
    return true;
}

async function getExistingData(seriesId: string) {
    // 使用分页查询获取所有数据，避免1000行限制
    let allData: { date: string; value: number }[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('economic_data')
            .select('date, value')
            .eq('series_id', seriesId)
            .order('date', { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) {
            console.error(`❌ 查询 ${seriesId} 失败:`, error.message);
            return [];
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    return allData;
}

function analyzeDailyGaps(records: { date: string; value: number }[], seriesId: string) {
    if (records.length < 2) return { normalGaps: [], abnormalGaps: [], totalExpected: 0, totalActual: records.length };

    const existingDates = new Set(records.map(r => r.date));
    const startDate = parseISO(records[0].date);
    const endDate = parseISO(records[records.length - 1].date);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const normalGaps: { start: string; end: string; reason: string; days: number }[] = [];
    const abnormalGaps: { start: string; end: string; reason: string; days: number }[] = [];

    let currentGap: { start: Date; end: Date; dates: Date[] } | null = null;

    for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const hasData = existingDates.has(dateStr);
        const isTradeDay = isTradingDay(day);

        if (!hasData) {
            if (!currentGap) {
                currentGap = { start: day, end: day, dates: [day] };
            } else {
                currentGap.end = day;
                currentGap.dates.push(day);
            }
        } else {
            if (currentGap) {
                // 结束一个缺口
                const gapStart = format(currentGap.start, 'yyyy-MM-dd');
                const gapEnd = format(currentGap.end, 'yyyy-MM-dd');
                const gapDays = differenceInDays(currentGap.end, currentGap.start) + 1;

                // 判断缺口类型
                const tradeDaysInGap = currentGap.dates.filter(d => isTradingDay(d)).length;

                if (tradeDaysInGap === 0) {
                    // 全是周末/假日
                    normalGaps.push({
                        start: gapStart,
                        end: gapEnd,
                        reason: '周末/假日',
                        days: gapDays
                    });
                } else {
                    // 包含交易日但没有数据
                    abnormalGaps.push({
                        start: gapStart,
                        end: gapEnd,
                        reason: `缺失 ${tradeDaysInGap} 个交易日数据`,
                        days: gapDays
                    });
                }
                currentGap = null;
            }
        }
    }

    // 处理最后一个缺口
    if (currentGap) {
        const gapStart = format(currentGap.start, 'yyyy-MM-dd');
        const gapEnd = format(currentGap.end, 'yyyy-MM-dd');
        const gapDays = differenceInDays(currentGap.end, currentGap.start) + 1;
        const tradeDaysInGap = currentGap.dates.filter(d => isTradingDay(d)).length;

        if (tradeDaysInGap === 0) {
            normalGaps.push({ start: gapStart, end: gapEnd, reason: '周末/假日', days: gapDays });
        } else {
            abnormalGaps.push({ start: gapStart, end: gapEnd, reason: `缺失 ${tradeDaysInGap} 个交易日数据`, days: gapDays });
        }
    }

    const expectedTradingDays = allDays.filter(d => isTradingDay(d)).length;

    return {
        normalGaps,
        abnormalGaps,
        totalExpected: expectedTradingDays,
        totalActual: records.length,
        coverage: ((records.length / expectedTradingDays) * 100).toFixed(1)
    };
}

function analyzeMonthlyGaps(records: { date: string; value: number }[], seriesId: string) {
    if (records.length < 2) return { normalGaps: [], abnormalGaps: [], totalExpected: 0, totalActual: records.length };

    // 月度数据：每月应该有一条
    const existingMonths = new Set(records.map(r => r.date.substring(0, 7))); // YYYY-MM
    const startDate = parseISO(records[0].date);
    const endDate = parseISO(records[records.length - 1].date);

    const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();

    const abnormalGaps: { start: string; end: string; reason: string; days: number }[] = [];

    for (let m = startMonth; m <= endMonth; m++) {
        const year = Math.floor(m / 12);
        const month = m % 12;
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

        if (!existingMonths.has(monthStr)) {
            // 检查是否是未来月份
            const now = new Date();
            const currentMonth = now.getFullYear() * 12 + now.getMonth();

            if (m < currentMonth) {
                // 过去的月份缺失
                abnormalGaps.push({
                    start: `${monthStr}-01`,
                    end: `${monthStr}-${new Date(year, month + 1, 0).getDate()}`,
                    reason: '整月数据缺失',
                    days: 1
                });
            }
        }
    }

    return {
        normalGaps: [],
        abnormalGaps,
        totalExpected: endMonth - startMonth + 1,
        totalActual: records.length,
        coverage: ((records.length / (endMonth - startMonth + 1)) * 100).toFixed(1)
    };
}

function analyzeQuarterlyGaps(records: { date: string; value: number }[], seriesId: string) {
    if (records.length < 2) return { normalGaps: [], abnormalGaps: [], totalExpected: 0, totalActual: records.length };

    const existingQuarters = new Set(records.map(r => {
        const date = parseISO(r.date);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
    }));

    const startDate = parseISO(records[0].date);
    const endDate = parseISO(records[records.length - 1].date);

    const startQ = startDate.getFullYear() * 4 + Math.floor(startDate.getMonth() / 3);
    const endQ = endDate.getFullYear() * 4 + Math.floor(endDate.getMonth() / 3);

    const abnormalGaps: { start: string; end: string; reason: string; days: number }[] = [];

    for (let q = startQ; q <= endQ; q++) {
        const year = Math.floor(q / 4);
        const quarter = (q % 4) + 1;
        const qStr = `${year}-Q${quarter}`;

        if (!existingQuarters.has(qStr)) {
            const now = new Date();
            const currentQ = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);

            if (q < currentQ) {
                abnormalGaps.push({
                    start: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`,
                    end: `${year}-${String(quarter * 3).padStart(2, '0')}-${new Date(year, quarter * 3, 0).getDate()}`,
                    reason: '整季度数据缺失',
                    days: 1
                });
            }
        }
    }

    return {
        normalGaps: [],
        abnormalGaps,
        totalExpected: endQ - startQ + 1,
        totalActual: records.length,
        coverage: ((records.length / (endQ - startQ + 1)) * 100).toFixed(1)
    };
}

function analyzeWeeklyGaps(records: { date: string; value: number }[], seriesId: string, publicationDay: number = 4) {
    if (records.length < 2) return { normalGaps: [], abnormalGaps: [], totalExpected: 0, totalActual: records.length };

    const existingDates = new Set(records.map(r => r.date));
    const startDate = parseISO(records[0].date);
    const endDate = parseISO(records[records.length - 1].date);

    // 计算期望的周数
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const expectedWeeks = Math.ceil(totalDays / 7);

    const abnormalGaps: { start: string; end: string; reason: string; days: number }[] = [];

    // 检查每周的发布日
    let currentDate = new Date(startDate);
    let weekCount = 0;

    while (currentDate <= endDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = currentDate.getDay();

        // 检查是否是发布日（周四）
        if (dayOfWeek === publicationDay) {
            weekCount++;
            if (!existingDates.has(dateStr)) {
                // 检查是否是未来日期
                const now = new Date();
                if (currentDate < now) {
                    abnormalGaps.push({
                        start: dateStr,
                        end: dateStr,
                        reason: '周数据缺失',
                        days: 1
                    });
                }
            }
        }

        // 移动到下一周
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return {
        normalGaps: [],
        abnormalGaps,
        totalExpected: weekCount,
        totalActual: records.length,
        coverage: ((records.length / weekCount) * 100).toFixed(1)
    };
}

async function diagnoseIndicator(config: IndicatorConfig) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${config.series_id} - ${config.name}`);
    console.log(`${'='.repeat(80)}`);

    const records = await getExistingData(config.series_id);

    if (records.length === 0) {
        console.log('❌ 无数据');
        return { seriesId: config.series_id, hasAbnormal: true, abnormalCount: 0 };
    }

    console.log(`💾 数据库记录数: ${records.length}`);
    console.log(`📅 数据范围: ${records[0].date} 至 ${records[records.length - 1].date}`);

    let result;
    switch (config.frequency) {
        case 'daily':
            result = analyzeDailyGaps(records, config.series_id);
            break;
        case 'weekly':
            // 使用专门的每周数据分析函数
            result = analyzeWeeklyGaps(records, config.series_id, config.publicationDay || 4);
            break;
        case 'monthly':
            result = analyzeMonthlyGaps(records, config.series_id);
            break;
        case 'quarterly':
            result = analyzeQuarterlyGaps(records, config.series_id);
            break;
        default:
            result = { normalGaps: [], abnormalGaps: [], totalExpected: 0, totalActual: records.length, coverage: '0' };
    }

    console.log(`\n📈 数据覆盖:`);
    console.log(`   期望记录数: ${result.totalExpected}`);
    console.log(`   实际记录数: ${result.totalActual}`);
    console.log(`   覆盖率: ${result.coverage}%`);

    if (result.normalGaps.length > 0) {
        console.log(`\n✅ 正常休市缺口: ${result.normalGaps.length} 个（周末/假日）`);
        if (result.normalGaps.length <= 5) {
            result.normalGaps.forEach(gap => {
                console.log(`   • ${gap.start} 至 ${gap.end} (${gap.days}天) - ${gap.reason}`);
            });
        } else {
            console.log(`   （仅显示前5个）`);
            result.normalGaps.slice(0, 5).forEach(gap => {
                console.log(`   • ${gap.start} 至 ${gap.end} (${gap.days}天) - ${gap.reason}`);
            });
        }
    }

    if (result.abnormalGaps.length > 0) {
        console.log(`\n⚠️  异常缺失缺口: ${result.abnormalGaps.length} 个`);
        result.abnormalGaps.forEach(gap => {
            console.log(`   🔴 ${gap.start} 至 ${gap.end} - ${gap.reason}`);
        });
    } else {
        console.log(`\n✅ 无异常缺失`);
    }

    return {
        seriesId: config.series_id,
        hasAbnormal: result.abnormalGaps.length > 0,
        abnormalCount: result.abnormalGaps.length,
        abnormalGaps: result.abnormalGaps
    };
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    数据缺口深度诊断报告                                      ║');
    console.log('║         区分正常休市（周末/假日）vs 异常缺失                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    const results = [];

    for (const indicator of INDICATORS) {
        const result = await diagnoseIndicator(indicator);
        results.push(result);
    }

    // 汇总报告
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 诊断汇总报告');
    console.log('='.repeat(80));

    const abnormalIndicators = results.filter(r => r.hasAbnormal);

    console.log(`\n✅ 数据完整指标: ${results.length - abnormalIndicators.length}/${results.length}`);
    console.log(`⚠️  存在异常缺口: ${abnormalIndicators.length}/${results.length}`);

    if (abnormalIndicators.length > 0) {
        console.log('\n🔴 需要修复的指标:');
        abnormalIndicators.forEach(r => {
            console.log(`   • ${r.seriesId}: ${r.abnormalCount} 个异常缺口`);
            r.abnormalGaps?.forEach((gap: { start: string; end: string; reason: string }) => {
                console.log(`     - ${gap.start} 至 ${gap.end}: ${gap.reason}`);
            });
        });
    } else {
        console.log('\n🎉 所有指标数据完整，无异常缺失！');
    }

    console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
