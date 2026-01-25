/**
 * 断点管理器 - 实现断点重传和错误恢复
 * 支持数据同步中断后的精确恢复
 */
import { 
  sync_checkpoints,
  InsertSyncCheckpoint,
  sync_progress,
  collection_runs
} from './database/schema'
import { Database } from 'bun:sqlite'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface CheckpointInfo {
  checkpointId: string
  checkpointType: 'data_checkpoint' | 'error_checkpoint' | 'batch_checkpoint'
  dataSource: string
  status: 'active' | 'completed' | 'error' | 'paused'
  startPosition: number
  currentPosition: number
  totalRecords: number
  recordsProcessed: number
  errorCount: number
  lastError?: string
  checkpointData: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface RecoveryOptions {
  resumeFromCheckpoint?: string
  resetErrors?: boolean
  maxRetries?: number
  skipProcessed?: boolean
}

export interface BatchCheckpointData {
  batchId: string
  batchSize: number
  processedItems: Array<{
    id: string
    status: 'success' | 'failed' | 'skipped'
    error?: string
    timestamp: Date
  }>
  startTime: Date
  endTime?: Date
}

export class CheckpointManager {
  private db: Database
  private runId: string | null = null
  private checkpoints: Map<string, CheckpointInfo> = new Map()
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor(db: Database) {
    this.db = db
  }

  /**
   * 初始化检查点管理器
   */
  async initialize(runId: string): Promise<void> {
    this.runId = runId
    
    // 启动自动保存检查点
    this.startAutoSave()
    
    // 加载现有的检查点
    await this.loadExistingCheckpoints()
    
    console.log(`🔄 检查点管理器已初始化，运行ID: ${runId}`)
  }

  /**
   * 创建数据检查点
   */
  async createDataCheckpoint(
    dataSource: string,
    startPosition: number,
    currentPosition: number,
    totalRecords: number,
    checkpointData: Record<string, any> = {}
  ): Promise<string> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    const checkpointId = `data_${dataSource}_${Date.now()}`

    try {
      const checkpoint: InsertSyncCheckpoint = {
        run_id: this.runId,
        checkpoint_id: checkpointId,
        checkpoint_type: 'data_checkpoint',
        data_source: dataSource,
        status: 'active',
        start_position: startPosition,
        current_position: currentPosition,
        total_records: totalRecords,
        records_processed: currentPosition - startPosition,
        error_count: 0,
        checkpoint_data: JSON.stringify(checkpointData),
        created_at: new Date()
      }

      this.db.prepare(`
        INSERT INTO sync_checkpoints (
          run_id, checkpoint_id, checkpoint_type, data_source, status,
          start_position, current_position, total_records, records_processed,
          error_count, checkpoint_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkpoint.run_id,
        checkpoint.checkpoint_id,
        checkpoint.checkpoint_type,
        checkpoint.data_source,
        checkpoint.status,
        checkpoint.start_position,
        checkpoint.current_position,
        checkpoint.total_records,
        checkpoint.records_processed,
        checkpoint.error_count,
        checkpoint.checkpoint_data,
        checkpoint.created_at?.toISOString()
      )

      // 更新内存缓存
      const checkpointInfo = await this.getCheckpointInfo(checkpointId)
      if (checkpointInfo) {
        this.checkpoints.set(checkpointId, checkpointInfo)
      }

      console.log(`📍 创建数据检查点: ${checkpointId} (位置: ${currentPosition}/${totalRecords})`)
      return checkpointId

    } catch (error) {
      throw new Error(`创建数据检查点失败: ${(error as Error).message}`)
    }
  }

  /**
   * 创建批次检查点
   */
  async createBatchCheckpoint(
    dataSource: string,
    batchId: string,
    batchData: BatchCheckpointData
  ): Promise<string> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    const checkpointId = `batch_${dataSource}_${batchId}`

    try {
      const processedCount = batchData.processedItems.filter(item => item.status === 'success').length
      const failedCount = batchData.processedItems.filter(item => item.status === 'failed').length

      const checkpoint: InsertSyncCheckpoint = {
        run_id: this.runId,
        checkpoint_id: checkpointId,
        checkpoint_type: 'batch_checkpoint',
        data_source: dataSource,
        status: 'active',
        start_position: 0,
        current_position: batchData.processedItems.length,
        total_records: batchData.batchSize,
        records_processed: processedCount,
        error_count: failedCount,
        checkpoint_data: JSON.stringify(batchData),
        created_at: new Date()
      }

      this.db.prepare(`
        INSERT INTO sync_checkpoints (
          run_id, checkpoint_id, checkpoint_type, data_source, status,
          start_position, current_position, total_records, records_processed,
          error_count, checkpoint_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkpoint.run_id,
        checkpoint.checkpoint_id,
        checkpoint.checkpoint_type,
        checkpoint.data_source,
        checkpoint.status,
        checkpoint.start_position,
        checkpoint.current_position,
        checkpoint.total_records,
        checkpoint.records_processed,
        checkpoint.error_count,
        checkpoint.checkpoint_data,
        checkpoint.created_at?.toISOString()
      )

      console.log(`📦 创建批次检查点: ${checkpointId} (${processedCount}/${batchData.batchSize} 成功)`)
      return checkpointId

    } catch (error) {
      throw new Error(`创建批次检查点失败: ${(error as Error).message}`)
    }
  }

  /**
   * 创建错误检查点
   */
  async createErrorCheckpoint(
    dataSource: string,
    error: Error,
    context: Record<string, any> = {}
  ): Promise<string> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    const checkpointId = `error_${dataSource}_${Date.now()}`

    try {
      // 获取当前数据源的最新检查点以获取位置信息
      const latestCheckpoint = this.db.prepare(`
        SELECT * FROM sync_checkpoints 
        WHERE run_id = ? AND data_source = ? AND checkpoint_type != 'error_checkpoint'
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(this.runId, dataSource) as sync_checkpoints | undefined

      const checkpoint: InsertSyncCheckpoint = {
        run_id: this.runId,
        checkpoint_id: checkpointId,
        checkpoint_type: 'error_checkpoint',
        data_source: dataSource,
        status: 'error',
        start_position: latestCheckpoint?.current_position || 0,
        current_position: latestCheckpoint?.current_position || 0,
        total_records: latestCheckpoint?.total_records || 0,
        records_processed: latestCheckpoint?.records_processed || 0,
        error_count: 1,
        checkpoint_data: JSON.stringify({
          error_message: error.message,
          error_stack: error.stack,
          context: context,
          timestamp: new Date()
        }),
        created_at: new Date()
      }

      this.db.prepare(`
        INSERT INTO sync_checkpoints (
          run_id, checkpoint_id, checkpoint_type, data_source, status,
          start_position, current_position, total_records, records_processed,
          error_count, last_error, checkpoint_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        checkpoint.run_id,
        checkpoint.checkpoint_id,
        checkpoint.checkpoint_type,
        checkpoint.data_source,
        checkpoint.status,
        checkpoint.start_position,
        checkpoint.current_position,
        checkpoint.total_records,
        checkpoint.records_processed,
        checkpoint.error_count,
        error.message,
        checkpoint.checkpoint_data,
        checkpoint.created_at?.toISOString()
      )

      console.log(`❌ 创建错误检查点: ${checkpointId} - ${error.message}`)
      return checkpointId

    } catch (dbError) {
      console.error('创建错误检查点失败:', dbError)
      throw new Error(`创建错误检查点失败: ${(dbError as Error).message}`)
    }
  }

  /**
   * 更新检查点状态
   */
  async updateCheckpointStatus(
    checkpointId: string,
    status: 'active' | 'completed' | 'error' | 'paused',
    currentPosition?: number,
    recordsProcessed?: number
  ): Promise<void> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    try {
      let updateFields = ['status = ?', 'updated_at = ?']
      const updateValues = [status, new Date().toISOString()]

      if (currentPosition !== undefined) {
        updateFields.push('current_position = ?')
        updateValues.push(currentPosition)
      }

      if (recordsProcessed !== undefined) {
        updateFields.push('records_processed = ?')
        updateValues.push(recordsProcessed)
      }

      updateValues.push(this.runId, checkpointId)

      this.db.prepare(`
        UPDATE sync_checkpoints 
        SET ${updateFields.join(', ')}
        WHERE run_id = ? AND checkpoint_id = ?
      `).run(...updateValues)

      // 更新内存缓存
      const cached = this.checkpoints.get(checkpointId)
      if (cached) {
        cached.status = status
        if (currentPosition !== undefined) cached.currentPosition = currentPosition
        if (recordsProcessed !== undefined) cached.recordsProcessed = recordsProcessed
        cached.updatedAt = new Date()
      }

      console.log(`🔄 更新检查点状态: ${checkpointId} -> ${status}`)

    } catch (error) {
      throw new Error(`更新检查点状态失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取恢复信息
   */
  async getRecoveryInfo(dataSource: string, options: RecoveryOptions = {}): Promise<{
    canResume: boolean
    lastCheckpoint?: CheckpointInfo
    recommendedAction: 'resume' | 'restart' | 'skip'
    message: string
  }> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    try {
      let checkpointId = options.resumeFromCheckpoint

      // 如果没有指定检查点，查找最新的
      if (!checkpointId) {
        const latest = this.db.prepare(`
          SELECT * FROM sync_checkpoints 
          WHERE run_id = ? AND data_source = ? AND checkpoint_type != 'error_checkpoint'
          ORDER BY created_at DESC 
          LIMIT 1
        `).get(this.runId, dataSource) as sync_checkpoints | undefined

        if (latest) {
          checkpointId = latest.checkpoint_id
        }
      }

      if (!checkpointId) {
        return {
          canResume: false,
          recommendedAction: 'restart',
          message: '未找到检查点，需要重新开始'
        }
      }

      const checkpoint = await this.getCheckpointInfo(checkpointId)
      if (!checkpoint) {
        return {
          canResume: false,
          recommendedAction: 'restart',
          message: '检查点不存在，需要重新开始'
        }
      }

      // 分析恢复可行性
      const canResume = this.canResumeFromCheckpoint(checkpoint, options)
      let recommendedAction: 'resume' | 'restart' | 'skip'
      let message: string

      if (!canResume) {
        recommendedAction = 'restart'
        message = '检查点数据不完整，建议重新开始'
      } else if (checkpoint.status === 'completed') {
        recommendedAction = 'skip'
        message = '此检查点已完成，可以跳过'
      } else if (checkpoint.errorCount > 5) {
        recommendedAction = 'restart'
        message = '错误次数过多，建议重新开始'
      } else {
        recommendedAction = 'resume'
        message = `可以从位置 ${checkpoint.currentPosition} 恢复`
      }

      return {
        canResume,
        lastCheckpoint: checkpoint,
        recommendedAction,
        message
      }

    } catch (error) {
      throw new Error(`获取恢复信息失败: ${(error as Error).message}`)
    }
  }

  /**
   * 从检查点恢复
   */
  async resumeFromCheckpoint(
    checkpointId: string,
    options: RecoveryOptions = {}
  ): Promise<{
    checkpoint: CheckpointInfo
    resumeData: Record<string, any>
    skippedItems: string[]
  }> {
    if (!this.runId) {
      throw new Error('检查点管理器未初始化')
    }

    try {
      const checkpoint = await this.getCheckpointInfo(checkpointId)
      if (!checkpoint) {
        throw new Error(`检查点不存在: ${checkpointId}`)
      }

      // 解析检查点数据
      const checkpointData = JSON.parse(checkpoint.checkpointData as string)

      // 如果需要重置错误
      if (options.resetErrors) {
        await this.resetCheckpointErrors(checkpointId)
      }

      // 获取已处理的项（如果是批次检查点）
      let skippedItems: string[] = []
      if (checkpoint.checkpointType === 'batch_checkpoint' && options.skipProcessed) {
        const batchData = checkpointData as BatchCheckpointData
        skippedItems = batchData.processedItems
          .filter(item => item.status === 'success')
          .map(item => item.id)
      }

      console.log(`🚀 从检查点恢复: ${checkpointId}`)
      console.log(`   恢复位置: ${checkpoint.currentPosition}/${checkpoint.totalRecords}`)
      console.log(`   已处理记录: ${checkpoint.recordsProcessed}`)
      if (skippedItems.length > 0) {
        console.log(`   跳过已处理项: ${skippedItems.length}`)
      }

      return {
        checkpoint,
        resumeData: checkpointData,
        skippedItems
      }

    } catch (error) {
      throw new Error(`从检查点恢复失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取检查点信息
   */
  private async getCheckpointInfo(checkpointId: string): Promise<CheckpointInfo | null> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM sync_checkpoints WHERE checkpoint_id = ?
      `).get(checkpointId) as sync_checkpoints | undefined

      if (!row) {
        return null
      }

      return {
        checkpointId: row.checkpoint_id,
        checkpointType: row.checkpoint_type,
        dataSource: row.data_source,
        status: row.status,
        startPosition: row.start_position,
        currentPosition: row.current_position,
        totalRecords: row.total_records,
        recordsProcessed: row.records_processed,
        errorCount: row.error_count,
        lastError: row.last_error || undefined,
        checkpointData: JSON.parse(row.checkpoint_data),
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at)
      }

    } catch (error) {
      console.error('获取检查点信息失败:', error)
      return null
    }
  }

  /**
   * 加载现有检查点
   */
  private async loadExistingCheckpoints(): Promise<void> {
    if (!this.runId) return

    try {
      const rows = this.db.prepare(`
        SELECT * FROM sync_checkpoints WHERE run_id = ? ORDER BY created_at DESC
      `).all(this.runId) as sync_checkpoints[]

      this.checkpoints.clear()

      for (const row of rows) {
        const checkpointInfo: CheckpointInfo = {
          checkpointId: row.checkpoint_id,
          checkpointType: row.checkpoint_type,
          dataSource: row.data_source,
          status: row.status,
          startPosition: row.start_position,
          currentPosition: row.current_position,
          totalRecords: row.total_records,
          recordsProcessed: row.records_processed,
          errorCount: row.error_count,
          lastError: row.last_error || undefined,
          checkpointData: JSON.parse(row.checkpoint_data),
          createdAt: new Date(row.created_at),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at)
        }

        this.checkpoints.set(row.checkpoint_id, checkpointInfo)
      }

      console.log(`📂 加载了 ${this.checkpoints.size} 个检查点`)

    } catch (error) {
      console.error('加载现有检查点失败:', error)
    }
  }

  /**
   * 判断是否可以从检查点恢复
   */
  private canResumeFromCheckpoint(checkpoint: CheckpointInfo, options: RecoveryOptions): boolean {
    // 检查点状态检查
    if (checkpoint.status === 'error' && !options.resetErrors) {
      return false
    }

    // 错误次数检查
    if (checkpoint.errorCount > (options.maxRetries || 5)) {
      return false
    }

    // 数据完整性检查
    if (checkpoint.currentPosition < checkpoint.startPosition) {
      return false
    }

    return true
  }

  /**
   * 重置检查点错误
   */
  private async resetCheckpointErrors(checkpointId: string): Promise<void> {
    if (!this.runId) return

    try {
      this.db.prepare(`
        UPDATE sync_checkpoints 
        SET error_count = 0, last_error = NULL, status = 'active'
        WHERE run_id = ? AND checkpoint_id = ?
      `).run(this.runId, checkpointId)

      console.log(`🔄 重置检查点错误: ${checkpointId}`)

    } catch (error) {
      console.error('重置检查点错误失败:', error)
    }
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveMemoryCheckpoints()
    }, 30000) // 每30秒自动保存一次

    console.log('⏰ 启动自动保存检查点 (30秒间隔)')
  }

  /**
   * 保存内存中的检查点
   */
  private async saveMemoryCheckpoints(): Promise<void> {
    // 这里可以实现内存检查点的定期保存逻辑
    // 目前检查点都是实时保存到数据库的
  }

  /**
   * 获取检查点摘要报告
   */
  async getCheckpointSummary(): Promise<string> {
    if (!this.runId) {
      return '❌ 检查点管理器未初始化'
    }

    try {
      const summary = this.db.prepare(`
        SELECT 
          checkpoint_type,
          data_source,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
          SUM(records_processed) as total_processed,
          MAX(created_at) as last_created
        FROM sync_checkpoints 
        WHERE run_id = ?
        GROUP BY checkpoint_type, data_source
        ORDER BY last_created DESC
      `).all(this.runId) as Array<{
        checkpoint_type: string
        data_source: string
        count: number
        completed: number
        errors: number
        total_processed: number
        last_created: string
      }>

      if (summary.length === 0) {
        return '📂 暂无检查点'
      }

      let report = `📋 **检查点摘要报告**\n\n`

      summary.forEach(item => {
        report += `📊 **${item.data_source} - ${item.checkpoint_type}**\n`
        report += `• 总数: ${item.count}\n`
        report += `• 已完成: ${item.completed}\n`
        report += `• 错误: ${item.errors}\n`
        report += `• 已处理记录: ${item.total_processed.toLocaleString()}\n`
        report += `• 最后创建: ${format(new Date(item.last_created), 'HH:mm:ss', { locale: zhCN })}\n\n`
      })

      return report

    } catch (error) {
      return `❌ 生成检查点摘要失败: ${(error as Error).message}`
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 停止自动保存
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }

    // 清空内存缓存
    this.checkpoints.clear()

    console.log('🧹 检查点管理器已清理')
  }
}

/**
 * 创建检查点管理器实例
 */
export function createCheckpointManager(db: Database): CheckpointManager {
  return new CheckpointManager(db)
}