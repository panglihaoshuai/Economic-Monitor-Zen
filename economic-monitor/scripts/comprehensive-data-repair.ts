/**
 * 全面数据修复脚本
 * 解决Supabase查询限制问题，执行完整数据协调和质量检查
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { format, subYears, parseISO, isValid } from 'date-fns';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FRED_API_KEY = process.env.FRED_API_KEY;

// 指标配置
const INDICATORS = [
    { series_id: 'SOFR', frequency: 'daily', name: 'Secured Overnight Financing Rate' },
    { series_id: 'DGS2', frequency: 'daily', name: '2-Year Treasury Rate' },
    { series_id: 'DGS10', frequency: 'daily', name: '10-Year Treasury Rate' },
    { series_id: 'TEDRATE', frequency: 'daily', name: 'TED Spread' },
    { series_id: 'MORTGAGE30US', frequency: 'weekly', name: '30-Year Mortgage Rate' },
    { series_id: 'CPIAUCSL', frequency: 'monthly', name: 'Consumer Price Index' },
    { series_id: 'UNRATE', frequency: 'monthly', name: 'Unemployment Rate' },
    { series_id: 'PPIACO', frequency: 'monthly', name: 'Producer Price Index' },
    { series_id: 'IMPGS', frequency: 'monthly', name: 'Imports of Goods and Services' },
    { series_id: 'EXPGSC1', frequency: 'monthly', name: 'Exports of Goods and Services' },
    { series_id: 'INDPRO', frequency: 'monthly', name: 'Industrial Production' },
    { series_id: 'PCEC1', frequency: 'monthly', name: 'Personal Consumption Expenditures' },
    { series_id: 'GDPC1', frequency: 'quarterly', name: 'Real Gross Domestic Product' },
    { series_id: 'USREC', frequency: 'daily', name: 'US Recession Indicator' },
];

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 从FRED API获取数据（带分页）
async function fetchFredData(seriesId: string, startDate: string, endDate: string) {
    const allData: any[] = [];
    let offset = 0;
    const limit = 10000; // FRED API单次最大返回数
    let hasMore = true;
    let retries = 0;
    const maxRetries = 3;

    while (hasMore && retries < maxRetries) {
        try {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&limit=${limit}&offset=${offset}&sort_order=asc`;

            console.log(`   获取 ${seriesId} 数据 (offset: ${offset})...`);

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 429) {
                    console.log('   触发限流，等待20秒...');
                    await delay(20000);
                    retries++;
                    continue;
                }
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();

            if (!data.observations || data.observations.length === 0) {
                hasMore = false;
                break;
            }

            allData.push(...data.observations);

            if (data.observations.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }

            // 遵守FRED API速率限制（120请求/分钟）
            await delay(500);
            retries = 0;
        } catch (error) {
            console.error(`   获取失败: ${error}`);
            retries++;
            if (retries < maxRetries) {
                await delay(5000 * retries);
            }
        }
    }

    return allData;
}

// 从Supabase获取所有数据（使用分页突破1000限制）
async function getAllSupabaseData(seriesId: string) {
    const allData: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('economic_data')
            .select('date, value')
            .eq('series_id', seriesId)
            .order('date', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error(`   查询Supabase失败: ${error.message}`);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allData.push(...data);
            if (data.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }
    }

    return allData;
}

// 批量插入数据
async function batchInsert(records: any[], seriesId: string) {
    const batchSize = 500;
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        try {
            const { data, error } = await supabase
                .from('economic_data')
                .upsert(batch, {
                    onConflict: 'series_id,date'
                });

            if (error) {
                console.error(`   批次插入失败: ${error.message}`);
                errors += batch.length;
            } else {
                // 简单估算：如果返回的数据量等于批次量，大部分是更新
                inserted += batch.length;
            }
        } catch (error) {
            console.error(`   批次异常: ${error}`);
            errors += batch.length;
        }

        // 避免触发Supabase速率限制
        if (i + batchSize < records.length) {
            await delay(100);
        }
    }

    return { inserted, updated, errors };
}

// 修复单个指标
async function repairIndicator(indicator: typeof INDICATORS[0]) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔧 修复 ${indicator.series_id} - ${indicator.name}`);
    console.log(`${'='.repeat(80)}`);

    // 1. 获取当前数据库状态
    const existingData = await getAllSupabaseData(indicator.series_id);
    console.log(`📊 数据库现有: ${existingData.length} 条`);

    // 2. 计算需要获取的时间范围
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subYears(new Date(), 10), 'yyyy-MM-dd');

    // 3. 从FRED获取完整数据
    console.log(`🌐 从FRED获取 ${startDate} 至 ${endDate}...`);
    const fredData = await fetchFredData(indicator.series_id, startDate, endDate);
    console.log(`📥 FRED返回: ${fredData.length} 条`);

    // 4. 转换数据
    const transformedData = fredData
        .filter((obs: any) => obs.value !== '.' && obs.value !== '')
        .map((obs: any) => ({
            series_id: indicator.series_id,
            date: obs.date,
            value: parseFloat(obs.value)
        }));

    console.log(`🔄 有效数据: ${transformedData.length} 条`);

    // 5. 计算差异
    const existingDates = new Set(existingData.map(d => d.date));
    const newRecords = transformedData.filter((r: any) => !existingDates.has(r.date));
    const updateRecords = transformedData.filter((r: any) => existingDates.has(r.date));

    console.log(`➕ 新增: ${newRecords.length} 条`);
    console.log(`📝 更新: ${updateRecords.length} 条`);

    // 6. 执行插入
    if (transformedData.length > 0) {
        console.log(`💾 开始插入...`);
        const result = await batchInsert(transformedData, indicator.series_id);
        console.log(`✅ 完成: ${result.inserted} 条处理`);

        if (result.errors > 0) {
            console.log(`❌ 错误: ${result.errors} 条`);
        }
    }

    // 7. 验证结果
    const finalData = await getAllSupabaseData(indicator.series_id);
    console.log(`\n📋 修复后: ${finalData.length} 条`);

    if (finalData.length > 0) {
        console.log(`📅 范围: ${finalData[0].date} 至 ${finalData[finalData.length - 1].date}`);
    }

    return {
        seriesId: indicator.series_id,
        before: existingData.length,
        after: finalData.length,
        expected: transformedData.length,
        success: finalData.length >= transformedData.length * 0.95 // 允许5%误差
    };
}

// 主函数
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    全面数据修复系统                                          ║');
    console.log('║         解决查询限制，执行完整数据协调                                       ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const indicator of INDICATORS) {
        try {
            const result = await repairIndicator(indicator);
            results.push(result);

            if (result.success) {
                successCount++;
                console.log(`✅ ${indicator.series_id} 修复成功`);
            } else {
                failCount++;
                console.log(`⚠️  ${indicator.series_id} 修复不完全`);
            }
        } catch (error) {
            console.error(`❌ ${indicator.series_id} 修复失败:`, error);
            failCount++;
            results.push({
                seriesId: indicator.series_id,
                before: 0,
                after: 0,
                expected: 0,
                success: false,
                error: String(error)
            });
        }

        // 指标间延迟，避免API限流
        await delay(1000);
    }

    // 最终报告
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 修复完成报告');
    console.log('='.repeat(80));

    console.log(`\n✅ 成功: ${successCount}/${INDICATORS.length}`);
    console.log(`❌ 失败: ${failCount}/${INDICATORS.length}`);

    console.log('\n📋 详细结果:');
    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.seriesId}: ${r.before} → ${r.after} (期望: ${r.expected})`);
    });

    // 数据质量检查
    console.log('\n🔍 数据质量检查:');
    const totalRecords = results.reduce((sum, r) => sum + r.after, 0);
    const totalExpected = results.reduce((sum, r) => sum + r.expected, 0);
    const coverage = totalExpected > 0 ? ((totalRecords / totalExpected) * 100).toFixed(1) : '0';

    console.log(`   总记录数: ${totalRecords}`);
    console.log(`   期望记录: ${totalExpected}`);
    console.log(`   覆盖率: ${coverage}%`);

    if (failCount === 0 && parseFloat(coverage) >= 95) {
        console.log('\n🎉 数据修复完成，质量达标！');
    } else {
        console.log('\n⚠️  部分指标需要重新修复');
    }

    console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
