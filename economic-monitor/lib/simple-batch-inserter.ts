// 简化的批量插入器
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BatchInserterConfig {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BatchInsertResult {
  success: boolean;
  inserted: number;
  errors: string[] | null;
}

export async function batchInsertEconomicData(
  data: any[],
  config: BatchInserterConfig = {}
): Promise<BatchInsertResult> {
  const {
    batchSize = 100,
    maxRetries = 3,
    retryDelay = 1000
  } = config;

  if (!data || data.length === 0) {
    return { success: true, inserted: 0, errors: null };
  }

  console.log(`[Batch Insert] Processing ${data.length} records in batches of ${batchSize}`);
  
  let totalInserted = 0;
  const allErrors: string[] = [];
  
  // 分批处理数据
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        console.log(`[Batch Insert] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} (${batch.length} records)`);
        
        const { data: insertedData, error } = await supabase
          .from('economic_data')
          .insert(batch)
          .select();
        
        if (error) {
          throw error;
        }
        
        const insertedCount = insertedData?.length || 0;
        totalInserted += insertedCount;
        
        console.log(`[Batch Insert] ✅ Batch inserted successfully: ${insertedCount} records`);
        break; // 成功，跳出重试循环
        
      } catch (error) {
        retries++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (retries > maxRetries) {
          const errorMsg = `Failed to insert batch ${Math.floor(i / batchSize) + 1} after ${maxRetries} retries: ${errorMessage}`;
          allErrors.push(errorMsg);
          console.error(`[Batch Insert] ❌ ${errorMsg}`);
        } else {
          console.warn(`[Batch Insert] ⚠️ Batch ${Math.floor(i / batchSize) + 1} failed (attempt ${retries}/${maxRetries}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
        }
      }
    }
  }
  
  const success = allErrors.length === 0;
  console.log(`[Batch Insert] ${success ? '✅ Completed' : '⚠️ Completed with errors'}: ${totalInserted}/${data.length} records inserted`);
  
  if (allErrors.length > 0) {
    console.error(`[Batch Insert] Errors encountered:`, allErrors);
  }
  
  return {
    success,
    inserted: totalInserted,
    errors: allErrors.length > 0 ? allErrors : null
  };
}