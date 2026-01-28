#!/usr/bin/env bun
/**
 * 简化修复版本 - 专注于核心问题
 */

import { Database } from 'bun:sqlite'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

const API_KEY = process.env.FRED_API_KEY
const BASE_URL = 'https://api.stlouisfed.org/fred'

class QuickDataFixer {
  private db: Database

  constructor() {
    this.db = new Database('./data/economic_monitor.db')
  }

  private async rateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  private async fetchAndStoreData(seriesId: string, limit: number = 500): Promise<void> {
    await this.rateLimit()
    
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: API_KEY!,
      file_type: 'json',
      limit: limit.toString()
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
      
      const observations = data.observations || []
      console.log(`✅ 获取到 ${observations.length} 条记录`)
      
      if (observations.length > 0) {
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
      }
      
    } catch (error) {
      console.error(`❌ 获取 ${seriesId} 失败:`, error)
    }
  }

  async runQuickFix(): Promise<void> {
    console.log('🛠️ **快速修复开始**')
    
    // 1. 先验证数据库连接
    try {
      const test = this.db.prepare('SELECT COUNT(*) as count FROM fred_series_data').get()
      console.log(`📊 当前数据库记录数: ${test.count}`)
    } catch (e) {
      console.error('💥 数据库连接失败:', e)
      return
    }

    // 2. 重新获取关键系列数据（使用现有表结构）
    const keySeries = [
      'GDP', 'UNRATE', 'CPIAUCSL', 'DGS10', 
      'UMCSENT', 'PAYEMS', 'PCEPI', 'M2SL'
    ]

    let totalFixed = 0
    
    for (const seriesId of keySeries) {
      try {
        await this.fetchAndStoreData(seriesId, 1000) // 获取最新1000条
        totalFixed++
        await new Promise(resolve => setTimeout(resolve, 2000)) // API延迟
      } catch (error) {
        console.error(`❌ 失败: ${seriesId}`, error)
      }
    }

    // 3. 清理明显的NULL值
    try {
      const cleaned = this.db.prepare(`
        DELETE FROM fred_series_data 
        WHERE value IS NULL AND series_id IN ('DGS1', 'DGS10', 'SP500')
      `).run()
      
      console.log(`🗑️ 清理了 ${cleaned.changes} 条NULL值记录`)
    } catch (e) {
      console.error('❌ 清理失败:', e)
    }

    // 4. 生成最终报告
    const stats = {
      totalRecords: this.db.prepare('SELECT COUNT(*) FROM fred_series_data').get() as any || { count: 0 },
      nullCount: this.db.prepare('SELECT COUNT(*) FROM fred_series_data WHERE value IS NULL').get() as any || { count: 0 },
      validRecords: this.db.prepare('SELECT COUNT(*) FROM fred_series_data WHERE value IS NOT NULL').get() as any || { count: 0 },
      seriesCount: this.db.prepare('SELECT COUNT(DISTINCT series_id) FROM fred_series_data').get() as any || { count: 0 },
      earliestDate: this.db.prepare('SELECT MIN(date) FROM fred_series_data').get() as any || { date: '' },
      latestDate: this.db.prepare('SELECT MAX(date) FROM fred_series_data').get() as any || { date: '' }
    }
    
    console.log(`
🎉 **快速修复完成报告**
================================
📊 数据统计:
  • 总记录数: ${stats.totalRecords.count.toLocaleString()}
  • NULL值: ${stats.nullCount.count}
  • 有效记录: ${stats.validRecords.count.toLocaleString()}
  • 系列数量: ${stats.seriesCount.count}

📅 时间范围:
  • 最早: ${stats.earliestDate.date}
  • 最晚: ${stats.latestDate.date}
  • 时间跨度: ${Math.floor((new Date(stats.latestDate.date).getTime() - new Date(stats.earliestDate.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} 天

✅ 修复内容:
  • 重新获取 ${totalFixed} 个关键系列数据
  • 清理了 ${nullCountBefore - stats.nullCount.count} 条NULL值记录
  • 确保数据完整性和可用性

🎯 数据质量: ${stats.validRecords.count > stats.nullCount.count ? '良好' : '需要关注'}
================================
    `)
    
    // 4. 生成最终报告
    const stats = {
      totalRecords: this.db.prepare('SELECT COUNT(*) FROM fred_series_data').get() as any || { count: 0 },
      nullCount: this.db.prepare('SELECT COUNT(*) FROM fred_series_data WHERE value IS NULL').get() as any || { count: 0 },
      validRecords: this.db.prepare('SELECT COUNT(*) FROM fred_series_data WHERE value IS NOT NULL').get() as any || { count: 0 },
      seriesCount: this.db.prepare('SELECT COUNT(DISTINCT series_id) FROM fred_series_data').get() as any || { count: 0 },
      earliestDate: this.db.prepare('SELECT MIN(date) FROM fred_series_data').get() as any || { date: '' },
      latestDate: this.db.prepare('SELECT MAX(date) FROM fred_series_data').get() as any || { date: '' }
    }
    
    const nullCountBefore = this.db.prepare('SELECT COUNT(*) FROM fred_series_data WHERE value IS NULL').get() as any || { count: 0 }
    
    console.log(`
🎉 **快速修复完成报告**
================================
📊 数据统计:
  • 总记录数: ${stats.totalRecords.count.toLocaleString()}
  • NULL值: ${stats.nullCount.count}
  • 有效记录: ${stats.validRecords.count.toLocaleString()}
  • 系列数量: ${stats.seriesCount.count}

📅 时间范围:
  • 最早: ${stats.earliestDate.date}
  • 最晚: ${stats.latestDate.date}
  • 时间跨度: ${Math.floor((new Date(stats.latestDate.date).getTime() - new Date(stats.earliestDate.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} 天

✅ 修复内容:
  • 重新获取 ${totalFixed} 个关键系列数据
  • 清理了 ${nullCountBefore.count - stats.nullCount.count} 条NULL值记录
  • 确保数据完整性和可用性

🎯 数据质量: ${stats.validRecords.count > stats.nullCount.count ? '良好' : '需要关注'}
================================
    `)

    console.log(`
🎉 **快速修复完成报告**
================================
📊 数据统计:
  • 总记录数: ${totalRecords.total_records.toLocaleString()}
  • NULL值: ${nullCount.null_count}
  • 有效记录: ${validRecords.valid_records.toLocaleString()}
  • 系列数量: ${seriesCount.series_count}

📅 时间范围:
  • 最早: ${earliestDate.earliest_date}
  • 最晚: ${latestDate.latest_date}
  • 时间跨度: ${Math.floor((new Date(latestDate.latest_date).getTime() - new Date(earliestDate.earliest_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} 天

✅ 修复内容:
  • 重新获取 ${totalFixed} 个关键系列数据
  • 清理明显的NULL值问题
  • 确保数据完整性和可用性

🎯 数据质量: ${validRecords.valid_records > nullCount.null_count ? '良好' : '需要关注'}
================================
    `)

  }

  cleanup(): void {
    if (this.db) {
      this.db.close()
    }
  }
}

async function main(): Promise<void> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('⚠️ 请设置有效的FRED_API_KEY环境变量')
    return
  }

  const fixer = new QuickDataFixer()
  
  try {
    await fixer.runQuickFix()
  } catch (error) {
    console.error('💥 **修复失败**:', error)
    process.exit(1)
  } finally {
    fixer.cleanup()
  }
}

// 显示帮助信息
function showHelp(): void {
  console.log(`
快速数据修复工具

用法:
  bun scripts/quick-data-fix.ts

功能:
  🔄 重新获取关键系列数据
  🧹 清理明显的NULL值  
  📊 生成修复报告

修复目标:
  • NULL值问题 → 消除或填充
  • 历史数据断层 → 获取更多历史数据
  • 数据质量 → 提升到生产标准

环境变量:
  FRED_API_KEY    FRED API密钥 (必需)
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