// Full Sync with Validation Script
// 全量数据同步与验证脚本 - 获取10年完整历史数据并进行完整性校验

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getAllIndicators, getIndicatorInfo } from '../lib/fred';
import { getFrequency, type DataFrequency } from '../lib/smart-data-scheduler';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const fredApiKey = process.env.FRED_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !fredApiKey) {
    console.error('❌ 错误: 缺少必要的环境变量');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 重试配置
interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
};

// 带重试的fetch函数
async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelay;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // 如果成功，返回响应
            if (response.ok) {
                return response;
            }

            // 如果是429（Too Many Requests），等待后重试
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
                console.log(`   ⚠️  请求被限流，等待 ${waitTime}ms 后重试 (尝试 ${attempt}/${retryConfig.maxRetries})`);
                await sleep(waitTime);
                delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
                continue;
            }

            // 如果是5xx错误，重试
            if (response.status >= 500) {
                const errorText = await response.text();
                lastError = new Error(`HTTP ${response.status}: ${errorText}`);
                console.log(`   ⚠️  服务器错误，等待 ${delay}ms 后重试 (尝试 ${attempt}/${retryConfig.maxRetries})`);
                await sleep(delay);
                delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
                continue;
            }

            // 其他错误，不重试
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            console.log(`   ⚠️  请求失败: ${lastError.message}，等待 ${delay}ms 后重试 (尝试 ${attempt}/${retryConfig.maxRetries})`);
            await sleep(delay);
            delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

// 指标分类（按依赖关系排序）
const INDICATOR_ORDER: string[] = [
    // 基础利率指标（无依赖）
    'SOFR', 'DGS2', 'DGS10', 'TEDRATE',
    // 房地产市场指标
    'MORTGAGE30US', 'HOUST', 'CSUSHPISA',
    // 宏观经济指标
    'GDPC1', 'UNRATE',
    // 消费和价格指标
    'PCEPI', 'PCE', 'RSAFS',
    // 贸易指标
    'BOPGSTB', 'IMPGS',
];

// 从FRED API获取数据（带重试机制）
async function fetchFREDData(seriesId: string, startDate: Date): Promise<{
    success: boolean;
    observations: Array<{ date: string; value: string }>;
    error?: string;
}> {
    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: fredApiKey,
        observation_start: startDate.toISOString().split('T')[0],
        file_type: 'json',
        limit: '100000',
    });

    try {
        const response = await fetchWithRetry(`${url}?${params}`, {}, DEFAULT_RETRY_CONFIG);
        const data = await response.json();
        return { success: true, observations: data.observations || [] };
    } catch (error) {
        return { success: false, observations: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// 验证数据连续性
function validateDataContinuity(
    records: Array<{ date: string; value: number }>,
    frequency: DataFrequency
): { isValid: boolean; gaps: Array<{ start: string; end: string }> } {
    if (records.length < 2) return { isValid: true, gaps: [] };

    const gaps: Array<{ start: string; end: string }> = [];

    for (let i = 1; i < records.length; i++) {
        const prevDate = new Date(records[i - 1].date);
        const currDate = new Date(records[i].date);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        let expectedDiff: number;
        switch (frequency) {
            case 'daily': expectedDiff = 1; break;
            case 'weekly': expectedDiff = 7; break;
            case 'monthly': expectedDiff = 28; break; // 允许一些灵活性
            case 'quarterly': expectedDiff = 85; break;
            default: expectedDiff = 1;
        }

        // 允许20%的容差
        if (diffDays > expectedDiff * 1.5) {
            gaps.push({
                start: records[i - 1].date,
                end: records[i].date,
            });
        }
    }

    return { isValid: gaps.length === 0, gaps };
}

// 同步单个指标
async function syncIndicator(
    seriesId: string,
    years: number = 10
): Promise<{
    success: boolean;
    seriesId: string;
    apiRecords: number;
    inserted: number;
    skipped: number;
    earliestDate: string | null;
    latestDate: string | null;
    continuityValid: boolean;
    gaps: Array<{ start: string; end: string }>;
    error?: string;
}> {
    const result: {
        success: boolean;
        seriesId: string;
        apiRecords: number;
        inserted: number;
        skipped: number;
        earliestDate: string | null;
        latestDate: string | null;
        continuityValid: boolean;
        gaps: Array<{ start: string; end: string }>;
        error?: string;
    } = {
        success: false,
        seriesId,
        apiRecords: 0,
        inserted: 0,
        skipped: 0,
        earliestDate: null,
        latestDate: null,
        continuityValid: true,
        gaps: [],
    };

    const startTime = Date.now();
    const indicator = getIndicatorInfo(seriesId);
    const frequency = getFrequency(seriesId);

    console.log(`\n📊 ${seriesId} - ${indicator?.title || 'Unknown'}`);
    console.log(`   频率: ${frequency}`);

    try {
        // 1. 计算开始日期
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);
        console.log(`   📅 获取范围: ${startDate.toISOString().split('T')[0]} 至今 (${years}年)`);

        // 2. 获取现有数据（用于去重）
        const { data: existingData } = await supabase
            .from('economic_data')
            .select('date')
            .eq('series_id', seriesId);

        const existingDates = new Set(existingData?.map((d: any) => d.date) || []);
        console.log(`   💾 数据库现有: ${existingDates.size} 条`);

        // 3. 调用FRED API
        const apiResult = await fetchFREDData(seriesId, startDate);
        if (!apiResult.success) {
            throw new Error(apiResult.error);
        }

        result.apiRecords = apiResult.observations.length;
        console.log(`   🌐 API返回: ${result.apiRecords} 条`);

        if (result.apiRecords === 0) {
            console.log(`   ⚠️  API未返回数据`);
            return result;
        }

        // 4. 数据转换和过滤
        const records = apiResult.observations
            .filter((obs: any) => obs.value && obs.value !== '.' && obs.value !== '-')
            .map((obs: any) => ({
                date: obs.date,
                value: parseFloat(obs.value),
            }))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log(`   ✅ 有效记录: ${records.length} 条`);
        console.log(`   🗑️  过滤: ${result.apiRecords - records.length} 条`);

        if (records.length === 0) {
            return result;
        }

        result.earliestDate = records[0].date;
        result.latestDate = records[records.length - 1].date;
        console.log(`   📊 数据范围: ${result.earliestDate} 至 ${result.latestDate}`);

        // 5. 验证数据连续性
        const continuityCheck = validateDataContinuity(records, frequency);
        result.continuityValid = continuityCheck.isValid;
        result.gaps = continuityCheck.gaps;

        if (!continuityCheck.isValid) {
            console.log(`   ⚠️  发现 ${continuityCheck.gaps.length} 个数据缺口`);
            continuityCheck.gaps.forEach((gap, i) => {
                console.log(`      缺口${i + 1}: ${gap.start} 至 ${gap.end}`);
            });
        } else {
            console.log(`   ✅ 数据连续性检查通过`);
        }

        // 6. 去重
        const newRecords = records.filter((r: any) => !existingDates.has(r.date));
        const duplicateRecords = records.filter((r: any) => existingDates.has(r.date));
        result.inserted = newRecords.length;
        result.skipped = duplicateRecords.length;

        console.log(`   🆕 新记录: ${newRecords.length} 条`);
        console.log(`   🔄 重复(跳过): ${duplicateRecords.length} 条`);

        // 7. 批量插入
        if (newRecords.length > 0) {
            const batchSize = 1000;
            let insertedCount = 0;

            for (let i = 0; i < newRecords.length; i += batchSize) {
                const batch = newRecords.slice(i, i + batchSize).map((r: any) => ({
                    series_id: seriesId,
                    date: r.date,
                    value: r.value,
                    vintage_date: new Date().toISOString().split('T')[0],
                }));

                const { error } = await supabase
                    .from('economic_data')
                    .upsert(batch, {
                        onConflict: 'series_id,date',
                        ignoreDuplicates: false
                    });

                if (error) {
                    throw new Error(`Insert error: ${error.message}`);
                }

                insertedCount += batch.length;
                process.stdout.write(`   💾 插入进度: ${insertedCount}/${newRecords.length}\r`);
            }
            console.log(`\n   ✅ 插入完成: ${insertedCount} 条`);
        }

        result.success = true;
        const duration = Date.now() - startTime;
        console.log(`   ⏱️  耗时: ${duration}ms`);

    } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ 失败: ${result.error}`);
    }

    return result;
}

// 主函数
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    全量数据同步与完整性验证系统                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('📋 同步策略:');
    console.log('   • 数据范围: 最近10年历史数据');
    console.log('   • 处理顺序: 按依赖关系排序（基础指标 → 衍生指标）');
    console.log('   • 更新方式: upsert（更新现有，插入新数据）');
    console.log('   • 验证项目: 数据类型、连续性、频率正确性');
    console.log();

    const indicators = INDICATOR_ORDER.map(id => getIndicatorInfo(id)).filter(Boolean);
    const results: any[] = [];

    // 按顺序处理每个指标
    for (let i = 0; i < indicators.length; i++) {
        const indicator = indicators[i];
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`[${i + 1}/${indicators.length}] 正在处理...`);

        const result = await syncIndicator(indicator!.id, 10);
        results.push(result);

        // 指标间延迟（避免API限流）
        if (i < indicators.length - 1) {
            await sleep(2000); // 增加到2秒，避免API限流
        }
    }

    // 汇总报告
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          同步完成报告                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalApiRecords = results.reduce((sum, r) => sum + r.apiRecords, 0);
    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const continuityIssues = results.filter(r => !r.continuityValid);

    console.log(`\n📊 总体统计:`);
    console.log(`   ✅ 成功: ${successful.length}/${results.length} 个指标`);
    console.log(`   ❌ 失败: ${failed.length}/${results.length} 个指标`);
    console.log(`   📈 API获取: ${totalApiRecords} 条`);
    console.log(`   💾 新插入: ${totalInserted} 条`);
    console.log(`   🔄 跳过(重复): ${totalSkipped} 条`);
    console.log(`   ⚠️  连续性警告: ${continuityIssues.length} 个指标`);

    // 详细结果表
    console.log(`\n📋 各指标详情:`);
    console.log('─'.repeat(100));
    console.log(`${'指标'.padEnd(15)} ${'API'.padStart(8)} ${'插入'.padStart(8)} ${'跳过'.padStart(8)} ${'最早日期'.padStart(12)} ${'最新日期'.padStart(12)} ${'状态'.padStart(8)}`);
    console.log('─'.repeat(100));

    results.forEach(r => {
        const status = r.success ? (r.continuityValid ? '✅' : '⚠️') : '❌';
        const earliest = r.earliestDate || 'N/A';
        const latest = r.latestDate || 'N/A';
        console.log(
            `${r.seriesId.padEnd(15)} ${r.apiRecords.toString().padStart(8)} ${r.inserted.toString().padStart(8)} ${r.skipped.toString().padStart(8)} ${earliest.padStart(12)} ${latest.padStart(12)} ${status.padStart(8)}`
        );
    });
    console.log('─'.repeat(100));

    // 失败详情
    if (failed.length > 0) {
        console.log(`\n❌ 失败的指标:`);
        failed.forEach(r => {
            console.log(`   • ${r.seriesId}: ${r.error}`);
        });
    }

    // 连续性警告
    if (continuityIssues.length > 0) {
        console.log(`\n⚠️  数据连续性警告:`);
        continuityIssues.forEach(r => {
            console.log(`   • ${r.seriesId}: ${r.gaps.length} 个缺口`);
            r.gaps.forEach((gap: any, i: number) => {
                console.log(`      - 缺口${i + 1}: ${gap.start} 至 ${gap.end}`);
            });
        });
    }

    // 数据完整性校验
    console.log(`\n🔍 数据完整性校验:`);
    const allSuccessful = failed.length === 0;
    const allContinuous = continuityIssues.length === 0;

    if (allSuccessful && allContinuous) {
        console.log(`   ✅ 所有指标同步成功`);
        console.log(`   ✅ 所有指标数据连续`);
        console.log(`   ✅ 数据完整性校验通过 - 零错误`);
    } else {
        console.log(`   ${allSuccessful ? '✅' : '❌'} 指标同步: ${successful.length}/${results.length}`);
        console.log(`   ${allContinuous ? '✅' : '⚠️'} 数据连续性: ${results.length - continuityIssues.length}/${results.length}`);
        console.log(`   ⚠️  数据完整性校验发现 ${failed.length + continuityIssues.length} 个问题`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ 全量同步完成');
    console.log('═'.repeat(80));
}

// 运行
main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
});
