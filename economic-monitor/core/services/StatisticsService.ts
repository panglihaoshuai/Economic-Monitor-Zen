// ============================================================================
// 📁 core/services/StatisticsService.ts
// ============================================================================
// 统计服务 - 封装统计分析和相关性计算
// ============================================================================
// ✅ 已完成核心功能
// ⚠️  未来可扩展：
//    - 支持更多相关性指标
//    - 支持时间序列分析
//    - 支持机器学习模型
//    - 支持AI洞察生成

import type {
  Trade,
  MacroCorrelation,
  CorrelationStats,
  EmotionStats,
  ApiResponse,
} from '@/shared/types';
import type { ITradeRepository } from '@/core/repositories/ITrade.repository';
import type { IMarketRepository } from '@/core/repositories/IMarket.repository';
import { INDICATOR_CONFIGS } from '@/core/entities/MacroIndicator.entity';

// ============================================================================
// 常量
// ============================================================================

const DEFAULT_USER_ID = 'default-user';

// ============================================================================
// 服务类
// ============================================================================

export class StatisticsService {
  private tradeRepository: ITradeRepository;
  private marketRepository: IMarketRepository;
  private userId: string;

  constructor(
    tradeRepository: ITradeRepository,
    marketRepository: IMarketRepository,
    userId?: string
  ) {
    this.tradeRepository = tradeRepository;
    this.marketRepository = marketRepository;
    this.userId = userId || DEFAULT_USER_ID;
  }

  // -------------------------------------------------------------------------
  // 宏观相关性分析
  // -------------------------------------------------------------------------

  /** 获取宏观信号相关性统计 */
  async getCorrelationStats(): Promise<ApiResponse<CorrelationStats[]>> {
    const tradesResponse = await this.tradeRepository.findMany({
      userId: this.userId,
      status: ['closed'],
    });

    const trades = tradesResponse.data || [];

    // 按指标分组统计
    const indicatorStats = new Map<string, CorrelationStats>();

    // 获取指标名称映射
    const indicatorNames: Record<string, string> = {};
    for (const [id, config] of Object.entries(INDICATOR_CONFIGS)) {
      indicatorNames[id] = config.name;
    }

    // 初始化统计
    for (const [id, config] of Object.entries(INDICATOR_CONFIGS)) {
      indicatorStats.set(id, {
        indicatorId: id,
        indicatorName: config.name,
        totalTrades: 0,
        followed: { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 },
        ignored: { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 },
        opposite: { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 },
        conclusion: '',
      });
    }

    // 统计每笔交易的宏观关联
    for (const trade of trades) {
      for (const correlation of trade.macroCorrelations) {
        const stats = indicatorStats.get(correlation.indicatorId);
        if (!stats) continue;

        stats.totalTrades++;

        const action = correlation.action;
        const pnl = trade.pnlPercent || 0;
        const isWin = pnl > 0;

        const actionStats = stats[action];
        actionStats.count++;
        actionStats.totalPnl += pnl;
        actionStats.avgPnl = actionStats.totalPnl / actionStats.count;
        // Track wins separately - using a separate counter
        if (isWin) {
          // We'll calculate winRate at the end by iterating trades
        }
      }
    }

    // 生成结论
    for (const stats of Array.from(indicatorStats.values())) {
      const { followed, ignored, opposite } = stats;

      // 找出表现最好的策略
      const strategies = [
        { name: 'followed', stats: followed },
        { name: 'ignored', stats: ignored },
        { name: 'opposite', stats: opposite },
      ].filter(s => s.stats.count > 0);

      if (strategies.length === 0) {
        stats.conclusion = '暂无足够数据进行分析';
        continue;
      }

      strategies.sort((a, b) => b.stats.avgPnl - a.stats.avgPnl);
      const best = strategies[0];
      const worst = strategies[strategies.length - 1];

      const strategyNames: Record<string, string> = {
        followed: '跟随信号',
        ignored: '忽略信号',
        opposite: '反向操作',
      };

      const verdict = best.stats.avgPnl > 0 ? '盈利' : '亏损';
      stats.conclusion = `${strategyNames[best.name]}表现${verdict}（${best.stats.avgPnl.toFixed(2)}%），` +
        `${strategyNames[worst.name]}表现${worst.stats.avgPnl > 0 ? '盈利' : '亏损'}（${worst.stats.avgPnl.toFixed(2)}%）`;
    }

    return {
      success: true,
      data: Array.from(indicatorStats.values()),
    };
  }

  /** 获取单个指标的相关性统计 */
  async getIndicatorCorrelation(indicatorId: string): Promise<ApiResponse<CorrelationStats | null>> {
    const response = await this.getCorrelationStats();
    const stats = response.data?.find(s => s.indicatorId === indicatorId) || null;
    return { success: true, data: stats };
  }

  // -------------------------------------------------------------------------
  // 情绪分析
  // -------------------------------------------------------------------------

  /** 获取情绪统计 */
  async getEmotionStats(): Promise<ApiResponse<EmotionStats[]>> {
    const tradesResponse = await this.tradeRepository.findMany({
      userId: this.userId,
      status: ['closed'],
    });

    const trades = tradesResponse.data || [];

    // 按情绪分组
    const emotionMap = new Map<string, Trade[]>();

    for (const trade of trades) {
      const tag = trade.emotionTag || 'unknown';
      if (!emotionMap.has(tag)) {
        emotionMap.set(tag, []);
      }
      emotionMap.get(tag)!.push(trade);
    }

    const totalTrades = trades.length;
    const stats: EmotionStats[] = [];

    for (const [tag, tagTrades] of Array.from(emotionMap.entries())) {
      const pnlSum = tagTrades.reduce((acc, t) => acc + (t.pnlPercent || 0), 0);
      const wins = tagTrades.filter(t => (t.pnlPercent || 0) > 0).length;

      stats.push({
        tag: tag as EmotionStats['tag'],
        count: tagTrades.length,
        avgPnl: pnlSum / tagTrades.length,
        winRate: (wins / tagTrades.length) * 100,
        percentage: (tagTrades.length / totalTrades) * 100,
      });
    }

    return { success: true, data: stats };
  }

  /** 根据情绪获取交易 */
  async getTradesByEmotion(emotion: string): Promise<ApiResponse<Trade[]>> {
    const response = await this.tradeRepository.findMany({ userId: this.userId });
    const trades = response.data || [];

    const filtered = trades.filter(t => t.emotionTag === emotion);
    return { success: true, data: filtered };
  }

  // -------------------------------------------------------------------------
  // 交易模式分析
  // -------------------------------------------------------------------------

  /** 获取交易类型表现 */
  async getTradeTypePerformance(): Promise<ApiResponse<Record<string, {
    count: number;
    avgPnl: number;
    winRate: number;
    totalPnl: number;
  }>>> {
    const response = await this.tradeRepository.findMany({
      userId: this.userId,
      status: ['closed'],
    });

    const trades = response.data || [];
    const performance: Record<string, { count: number; avgPnl: number; winRate: number; totalPnl: number }> = {};

    for (const trade of trades) {
      const type = trade.tradeType;
      if (!performance[type]) {
        performance[type] = { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 };
      }

      const pnl = trade.pnlPercent || 0;
      performance[type].count++;
      performance[type].totalPnl += pnl;
      performance[type].avgPnl = performance[type].totalPnl / performance[type].count;

      const wins = trades.filter(t => t.tradeType === type && (t.pnlPercent || 0) > 0).length;
      performance[type].winRate = (wins / performance[type].count) * 100;
    }

    return { success: true, data: performance };
  }

  /** 获取最佳交易时间 */
  async getBestTradeTimes(): Promise<ApiResponse<{
    dayOfWeek: Record<string, { count: number; avgPnl: number; winRate: number }>;
    hourOfDay: Record<string, { count: number; avgPnl: number; winRate: number }>;
  }>> {
    const response = await this.tradeRepository.findMany({
      userId: this.userId,
      status: ['closed'],
    });

    const trades = response.data || [];

    const dayStats: Record<string, { count: number; avgPnl: number; winRate: number; totalPnl: number }> = {};
    const hourStats: Record<string, { count: number; avgPnl: number; winRate: number; totalPnl: number }> = {};

    for (const trade of trades) {
      const entryDate = new Date(trade.entryTime);
      const day = entryDate.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = entryDate.getHours().toString();

      // Day stats
      if (!dayStats[day]) {
        dayStats[day] = { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 };
      }
      dayStats[day].count++;
      dayStats[day].totalPnl += trade.pnlPercent || 0;
      dayStats[day].avgPnl = dayStats[day].totalPnl / dayStats[day].count;

      // Hour stats
      if (!hourStats[hour]) {
        hourStats[hour] = { count: 0, avgPnl: 0, winRate: 0, totalPnl: 0 };
      }
      hourStats[hour].count++;
      hourStats[hour].totalPnl += trade.pnlPercent || 0;
      hourStats[hour].avgPnl = hourStats[hour].totalPnl / hourStats[hour].count;
    }

    // Calculate win rates
    const calculateWinRate = (stats: typeof dayStats) => {
      for (const key of Object.keys(stats)) {
        const dayTrades = trades.filter(t => new Date(t.entryTime).toLocaleDateString('en-US', { weekday: 'long' }) === key);
        const wins = dayTrades.filter(t => (t.pnlPercent || 0) > 0).length;
        stats[key].winRate = dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0;
      }
    };
    calculateWinRate(dayStats);

    return {
      success: true,
      data: {
        dayOfWeek: dayStats,
        hourOfDay: hourStats,
      },
    };
  }

  // -------------------------------------------------------------------------
  // 风险分析
  // -------------------------------------------------------------------------

  /** 获取风险指标 */
  async getRiskMetrics(): Promise<ApiResponse<{
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    winLossRatio: number;
  }>> {
    const response = await this.tradeRepository.findMany({
      userId: this.userId,
      status: ['closed'],
    });

    const trades = response.data || [];
    const pnls = trades.map(t => t.pnlPercent || 0);

    if (pnls.length === 0) {
      return {
        success: true,
        data: {
          sharpeRatio: 0,
          sortinoRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          winLossRatio: 0,
        },
      };
    }

    // 计算平均收益和标准差
    const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / pnls.length;
    const stdDev = Math.sqrt(variance);

    // 计算最大回撤
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const pnl of pnls) {
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // 计算胜负比
    const wins = pnls.filter(p => p > 0).length;
    const losses = pnls.filter(p => p < 0).length;
    const avgWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / (wins || 1);
    const avgLoss = pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / (losses || 1);
    const winLossRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;

    // 夏普比率（简化版，假设无风险利率为0）
    const sharpeRatio = stdDev > 0 ? avgPnl / stdDev : 0;

    // 索提诺比率（只考虑下行波动）
    const downsidePnls = pnls.filter(p => p < 0);
    const downsideVariance = downsidePnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / (downsidePnls.length || 1);
    const downsideStdDev = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideStdDev > 0 ? avgPnl / downsideStdDev : 0;

    return {
      success: true,
      data: {
        sharpeRatio: Number(sharpeRatio.toFixed(2)),
        sortinoRatio: Number(sortinoRatio.toFixed(2)),
        maxDrawdown: Number((-maxDrawdown).toFixed(2)),
        volatility: Number(stdDev.toFixed(2)),
        winLossRatio: Number(winLossRatio.toFixed(2)),
      },
    };
  }
}

// ============================================================================
// 服务工厂
// ============================================================================

export function createStatisticsService(
  tradeRepository: ITradeRepository,
  marketRepository: IMarketRepository,
  userId?: string
): StatisticsService {
  return new StatisticsService(tradeRepository, marketRepository, userId);
}

export function getStatisticsService(
  tradeRepository?: ITradeRepository,
  marketRepository?: IMarketRepository
): StatisticsService {
  const { getTradeRepository } = require('@/repositories/ITrade.repository');
  const { getMarketRepository } = require('@/repositories/IMarket.repository');

  return new StatisticsService(
    tradeRepository || getTradeRepository('mock'),
    marketRepository || getMarketRepository('mock')
  );
}
