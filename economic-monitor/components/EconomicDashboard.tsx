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
    <div className="space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-4xl tracking-tight" style={{ fontSize: '2.25rem', color: '#c0caf5', fontWeight: '300', letterSpacing: '-0.02em' }}>
          经济数据看板
        </h1>
        <p className="text-light max-w-2xl mx-auto" style={{ color: '#9aa5ce', fontWeight: '300', maxWidth: '42rem', margin: '0 auto' }}>
          实时追踪关键经济指标，把握市场脉搏
        </p>
        <div className="w-24 h-0-5 mx-auto" style={{ width: '6rem', height: '2px', background: 'linear-gradient(to right, transparent, #414868, transparent)', margin: '1rem auto' }}></div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-8 rounded-full" style={{ width: '0.5rem', height: '2rem', backgroundColor: '#7aa2f7', borderRadius: '9999px' }}></div>
          <h2 className="text-2xl text-light" style={{ fontSize: '1.5rem', color: '#c0caf5', fontWeight: '300' }}>关键指标</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {priorityData.high.map((item) => (
            <PriorityCard key={item.id} data={item} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-6 rounded-full" style={{ width: '0.5rem', height: '1.5rem', backgroundColor: '#565f89', borderRadius: '9999px' }}></div>
          <h2 className="text-xl text-light" style={{ fontSize: '1.25rem', color: '#9aa5ce', fontWeight: '300' }}>次要指标</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priorityData.medium.map((item) => (
            <SecondaryCard key={item.id} data={item} />
          ))}
        </div>
      </section>

      <section className="space-y-6 opacity-60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-4 rounded-full" style={{ width: '0.5rem', height: '1rem', backgroundColor: '#414868', borderRadius: '9999px' }}></div>
          <h2 className="text-lg text-light" style={{ fontSize: '1.125rem', color: '#565f89', fontWeight: '300' }}>参考指标</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    <div className="zen-card" style={{ borderRadius: '1rem', padding: '2rem', border: '1px solid rgba(122, 162, 247, 0.3)' }}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl" style={{ fontSize: '1.25rem', color: '#c0caf5', fontWeight: '300' }}>{data.name}</h3>
        <span className="text-xs" style={{ fontSize: '0.75rem', color: '#565f89', backgroundColor: '#1a1b26', padding: '0.25rem 0.5rem', borderRadius: '9999px' }}>
          实时
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl" style={{ fontSize: '3rem', color: '#c0caf5', fontWeight: '300', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data.value}
          </span>
          <span style={{ fontSize: '0.875rem', color: '#9aa5ce' }}>{data.unit}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm" style={{ fontSize: '0.875rem', color: isPositive ? '#9ece6a' : '#f7768e' }}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span className="tabular-nums">
              {Math.abs(data.change).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              ({Math.abs(data.changePercent).toFixed(1)}%)
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#565f89' }}>{data.updateTime}</span>
        </div>
      </div>
    </div>
  );
}

function SecondaryCard({ data }: { data: EconomicData }) {
  const isPositive = data.change >= 0;
  
  return (
    <div className="zen-card" style={{ borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid rgba(65, 72, 104, 0.5)' }}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg" style={{ fontSize: '1.125rem', color: '#9aa5ce', fontWeight: '300' }}>{data.name}</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl" style={{ fontSize: '2rem', color: '#c0caf5', fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}>
            {data.value}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#565f89' }}>{data.unit}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ fontSize: '0.75rem', color: isPositive ? '#9ece6a' : '#f7768e' }}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span className="tabular-nums">{Math.abs(data.changePercent).toFixed(1)}%</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#565f89' }}>{data.updateTime}</span>
        </div>
      </div>
    </div>
  );
}

function MutedCard({ data }: { data: EconomicData }) {
  const isPositive = data.change >= 0;
  
  return (
    <div style={{ borderRadius: '0.5rem', padding: '1rem', border: '1px solid rgba(65, 72, 104, 0.2)', background: 'rgba(26, 27, 38, 0.3)' }}>
      <div className="flex justify-between items-center">
        <h3 className="text-base" style={{ fontSize: '1rem', color: '#565f89', fontWeight: '300' }}>{data.name}</h3>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-xl" style={{ fontSize: '1.25rem', color: '#9aa5ce', fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}>
              {data.value}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#414868' }}>{data.unit}</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ fontSize: '0.75rem', color: isPositive ? 'rgba(158, 206, 106, 0.6)' : 'rgba(247, 118, 142, 0.6)' }}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(data.changePercent).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}