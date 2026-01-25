// 删除测试数据脚本
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0'
);

async function deleteTestData() {
  console.log('='.repeat(60));
  console.log('🗑️ 删除测试数据');
  console.log('='.repeat(60));
  
  try {
    // 1. 查看删除前的数据
    const { count: beforeCount, error: beforeError } = await supabase
      .from('economic_data')
      .select('*', { count: 'exact', head: true });
      
    if (beforeError) {
      console.error('❌ 查询失败:', beforeError.message);
      return;
    }
    
    console.log(`📊 删除前总记录数: ${beforeCount}`);
    
    // 2. 查看TEST记录
    const { data: testRecords, error: testError } = await supabase
      .from('economic_data')
      .select('*')
      .eq('series_id', 'TEST');
      
    if (testError) {
      console.error('❌ 查询TEST记录失败:', testError.message);
      return;
    }
    
    console.log(`🧪 发现TEST记录: ${testRecords?.length}条`);
    testRecords?.forEach(record => {
      console.log(`  ${record.date}: ${record.value}`);
    });
    
    // 3. 删除TEST记录
    if (testRecords && testRecords.length > 0) {
      const { error: deleteError } = await supabase
        .from('economic_data')
        .delete()
        .eq('series_id', 'TEST');
        
      if (deleteError) {
        console.error('❌ 删除失败:', deleteError.message);
        return;
      }
      
      console.log(`✅ 成功删除${testRecords.length}条TEST记录`);
    }
    
    // 4. 查看删除后的数据
    const { count: afterCount, error: afterError } = await supabase
      .from('economic_data')
      .select('*', { count: 'exact', head: true });
      
    if (afterError) {
      console.error('❌ 查询失败:', afterError.message);
      return;
    }
    
    console.log(`📊 删除后总记录数: ${afterCount}`);
    console.log(`📈 删除了 ${beforeCount! - afterCount!} 条记录`);
    
    // 5. 显示剩余数据概览
    const { data: remaining, error: remainingError } = await supabase
      .from('economic_data')
      .select('series_id, count(*) as count')
      .group('series_id');
      
    if (remainingError) {
      console.error('❌ 查询剩余数据失败:', remainingError.message);
      return;
    }
    
    console.log('\n📈 剩余数据分布:');
    remaining?.forEach(item => {
      console.log(`  ${item.series_id}: ${item.count}条记录`);
    });
    
  } catch (error) {
    console.error('❌ 删除过程出错:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  deleteTestData().catch(console.error);
}

export { deleteTestData };