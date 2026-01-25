'use client';

import { useMemo } from 'react';
import type { Trade, CorrelationStats, MonthlyStats } from '@/shared/types';

interface TradeDashboardProps {
  trades: Trade[];
  stats: MonthlyStats;
  correlationStats: CorrelationStats[];
  onOpenTradeForm: () => void;
}

function TradeList({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
暂无交易记录
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <div key={trade.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${
              trade.direction === 'long' ? 'text-green-400' : 'text-red-400'
            }`}>
              {trade.direction === 'long' ? '多' : '空'}
            </span>
            <span className="text-white">{trade.symbol}</span>
            {trade.tags.length > 0 && (
              <span className="text-xs text-slate-500">{trade.tags[0]}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              {new Date(trade.entryTime).toLocaleDateString('zh-CN')}
            </span>
            <span className={`font-medium ${
              (trade.pnlPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {(trade.pnlPercent || 0) >= 0 ? '+' : ''}{(trade.pnlPercent || 0).toFixed(2)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PnlChart({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    let cumulative = 0;
    return trades.map((trade) => {
      cumulative += trade.pnlPercent || 0;
      return cumulative;
    });
  }, [trades]);

  if (data.length === 0) {
    return null;
  }

  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <div className="h-24 flex items-end gap-1">
      {data.map((value, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${
            value >= 0 ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{
            height: `${((Math.abs(value) + (range * 0.1)) / range) * 100}%`,
            opacity: 0.6 + (i / data.length) * 0.4
          }}
        />
      ))}
    </div>
  );
}

export function TradeDashboard({ 
  trades, 
  stats, 
  correlationStats,
  onOpenTradeForm 
}: TradeDashboardProps) {
  return (
    <div className="space-y-6">
      {/* 收益概览 */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">累计收益</span>
          <span className={`text-2xl font-bold ${
            stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}%
          </span>
        </div>
        
        <PnlChart trades={trades} />
        
        <div className="flex justify-between mt-4 text-xs text-slate-500">
          <span>胜率 {stats.winRate.toFixed(0)}%</span>
          <span>交易 {stats.tradeCount} 笔</span>
          <span>回撤 {stats.maxDrawdown.toFixed(1)}%</span>
        </div>
      </div>

      {/* 交易记录 */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">交易记录</span>
          <span className="text-xs text-slate-500">{trades.length} 笔</span>
        </div>
        <TradeList trades={trades} />
      </div>

      {/* 记录按钮 */}
      <button
        onClick={onOpenTradeForm}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition-colors"
      >
        记录交易
      </button>
    </div>
  );
}
