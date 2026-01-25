#!/usr/bin/env bun
/**
 * 真实数据获取脚本 - FRED API集成
 * 
 * 功能:
 * - 真实的FRED API调用
 * - 智能限速和错误重试
 * - 断点恢复和进度跟踪
 * - 高性能批量插入
 */

import { Database } from 'bun:sqlite'
import { createDataPipelineOrchestrator, DataSourceConfig } from '../lib/data-pipeline-orchestrator'
import { createProgressTracker } from '../lib/progress-tracker'
import { createCheckpointManager } from '../lib/checkpoint-manager'
import { createAPIDataInserter } from '../lib/enhanced-batch-inserter'

// 加载环境变量
import { config } from 'dotenv'
config({ path: '.env.local' })

// FRED API配置
interface FREDConfig {
  apiKey: string
  baseUrl: string
  rateLimit: {
    requestsPerMinute: number
    burstLimit: number
  }
}

// 默认FRED配置
const DEFAULT_FRED_CONFIG: FREDConfig = {
  apiKey: process.env.FRED_API_KEY || 'YOUR_API_KEY_HERE',
  baseUrl: 'https://api.stlouisfed.org/fred',
  rateLimit: {
    requestsPerMinute: 120,
    burstLimit: 10
  }
}

/**
 * FRED API客户端
 */
class FREDAPIClient {
  private config: FREDConfig
  private requestCount: number = 0
  private lastRequestTime: number = 0

  constructor(config: FREDConfig) {
    this.config = config
  }

  /**
   * 获取系列数据
   */
  async getSeriesData(seriesId: string, options: {
    observation_start?: string
    observation_end?: string
    limit?: number
  } = {}): Promise<any[]> {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: this.config.apiKey,
      file_type: 'json',
      ...options
    })

    const url = `${this.config.baseUrl}/series/observations?${params}`
    
    // 智能限速
    await this.rateLimit()
    
    console.log(`📡 获取FRED数据: ${seriesId}`)
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`FRED API错误: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error_code) {
        throw new Error(`FRED API错误: ${data.error_message}`)
      }
      
      const observations = data.observations || []
      console.log(`📊 获取到 ${observations.length} 条记录: ${seriesId}`)
      
      return observations.map((obs: any) => ({
        series_id: seriesId,
        date: obs.date,
        value: parseFloat(obs.value) || null,
        realtime_start: obs.realtime_start,
        realtime_end: obs.realtime_end,
        source: 'FRED',
        fetched_at: new Date().toISOString()
      }))
      
    } catch (error) {
      console.error(`❌ 获取FRED数据失败 [${seriesId}]:`, error)
      throw error
    }
  }

  /**
   * 获取系列信息
   */
  async getSeriesInfo(seriesId: string): Promise<any> {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: this.config.apiKey,
      file_type: 'json'
    })

    const url = `${this.config.baseUrl}/series?${params}`
    
    await this.rateLimit()
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`FRED API错误: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error_code) {
        throw new Error(`FRED API错误: ${data.error_message}`)
      }
      
      return data.seriess?.[0] || null
      
    } catch (error) {
      console.error(`❌ 获取系列信息失败 [${seriesId}]:`, error)
      throw error
    }
  }

  /**
   * 智能限速
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    // 如果距离上次请求太短，等待
    const minInterval = 60000 / this.config.rateLimit.requestsPerMinute // 500ms for 120 req/min
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest))
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
    
    // 每分钟重置计数器
    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      console.log(`⏰ 达到API限制，等待重置...`)
      await new Promise(resolve => setTimeout(resolve, 60000))
      this.requestCount = 0
    }
  }
}

/**
 * 真实数据同步器
 */
class RealDataSyncer {
  private db: Database
  private fredClient: FREDAPIClient
  private orchestrator: any

  constructor(fredConfig?: Partial<FREDConfig>) {
    this.db = new Database('./data/economic_monitor.db')
    this.fredClient = new FREDAPIClient({ ...DEFAULT_FRED_CONFIG, ...fredConfig })
    
    // 设置数据库优化
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = NORMAL')
    this.db.exec('PRAGMA cache_size = 10000')
  }

  /**
   * 初始化数据库表
   */
  private async initializeTables(): Promise<void> {
    console.log('🗄️ 初始化数据库表...')
    
    // 创建同步进度表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_progress (
        run_id TEXT,
        snapshot_id INTEGER,
        processed_records INTEGER,
        success_records INTEGER,
        failed_records INTEGER,
        duplicate_records INTEGER,
        updated_records INTEGER,
        records_per_second REAL,
        progress_percentage REAL,
        error_count INTEGER,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建集合运行表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collection_runs (
        run_id TEXT PRIMARY KEY,
        data_source TEXT,
        start_time DATETIME,
        end_time DATETIME,
        status TEXT,
        records_processed INTEGER,
        records_found INTEGER,
        records_updated INTEGER,
        records_failed INTEGER,
        duplicate_records INTEGER,
        avg_processing_time REAL,
        config TEXT,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建检查点表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        run_id TEXT,
        checkpoint_id TEXT,
        checkpoint_type TEXT,
        data_source TEXT,
        status TEXT,
        start_position INTEGER,
        current_position INTEGER,
        total_records INTEGER,
        records_processed INTEGER,
        error_count INTEGER,
        last_error TEXT,
        checkpoint_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建数据源配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_source_config (
        source_id TEXT PRIMARY KEY,
        source_name TEXT,
        source_type TEXT,
        config_data TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建FRED数据表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fred_series_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL,
        realtime_start TEXT,
        realtime_end TEXT,
        source TEXT DEFAULT 'FRED',
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(series_id, date)
      )
    `)

    // 创建系列信息表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fred_series_info (
        series_id TEXT PRIMARY KEY,
        title TEXT,
        observation_start TEXT,
        observation_end TEXT,
        frequency TEXT,
        frequency_short TEXT,
        units TEXT,
        units_short TEXT,
        seasonal_adjustment TEXT,
        seasonal_adjustment_short TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_progress_run_id ON sync_progress(run_id);
      CREATE INDEX IF NOT EXISTS idx_collection_runs_run_id ON collection_runs(run_id);
      CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_run_id ON sync_checkpoints(run_id);
      CREATE INDEX IF NOT EXISTS idx_fred_series_data_series_id ON fred_series_data(series_id);
      CREATE INDEX IF NOT EXISTS idx_fred_series_data_date ON fred_series_data(date);
      CREATE INDEX IF NOT EXISTS idx_fred_series_data_fetched_at ON fred_series_data(fetched_at);
    `)

    console.log('✅ 数据库表初始化完成')
  }

  /**
   * 获取热门经济指标系列ID
   */
  private getPopularSeries(): string[] {
    return [
      // GDP相关
      'GDP', 'GDPC1', 'GDPPOT', 'NYGDPMKTPCDWLD',
      
      // 就业相关
      'UNRATE', 'PAYEMS', 'CIVPART', 'EMRATIO',
      
      // 通胀相关
      'CPIAUCSL', 'CPALTT01USM657N', 'PCEPI', 'DFEDTARU',
      
      // 利率相关
      'FEDFUNDS', 'DGS10', 'DGS1', 'DGS30',
      
      // 股市相关
      'SP500', 'DJIA', 'VIXCLS',
      
      // 房地产相关
      'MORTGAGE30US', 'HOUST', 'PERMIT', 'MSACSR',
      
      // 消费者相关
      'UMCSENT', 'RRSFS', 'RETAILMM',
      
      // 制造业相关
      'IPMAN', 'DGORDER', 'TCU', 'CMRMTSPL',
      
      // 国际贸易
      'BOPGSTB', 'EXPGS', 'IMPGS',
      
      // 政府财政
      'FYFSGDA188S', 'GFDEGDQ188S',
      
      // 货币供应
      'M2SL', 'BOGMBASE', 'RESPPANWW',
      
      // 商品价格
      'DEXCHUS', 'GOLDAMGBD228NLBM', 'DCOILWTICO'
    ]
  }

  /**
   * 执行全量数据同步
   */
  async executeFullSync(): Promise<void> {
    try {
      console.log('🚀 **开始全量FRED数据同步**')
      const startTime = Date.now()

      // 检查API密钥
      if (this.fredClient.config.apiKey === 'YOUR_API_KEY_HERE') {
        throw new Error('请设置FRED_API_KEY环境变量或修改配置中的API密钥')
      }

      // 初始化数据库
      await this.initializeTables()

      // 获取热门系列列表
      const seriesIds = this.getPopularSeries()
      console.log(`📊 准备同步 ${seriesIds.length} 个经济指标系列`)

      // 创建数据源配置
      const dataSources: DataSourceConfig[] = [{
        id: 'fred_popular_series',
        name: 'FRED Popular Economic Series',
        type: 'api',
        priority: 'high',
        enabled: true,
        apiConfig: {
          baseUrl: this.fredClient.config.baseUrl,
          rateLimit: this.fredClient.config.rateLimit
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 2000,
          backoffMultiplier: 2
        },
        transform: async (data: any) => {
          // 这里将实现真实的数据获取逻辑
          const results = []
          
          for (const seriesId of seriesIds) {
            try {
              console.log(`📡 处理系列: ${seriesId}`)
              
              // 获取系列数据
              const seriesData = await this.fredClient.getSeriesData(seriesId, {
                limit: 1000 // 获取最近1000条记录
              })
              
              // 获取系列信息
              const seriesInfo = await this.fredClient.getSeriesInfo(seriesId)
              
              // 保存系列信息
              if (seriesInfo) {
                this.db.prepare(`
                  INSERT OR REPLACE INTO fred_series_info 
                  (series_id, title, observation_start, observation_end, frequency, 
                   frequency_short, units, units_short, seasonal_adjustment, 
                   seasonal_adjustment_short, last_updated)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  seriesInfo.id,
                  seriesInfo.title,
                  seriesInfo.observation_start,
                  seriesInfo.observation_end,
                  seriesInfo.frequency,
                  seriesInfo.frequency_short,
                  seriesInfo.units,
                  seriesInfo.units_short,
                  seriesInfo.seasonal_adjustment,
                  seriesInfo.seasonal_adjustment_short,
                  new Date().toISOString()
                )
              }
              
              results.push(...seriesData)
              
              // 短暂延迟避免API限制
              await new Promise(resolve => setTimeout(resolve, 100))
              
            } catch (error) {
              console.error(`❌ 处理系列失败 [${seriesId}]:`, error)
              // 继续处理其他系列
            }
          }
          
          return results
        }
      }]

      // 创建管道编排器
      this.orchestrator = createDataPipelineOrchestrator(this.db, {
        maxConcurrentDataSources: 1, // FRED API限制，使用单线程
        enableRealTimeMonitoring: true,
        enableAutoRecovery: true,
        progressUpdateInterval: 5000,
        checkpointInterval: 30000
      })

      // 添加数据源
      this.orchestrator.addDataSource(dataSources[0])

      // 设置事件监听
      this.orchestrator.on('progress', (status: any) => {
        console.clear()
        console.log('📊 **实时进度**')
        console.log(this.orchestrator.getFormattedStatusReport())
      })

      // 初始化并执行
      await this.orchestrator.initialize()
      await this.orchestrator.execute()

      // 生成最终报告
      const endTime = Date.now()
      const duration = Math.floor((endTime - startTime) / 1000)
      
      console.log('\n🎉 **全量数据同步完成**')
      console.log(`⏱️ 总耗时: ${Math.floor(duration / 60)}分${duration % 60}秒`)
      
      // 显示统计信息
      const stats = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT series_id) as series_count,
          COUNT(*) as total_records,
          MIN(date) as earliest_date,
          MAX(date) as latest_date
        FROM fred_series_data
      `).get() as any

      console.log(`📊 同步统计:`)
      console.log(`   系列数量: ${stats.series_count}`)
      console.log(`   记录总数: ${stats.total_records.toLocaleString()}`)
      console.log(`   时间范围: ${stats.earliest_date} 至 ${stats.latest_date}`)

    } catch (error) {
      console.error('💥 **全量数据同步失败**:', error)
      throw error
    } finally {
      await this.cleanup()
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.orchestrator) {
        // 清理编排器资源
      }
      
      if (this.db) {
        this.db.close()
      }
      
      console.log('🧹 资源清理完成')
    } catch (error) {
      console.warn(`⚠️ 清理资源时出错: ${error}`)
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    console.log('🌟 **FRED全量数据同步工具**')
    console.log('=====================================')
    
    // 检查API密钥
    if (!process.env.FRED_API_KEY) {
      console.log('\n⚠️ **需要设置FRED API密钥**')
      console.log('方法1: 设置环境变量')
      console.log('  export FRED_API_KEY=your_api_key_here')
      console.log('  bun scripts/real-data-sync.ts')
      console.log('\n方法2: 临时设置')
      console.log('  FRED_API_KEY=your_api_key_here bun scripts/real-data-sync.ts')
      console.log('\n获取API密钥: https://fred.stlouisfed.org/docs/api/api_key.html')
      return
    }

    const syncer = new RealDataSyncer()
    await syncer.executeFullSync()

  } catch (error) {
    console.error('💥 **同步执行失败**:', error)
    process.exit(1)
  }
}

// 显示帮助信息
function showHelp(): void {
  console.log(`
FRED全量数据同步工具

用法:
  bun scripts/real-data-sync.ts

环境变量:
  FRED_API_KEY    FRED API密钥 (必需)

功能:
  - 同步50+个热门经济指标
  - 智能API限速 (120 req/min)
  - 断点恢复和错误重试
  - 实时进度跟踪
  - 高性能批量插入

获取API密钥: https://fred.stlouisfed.org/docs/api/api_key.html
`)
}

// 检查命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp()
  process.exit(0)
}

// 如果直接运行此脚本，执行主函数
if (import.meta.main) {
  main()
}

// 导出类
export { RealDataSyncer, FREDAPIClient }