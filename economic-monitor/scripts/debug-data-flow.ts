// Debug Data Flow Script
// 数据流调试脚本 - 追踪从API到数据库的完整数据流

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getAllIndicators } from '../lib/fred';

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

// 测试单个指标的完整数据流
async function debugIndicatorFlow(seriesId: string) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 调试指标: ${seriesId}`);
    console.log('='.repeat(80));

    // 1. 检查数据库当前状态
    console.log('\n📊 步骤1: 检查数据库当前状态');
    const { data: existingData, error: dbError } = await supabase
        .from('economic_data')
        .select('date, value')
        .eq('series_id', seriesId)
        .order('date', { ascending: true });

    if (dbError) {
        console.error('   ❌ 数据库查询失败:', dbError.message);
        return;
    }

    const dbCount = existingData?.length || 0;
    const dbEarliest = existingData?.[0]?.date || 'N/A';
    const dbLatest = existingData?.[existingData.length - 1]?.date || 'N/A';
    console.log(`   ✅ 数据库现有记录: ${dbCount} 条`);
    console.log(`   📅 范围: ${dbEarliest} 至 ${dbLatest}`);

    // 2. 调用FRED API获取数据
    console.log('\n🌐 步骤2: 调用FRED API');
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 10); // 10年前

    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: fredApiKey,
        observation_start: startDate.toISOString().split('T')[0],
        file_type: 'json',
        limit: '100000',
    });

    console.log(`   📝 API URL: ${url}?${params.toString().replace(fredApiKey, '***')}`);

    try {
        const response = await fetch(`${url}?${params}`);
        console.log(`   📡 HTTP状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('   ❌ API请求失败:', errorText);
            return;
        }

        const apiData = await response.json();
        const observations = apiData.observations || [];
        console.log(`   ✅ API返回记录数: ${observations.length}`);

        if (observations.length > 0) {
            console.log(`   📅 API数据范围: ${observations[0].date} 至 ${observations[observations.length - 1].date}`);
            console.log(`   📝 样本数据:`, observations.slice(0, 3).map((o: any) => ({ date: o.date, value: o.value })));
        }

        // 3. 数据过滤和转换
        console.log('\n🔄 步骤3: 数据过滤和转换');
        const validObservations = observations.filter((obs: any) => {
            const isValid = obs.value && obs.value !== '.' && obs.value !== '-';
            return isValid;
        });
        console.log(`   ✅ 有效记录数: ${validObservations.length}`);
        console.log(`   🗑️  过滤掉的记录数: ${observations.length - validObservations.length}`);

        const records = validObservations.map((obs: any) => ({
            series_id: seriesId,
            date: obs.date,
            value: parseFloat(obs.value),
            vintage_date: new Date().toISOString().split('T')[0],
        }));

        console.log(`   📝 转换后的记录数: ${records.length}`);
        if (records.length > 0) {
            console.log(`   📊 样本记录:`, records.slice(0, 3));
        }

        // 4. 检查是否有重复数据
        console.log('\n🔍 步骤4: 检查重复数据');
        const existingDates = new Set(existingData?.map((d: any) => d.date) || []);
        const newRecords = records.filter((r: any) => !existingDates.has(r.date));
        const duplicateRecords = records.filter((r: any) => existingDates.has(r.date));
        console.log(`   🆕 新记录数: ${newRecords.length}`);
        console.log(`   🔄 重复记录数: ${duplicateRecords.length}`);

        // 5. 批量插入测试
        if (newRecords.length > 0) {
            console.log('\n💾 步骤5: 批量插入数据库');

            // 分批插入（每批1000条）
            const batchSize = 1000;
            let totalInserted = 0;
            const errors: string[] = [];

            for (let i = 0; i < newRecords.length; i += batchSize) {
                const batch = newRecords.slice(i, i + batchSize);
                console.log(`   📦 插入批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(newRecords.length / batchSize)} (${batch.length} 条)`);

                const { data: inserted, error } = await supabase
                    .from('economic_data')
                    .upsert(batch, {
                        onConflict: 'series_id,date',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.error(`   ❌ 批次插入失败:`, error.message);
                    errors.push(error.message);
                } else {
                    totalInserted += batch.length;
                    console.log(`   ✅ 批次插入成功`);
                }
            }

            console.log(`\n📊 插入结果:`);
            console.log(`   ✅ 成功插入: ${totalInserted} 条`);
            console.log(`   ❌ 失败: ${errors.length} 批次`);
            if (errors.length > 0) {
                console.log(`   📝 错误信息:`, errors);
            }

            // 6. 验证插入结果
            console.log('\n✅ 步骤6: 验证插入结果');
            const { data: finalData, error: finalError } = await supabase
                .from('economic_data')
                .select('date, value')
                .eq('series_id', seriesId)
                .order('date', { ascending: true });

            if (finalError) {
                console.error('   ❌ 验证查询失败:', finalError.message);
            } else {
                const finalCount = finalData?.length || 0;
                const finalEarliest = finalData?.[0]?.date || 'N/A';
                const finalLatest = finalData?.[finalData.length - 1]?.date || 'N/A';
                console.log(`   📊 最终记录数: ${finalCount} (增加 ${finalCount - dbCount})`);
                console.log(`   📅 最终范围: ${finalEarliest} 至 ${finalLatest}`);
            }
        } else {
            console.log('\n⚠️  没有新记录需要插入');
        }

    } catch (error) {
        console.error('   ❌ 调试过程中发生错误:', error);
    }
}

// 主函数
async function main() {
    console.log('🔍 数据流调试工具');
    console.log('==================');
    console.log('此脚本将追踪从FRED API到Supabase的完整数据流');
    console.log('用于定位数据丢失的具体环节\n');

    // 测试几个关键指标
    const testIndicators = ['SOFR', 'GDPC1', 'UNRATE'];

    for (const indicatorId of testIndicators) {
        await debugIndicatorFlow(indicatorId);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 调试完成');
    console.log('='.repeat(80));
}

main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
});
