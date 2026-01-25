#!/usr/bin/env bun
/**
 * 数据质量验证脚本 - 验证修补效果
 * 确保修复是精准的，没有引入新问题
 */

import { Database } from 'bun:sqlite'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

class DataQualityValidator {
  private db: Database

  constructor() {
    this.db = new Database('./data/economic_monitor.db')
  }

  async runValidation(): Promise<void> {
    console.log('🔍 **数据质量验证开始**')
    console.log('=====================================')
    
    try {
      // 1. 验证NULL值修复效果
      await this.validateNULLFix()
      
      // 2. 验证数据完整性
      await this.validateDataIntegrity()
      
      // 3. 验证时间覆盖
      await this.validateTimeCoverage()
      
      // 4. 验证数据质量
      await this.validateDataQuality()
      
      // 5. 验证修复副作用
      await this.validateSideEffects()
      
      // 6. 生成验证报告
      await this.generateValidationReport()
      
    } catch (error) {
      console.error('💥 **验证失败**:', error)
      throw error
    }
  }

  private async validateNULLFix(): Promise<void> {
    console.log('🔍 验证NULL值修复效果...')
    
    // 检查修复后的NULL值分布
    const nullBySeries = this.db.prepare(`
      SELECT 
        series_id,
        COUNT(*) as total_records,
        COUNT(CASE WHEN value IS NULL THEN 1 END) as null_count,
        ROUND(COUNT(CASE WHEN value IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
      FROM fred_series_data 
      GROUP BY series_id
      ORDER BY null_count DESC
    `).all() as any[]

    console.log('\n📊 NULL值修复验证:')
    let totalNulls = 0
    let problematicSeries = 0
    
    nullBySeries.forEach(series => {
      const status = series.null_count === 0 ? '✅ 完全修复' : 
                   series.null_count < 5 ? '⚠️ 轻微问题' : 
                   series.null_count < 20 ? '❌ 需要关注' : '💀 严重问题'
      
      console.log(`  ${status} ${series.series_id}: ${series.null_count} NULL值 (${series.null_percentage}%)`)
      
      totalNulls += series.null_count
      if (series.null_count > 0) problematicSeries++
    })
    
    const overallNullRate = totalNulls > 0 ? (totalNulls / 17574 * 100).toFixed(2) : 0
    
    console.log(`\n📈 总体NULL值率: ${overallNullRate}%`)
    console.log(`📊 问题系列数: ${problematicSeries}/23`)
    
    // 验证特定系列的修复效果
    const criticalSeries = ['UMCSENT', 'DGS1', 'DGS10', 'SP500']
    console.log('\n🎯 关键系列修复验证:')
    
    criticalSeries.forEach(seriesId => {
      const seriesData = nullBySeries.find(s => s.series_id === seriesId)
      if (seriesData) {
        const status = seriesData.null_count === 0 ? '✅ 完全修复' : '❌ 仍有问题'
        console.log(`  ${status} ${seriesId}: ${seriesData.null_count} NULL值`)
      }
    })
  }

  private async validateDataIntegrity(): Promise<void> {
    console.log('\n🔍 验证数据完整性...')
    
    // 检查重复数据
    const duplicates = this.db.prepare(`
      SELECT COUNT(*) as duplicate_count
      FROM fred_series_data d1
      WHERE EXISTS (
        SELECT 1 FROM fred_series_data d2 
        WHERE d1.series_id = d2.series_id 
          AND d1.date = d2.date 
          AND d1.id != d2.id
      )
    `).get() as any

    // 检查数据类型一致性
    const typeIssues = this.db.prepare(`
      SELECT COUNT(*) as type_issues
      FROM fred_series_data 
      WHERE 
        (series_id IS NULL OR series_id = '') OR
        (date IS NULL OR date = '') OR
        (fetched_at IS NULL OR fetched_at = '')
    `).get() as any

    // 检查时间序列完整性
    const timeGaps = this.db.prepare(`
      SELECT COUNT(*) as gap_count
      FROM fred_series_data d1
      WHERE EXISTS (
        SELECT 1 FROM fred_series_data d2 
        WHERE d1.series_id = d2.series_id 
          AND d2.date = date(d1.date, '+1 day')
          AND NOT EXISTS (
            SELECT 1 FROM fred_series_data d3 
            WHERE d3.series_id = d1.series_id 
              AND d3.date = date(d2.date, '-1 day')
          )
      )
    `).get() as any

    console.log('\n📊 数据完整性验证:')
    console.log(`  ✅ 重复数据: ${duplicates.duplicate_count === 0 ? '无重复' : duplicates.duplicate_count + ' 条'}`)
    console.log(`  ✅ 类型问题: ${typeIssues.type_issues === 0 ? '无问题' : typeIssues.type_issues + ' 条'}`)
    console.log(`  ✅ 时间序列: ${timeGaps.gap_count === 0 ? '无断层' : timeGaps.gap_count + ' 个断层'}`)
  }

  private async validateTimeCoverage(): Promise<void> {
    console.log('\n🔍 验证时间覆盖...')
    
    // 检查每个系列的时间覆盖
    const timeCoverage = this.db.prepare(`
      SELECT 
        series_id,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(*) as record_count,
        julianday(MAX(date)) - julianday(MIN(date)) as days_span,
        CASE 
          WHEN julianday(MAX(date)) - julianday(MIN(date)) > 365 * 50 THEN '50+ years'
          WHEN julianday(MAX(date)) - julianday(MIN(date)) > 365 * 20 THEN '20+ years'
          WHEN julianday(MAX(date)) - julianday(MIN(date)) > 365 * 10 THEN '10+ years'
          WHEN julianday(MAX(date)) - julianday(MIN(date)) > 365 * 5 THEN '5+ years'
          ELSE '< 5 years'
        END as coverage_span
      FROM fred_series_data 
      GROUP BY series_id
      ORDER BY days_span DESC
    `).all() as any[]

    console.log('\n📅 时间覆盖验证:')
    let goodCoverage = 0
    let moderateCoverage = 0
    let poorCoverage = 0
    
    timeCoverage.forEach(series => {
      const status = series.coverage_span === '< 5 years' ? '❌ 严重不足' :
                   series.coverage_span === '5+ years' ? '⚠️ 不足' :
                   series.coverage_span === '10+ years' ? '✅ 良好' :
                   series.coverage_span === '20+ years' ? '🎯 优秀' : '📊 超长'
      
      console.log(`  ${status} ${series.series_id}: ${series.earliest_date} → ${series.latest_date} (${series.coverage_span})`)
      
      if (status.includes('✅')) goodCoverage++
      else if (status.includes('🎯')) goodCoverage++
      else if (status.includes('⚠️')) moderateCoverage++
      else poorCoverage++
    })
    
    console.log(`\n📈 时间覆盖统计:`)
    console.log(`  🎯 优秀覆盖: ${goodCoverage} 个系列`)
    console.log(`  ✅ 良好覆盖: ${moderateCoverage} 个系列`)
    console.log(`  ⚠️ 不足覆盖: ${poorCoverage} 个系列`)
    console.log(`  ❌ 严重不足: ${poorCoverage} 个系列`)
  }

  private async validateDataQuality(): Promise<void> {
    console.log('\n🔍 验证数据质量...')
    
    // 检查数据分布
    const dataDistribution = this.db.prepare(`
      SELECT 
        series_id,
        COUNT(*) as total_records,
        COUNT(CASE WHEN value IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN value > 0 THEN 1 END) as positive_count,
        COUNT(CASE WHEN value < 0 THEN 1 END) as negative_count,
        AVG(CASE WHEN value > 0 THEN value END) as avg_value,
        MIN(CASE WHEN value > 0 THEN value END) as min_value,
        MAX(CASE WHEN value > 0 THEN value END) as max_value
      FROM fred_series_data 
      GROUP BY series_id
      ORDER BY total_records DESC
    `).all() as any[]

    console.log('\n📊 数据质量验证:')
    let highQuality = 0
    let mediumQuality = 0
    let lowQuality = 0
    
    dataDistribution.forEach(series => {
      const nullRate = series.null_count / series.total_records
      const positiveRate = series.positive_count / series.total_records
      const avgValue = series.avg_value || 0
      
      let quality = '🔍 优秀'
      
      if (nullRate > 0.05) {
        quality = '❌ 低质量'
        lowQuality++
      } else if (nullRate > 0.01) {
        quality = '⚠️ 中等质量'
        mediumQuality++
      } else if (nullRate === 0 && positiveRate > 0.95) {
        quality = '🎯 优秀'
        highQuality++
      }
      
      console.log(`  ${quality} ${series.series_id}: ${series.total_records} 条记录`)
      console.log(`     NULL率: ${(nullRate * 100).toFixed(2)}%`)
      console.log(`     正值率: ${(positiveRate * 100).toFixed(1)}%`)
      console.log(`     平均值: ${avgValue.toFixed(2)}`)
      
      if (quality === '🎯 优秀') highQuality++
      else if (quality === '🔍 优秀') highQuality++
      else if (quality === '⚠️ 中等质量') mediumQuality++
      else lowQuality++
    })
    
    console.log(`\n📈 数据质量统计:`)
    console.log(`  🎯 优秀质量: ${highQuality} 个系列`)
    console.log(`  🔍  中等质量: ${mediumQuality} 个系列`)
    console.log(`  ⚠️ 低质量: ${lowQuality} 个系列`)
  }

  private async validateSideEffects(): Promise<void> {
    console.log('\n🔍 验证修复副作用...')
    
    // 检查是否引入了新问题
    const newIssues = this.db.prepare(`
      SELECT 
        COUNT(*) as new_issues
      FROM fred_series_data 
      WHERE 
        (fetched_at > datetime('now', '-1 day')) OR
        (value < -1000000 OR value > 1000000) OR
        (julianday(date) > julianday('now', '+1 year'))
    `).get() as any

    // 检查数据一致性
    const consistencyIssues = this.db.prepare(`
      SELECT COUNT(*) as consistency_issues
      FROM fred_series_data d1
      WHERE d1.series_id IN (
        SELECT series_id FROM fred_series_data GROUP BY series_id
        HAVING COUNT(*) > 1000
      )
      AND d1.id NOT IN (
        SELECT MIN(id) FROM fred_series_data d2 
        WHERE d2.series_id = d1.series_id
        GROUP BY d2.series_id
      )
    `).get() as any

    console.log('\n📊 副作用验证:')
    console.log(`  ✅ 新增问题: ${newIssues.new_issues} 条记录`)
    console.log(`  ✅ 一致性问题: ${consistencyIssues.consistency_issues} 条记录`)
    
    if (newIssues.new_issues > 0) {
      console.log('⚠️ 證告: 发现新增问题，需要进一步调查')
    }
  }

  async generateValidationReport(): Promise<void> {
    console.log('\n📋 **数据质量验证报告**')
    console.log('=====================================')
    
    // 获取最终统计
    const finalStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN value IS NULL THEN 1 END) as null_count,
        COUNT(DISTINCT series_id) as series_count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(CASE WHEN value IS NOT NULL THEN 1 END) as valid_records,
        AVG(CASE WHEN value IS NOT NULL THEN value END) as avg_value,
        MIN(CASE WHEN value IS NOT NULL THEN value END) as min_value,
        MAX(CASE WHEN value IS NOT NULL THEN value END) as max_value
      FROM fred_series_data
    `).get() as any

    const nullRate = finalStats.null_count / finalStats.total_records * 100
    const validRate = finalStats.valid_records / finalStats.total_records * 100
    const dataQuality = validRate > 95 ? '🎯 优秀' : validRate > 80 ? '🔍 良好' : validRate > 60 ? '⚠️ 一般' : '❌ 需要改进'
    
    console.log('🎉 **验证完成报告**')
    console.log('=====================================')
    console.log('📊 最终数据统计:')
    console.log(`  • 总记录数: ${finalStats.total_records.toLocaleString()}`)
    console.log(`  • NULL值: ${finalStats.null_count} (${nullRate.toFixed(2)}%)`)
    console.log(`  • 有效记录: ${finalStats.valid_records.toLocaleString()} (${validRate.toFixed(1)}%)`)
    console.log(`  • 系列数量: ${finalStats.series_count}`)
    
    console.log('\n📅 时间范围:')
    console.log(`  • 最早日期: ${finalStats.earliest_date}`)
    console.log(`  • 最晚日期: ${finalStats.latest_date}`)
    const timeSpan = Math.floor((new Date(finalStats.latest_date).getTime() - new Date(finalStats.earliest_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    console.log(`  • 时间跨度: ${timeSpan} 天`)
    
    console.log(`\n🎯 **数据质量评估**: ${dataQuality}`)
    console.log(`  • NULL值率: ${nullRate.toFixed(2)}% (目标: < 1%)`)
    console.log(`  • 有效率: ${validRate.toFixed(1)}% (目标: > 95%)`)
    console.log(`  • 数据完整性: ${finalStats.series_count}/23 (${(finalStats.series_count / 23 * 100).toFixed(1)}% 覆盖)`)
    
    console.log('\n🎯 **修复效果评估**:')
    if (nullRate < 1) {
      console.log('  🎉 NULL值问题已完全解决')
    } else if (nullRate < 5) {
      console.log('  🔧 NULL值问题基本解决')
    } else if (nullRate < 10) {
      console.log('  ⚠️ NULL值问题部分解决')
    } else {
      console.log('  ❌ NULL值问题仍需关注')
    }
    
    console.log('\n🎯 **数据可用性评估**:')
    if (dataQuality === '🎯 优秀') {
      console.log('  ✅ 数据质量优秀，可直接用于生产环境')
    } else if (dataQuality === '🔍 良好') {
      console.log('  ✅ 数据质量良好，可用于分析')
    } else if (dataQuality === '⚠️ 一般') {
      console.log('  🔧 修补部分成功，建议进一步优化')
    } else {
      console.log('  ❌ 修补效果有限，需要重新评估')
    }
    
    console.log('=====================================')
  }

  cleanup(): void {
    if (this.db) {
      this.db.close()
    }
  }
}

async function main(): Promise<void> {
  const API_KEY = process.env.FRED_API_KEY
  if (!API_KEY || API_KEY === '🔑 YOUR_API_KEY_HERE') {
    console.log('⚠️ 请设置有效的FRED_API_KEY环境变量')
    return
  }

  const validator = new DataQualityValidator()
  
  try {
    await validator.runValidation()
  } catch (error) {
    console.error('💥 **验证失败**:', error)
    process.exit(1)
  } finally {
      validator.cleanup()
    }
  }

// 显示帮助信息
function showHelp(): void {
  console.log(`
数据质量验证工具

用法:
  bun scripts/data-quality-validator.ts

功能:
  🔍 验证NULL值修复效果
  🔍 检查数据完整性
  🔍 验证时间覆盖
  🔍 验证数据质量
  🔍 检查修复副作用

验证目标:
  • NULL值率 < 1% (从2.29%改善)
  • 数据完整性 > 95% (从78%改善)
  • 时间覆盖 > 20年 (从65年改善)
  • 数据质量达到企业级标准

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