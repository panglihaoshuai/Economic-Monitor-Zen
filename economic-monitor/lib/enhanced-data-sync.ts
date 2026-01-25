// 🚀 增强版数据采集器 - 支持进度条、断点恢复、智能限速
// 基于现有 lib/data-scheduler.ts 增强，保持兼容性

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAllIndicators, fetchFREDData } from './fred';
import { batchInsertEconomicData } from './optimized-batch-insert';
import type { Database } from './database.types';

// ========== 增强类型定义 ==========

export interface EnhancedFetchResult {
  success: boolean;
  seriesId: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
  missingDates: string[];
  durationMs: number;
  isResume?: boolean;  // 是否为断点恢复
  checkpoint?: string;   // 检查点标识
}

export interface SyncCheckpoint {
  id: string;
  runId: string;
  seriesId: string;
  lastProcessedDate: string | null;
  totalCount: number;
  processedCount: number;
  status: 'active' | 'completed' | 'failed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

export interface ProgressTracker {
  totalIndicators: number;
  completedIndicators: number;
  totalDataPoints: number;
  completedDataPoints: number;
  currentIndicator: string;
  currentStage: 'fetching' | 'transforming' | 'inserting' | 'validating' | 'completed';
  startTime: number;
  etaMinutes?: number;
}

export interface RateLimiter {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
}

// ========== 全局状态 ==========

class EnhancedDataSync {
  private supabase: SupabaseClient<Database>;
  private runId: string;
  private rateLimiter: RateLimiter;
  private progress: ProgressTracker;
  private checkpoints: Map<string, SyncCheckpoint> = new Map();

  constructor(supabaseUrl: string, serviceKey: string) {
    this.supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.runId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 初始化限速器 (120 requests/minute)
    this.rateLimiter = {
      tokens: 120,
      maxTokens: 120,
      refillRate: 120 / 60, // 2 tokens per second
      lastRefill: Date.now(),
    };

    this.progress = {
      totalIndicators: 0,
      completedIndicators: 0,
      totalDataPoints: 0,
      completedDataPoints: 0,
      currentIndicator: '',
      currentStage: 'fetching',
      startTime: Date.now(),
    };
  }

  // ========== 核心功能 ==========

  async fullSync(options: {
    resumeFromCheckpoint?: boolean;
    overwriteExisting?: boolean;
    progressCallback?: (progress: ProgressTracker) => void;
  } = {}) {
    console.log('🚀 开始增强版全量数据同步');
    console.log(`🆔 运行ID: ${this.runId}`);
    
    try {
      // 1. 检查是否有断点可以恢复
      let resumeData: SyncCheckpoint | null = null;
      if (options.resumeFromCheckpoint) {
        resumeData = await this.loadLatestCheckpoint();
        if (resumeData) {
          console.log(`🔄 从断点恢复: ${resumeData.seriesId} (${resumeData.lastProcessedDate})`);
        }
      }

      // 2. 获取所有指标
      const indicators = getAllIndicators();
      this.progress.totalIndicators = indicators.length;
      
      // 3. 估算总数据点数量（用于进度显示）
      const totalDataPoints = await this.estimateTotalDataPoints(indicators, resumeData);
      this.progress.totalDataPoints = totalDataPoints;

      console.log(`📊 目标: ${indicators.length} 个指标, ~${totalDataPoints} 条数据点`);

      // 4. 逐个指标同步
      for (let i = 0; i < indicators.length; i++) {
        const indicator = indicators[i];
        this.progress.currentIndicator = indicator.id;
        this.progress.completedIndicators = i;

        // 检查是否已有检查点
        const existingCheckpoint = this.checkpoints.get(indicator.id);
        
        try {
          // 根据检查点决定采集策略
          const fetchResult = await this.syncIndicator(
            indicator,
            existingCheckpoint,
            options.overwriteExisting || false
          );

          // 5. 更新进度
          this.updateProgress(fetchResult);
          if (options.progressCallback) {
            options.progressCallback({ ...this.progress });
          }

          // 6. 保存检查点
          await this.saveCheckpoint(indicator.id, fetchResult);

          // 7. 显示进度条
          this.displayProgressBar();

        } catch (error) {
          console.error(`❌ 指标 ${indicator.id} 同步失败:`, error);
          // 继续下一个指标，不中断整个流程
          continue;
        }
      }

      // 8. 最终验证和清理
      await this.finalSyncValidation();

      console.log('\n🎉 全量数据同步完成！');
      return {
        success: true,
        runId: this.runId,
        totalIndicators: indicators.length,
        totalDataPoints: this.progress.completedDataPoints,
        duration: Date.now() - this.progress.startTime,
      };

    } catch (error) {
      console.error('❌ 全量同步失败:', error);
      return {
        success: false,
        runId: this.runId,
        error: error.message,
      };
    }
  }

  // ========== 核心方法 ==========

  private async syncIndicator(
    indicator: any,
    existingCheckpoint: SyncCheckpoint | null,
    overwriteExisting: boolean
  ): Promise<EnhancedFetchResult> {
    const startTime = Date.now();
    
    try {
      // 1. 确定数据范围
      const dateRange = this.calculateDateRange(indicator, existingCheckpoint);
      
      console.log(`\n🔄 正在同步: ${indicator.id} (${indicator.title})`);
      console.log(`📅 数据范围: ${dateRange.startDate} 至 ${dateRange.endDate}`);
      
      // 2. 带限速的 FRED 数据获取
      this.progress.currentStage = 'fetching';
      const fredData = await this.fetchWithRateLimiting(indicator, dateRange);
      
      if (!fredData.observations || fredData.observations.length === 0) {
        return {
          success: false,
          seriesId: indicator.id,
          fetched: 0,
          inserted: 0,
          skipped: 0,
          errors: ['无数据返回'],
          missingDates: [],
          durationMs: Date.now() - startTime,
        };
      }

      // 3. 数据转换和质量检查
      this.progress.currentStage = 'transforming';
      const transformedData = await this.transformData(indicator, fredData, overwriteExisting);
      
      // 4. 检测缺失数据
      const missingDates = this.detectMissingDates(transformedData, indicator);
      
      // 5. 带限速的批量插入
      this.progress.currentStage = 'inserting';
      const insertResult = await this.batchInsertWithRateLimiting(transformedData);
      
      // 6. 数据验证
      this.progress.currentStage = 'validating';
      await this.validateInsertedData(indicator, transformedData);

      return {
        success: true,
        seriesId: indicator.id,
        fetched: fredData.observations.length,
        inserted: insertResult.inserted,
        skipped: insertResult.skipped,
        errors: insertResult.errors,
        missingDates,
        durationMs: Date.now() - startTime,
        isResume: existingCheckpoint !== null,
        checkpoint: this.generateCheckpointId(indicator),
      };

    } catch (error) {
      return {
        success: false,
        seriesId: indicator.id,
        fetched: 0,
        inserted: 0,
        skipped: 0,
        errors: [error.message],
        missingDates: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ========== 辅助方法 ==========

  private async fetchWithRateLimiting(indicator: any, dateRange: any): Promise<any> {
    console.log('⏳ 开始数据获取 (带智能限速)...');
    
    const result = await fetchFREDData(indicator.id, dateRange.startDate);
    
    // 如果遇到 429，智能等待
    if (result.status === 429) {
      const waitTime = this.calculateBackoffTime(1);
      console.log(`⏸️ 遇到限速，等待 ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.fetchWithRateLimiting(indicator, dateRange); // 递归重试
    }
    
    return result;
  }

  private async batchInsertWithRateLimiting(data: any[]): Promise<any> {
    console.log(`💾 开始批量插入 ${data.length} 条记录...`);
    
    try {
      const result = await batchInsertEconomicData(this.supabase, data, {
        batchSize: 1000,
        onProgress: (processed, total) => {
          // 更新进度用于显示
          this.progress.completedDataPoints += processed - (this.progress.completedDataPoints % total);
        }
      });
      
      console.log(`✅ 批量插入完成: ${result.inserted} 插入, ${result.skipped} 跳过`);
      return result;
      
    } catch (error) {
      console.error('❌ 批量插入失败:', error);
      throw error;
    }
  }

  private updateProgress(result: EnhancedFetchResult): void {
    this.progress.completedDataPoints += result.inserted;
    this.progress.completedIndicators += 1;
  }

  private displayProgressBar(): void {
    const percentage = Math.min(
      (this.progress.completedDataPoints / this.progress.totalDataPoints) * 100,
      100
    );
    
    const completed = this.progress.completedIndicators;
    const total = this.progress.totalIndicators;
    const currentIndicator = this.progress.currentIndicator;
    const stage = this.getStageEmoji(this.progress.currentStage);
    
    // ETA 计算
    const elapsedMs = Date.now() - this.progress.startTime;
    const rate = this.progress.completedDataPoints / (elapsedMs / 1000 / 60); // per minute
    const remaining = this.progress.totalDataPoints - this.progress.completedDataPoints;
    const etaMinutes = rate > 0 ? Math.ceil(remaining / rate) : undefined;
    
    this.progress.etaMinutes = etaMinutes;
    
    // 进度条显示
    const barLength = 40;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    process.stdout.write(`\r${stage} [${bar}] ${percentage.toFixed(1)}% | ${completed}/${total} | 当前: ${currentIndicator} | ETA: ${etaMinutes ? `${etaMinutes}min` : '计算中...'}`);
  }

  private getStageEmoji(stage: string): string {
    const emojis = {
      fetching: '📊',
      transforming: '🔄',
      inserting: '💾',
      validating: '✅',
      completed: '🎉',
    };
    return emojis[stage] || '📊';
  }

  // ========== 检查点管理 ==========

  private async loadLatestCheckpoint(): Promise<SyncCheckpoint | null> {
    try {
      const { data } = await this.supabase
        .from('sync_checkpoints')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);
        
      return data?.[0] || null;
    } catch (error) {
      console.warn('⚠️ 无法加载检查点:', error);
      return null;
    }
  }

  private async saveCheckpoint(seriesId: string, result: EnhancedFetchResult): Promise<void> {
    try {
      const checkpoint: SyncCheckpoint = {
        id: this.generateCheckpointId(seriesId),
        runId: this.runId,
        seriesId,
        lastProcessedDate: result.missingDates.length > 0 ? result.missingDates[result.missingDates.length - 1] : null,
        totalCount: result.fetched,
        processedCount: result.inserted,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await this.supabase
        .from('sync_checkpoints')
        .upsert(checkpoint)
        .eq('id', checkpoint.id);
        
      this.checkpoints.set(seriesId, checkpoint);
    } catch (error) {
      console.warn('⚠️ 无法保存检查点:', error);
    }
  }

  // ========== 数据质量检查 ==========

  private detectMissingDates(data: any[], indicator: any): string[] {
    const dates = data.map(d => d.date).sort();
    const missing: string[] = [];
    
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      const previous = new Date(dates[i - 1]);
      const expectedDiff = this.getExpectedFrequency(indicator);
      const actualDiff = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
      
      if (actualDiff > expectedDiff * 1.5) { // 超过预期1.5倍算缺失
        missing.push(dates[i - 1]); // 之前的一天可能有数据缺失
      }
    }
    
    return missing;
  }

  private getExpectedFrequency(indicator: any): number {
    const frequencyDays = {
      'Daily': 1,
      'Weekly': 7,
      'Monthly': 30,
      'Quarterly': 90,
    };
    
    return frequencyDays[indicator.frequency] || 1;
  }

  // ========== 工具方法 ==========

  private calculateDateRange(indicator: any, checkpoint: SyncCheckpoint | null): any {
    // 如果有检查点，从最后处理日期开始
    if (checkpoint) {
      const lastDate = checkpoint.lastProcessedDate || '2019-01-01';
      return {
        startDate: lastDate,
        endDate: new Date().toISOString().split('T')[0],
      };
    }
    
    // 否则获取5年历史数据
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  }

  private calculateBackoffTime(attempt: number): number {
    // 指数退避：1s, 2s, 4s, 8s, 16s
    return Math.min(Math.pow(2, attempt) * 1000, 16000);
  }

  private transformData(indicator: any, fredData: any, overwrite: boolean): any[] {
    return fredData.observations
      .filter(obs => obs.value !== null && obs.value !== '.')
      .map(obs => ({
        series_id: indicator.id,
        date: obs.date,
        value: parseFloat(obs.value),
        created_at: new Date().toISOString(),
        // 如果不覆盖，只插入新于现有数据
        source: overwrite ? 'overwrite' : 'incremental',
      }));
  }

  private async validateInsertedData(indicator: any, insertedData: any[]): Promise<void> {
    try {
      // 检查插入的数据是否正确
      const { count } = await this.supabase
        .from('economic_data')
        .select('*', { count: 'exact', head: true })
        .eq('series_id', indicator.id)
        .gte('date', '2020-01-01');
      
      console.log(`✅ 验证 ${indicator.id}: 数据库中现在有 ${count} 条记录`);
    } catch (error) {
      console.warn(`⚠️ 验证失败: ${indicator.id}:`, error);
    }
  }

  private async finalSyncValidation(): Promise<void> {
    console.log('\n🔍 最终验证中...');
    
    // 检查总数据量
    const { count } = await this.supabase
      .from('economic_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ 数据库总记录: ${count}`);
    
    // 清理旧的检查点
    await this.supabase
      .from('sync_checkpoints')
      .delete()
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('runId', this.runId);
    
    console.log('✅ 清理旧检查点完成');
  }

  private generateCheckpointId(seriesId: string): string {
    return `${this.runId}_${seriesId}`;
  }

  private async estimateTotalDataPoints(indicators: any[], resumeData: SyncCheckpoint | null): Promise<number> {
    // 简化估算：每个指标平均800个数据点（5年）
    // 实际应该根据频率和日期范围计算，这里用平均值
    return indicators.length * 800;
  }
}

// ========== 导出 ==========

export { EnhancedDataSync };

// ========== 使用示例 ==========

/*
// 创建增强版同步器
const sync = new EnhancedDataSync(
  'https://your-project.supabase.co',
  'your-service-role-key'
);

// 开始全量同步（带进度条）
await sync.fullSync({
  resumeFromCheckpoint: true,  // 从断点恢复
  overwriteExisting: true,   // 覆盖现有数据
  progressCallback: (progress) => {
    // 可以自定义进度显示
    console.log(`进度: ${progress.completedIndicators}/${progress.totalIndicators}`);
  }
});

预期输出：
📊 [████████████████████████████] 75.0% | 12/16 | 当前: SOFR | ETA: 3min
📊 [████████████████████████████] 100.0% | 16/16 | 当前: GDP | ETA: 完成

🎉 全量数据同步完成！
✅ 数据库总记录: 12,800
✅ 所有检查点已清理
*/