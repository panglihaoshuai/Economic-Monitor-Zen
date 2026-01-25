// 快速分析数据库内容
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0'
);

async function analyzeData() {
  console.log('='.repeat(60));
  console.log('📊 分析economic_data表内容');
  console.log('='.repeat(60));
  
  try {
    // 1. 查看数据范围
    const { data: range, error: rangeError } = await supabase
      .from('economic_data')
      .select('series_id')
      .limit(10);
      
    if (rangeError) {
      console.error('❌ 查询失败:', rangeError.message);
      return;
    }
    
    console.log('📈 数据样本:');
    range?.forEach(item => {
      console.log(`  指标: ${item.series_id}`);
    });
    
    // 2. 查看最新数据
    const { data: latest, error: latestError } = await supabase
      .from('economic_data')
      .select('series_id, date, value, created_at')
      .order('date', { ascending: false })
      .limit(5);
      
    if (latestError) {
      console.error('❌ 查询最新数据失败:', latestError.message);
      return;
    }
    
    console.log('\n🕐 最新5条记录:');
    latest?.forEach(item => {
      console.log(`  ${item.series_id}: ${item.date} = ${item.value}`);
      console.log(`     创建于: ${item.created_at}`);
    });
    
    // 3. 统计总数
    const { count, error: countError } = await supabase
      .from('economic_data')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('❌ 统计失败:', countError.message);
      return;
    }
    
    console.log(`\n📊 总记录数: ${count}`);
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

analyzeData().catch(console.error);