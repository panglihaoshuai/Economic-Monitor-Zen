// Local Full Sync Script
// 本地全量数据同步脚本 - 用于首次数据填充或数据修复

import { createClient } from '@supabase/supabase-js';
import { getAllIndicators } from '../lib/fred';

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const fredApiKey = process.env.FRED_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !fredApiKey) {
    console.error('❌ 错误: 缺少必要的环境变量');
    console.error('需要: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRED_API_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 从FRED API获取数据
async function fetchFREDData(seriesId: string, startDate: Date): Promise<Array<{ date: string; value: number }>> {
    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: fredApiKey,
        observation_start: startDate.toISOString().split('T')[0],
        file_type: 'json',
        limit: '100000',
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
        throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
    }

    const data = await response.json();

    // 过滤并转换数据
    return data.observations
        .filter((obs: { value: string }) => obs.value && obs.value !== '.' && obs.value !== '-')
        .map((obs: { date: string; value: string }) => ({
            date: obs.date,
            value: parseFloat(obs.value),
        }));
}

// 批量插入数据（使用upsert避免重复）
async function upsertData(seriesId: string, records: Array<{ date: string; value: number }>): Promise<number> {
    if (records.length === 0) return 0;

    const dataToInsert = records.map(record => ({
        series_id: seriesId,
        date: record.date,
        value: record.value,
        vintage_date: new Date().toISOString().split('T')[0],
    }));

    const { error } = await supabase
        .from('economic_data')
        .upsert(dataToInsert, {
            onConflict: 'series_id,date',
            ignoreDuplicates: false // 更新现有记录
        });

    if (error) {
        throw new Error(`Upsert error for ${seriesId}: ${error.message}`);
    }

    return records.length;
}

// 同步单个指标
async function syncIndicator(
    seriesId: string,
    years: number = 10
): Promise<{ success: boolean; inserted: number; error?: string }> {
    const startTime = Date.now();

    try {
        // 计算开始日期
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);

        console.log(`📥 正在获取 ${seriesId} 的 ${years} 年历史数据...`);

        // 获取数据
        const records = await fetchFREDData(seriesId, startDate);

        if (records.length === 0) {
            console.log(`   ⚠️  ${seriesId}: 未获取到数据`);
            return { success: true, inserted: 0 };
        }

        console.log(`   📊 获取到 ${records.length} 条记录 (${records[0].date} 至 ${records[records.length - 1].date})`);

        // 批量插入（分批处理避免请求过大）
        const batchSize = 1000;
        let totalInserted = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const inserted = await upsertData(seriesId, batch);
            totalInserted += inserted;

            if (i + batchSize < records.length) {
                await sleep(100); // 批次间延迟
            }
        }

        const duration = Date.now() - startTime;
        console.log(`   ✅ 成功插入/更新 ${totalInserted} 条记录 (${duration}ms)`);

        return { success: true, inserted: totalInserted };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ 失败: ${errorMsg}`);
        return { success: false, inserted: 0, error: errorMsg };
    }
}

// 主函数
async function main() {
    const indicators = getAllIndicators();
    const years = 10; // 获取10年数据

    console.log('═'.repeat(80));
    console.log('🚀 本地全量数据同步');
    console.log('═'.repeat(80));
    console.log(`📊 指标数量: ${indicators.length}`);
    console.log(`📅 时间范围: ${years} 年`);
    console.log(`🔄 更新策略: upsert (不会重复插入)`);
    console.log('═'.repeat(80));
    console.log();

    const results: Array<{ seriesId: string; success: boolean; inserted: number; error?: string }> = [];

    // 串行处理以避免API限流
    for (let i = 0; i < indicators.length; i++) {
        const indicator = indicators[i];
        console.log(`\n[${i + 1}/${indicators.length}] ${indicator.id} - ${indicator.title}`);

        const result = await syncIndicator(indicator.id, years);
        results.push({
            seriesId: indicator.id,
            ...result,
        });

        // 指标间延迟（避免FRED API限流）
        if (i < indicators.length - 1) {
            await sleep(500);
        }
    }

    // 汇总报告
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 同步完成报告');
    console.log('═'.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalInserted = successful.reduce((sum, r) => sum + r.inserted, 0);

    console.log(`\n✅ 成功: ${successful.length} 个指标`);
    console.log(`❌ 失败: ${failed.length} 个指标`);
    console.log(`📈 总插入/更新: ${totalInserted} 条记录`);

    if (failed.length > 0) {
        console.log('\n❌ 失败的指标:');
        failed.forEach(r => {
            console.log(`   - ${r.seriesId}: ${r.error}`);
        });
    }

    // 显示每个指标的统计
    console.log('\n📋 各指标数据量:');
    console.log('─'.repeat(60));
    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`${status} ${r.seriesId.padEnd(15)} ${r.inserted.toString().padStart(6)} 条记录`);
    });
    console.log('─'.repeat(60));

    console.log('\n✨ 全量同步完成！');
    console.log('💡 提示: 可以多次运行此脚本，不会导致重复数据');
    console.log('═'.repeat(80));
}

// 运行
main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
});
