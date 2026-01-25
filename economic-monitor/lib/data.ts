// ============================================================================
// 📁 lib/data.ts
// ============================================================================
// 模拟数据 - 兼容层
// ============================================================================
// ✅ 已迁移到 core/entities 和 core/repositories
// ⚠️  未来将逐步迁移所有使用方到新的服务层

// 从共享类型导入
import type { MacroIndicator, MacroSignal, Trade, CorrelationStats, MonthlyStats } from '@/shared/types';

// 从实体导入工厂函数
import { createMacroIndicator } from '@/core/entities/MacroIndicator.entity';
import { INDICATOR_CONFIGS } from '@/core/entities/MacroIndicator.entity';

// 宏观经济数据（使用新架构创建）
export const macroIndicators: MacroIndicator[] = [
  createMacroIndicator({ id: 'SOFR', value: 5.32, previousValue: 5.26 }),
  createMacroIndicator({ id: 'GDP', value: 2.4, previousValue: 2.3 }),
  createMacroIndicator({ id: 'PCE', value: 2.6, previousValue: 2.7 }),
  createMacroIndicator({ id: 'UNRATE', value: 3.9, previousValue: 3.9 }),
];

// 当前宏观信号
export const currentSignals: MacroSignal[] = macroIndicators
  .filter(i => i.status !== 'normal')
  .map(i => ({
    indicatorId: i.id,
    type: i.id === 'SOFR' ? 'bearish' as const : 'neutral' as const,
    severity: i.status,
    confidence: Math.abs(i.zScore) / 3,
    description: i.description,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));

// 交易记录（使用新实体创建）
import { createTrade, closeTrade } from '@/core/entities/Trade.entity';

const baseTrades = [
  {
    symbol: 'BTC/USDT',
    assetClass: 'crypto' as const,
    direction: 'long' as const,
    entryPrice: 65000,
    quantity: 1,
  },
  {
    symbol: 'AAPL',
    assetClass: 'stock' as const,
    direction: 'long' as const,
    entryPrice: 180,
    quantity: 10,
  },
  {
    symbol: 'NVDA',
    assetClass: 'stock' as const,
    direction: 'long' as const,
    entryPrice: 900,
    quantity: 1,
  },
  {
    symbol: 'BTC/USDT',
    assetClass: 'crypto' as const,
    direction: 'short' as const,
    entryPrice: 72000,
    quantity: 1,
  },
];

export const trades: Trade[] = baseTrades.map((base, i) => {
  const trade = createTrade(base);
  trade.userId = 'default-user';
  
  // 添加标签和备注
  const tags = [
    ['BTC/USDT', 'long'].includes(base.symbol) ? '#趋势' : '',
    i === 1 ? '#财报' : '',
    i === 2 ? '#AI' : '',
    i === 3 ? '#趋势' : '',
  ].filter(Boolean);
  
  const notes = [
    'SOFR确认下降趋势后入场',
    '财报前追涨被套',
    'GDP数据利好后入场',
    'SOFR异常升高后做空',
  ];
  
  // 平仓并设置结果
  const exitPrices = [68500, 176, 928, 70500];
  const pnlPercents = [5.38, -2.22, 3.11, 2.08];
  
  const closed = closeTrade(trade, exitPrices[i]);
  closed.tags = tags;
  closed.note = notes[i];
  closed.macroCorrelations = [
    {
      indicatorId: 'SOFR',
      signalType: i === 1 || i === 3 ? 'bearish' : 'bullish',
      action: i === 1 ? 'ignored' : 'followed',
      confidence: 0.7,
    },
  ];
  closed.emotionTag = i === 1 ? 'fomo' : 'calm';
  
  return closed;
});

// 计算统计数据
export function calculateMonthlyStats(): MonthlyStats {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const pnlSum = closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);
  const wins = closedTrades.filter(t => (t.pnlPercent || 0) > 0).length;
  
  // 计算平均持仓时间
  const totalHoldingHours = closedTrades.reduce((acc, t) => acc + (t.holdingPeriodHours || 0), 0);
  const avgHoldingPeriod = closedTrades.length > 0 ? totalHoldingHours / closedTrades.length : 0;

  return {
    totalPnl: pnlSum,
    winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
    tradeCount: closedTrades.length,
    maxDrawdown: -3.2,
    avgHoldingPeriod,
  };
}

// 计算相关性统计
export function calculateCorrelationStats(): CorrelationStats[] {
  const indicatorIds = Object.keys(INDICATOR_CONFIGS);
  
  return indicatorIds.map(indicatorId => {
    const indicatorTrades = trades.filter(t =>
      t.macroCorrelations.some(c => c.indicatorId === indicatorId)
    );
    
    const followed = indicatorTrades.filter(t =>
      t.macroCorrelations.find(c => c.indicatorId === indicatorId)?.action === 'followed'
    );
    const ignored = indicatorTrades.filter(t =>
      t.macroCorrelations.find(c => c.indicatorId === indicatorId)?.action === 'ignored'
    );
    const opposite = indicatorTrades.filter(t =>
      t.macroCorrelations.find(c => c.indicatorId === indicatorId)?.action === 'opposite'
    );
    
    const avgPnl = (list: Trade[]) => 
      list.length > 0 ? list.reduce((s, t) => s + (t.pnlPercent || 0), 0) / list.length : 0;
    const winRate = (list: Trade[]) => 
      list.length > 0 ? (list.filter(t => (t.pnlPercent || 0) > 0).length / list.length) * 100 : 0;
    
    const followedPnl = avgPnl(followed);
    const ignoredPnl = avgPnl(ignored);
    const indicatorName = INDICATOR_CONFIGS[indicatorId as keyof typeof INDICATOR_CONFIGS]?.name || indicatorId;
    
    let conclusion = '';
    if (followed.length > 0 && ignored.length > 0) {
      const ratio = Math.abs(followedPnl) / Math.abs(ignoredPnl);
      conclusion = `顺应${indicatorName}信号的交易盈利是忽略的 ${ratio.toFixed(1)} 倍`;
    } else if (followed.length > 0) {
      conclusion = `顺应${indicatorName}信号的交易表现良好（${followedPnl.toFixed(2)}%）`;
    } else {
      conclusion = `暂无${indicatorName}相关交易数据`;
    }
    
    return {
      indicatorId,
      indicatorName,
      totalTrades: indicatorTrades.length,
      followed: {
        count: followed.length,
        avgPnl: followedPnl,
        winRate: winRate(followed),
        totalPnl: followed.reduce((s, t) => s + (t.pnlPercent || 0), 0),
      },
      ignored: {
        count: ignored.length,
        avgPnl: ignoredPnl,
        winRate: winRate(ignored),
        totalPnl: ignored.reduce((s, t) => s + (t.pnlPercent || 0), 0),
      },
      opposite: {
        count: opposite.length,
        avgPnl: avgPnl(opposite),
        winRate: winRate(opposite),
        totalPnl: opposite.reduce((s, t) => s + (t.pnlPercent || 0), 0),
      },
      conclusion,
    };
  });
}
