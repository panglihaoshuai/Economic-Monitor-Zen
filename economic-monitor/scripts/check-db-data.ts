/**
 * 检查数据库中特定指标的实际数据
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIndicatorData(seriesId: string) {
    console.log(`\n================================================================================`);
    console.log(`📊 检查指标: ${seriesId}`);
    console.log(`================================================================================`);

    // 获取所有数据（使用分页）
    let allData: any[] = [];
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
            console.error(`❌ 查询失败:`, error.message);
            return;
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    console.log(`💾 数据库记录数: ${allData.length}`);

    if (allData.length > 0) {
        console.log(`📅 数据范围: ${allData[0].date} 至 ${allData[allData.length - 1].date}`);
        console.log(`\n📋 前5条记录:`);
        allData.slice(0, 5).forEach((record, i) => {
            console.log(`   ${i + 1}. ${record.date}: ${record.value}`);
        });

        if (allData.length > 10) {
            console.log(`\n📋 后5条记录:`);
            allData.slice(-5).forEach((record, i) => {
                console.log(`   ${allData.length - 4 + i}. ${record.date}: ${record.value}`);
            });
        }
    } else {
        console.log(`⚠️  数据库中没有数据`);
    }
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    数据库数据检查                                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    // 检查有问题的指标
    await checkIndicatorData('GDPC1');
    await checkIndicatorData('USREC');
    await checkIndicatorData('MORTGAGE30US');
    await checkIndicatorData('IMPGS');
    await checkIndicatorData('EXPGSC1');

    console.log('\n================================================================================');
    console.log('✅ 检查完成');
    console.log('================================================================================');
}

main().catch(console.error);
