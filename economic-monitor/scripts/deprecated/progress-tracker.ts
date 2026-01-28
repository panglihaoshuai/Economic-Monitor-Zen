/**
 * 实时进度跟踪器
 * 提供详细的同步进度、速度统计和ETA计算
 */
import { 
  sync_progress, 
  collection_runs,
  data_source_config,
  InsertSyncProgress,
  InsertCollectionRun,
  sync_checkpoints
} from './database/schema'
import { Database } from 'bun:sqlite'
import { format, formatDistanceToNow, subSeconds } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface ProgressStats {
  totalRecords: number
  processedRecords: number
  successRecords: number
  failedRecords: number
  duplicateRecords: number
  updatedRecords: number
  progressPercentage: number
  recordsPerSecond: number
  estimatedTimeRemaining: number | null
  startTime: Date | null
  lastUpdateTime: Date | null
  currentBatchNumber: number
  errorsInLastHour: number
  recentErrors: Array<{
    batch_number: number
    error_message: string
    error_time: Date
  }>
}

export interface DataCollectionStats {
  dataSource: string
  collectedToday: number
  weekOverWeek: number
  monthOverMonth: number
  lastCollectionTime: Date | null
  avgProcessingTime: number
  dataQualityScore: number
}

export class ProgressTracker {
  private db: Database
  private runId: string | null = null
  private lastProgressUpdate: ProgressStats | null = null
  private progressUpdateInterval: NodeJS.Timeout | null = null

  constructor(db: Database) {
    this.db = db
  }

  /**
   * 启动新的数据收集运行
   */
  async startCollectionRun(dataSource: string, config?: Record<string, any>): Promise<string> {
    try {
      const runId = `run_${dataSource}_${Date.now()}`
      
      const runData: InsertCollectionRun = {
        run_id: runId,
        data_source: dataSource,
        start_time: new Date(),
        status: 'running',
        records_processed: 0,
        records_found: 0,
        records_updated: 0,
        records_failed: 0,
        duplicate_records: 0,
        avg_processing_time: 0,
        config: JSON.stringify(config || {})
      }

      this.db.prepare(`
        INSERT INTO collection_runs (
          run_id, data_source, start_time, status, records_processed,
          records_found, records_updated, records_failed, duplicate_records,
          avg_processing_time, config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        runData.run_id,
        runData.data_source,
        runData.start_time?.toISOString(),
        runData.status,
        runData.records_processed,
        runData.records_found,
        runData.records_updated,
        runData.records_failed,
        runData.duplicate_records,
        runData.avg_processing_time,
        runData.config
      )

      this.runId = runId

      // 启动自动进度更新
      this.startProgressUpdates()

      return runId
    } catch (error) {
      throw new Error(`启动收集运行失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 更新同步进度
   */
  async updateProgress(
    recordsAdded: number = 0,
    recordsUpdated: number = 0,
    recordsFailed: number = 0,
    errorMessage?: string
  ): Promise<void> {
    if (!this.runId) {
      throw new Error('没有活动的收集运行')
    }

    try {
      const run = this.db.prepare(`
        SELECT * FROM collection_runs WHERE run_id = ? AND status = 'running'
      `).get(this.runId) as collection_runs | undefined

      if (!run) {
        throw new Error('未找到活动的收集运行')
      }

      // 更新集合运行统计
      const newProcessed = run.records_processed + recordsAdded + recordsUpdated + recordsFailed
      const newUpdated = run.records_updated + recordsUpdated
      const newFailed = run.records_failed + recordsFailed
      
      this.db.prepare(`
        UPDATE collection_runs 
        SET records_processed = ?, records_updated = ?, records_failed = ?, last_update = ?
        WHERE run_id = ?
      `).run(newProcessed, newUpdated, newFailed, new Date().toISOString(), this.runId)

      // 记录进度快照
      await this.recordProgressSnapshot(newProcessed, newUpdated, newFailed)

      // 记录错误（如果有）
      if (errorMessage && recordsFailed > 0) {
        await this.recordError(errorMessage)
      }

    } catch (error) {
      console.error('更新进度失败:', error)
    }
  }

  /**
   * 记录进度快照
   */
  private async recordProgressSnapshot(
    processedRecords: number,
    updatedRecords: number,
    failedRecords: number
  ): Promise<void> {
    if (!this.runId) return

    try {
      // 获取当前快照编号
      const maxSnapshot = this.db.prepare(`
        SELECT COALESCE(MAX(snapshot_id), 0) as max_id 
        FROM sync_progress 
        WHERE run_id = ?
      `).get(this.runId) as { max_id: number } | undefined

      const nextSnapshotId = (maxSnapshot?.max_id || 0) + 1

      // 计算处理速度
      const recentSnapshots = this.db.prepare(`
        SELECT * FROM sync_progress 
        WHERE run_id = ? AND snapshot_id >= ?
        ORDER BY snapshot_id ASC
      `).all(this.runId, Math.max(1, nextSnapshotId - 10)) as sync_progress[]

      let recordsPerSecond = 0
      if (recentSnapshots.length > 0) {
        const firstSnapshot = recentSnapshots[0]
        const timeDiff = Date.now() - new Date(firstSnapshot.recorded_at).getTime()
        const recordDiff = processedRecords - firstSnapshot.processed_records
        
        if (timeDiff > 0) {
          recordsPerSecond = (recordDiff / timeDiff) * 1000
        }
      }

      const progressData: InsertSyncProgress = {
        run_id: this.runId,
        snapshot_id: nextSnapshotId,
        processed_records: processedRecords,
        success_records: processedRecords - failedRecords,
        failed_records: failedRecords,
        duplicate_records: 0, // 将在批量插入时更新
        updated_records: updatedRecords,
        records_per_second: recordsPerSecond,
        progress_percentage: 0, // 将在updateFinalStats中计算
        error_count: 0, // 将单独计算
        recorded_at: new Date()
      }

      this.db.prepare(`
        INSERT INTO sync_progress (
          run_id, snapshot_id, processed_records, success_records,
          failed_records, duplicate_records, updated_records,
          records_per_second, progress_percentage, error_count, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        progressData.run_id,
        progressData.snapshot_id,
        progressData.processed_records,
        progressData.success_records,
        progressData.failed_records,
        progressData.duplicate_records,
        progressData.updated_records,
        progressData.records_per_second,
        progressData.progress_percentage,
        progressData.error_count,
        progressData.recorded_at?.toISOString()
      )

    } catch (error) {
      console.error('记录进度快照失败:', error)
    }
  }

  /**
   * 记录错误
   */
  private async recordError(errorMessage: string): Promise<void> {
    if (!this.runId) return

    try {
      const maxSnapshot = this.db.prepare(`
        SELECT COALESCE(MAX(snapshot_id), 0) as max_id 
        FROM sync_progress 
        WHERE run_id = ?
      `).get(this.runId) as { max_id: number } | undefined

      const snapshotId = maxSnapshot?.max_id || 1

      // 记录到sync_checkpoints表作为错误检查点
      this.db.prepare(`
        INSERT INTO sync_checkpoints (
          run_id, checkpoint_id, checkpoint_type, data_source,
          status, start_position, current_position, total_records,
          records_processed, error_count, last_error, checkpoint_data, created_at
        ) VALUES (?, ?, 'error_checkpoint', ?, 'error', 0, 0, 0, 1, 1, ?, ?, ?)
      `).run(
        this.runId,
        `error_${Date.now()}`,
        this.runId.split('_')[1] || 'unknown',
        errorMessage,
        JSON.stringify({ error_message: errorMessage, timestamp: new Date() }),
        new Date().toISOString()
      )

    } catch (error) {
      console.error('记录错误失败:', error)
    }
  }

  /**
   * 获取当前进度统计
   */
  async getCurrentProgress(): Promise<ProgressStats> {
    if (!this.runId) {
      throw new Error('没有活动的收集运行')
    }

    try {
      // 获取集合运行信息
      const run = this.db.prepare(`
        SELECT * FROM collection_runs WHERE run_id = ?
      `).get(this.runId) as collection_runs | undefined

      if (!run) {
        throw new Error('未找到收集运行')
      }

      // 获取最新的进度快照
      const latestSnapshot = this.db.prepare(`
        SELECT * FROM sync_progress 
        WHERE run_id = ? 
        ORDER BY snapshot_id DESC 
        LIMIT 1
      `).get(this.runId) as sync_progress | undefined

      // 获取最近1小时的错误
      const oneHourAgo = subSeconds(new Date(), 3600).toISOString()
      const recentErrorsQuery = this.db.prepare(`
        SELECT run_id, checkpoint_id as batch_number, last_error as error_message, created_at as error_time
        FROM sync_checkpoints 
        WHERE run_id = ? AND checkpoint_type = 'error_checkpoint' AND created_at > ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(this.runId, oneHourAgo) as Array<{
        batch_number: string
        error_message: string
        error_time: string
      }>

      // 获取总记录数（从数据源配置或实际表中获取）
      const totalRecords = await this.getTotalRecordsCount(run.data_source)

      const processedRecords = latestSnapshot?.processed_records || run.records_processed
      const successRecords = latestSnapshot?.success_records || (run.records_processed - run.records_failed)
      const failedRecords = latestSnapshot?.failed_records || run.records_failed
      const updatedRecords = latestSnapshot?.updated_records || run.records_updated
      const duplicateRecords = latestSnapshot?.duplicate_records || 0

      const progressPercentage = totalRecords > 0 ? (processedRecords / totalRecords) * 100 : 0
      const recordsPerSecond = latestSnapshot?.records_per_second || 0

      // 计算预估剩余时间
      let estimatedTimeRemaining: number | null = null
      if (recordsPerSecond > 0 && totalRecords > processedRecords) {
        estimatedTimeRemaining = (totalRecords - processedRecords) / recordsPerSecond
      }

      const stats: ProgressStats = {
        totalRecords,
        processedRecords,
        successRecords,
        failedRecords,
        duplicateRecords,
        updatedRecords,
        progressPercentage,
        recordsPerSecond,
        estimatedTimeRemaining,
        startTime: run.start_time ? new Date(run.start_time) : null,
        lastUpdateTime: run.last_update ? new Date(run.last_update) : null,
        currentBatchNumber: latestSnapshot?.snapshot_id || 0,
        errorsInLastHour: recentErrorsQuery.length,
        recentErrors: recentErrorsQuery.map(err => ({
          ...err,
          batch_number: parseInt(err.batch_number.replace(/\D/g, '')) || 0,
          error_time: new Date(err.error_time)
        }))
      }

      this.lastProgressUpdate = stats
      return stats

    } catch (error) {
      throw new Error(`获取进度统计失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取数据收集统计
   */
  async getCollectionStats(dataSource?: string): Promise<DataCollectionStats[]> {
    try {
      let whereClause = ''
      const params: any[] = []

      if (dataSource) {
        whereClause = 'WHERE data_source = ?'
        params.push(dataSource)
      }

      const query = `
        SELECT 
          data_source,
          COUNT(*) as runs_today,
          AVG(records_processed) as avg_processed,
          MAX(last_update) as last_collection
        FROM collection_runs 
        ${whereClause}
        AND DATE(start_time) = DATE('now')
        GROUP BY data_source
      `

      const results = this.db.prepare(query).all(...params) as Array<{
        data_source: string
        runs_today: number
        avg_processed: number
        last_collection: string
      }>

      const stats: DataCollectionStats[] = []

      for (const result of results) {
        // 计算周同比和月同比
        const weekOverWeek = await this.calculateGrowth(result.data_source, 'week')
        const monthOverMonth = await this.calculateGrowth(result.data_source, 'month')

        // 获取平均处理时间
        const avgProcessingTime = this.db.prepare(`
          SELECT AVG(avg_processing_time) as avg_time
          FROM collection_runs 
          WHERE data_source = ? AND avg_processing_time > 0
        `).get(result.data_source) as { avg_time: number } | undefined

        // 计算数据质量分数
        const qualityScore = await this.calculateDataQualityScore(result.data_source)

        stats.push({
          dataSource: result.data_source,
          collectedToday: result.avg_processed || 0,
          weekOverWeek,
          monthOverMonth,
          lastCollectionTime: result.last_collection ? new Date(result.last_collection) : null,
          avgProcessingTime: avgProcessingTime?.avg_time || 0,
          dataQualityScore: qualityScore
        })
      }

      return stats

    } catch (error) {
      throw new Error(`获取收集统计失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取格式化的进度报告
   */
  async getFormattedProgressReport(): Promise<string> {
    try {
      const progress = await this.getCurrentProgress()
      const runInfo = this.db.prepare(`
        SELECT data_source, start_time, status 
        FROM collection_runs 
        WHERE run_id = ?
      `).get(this.runId) as { data_source: string; start_time: string; status: string } | undefined

      if (!runInfo) {
        return '❌ 未找到活动运行'
      }

      const startTime = new Date(runInfo.start_time)
      const duration = formatDistanceToNow(startTime, { addSuffix: false, locale: zhCN })
      
      let report = `📊 **${runInfo.data_source}** 数据同步进度报告\n\n`
      
      // 基础进度
      report += `🎯 **进度概览**\n`
      report += `• 总记录数: ${progress.totalRecords.toLocaleString()}\n`
      report += `• 已处理: ${progress.processedRecords.toLocaleString()} (${progress.progressPercentage.toFixed(1)}%)\n`
      report += `• 成功: ${progress.successRecords.toLocaleString()}\n`
      report += `• 失败: ${progress.failedRecords.toLocaleString()}\n`
      report += `• 更新: ${progress.updatedRecords.toLocaleString()}\n`
      if (progress.duplicateRecords > 0) {
        report += `• 重复: ${progress.duplicateRecords.toLocaleString()}\n`
      }

      // 速度和ETA
      report += `\n⚡ **性能指标**\n`
      report += `• 处理速度: ${progress.recordsPerSecond.toFixed(1)} 记录/秒\n`
      if (progress.estimatedTimeRemaining) {
        const eta = formatDistanceToNow(Date.now() + progress.estimatedTimeRemaining * 1000, { 
          addSuffix: false, locale: zhCN 
        })
        report += `• 预计完成: ${eta}\n`
      } else {
        report += `• 预计完成: 计算中...\n`
      }
      
      // 时间信息
      report += `\n⏰ **时间信息**\n`
      report += `• 开始时间: ${format(startTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}\n`
      report += `• 运行时长: ${duration}\n`
      if (progress.lastUpdateTime) {
        report += `• 最后更新: ${format(progress.lastUpdateTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}\n`
      }

      // 错误信息
      if (progress.errorsInLastHour > 0) {
        report += `\n⚠️ **最近错误** (${progress.errorsInLastHour}个)\n`
        progress.recentErrors.slice(0, 3).forEach((error, index) => {
          report += `${index + 1}. ${error.error_message.substring(0, 100)}...\n`
        })
        if (progress.recentErrors.length > 3) {
          report += `... 还有${progress.recentErrors.length - 3}个错误\n`
        }
      }

      report += `\n🔧 **当前批次**: #${progress.currentBatchNumber}\n`
      report += `📈 **状态**: ${runInfo.status === 'running' ? '🟢 运行中' : '🟡 ' + runInfo.status}\n`

      return report

    } catch (error) {
      return `❌ 生成进度报告失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  /**
   * 完成收集运行
   */
  async completeCollectionRun(status: 'completed' | 'failed' = 'completed', finalStats?: Partial<ProgressStats>): Promise<void> {
    if (!this.runId) {
      throw new Error('没有活动的收集运行')
    }

    try {
      // 更新最终统计
      if (finalStats) {
        await this.updateFinalStats(finalStats)
      }

      // 标记运行完成
      this.db.prepare(`
        UPDATE collection_runs 
        SET status = ?, end_time = ?, last_update = ?
        WHERE run_id = ?
      `).run(status, new Date().toISOString(), new Date().toISOString(), this.runId)

      // 停止进度更新
      this.stopProgressUpdates()

    } catch (error) {
      throw new Error(`完成收集运行失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 启动自动进度更新
   */
  private startProgressUpdates(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval)
    }

    this.progressUpdateInterval = setInterval(async () => {
      try {
        if (this.runId) {
          await this.getCurrentProgress()
        }
      } catch (error) {
        console.error('自动进度更新失败:', error)
      }
    }, 5000) // 每5秒更新一次
  }

  /**
   * 停止自动进度更新
   */
  private stopProgressUpdates(): void {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval)
      this.progressUpdateInterval = null
    }
  }

  /**
   * 获取总记录数
   */
  private async getTotalRecordsCount(dataSource: string): Promise<number> {
    try {
      // 根据数据源获取相应的记录数
      const tableMap: Record<string, string> = {
        'futures': 'futures_data',
        'stock_indices': 'stock_index_data',
        'macro_data': 'macro_economic_data',
        'commodities': 'commodity_futures_data',
        'global_markets': 'global_market_data',
        'bonds': 'bond_data'
      }

      const tableName = tableMap[dataSource]
      if (tableName) {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }
        return count.count
      }

      // 如果没有对应的表，返回一个较大的估计值
      return 100000

    } catch (error) {
      console.error('获取总记录数失败:', error)
      return 100000
    }
  }

  /**
   * 计算增长率
   */
  private async calculateGrowth(dataSource: string, period: 'week' | 'month'): Promise<number> {
    try {
      let dateFormat = ''
      if (period === 'week') {
        dateFormat = "DATE(start_time, '-7 days')"
      } else {
        dateFormat = "DATE(start_time, '-30 days')"
      }

      const current = this.db.prepare(`
        SELECT AVG(records_processed) as avg_current
        FROM collection_runs 
        WHERE data_source = ? AND DATE(start_time) >= DATE('now')
      `).get(dataSource) as { avg_current: number } | undefined

      const previous = this.db.prepare(`
        SELECT AVG(records_processed) as avg_previous
        FROM collection_runs 
        WHERE data_source = ? AND DATE(start_time) >= ${dateFormat} AND DATE(start_time) < DATE('now')
      `).get(dataSource) as { avg_previous: number } | undefined

      if (!current?.avg_current || !previous?.avg_previous || previous.avg_previous === 0) {
        return 0
      }

      return ((current.avg_current - previous.avg_previous) / previous.avg_previous) * 100

    } catch (error) {
      console.error('计算增长率失败:', error)
      return 0
    }
  }

  /**
   * 计算数据质量分数
   */
  private async calculateDataQualityScore(dataSource: string): Promise<number> {
    try {
      // 基于成功率、重复率、错误率等计算质量分数
      const recentRuns = this.db.prepare(`
        SELECT 
          AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_rate,
          AVG(duplicate_records / NULLIF(records_processed, 0)) as duplicate_rate,
          AVG(records_failed / NULLIF(records_processed, 0)) as error_rate
        FROM collection_runs 
        WHERE data_source = ? AND start_time >= DATE('now', '-7 days')
      `).get(dataSource) as { 
        success_rate: number; 
        duplicate_rate: number; 
        error_rate: number 
      } | undefined

      if (!recentRuns) {
        return 85 // 默认分数
      }

      const successRate = recentRuns.success_rate || 0
      const duplicateRate = recentRuns.duplicate_rate || 0
      const errorRate = recentRuns.error_rate || 0

      // 质量分数计算：成功率权重60%，重复率权重20%，错误率权重20%
      const qualityScore = (successRate * 60) + ((1 - Math.min(duplicateRate * 10, 1)) * 20) + ((1 - Math.min(errorRate * 10, 1)) * 20)

      return Math.round(qualityScore)

    } catch (error) {
      console.error('计算数据质量分数失败:', error)
      return 85
    }
  }

  /**
   * 更新最终统计
   */
  private async updateFinalStats(stats: Partial<ProgressStats>): Promise<void> {
    if (!this.runId) return

    try {
      if (stats.duplicateRecords !== undefined) {
        this.db.prepare(`
          UPDATE collection_runs 
          SET duplicate_records = ?
          WHERE run_id = ?
        `).run(stats.duplicateRecords, this.runId)
      }
    } catch (error) {
      console.error('更新最终统计失败:', error)
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopProgressUpdates()
    this.runId = null
    this.lastProgressUpdate = null
  }

  /**
   * 获取当前运行ID
   */
  getRunId(): string | null {
    return this.runId
  }

  /**
   * 检查是否有活动运行
   */
  hasActiveRun(): boolean {
    return this.runId !== null
  }
}

// 导出实例化函数
export function createProgressTracker(db: Database): ProgressTracker {
  return new ProgressTracker(db)
}