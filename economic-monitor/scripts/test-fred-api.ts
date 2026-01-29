/**
 * FRED API 直接测试脚本
 * 用于验证FRED API实际返回的数据，确定数据缺失的根本原因
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const FRED_API_KEY = process.env.FRED_API_KEY!;

if (!FRED_API_KEY) {
    console.error('❌ 错误: 缺少FRED_API_KEY环境变量');
    process.exit(1);
}

// 测试指标列表
const TEST_INDICATORS = [
    { series_id: 'TEDRATE', name: 'TED Spread', frequency: 'daily' },
    { series_id: 'MORTGAGE30US', name: '30-Year Mortgage Rate', frequency: 'weekly' },
    { series_id: 'IMPGS', name: 'Imports of Goods and Services', frequency: 'monthly' },
    { series_id: 'EXPGSC1', name: 'Exports of Goods and Services', frequency: 'monthly' },
    { series_id: 'GDPC1', name: 'Real Gross Domestic Product', frequency: 'quarterly' },
    { series_id: 'USREC', name: 'US Recession Indicator', frequency: 'daily' },
];

// 从FRED API获取数据
async function fetchFREDData(seriesId: string, startDate: string, limit: number = 100000) {
    const url = 'https://api.stlouisfed.org/fred/series/observations';
    const params = new URLSearchParams({
        series_id: seriesId,
        api_key: FRED_API_KEY,
        observation_start: startDate,
        file_type: 'json',
        limit: limit.toString(),
    });

    try {
        const response = await fetch(`${url}?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, observations: [], error: `HTTP ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        return { success: true, observations: data.observations || [] };
    } catch (error) {
        return { success: false, observations: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// 分析数据
function analyzeData(observations: any[], frequency: string) {
    if (observations.length === 0) {
        return { count: 0, startDate: null, endDate: null, gaps: [] };
    }

    const sortedObs = [...observations].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const startDate = sortedObs[0].date;
    const endDate = sortedObs[sortedObs.length - 1].date;

    // 计算期望的记录数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    let expectedCount: number;
    switch (frequency) {
        case 'daily':
            expectedCount = daysDiff + 1;
            break;
        case 'weekly':
            expectedCount = Math.floor(daysDiff / 7) + 1;
            break;
        case 'monthly':
            expectedCount = Math.floor(daysDiff / 30) + 1;
            break;
        case 'quarterly':
            expectedCount = Math.floor(daysDiff / 90) + 1;
            break;
        default:
            expectedCount = daysDiff + 1;
    }

    return {
        count: sortedObs.length,
        startDate,
        endDate,
        expectedCount,
        coverage: ((sortedObs.length / expectedCount) * 100).toFixed(1)
    };
}

// 主函数
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    FRED API 直接测试                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log();

    const startDate = '2016-01-01'; // 10年前

    for (const indicator of TEST_INDICATORS) {
        console.log('================================================================================');
        console.log(`📊 ${indicator.series_id} - ${indicator.name}`);
        console.log(`   频率: ${indicator.frequency}`);
        console.log(`   查询范围: ${startDate} 至今`);
        console.log();

        const result = await fetchFREDData(indicator.series_id, startDate);

        if (!result.success) {
            console.log(`   ❌ API请求失败: ${result.error}`);
            console.log();
            continue;
        }

        console.log(`   ✅ API返回: ${result.observations.length} 条记录`);

        if (result.observations.length > 0) {
            const analysis = analyzeData(result.observations, indicator.frequency);
            console.log(`   📅 数据范围: ${analysis.startDate} 至 ${analysis.endDate}`);
            console.log(`   📈 期望记录数: ${analysis.expectedCount}`);
            console.log(`   📊 覆盖率: ${analysis.coverage}%`);

            // 显示前5条和后5条记录
            console.log(`   📋 前5条记录:`);
            result.observations.slice(0, 5).forEach((obs: any, i: number) => {
                console.log(`      ${i + 1}. ${obs.date}: ${obs.value}`);
            });

            if (result.observations.length > 10) {
                console.log(`   📋 后5条记录:`);
                result.observations.slice(-5).forEach((obs: any, i: number) => {
                    console.log(`      ${result.observations.length - 4 + i}. ${obs.date}: ${obs.value}`);
                });
            }
        }

        console.log();
    }

    console.log('================================================================================');
    console.log('📋 测试总结');
    console.log('================================================================================');
    console.log();
    console.log('✅ 测试完成');
    console.log();
    console.log('📝 结论:');
    console.log('   如果API返回的数据与数据库中的数据一致，则说明数据获取逻辑正确，');
    console.log('   数据缺失是由于FRED API本身的数据限制。');
    console.log('   如果API返回的数据比数据库中的数据多，则说明存在数据获取或插入问题。');
    console.log();
}

main().catch(console.error);
