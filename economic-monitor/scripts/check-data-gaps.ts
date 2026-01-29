// Data Gap Checker Script
// 数据缺口检查脚本 - 在本地运行以分析当前数据库状态

import { createClient } from '@supabase/supabase-js';
import { getAllIndicators, getIndicatorInfo } from '../lib/fred';
import { analyzeDataGaps, type GapAnalysisReport } from '../lib/smart-data-scheduler';

// 初始化Supabase客户端
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 错误: 缺少Supabase环境变量');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '已设置' : '未设置');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '已设置' : '未设置');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 检查当前数据状态
async function checkCurrentDataStatus() {
    console.log('🔍 正在检查数据库数据状态...\n');

    // 1. 获取总体统计
    const { data: totalStats, error: totalError } = await supabase
        .from('economic_data')
        .select('*', { count: 'exact', head: true });

    if (totalError) {
        console.error('❌ 获取总数据量失败:', totalError.message);
        return;
    }

    console.log(`📊 数据库总数据行数: ${totalStats?.length || 0}\n`);

    // 2. 获取每个指标的数据统计
    const indicators = getAllIndicators();
    console.log(`📈 配置指标总数: ${indicators.length}\n`);

    const indicatorStats: Array<{
        seriesId: string;
        name: string;
        frequency: string;
        count: number;
        earliestDate: string | null;
        latestDate: string | null;
        daysCovered: number;
        status: 'complete' | 'partial' | 'missing' | 'critical';
    }> = [];

    for (const indicator of indicators) {
        // 获取该指标的数据统计
        const { data: stats, error } = await supabase
            .from('economic_data')
            .select('date')
            .eq('series_id', indicator.id)
            .order('date', { ascending: true });

        if (error) {
            console.error(`❌ 获取 ${indicator.id} 数据失败:`, error.message);
            continue;
        }

        const count = stats?.length || 0;
        const earliestDate = stats?.[0]?.date || null;
        const latestDate = stats?.[stats.length - 1]?.date || null;

        let daysCovered = 0;
        if (earliestDate && latestDate) {
            daysCovered = Math.ceil(
                (new Date(latestDate).getTime() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24)
            );
        }

        // 判断数据状态
        let status: 'complete' | 'partial' | 'missing' | 'critical';
        const expectedDays = 365 * 10; // 10年预期

        if (count === 0) {
            status = 'missing';
        } else if (daysCovered < expectedDays * 0.3) {
            status = 'critical';
        } else if (daysCovered < expectedDays * 0.8) {
            status = 'partial';
        } else {
            status = 'complete';
        }

        indicatorStats.push({
            seriesId: indicator.id,
            name: indicator.title,
            frequency: indicator.frequency,
            count,
            earliestDate,
            latestDate,
            daysCovered,
            status,
        });
    }

    // 3. 打印详细统计
    console.log('📋 各指标数据状态:\n');
    console.log('─'.repeat(120));
    console.log(
        `${'指标ID'.padEnd(15)} ${'数据点数'.padStart(10)} ${'最早日期'.padStart(12)} ${'最新日期'.padStart(12)} ${'覆盖天数'.padStart(10)} ${'频率'.padStart(10)} ${'状态'.padStart(10)}`
    );
    console.log('─'.repeat(120));

    const statusIcons = {
        complete: '✅',
        partial: '⚠️ ',
        missing: '❌',
        critical: '🔴',
    };

    const statusLabels = {
        complete: '完整',
        partial: '部分',
        missing: '缺失',
        critical: '严重不足',
    };

    for (const stat of indicatorStats) {
        const icon = statusIcons[stat.status];
        const label = statusLabels[stat.status];
        console.log(
            `${stat.seriesId.padEnd(15)} ${stat.count.toString().padStart(10)} ${(stat.earliestDate || 'N/A').padStart(12)} ${(stat.latestDate || 'N/A').padStart(12)} ${stat.daysCovered.toString().padStart(10)} ${stat.frequency.padStart(10)} ${icon} ${label}`
        );
    }

    console.log('─'.repeat(120));

    // 4. 汇总统计
    const missingCount = indicatorStats.filter(s => s.status === 'missing').length;
    const criticalCount = indicatorStats.filter(s => s.status === 'critical').length;
    const partialCount = indicatorStats.filter(s => s.status === 'partial').length;
    const completeCount = indicatorStats.filter(s => s.status === 'complete').length;

    console.log('\n📊 数据完整性汇总:');
    console.log(`   ✅ 完整: ${completeCount} 个指标`);
    console.log(`   ⚠️  部分: ${partialCount} 个指标`);
    console.log(`   🔴 严重不足: ${criticalCount} 个指标`);
    console.log(`   ❌ 完全缺失: ${missingCount} 个指标`);

    // 5. 执行详细缺口分析
    console.log('\n\n🔍 正在执行详细缺口分析...\n');

    const gapReport = await analyzeDataGaps(supabase, {
        checkRangeDays: 365 * 10, // 检查10年
        minGapDays: 7,
    });

    // 6. 打印缺口报告
    printGapReport(gapReport);

    // 7. 生成修复建议
    generateRemediationGuide(indicatorStats, gapReport);
}

// 打印缺口报告
function printGapReport(report: GapAnalysisReport) {
    console.log('─'.repeat(120));
    console.log('📋 数据缺口分析报告');
    console.log('─'.repeat(120));
    console.log(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`);
    console.log(`总指标数: ${report.totalIndicators}`);
    console.log(`存在缺口的指标: ${report.indicatorsWithGaps}`);
    console.log(`总缺口数: ${report.totalGaps}`);
    console.log(`严重缺口: ${report.criticalGaps} | 高度缺口: ${report.highGaps} | 中度缺口: ${report.mediumGaps} | 低度缺口: ${report.lowGaps}`);
    console.log('─'.repeat(120));

    // 按频率分组显示缺口
    for (const [frequency, gaps] of Object.entries(report.gapsByFrequency)) {
        if (gaps.length === 0) continue;

        const freqLabels: Record<string, string> = {
            daily: '📅 日度指标',
            weekly: '📅 周度指标',
            monthly: '📅 月度指标',
            quarterly: '📅 季度指标',
        };

        console.log(`\n${freqLabels[frequency] || frequency} (${gaps.length}个缺口)`);
        console.log('─'.repeat(100));

        for (const gap of gaps) {
            const severityIcon = {
                critical: '🔴',
                high: '🟠',
                medium: '🟡',
                low: '🔵',
            }[gap.severity];

            console.log(`\n${severityIcon} ${gap.seriesName} (${gap.seriesId})`);
            console.log(`   缺口范围: ${gap.gapStart} 至 ${gap.gapEnd} (${gap.gapDays}天)`);
            console.log(`   数据点: 应有 ${gap.expectedPoints}, 实际 ${gap.actualPoints}, 缺失 ${gap.missingPoints}`);
            console.log(`   建议: ${gap.remediationSuggestion}`);
        }
    }

    // 修复计划
    if (report.remediationPlan.length > 0) {
        console.log('\n\n🔧 修复计划 (前10项)');
        console.log('─'.repeat(100));

        for (const action of report.remediationPlan.slice(0, 10)) {
            const actionLabels: Record<string, string> = {
                immediate_fetch: '⚡ 立即获取',
                backfill: '📥 回溯填充',
                scheduled_fetch: '⏰ 定时获取',
                manual_review: '👤 人工审核',
            };

            console.log(`\n#${action.priority} ${actionLabels[action.action] || action.action}`);
            console.log(`   指标: ${action.seriesId}`);
            console.log(`   描述: ${action.description}`);
            console.log(`   预计记录数: ${action.estimatedRecords}`);
            console.log(`   时间范围: ${action.timeRange.start} 至 ${action.timeRange.end}`);
        }

        if (report.remediationPlan.length > 10) {
            console.log(`\n... 还有 ${report.remediationPlan.length - 10} 项修复计划`);
        }
    }
}

// 生成修复指南
function generateRemediationGuide(
    stats: Array<{ seriesId: string; status: string; count: number }>,
    report: GapAnalysisReport
) {
    console.log('\n\n');
    console.log('═'.repeat(120));
    console.log('📖 数据修复执行指南');
    console.log('═'.repeat(120));

    // 1. 完全缺失的指标
    const missingIndicators = stats.filter(s => s.status === 'missing');
    if (missingIndicators.length > 0) {
        console.log('\n🔴 第一步: 获取完全缺失的指标数据（全量获取）');
        console.log('─'.repeat(100));
        console.log(`以下 ${missingIndicators.length} 个指标完全没有数据，需要执行全量获取:`);
        missingIndicators.forEach(s => {
            console.log(`   - ${s.seriesId}`);
        });
        console.log('\n执行命令:');
        console.log(`curl -X POST "http://localhost:3000/api/cron/fetch-data?mode=full" \\\n  -H "Authorization: Bearer $CRON_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{"seriesIds":${JSON.stringify(missingIndicators.map(s => s.seriesId))}}'`);
    }

    // 2. 严重不足的指标
    const criticalIndicators = stats.filter(s => s.status === 'critical');
    if (criticalIndicators.length > 0) {
        console.log('\n🔴 第二步: 补充严重不足的指标数据（回溯填充）');
        console.log('─'.repeat(100));
        console.log(`以下 ${criticalIndicators.length} 个指标数据严重不足:`);
        criticalIndicators.forEach(s => {
            console.log(`   - ${s.seriesId} (当前 ${s.count} 条记录)`);
        });
        console.log('\n执行命令:');
        console.log(`curl -X POST "http://localhost:3000/api/cron/smart-scheduler" \\\n  -H "Authorization: Bearer $CRON_SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"remediate","remediationPlan":${JSON.stringify(
            report.remediationPlan
                .filter(p => criticalIndicators.some(s => s.seriesId === p.seriesId))
                .slice(0, 5)
        )}}'`);
    }

    // 3. 部分缺失的指标
    const partialIndicators = stats.filter(s => s.status === 'partial');
    if (partialIndicators.length > 0) {
        console.log('\n⚠️  第三步: 补充部分缺失的指标数据');
        console.log('─'.repeat(100));
        console.log(`以下 ${partialIndicators.length} 个指标数据部分缺失:`);
        partialIndicators.forEach(s => {
            console.log(`   - ${s.seriesId} (当前 ${s.count} 条记录)`);
        });
    }

    // 4. 配置说明
    console.log('\n\n📋 本地全量更新 vs Vercel增量更新策略');
    console.log('─'.repeat(100));
    console.log(`
【本地开发环境 - 全量更新】
用途: 首次数据填充或数据修复
命令: npm run data:full-sync
或: curl "/api/cron/fetch-data?mode=full" -H "Authorization: Bearer $CRON_SECRET"
特点: 
- 获取10年历史数据
- 使用 upsert 操作，不会重复插入
- 适合本地开发时一次性填充

【Vercel生产环境 - 增量更新】
用途: 日常数据维护
调度: 每天08:00 UTC自动执行
命令: curl "/api/cron/fetch-data" -H "Authorization: Bearer $CRON_SECRET"
特点:
- 只获取最近7-180天的数据（根据频率）
- 使用 upsert 操作，自动跳过已存在数据
- 不会与现有数据冲突

【数据冲突保护机制】
1. 数据库唯一约束: (series_id, date) 复合主键
2. upsert 操作: onConflict: 'series_id,date'
3. 采集时过滤: 自动跳过已存在的日期
4. 结果: 多次执行不会导致重复数据
  `);

    console.log('\n✅ 建议执行顺序:');
    console.log('   1. 先在本地运行全量更新获取历史数据');
    console.log('   2. 验证数据完整性');
    console.log('   3. 部署到Vercel后自动进行增量更新');
    console.log('   4. 定期使用智能调度系统检查数据缺口');
    console.log('═'.repeat(120));
}

// 主函数
async function main() {
    try {
        await checkCurrentDataStatus();
    } catch (error) {
        console.error('❌ 执行失败:', error);
        process.exit(1);
    }
}

main();
