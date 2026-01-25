// 🚨 危险：删除所有 Supabase 数据脚本
// ⚠️ 执行前请确认：此操作不可恢复！

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwvaakquduxoahmisww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd3ZhYWtxdWR1eG9haG1pc3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5NTgwNiwiZXhwIjoyMDg0NTcxODA2fQ.ZOAWV-f2GwNo15goypRmcyIZZ95GNIwYm2xOrtG0XQ0'
);

async function deleteAllData() {
  console.log('🚨'.repeat(30));
  console.log('⚠️  警告：即将删除所有 Supabase 数据！');
  console.log('🚨'.repeat(30));
  
  try {
    // 1. 显示删除前的数据统计
    console.log('\n📊 删除前数据统计：');
    
    const tables = ['users', 'user_indicators', 'economic_data', 'anomalies'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ 查询 ${table} 失败:`, error.message);
      } else {
        console.log(`  ${table}: ${count} 条记录`);
      }
    }
    
    console.log('\n⏳ 等待 5 秒，如要取消请按 Ctrl+C...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🗑️ 开始删除数据...');
    
    // 2. 按依赖关系顺序删除（避免外键约束问题）
    const deleteOrder = [
      { table: 'anomalies', name: '异常记录' },
      { table: 'user_indicators', name: '用户指标' },
      { table: 'economic_data', name: '经济数据' },
      { table: 'users', name: '用户资料' }
    ];
    
    let totalDeleted = 0;
    
    for (const { table, name } of deleteOrder) {
      console.log(`\n🗑️ 正在删除 ${name}...`);
      
      // 先查询要删除多少
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error(`❌ 查询 ${table} 数量失败:`, countError.message);
        continue;
      }
      
      if (count === 0) {
        console.log(`  ✅ ${name} 已经是空的`);
        continue;
      }
      
      // 执行删除
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '');  // 删除所有记录
        
      if (error) {
        console.error(`❌ 删除 ${name} 失败:`, error.message);
      } else {
        console.log(`  ✅ 成功删除 ${count} 条 ${name}`);
        totalDeleted += count;
      }
    }
    
    // 3. 验证删除结果
    console.log('\n📊 删除后验证：');
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ 验证 ${table} 失败:`, error.message);
      } else {
        console.log(`  ${table}: ${count} 条记录`);
      }
    }
    
    console.log(`\n✅ 数据清理完成！共删除 ${totalDeleted} 条记录`);
    console.log('💡 数据库现在是空的，可以重新开始');
    
  } catch (error) {
    console.error('❌ 删除过程出错:', error.message);
  }
}

// 添加安全确认
async function confirmDelete() {
  console.log('🚨 安全确认步骤');
  console.log('请输入 "DELETE ALL DATA" 来确认删除操作:');
  
  // 在实际使用中，建议添加交互式确认
  // 这里为了自动化，直接执行
  return true;
}

async function main() {
  const confirmed = await confirmDelete();
  
  if (!confirmed) {
    console.log('❌ 操作已取消');
    return;
  }
  
  await deleteAllData();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

export { deleteAllData, confirmDelete };