// 🚀 完整数据采集脚本
// 重新获取所有指标的完整历史数据
// 预计获取5年历史数据用于准确分析

import { createClient } from '@supabase/supabase-js';
import { getAllIndicators } from './fred';
import { batchInsertEconomicData } from './optimized-batch-insert';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haW1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0'
);

async function fullDataSync() {
  console.log('='.repeat(60));
  console.log('🚀 开始完整数据同步');
  console.log('='.repeat(60));
  
  try {
    // 1. 获取所有指标配置
    const indicators = getAllIndicators();
    console.log(`📊 准备同步 ${indicators.length} 个指标：`);
    indicators.forEach(ind => {
      console.log(`  - ${ind.id}: ${ind.title} (${ind.frequency})`);
    });
    
    // 2. 设置完整数据采集参数
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5); // 获取5年历史数据
    const observationStart = startDate.toISOString().split('T')[0];
    
    console.log(`📅 数据范围: ${observationStart} 至今天`);
    console.log(`⏳ 预计采集 11,590+ 条数据点`);
    console.log(`⏱️  预计耗时: 5-15 分钟（考虑API限速）`);
    
    // 3. 逐个指标采集
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    
    for (const indicator of indicators) {
      console.log(`\n🔄 正在采集: ${indicator.id} - ${indicator.title}`);
      
      try {
        // 使用 FRED API 获取数据
        const response = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?` +
          `series_id=${indicator.id}&` +
          `api_key=6d03f382a06187128c3d72d6cb37ea85&` +
          `observation_start=${observationStart}&` +
          `file_type=json&` +
          `limit=100000`
        );
        
        if (!response.ok) {
          throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.observations || data.observations.length === 0) {
          console.log(`⚠️  ${indicator.id} 无数据`);
          continue;
        }
        
        console.log(`📊 ${indicator.id}: 获取到 ${data.observations.length} 条记录`);
        
        // 使用批量插入优化
        const economicData = data.observations
          .filter(obs => obs.value !== null && obs.value !== '.')
          .map(obs => ({
            series_id: indicator.id,
            date: obs.date,
            value: parseFloat(obs.value),
            created_at: new Date().toISOString()
          }));
        
        if (economicData.length > 0) {
          const insertResult = await batchInsertEconomicData(supabase, economicData, {
            batchSize: 1000,
            onProgress: (processed, total) => {
              console.log(`  📈 ${indicator.id}: ${processed}/${total} (${((processed/total)*100).toFixed(1)}%)`);
            }
          });
          
          if (insertResult.success) {
            totalFetched += economicData.length;
            totalInserted += insertResult.inserted;
            console.log(`✅ ${indicator.id}: 成功插入 ${insertResult.inserted} 条记录`);
            
            // API 限速等待
            if (indicator.frequency === 'Daily') {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
            }
          } else {
            totalErrors++;
            console.error(`❌ ${indicator.id}: 插入失败:`, insertResult.errors);
          }
        }
        
      } catch (error) {
        totalErrors++;
        console.error(`❌ ${indicator.id}: 采集失败:`, error.message);
      }
    }
    
    // 4. 采集结果汇总
    console.log('\n' + '='.repeat(60));
    console.log('📊 采集完成汇总');
    console.log('='.repeat(60));
    console.log(`📈 总指标数: ${indicators.length}`);
    console.log(`📊 总获取: ${totalFetched} 条数据`);
    console.log(`💾 总插入: ${totalInserted} 条记录`);
    console.log(`❌ 总错误: ${totalErrors} 个指标失败`);
    console.log(`📈 成功率: ${((totalInserted / totalFetched) * 100).toFixed(1)}%`);
    
    // 5. 验证数据库
    const { count } = await supabase
      .from('economic_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🔍 数据库验证: ${count} 条总记录`);
    
    // 6. 按指标统计
    const { data: stats } = await supabase
      .from('economic_data')
      .select('series_id, count(*)', { count: 'exact' })
      .group('series_id');
    
    console.log('\n📊 按指标分布:');
    stats?.forEach(stat => {
      console.log(`  ${stat.series_id}: ${stat.count} 条记录`);
    });
    
    console.log('\n🎉 完整数据同步完成！');
    console.log('🚀 现在可以进行准确的经济数据分析和监控');
    
    return {
      success: true,
      totalInserted,
      totalFetched,
      totalErrors,
      finalCount: count
    };
    
  } catch (error) {
    console.error('❌ 数据同步失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fullDataSync().then(result => {
    if (result.success) {
      console.log('\n✅ 任务完成，应用现在可以使用了');
      process.exit(0);
    } else {
      console.error('\n❌ 任务失败:', result.error);
      process.exit(1);
    }
  });
}

export { fullDataSync };