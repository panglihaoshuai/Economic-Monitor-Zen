#!/usr/bin/env bun
/**
 * 简化的FRED数据同步脚本
 * 专注于核心功能：获取数据并保存到数据库
 */

import { Database } from 'bun:sqlite'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

const API_KEY = process.env.FRED_API_KEY
const BASE_URL = 'https://api.stlouisfed.org/fred'

// 热门经济指标系列
const POPULAR_SERIES = [
  'GDP', 'GDPC1', 'GDPPOT', 'UNRATE', 'PAYEMS', 'CIVPART', 'EMRATIO',
  'CPIAUCSL', 'PCEPI', 'FEDFUNDS', 'DGS10', 'DGS1', 'SP500', 
  'MORTGAGE30US', 'HOUST', 'UMCSENT', 'IPMAN', 'M2SL', 'DEXCHUS',
  'DCOILWTICO', 'BOPGSTB', 'EXPGS', 'IMPGS'
]

class SimpleFREDSyncer {
  private db: Database
  private requestCount: number = 0
  private lastRequestTime: number = 0

  constructor() {
    this.db = new Database('./data/economic_monitor.db')
    this.setupDatabase()
  }

  private setupDatabase(): void {
    console.log('🗄️ 初始化数据库...')
    
    // 创建FRED数据表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fred_series_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL,
        source TEXT DEFAULT 'FRED',
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(series_id, date)
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fred_series_data_series_id ON fred_series_data(series_id);
      CREATE INDEX IF NOT EXISTS idx_fred_series_data_date ON fred_series_data(date);
    `)

    console.log('✅ 数据库初始化完成')
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 500 // 120 req/min = 500ms per request
    
    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest))
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
    
    // 每120个请求重置
    if (this.requestCount >= 120) {
      console.log('⏰ 达到API限制，等待60秒...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      this.requestCount = 0
    }
  }

  private async fetchSeriesData(seriesId: string): Promise<any[]> {
    await this.rateLimit()
    
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: API_KEY!,
      file_type: 'json',
      limit: '1000'
    })

    const url = `${BASE_URL}/series/observations?${params}`
    
    console.log(`📡 获取 ${seriesId}...`)
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API错误: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error_code) {
        throw new Error(`FRED错误: ${data.error_message}`)
      }
      
      return data.observations || []
      
    } catch (error) {
      console.error(`❌ 获取 ${seriesId} 失败:`, error)
      return []
    }
  }

  private async saveSeriesData(seriesId: string, observations: any[]): Promise<void> {
    if (observations.length === 0) return

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO fred_series_data (series_id, date, value, source, fetched_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const transaction = this.db.transaction(() => {
      for (const obs of observations) {
        const value = parseFloat(obs.value) || null
        stmt.run(seriesId, obs.date, value, 'FRED', new Date().toISOString())
      }
    })

    transaction()
    console.log(`✅ 保存了 ${observations.length} 条记录: ${seriesId}`)
  }

  async syncAll(): Promise<void> {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
      throw new Error('请设置有效的FRED_API_KEY')
    }

    console.log(`🚀 开始同步 ${POPULAR_SERIES.length} 个经济指标`)
    const startTime = Date.now()
    let totalRecords = 0
    let successCount = 0

    for (const seriesId of POPULAR_SERIES) {
      try {
        const observations = await this.fetchSeriesData(seriesId)
        
        if (observations.length > 0) {
          await this.saveSeriesData(seriesId, observations)
          totalRecords += observations.length
          successCount++
        }
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ 处理 ${seriesId} 失败:`, error)
      }
    }

    const endTime = Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)
    
    // 显示统计
    console.log('\n🎉 **同步完成**')
    console.log(`⏱️ 耗时: ${Math.floor(duration / 60)}分${duration % 60}秒`)
    console.log(`📊 成功系列: ${successCount}/${POPULAR_SERIES.length}`)
    console.log(`📈 总记录数: ${totalRecords.toLocaleString()}`)
    console.log(`⚡ 平均速度: ${(totalRecords / duration).toFixed(1)} 记录/秒`)

    // 显示数据库统计
    const stats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT series_id) as series_count,
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM fred_series_data
    `).get() as any

    console.log('\n📋 **数据库统计**:')
    console.log(`   系列数量: ${stats.series_count}`)
    console.log(`   记录总数: ${stats.total_records.toLocaleString()}`)
    console.log(`   时间范围: ${stats.earliest_date} 至 ${stats.latest_date}`)
  }

  cleanup(): void {
    this.db.close()
  }
}

async function main(): Promise<void> {
  const syncer = new SimpleFREDSyncer()
  
  try {
    await syncer.syncAll()
  } catch (error) {
    console.error('💥 **同步失败**:', error)
    process.exit(1)
  } finally {
    syncer.cleanup()
  }
}

main()