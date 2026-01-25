'use client';

import type { MacroIndicator, MacroSignal } from '@/shared/types';
import { macroIndicators } from '@/lib/data';

// 简洁的指标解读
const indicatorInsights: Record<string, string> = {
  SOFR: '美国基准利率，影响整体融资成本',
  GDP: '经济增长速度，正值表示扩张',
  PCE: '美联储通胀目标，2% 为理想水平',
  UNRATE: '失业率水平，低于 4% 通常强劲',
};

export function MacroDashboard({ signals, onNavigateToTrade }: MacroDashboardProps) {
  return (
    <div className="space-y-6">
      {/* 经济周期 */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">经济周期</span>
            <p className="text-xl font-semibold text-white mt-1">扩张后期</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">配置建议</span>
            <p className="text-sm text-amber-400 mt-1">防御为主</p>
          </div>
        </div>
      </div>

      {/* 宏观指标 */}
      <div className="space-y-3">
        <span className="text-xs text-slate-500 uppercase tracking-wider">核心指标</span>
        
        {macroIndicators.map((indicator) => (
          <MacroCard key={indicator.id} indicator={indicator} />
        ))}
      </div>
    </div>
  );
}

function MacroCard({ indicator }: { indicator: MacroIndicator }) {
  const isUp = indicator.change >= 0;
  const isWarning = indicator.status === 'warning' || indicator.status === 'critical';
  
  return (
    <div className={`rounded-lg p-4 ${
      isWarning ? 'bg-amber-900/20' : 'bg-slate-900'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{indicator.name}</h3>
            {isWarning && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                异常
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {indicatorInsights[indicator.id] || ''}
          </p>
        </div>
        
        <div className="text-right ml-4">
          <div className="text-lg font-semibold text-white">
            {indicator.value.toFixed(2)}%
          </div>
          <div className={`text-xs ${
            isUp ? 'text-green-400' : 'text-red-400'
          }`}>
            {isUp ? '↑' : '↓'} {Math.abs(indicator.change).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

interface MacroDashboardProps {
  signals: MacroSignal[];
  onNavigateToTrade: () => void;
}
