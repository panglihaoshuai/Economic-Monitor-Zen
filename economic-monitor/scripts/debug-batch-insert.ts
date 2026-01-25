#!/usr/bin/env bun
/**
 * 简单的批量插入测试来调试SQL问题
 */

import { Database } from 'bun:sqlite'
import { createLocalDataInserter } from '../lib/enhanced-batch-inserter'

async function testBatchInsert() {
  console.log('🧪 简单批量插入测试')
  
  const db = new Database(':memory:')
  
  // 创建测试表
  db.exec(`
    CREATE TABLE test_data (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      data_source TEXT,
      timestamp DATETIME,
      value REAL,
      metadata TEXT
    )
  `)
  
  const inserter = createLocalDataInserter(db)
  
  // 准备简单的测试数据
  const testItems = [
    {
      id: 'test_1',
      data: {
        id: 'test_1',
        batch_id: 'test_batch',
        data_source: 'test_source',
        timestamp: new Date(),
        value: 123.45,
        metadata: '{"test": true}'
      }
    }
  ]
  
  try {
    const result = await inserter.batchInsert('test_data', testItems, {
      conflictResolution: 'ignore'
    })
    
    console.log('✅ 批量插入成功:', result)
    
  } catch (error) {
    console.error('❌ 批量插入失败:', error)
  }
  
  inserter.cleanup()
  db.close()
}

testBatchInsert()