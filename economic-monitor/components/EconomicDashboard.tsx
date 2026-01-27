'use client';

import { useState, useEffect } from 'react';

interface EconomicData {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  updateTime: string;
  priority: 'high' | 'medium' | 'low';
  unit: string;
}

export function EconomicDashboard() {
  const [economicData, setEconomicData] = useState<EconomicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData: EconomicData[] = [
      {
        id: 'fed_funds',
        name: '联邦基金利率',
        value: 4.25,
        change: 0.00,
        changePercent: 0.00,
        updateTime: '2024-01-24',
        priority: 'high',
        unit: '%'
      },
      {
        id: 'cpi',
        name: '消费者物价指数',
        value: 298.4,
        change: 0.3,
        changePercent: 0.1,
        updateTime: '2024-01-24',
        priority: 'high',
        unit: ''
      },
      {
        id: 'unemployment',
        name: '失业率',
        value: 3.7,
        change: -0.1,
        changePercent: -2.6,
        updateTime: '2024-01-24',
        priority: 'high',
        unit: '%'
      },
      {
        id: 'gdp_growth',
        name: 'GDP增长率',
        value: 2.9,
        change: 0.4,
        changePercent: 16.0,
        updateTime: '2024-01-24',
        priority: 'high',
        unit: '%'
      },
      {
        id: 'dollar_index',
        name: '美元指数',
        value: 103.2,
        change: 0.5,
        changePercent: 0.5,
        updateTime: '2024-01-24',
        priority: 'medium',
        unit: ''
      },
      {
        id: 'sp500',
        name: '标普500',
        value: 4783.45,
        change: -12.34,
        changePercent: -0.26,
        updateTime: '2024-01-24',
        priority: 'medium',
        unit: ''
      },
      {
        id: 'm2_money_supply',
        name: 'M2货币供应量',
        value: 20.8,
        change: 0.1,
        changePercent: 0.5,
        updateTime: '2024-01-24',
        priority: 'low',
        unit: '万亿'
      },
      {
        id: 'housing_starts',
        name: '新屋开工',
        value: 1460,
        change: -45,
        changePercent: -3.0,
        updateTime: '2024-01-24',
        priority: 'low',
        unit: '千套'
      }
    ];

    setTimeout(() => {
      setEconomicData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const priorityData = {
    high: economicData.filter(item => item.priority === 'high'),
    medium: economicData.filter(item => item.priority === 'medium'),
    low: economicData.filter(item => item.priority === 'low')
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-zen">
          <div className="text-center">
            <div className="text-2xl text-light" style={{ color: '#9aa5ce', fontWeight: '300' }}>加载中</div>
            <div className="w-16 h-0-5 mx-auto" style={{ width: '4rem', height: '2px', backgroundColor: '#414868', margin: '0.5rem auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-20 py-10">
      <header className="text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-5xl font-light tracking-tight text-white">
          <span className="text-gradient">禅意</span> 经济看板
        </h1>
        <p className="text-lg text-[#9aa5ce] font-light leading-relaxed">
          去除冗余，聚焦核心。在一个宁静的视觉空间中，观察全球宏观经济的脉动循环。
        </p>
        <div className="flex justify-center">
          <div className="w-px h-16 bg-gradient-to-b from-[#7aa2f7] to-transparent opacity-40"></div>
        </div>
      </header>

      {/* 关键指标 - 宏大且专注 */}
      <section className="space-y-10">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm uppercase tracking-[0.3em] text-[#565f89] font-medium">核心经济动力</h2>
          <div className="h-px w-20 bg-[#414868]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {priorityData.high.map((item) => (
            <PriorityCard key={item.id} data={item} />
          ))}
        </div>
      </section>

      {/* 次要指标 - 优雅且清晰 */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#24283b]"></div>
          <h2 className="text-sm uppercase tracking-[0.2em] text-[#565f89] font-medium">市场参考指标</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#24283b]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {priorityData.medium.map((item) => (
            <SecondaryCard key={item.id} data={item} />
          ))}
        </div>
      </section>

      {/* 参考指标 - 极简且弱化 */}
      <section className="space-y-8 pb-10">
        <div className="flex items-center gap-4 opacity-40">
          <div className="h-px flex-1 bg-[#24283b]"></div>
          <h2 className="text-xs uppercase tracking-[0.1em] text-[#565f89]">辅助观测指标</h2>
          <div className="h-px flex-1 bg-[#24283b]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priorityData.low.map((item) => (
            <MutedCard key={item.id} data={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PriorityCard({ data }: { data: EconomicData }) {
  const isPositive = data.change >= 0;

  return (
    <div className="zen-card p-8 relative overflow-hidden group">
      {/* 背景装饰球 */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7aa2f7] opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.06] transition-opacity"></div>

      <div className="relative flex justify-between items-start mb-10">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-[#565f89] font-medium">Indicator</p>
          <h3 className="text-2xl text-[#c0caf5] font-light">{data.name}</h3>
        </div>
        <div className="animate-pulse-zen flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#9ece6a]"></div>
          <span className="text-[10px] uppercase tracking-tighter text-[#565f89]">Live</span>
        </div>
      </div>

      <div className="relative flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-6xl text-white font-light tabular-nums tracking-tighter">
            {data.value}
          </span>
          <span className="text-lg text-[#565f89] font-light">{data.unit}</span>
        </div>

        <div className="text-right space-y-1">
          <div className={`flex items-center justify-end gap-1.5 text-lg font-light ${isPositive ? 'text-[#9ece6a]' : 'text-[#f7768e]'}`}>
            <span className="text-sm">{isPositive ? '↑' : '↓'}</span>
            <span className="tabular-nums">{Math.abs(data.change).toFixed(2)}</span>
          </div>
          <p className="text-xs text-[#565f89] tabular-nums">
            {isPositive ? '+' : '-'}{Math.abs(data.changePercent).toFixed(1)}% Trend
          </p>
        </div>
      </div>
    </div>
  );
}

function SecondaryCard({ data }: { data: EconomicData }) {
  const isPositive = data.change >= 0;

  return (
    <div className="zen-card p-6 border-transparent hover:border-[#414868]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg text-[#9aa5ce] font-light">{data.name}</h3>
        <span className="text-[10px] text-[#414868] font-medium uppercase tracking-widest">Market</span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl text-[#c0caf5] font-light tabular-nums">
            {data.value}
          </span>
          <span className="text-xs text-[#565f89]">{data.unit}</span>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-light tabular-nums ${isPositive ? 'bg-[#9ece6a]/10 text-[#9ece6a]' : 'bg-[#f7768e]/10 text-[#f7768e]'
          }`}>
          {isPositive ? '+' : '-'}{Math.abs(data.changePercent).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function MutedCard({ data }: { data: EconomicData }) {
  return (
    <div className="p-4 rounded-2xl border border-[#24283b] bg-[#1a1b26]/30 flex justify-between items-center hover:bg-[#1a1b26]/50 transition-colors group">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-[#414868] font-medium">Reference</span>
        <h3 className="text-[#565f89] group-hover:text-[#9aa5ce] transition-colors">{data.name}</h3>
      </div>
      <div className="text-right">
        <div className="text-lg text-[#565f89] group-hover:text-[#c0caf5] tabular-nums transition-colors">
          {data.value}
          <span className="text-[10px] ml-1 opacity-50">{data.unit}</span>
        </div>
      </div>
    </div>
  );
}