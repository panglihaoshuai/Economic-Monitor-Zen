'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
}

export function TransactionRecords() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: 'tx001',
        date: '2024-01-24 14:32',
        type: 'buy',
        asset: 'SPY',
        amount: 100,
        price: 478.50,
        total: 47850,
        status: 'completed',
        notes: '基于CPI数据买入'
      },
      {
        id: 'tx002',
        date: '2024-01-24 11:15',
        type: 'sell',
        asset: 'QQQ',
        amount: 50,
        price: 432.80,
        total: 21640,
        status: 'completed',
        notes: '美联储利率决议前获利了结'
      },
      {
        id: 'tx003',
        date: '2024-01-23 16:45',
        type: 'buy',
        asset: 'TLT',
        amount: 200,
        price: 95.20,
        total: 19040,
        status: 'pending',
        notes: '避险配置'
      },
      {
        id: 'tx004',
        date: '2024-01-23 09:30',
        type: 'buy',
        asset: 'GLD',
        amount: 150,
        price: 202.30,
        total: 30345,
        status: 'completed',
        notes: '通胀对冲'
      },
      {
        id: 'tx005',
        date: '2024-01-22 15:20',
        type: 'sell',
        asset: 'BTC',
        amount: 0.5,
        price: 39850,
        total: 19925,
        status: 'failed',
        notes: '网络延迟导致失败'
      }
    ];

    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 800);
  }, []);

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const stats = {
    total: transactions.length,
    completed: transactions.filter(tx => tx.status === 'completed').length,
    pending: transactions.filter(tx => tx.status === 'pending').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
    totalVolume: transactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.total, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-zen">
          <div className="text-center">
            <div className="text-2xl" style={{ fontSize: '1.5rem', color: '#9aa5ce', fontWeight: '300' }}>加载交易记录</div>
            <div className="w-16 h-0-5 mx-auto" style={{ width: '4rem', height: '2px', backgroundColor: '#414868', margin: '0.5rem auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 py-10">
      <header className="text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-5xl font-light tracking-tight text-white">
          <span className="text-gradient">决策</span> 轨迹
        </h1>
        <p className="text-lg text-[#9aa5ce] font-light leading-relaxed">
          记录每一次波动的抉择，在历史的沉淀中寻求投资的智慧。
        </p>
        <div className="flex justify-center">
          <div className="w-px h-12 bg-gradient-to-b from-[#bb9af7] to-transparent opacity-40"></div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="运行总量" value={stats.total.toString()} color="#7aa2f7" />
        <StatCard label="最终达成" value={stats.completed.toString()} color="#9ece6a" />
        <StatCard label="流程中" value={stats.pending.toString()} color="#e0af68" />
        <StatCard label="成交额度" value={`$${(stats.totalVolume / 1000).toFixed(0)}K`} color="#bb9af7" />
      </section>

      <section className="flex justify-center pb-4">
        <div className="inline-flex rounded-full p-1.5 bg-[#1a1b26]/50 border border-[#24283b] backdrop-blur-sm">
          {(['all', 'buy', 'sell'] as const).map((filterType) => (
            <button
              key={filterType}
              type="button"
              onClick={() => setFilter(filterType)}
              className={`px-6 py-2 rounded-full text-sm font-light transition-all duration-500 ${filter === filterType
                  ? 'bg-[#7aa2f7] text-[#16161e] shadow-lg shadow-[#7aa2f7]/20'
                  : 'text-[#565f89] hover:text-[#9aa5ce]'
                }`}
            >
              {filterType === 'all' ? '全部' : filterType === 'buy' ? '流入' : '流出'}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto space-y-6">
        {filteredTransactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-20">
            <div className="text-[#414868] font-light italic tracking-widest uppercase text-xs">
              一片宁静 ・ 尚无记录
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="zen-card p-6 border-transparent hover:border-[#24283b] group">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#565f89] font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl text-white font-light tabular-nums">
            {value}
          </span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const isBuy = transaction.type === 'buy';

  const statusConfig = {
    completed: { text: 'Success', color: '#9ece6a', bg: 'bg-[#9ece6a]/5' },
    pending: { text: 'Flow', color: '#e0af68', bg: 'bg-[#e0af68]/5' },
    failed: { text: 'Lost', color: '#f7768e', bg: 'bg-[#f7768e]/5' }
  };

  const status = statusConfig[transaction.status];

  return (
    <div className="zen-card p-6 group">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4">
            <div className={`w-1 h-10 rounded-full ${isBuy ? 'bg-[#9ece6a]' : 'bg-[#f7768e]'} opacity-40`}></div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl text-[#c0caf5] font-light">
                  {isBuy ? '流入' : '流出'} <span className="text-white font-normal">{transaction.asset}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-tighter ${status.bg}`} style={{ color: status.color }}>
                  {status.text}
                </span>
              </div>
              <p className="text-xs text-[#565f89] mt-1 font-light tabular-nums">{transaction.date}</p>
            </div>
          </div>

          {transaction.notes && (
            <p className="text-xs text-[#414868] pl-5 border-l border-[#24283b] italic">
              {transaction.notes}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between md:flex-col md:items-end gap-2 px-5 py-3 rounded-2xl bg-[#16161e]/50 border border-[#24283b]/30">
          <div className="flex items-baseline gap-2">
            <span className="text-lg text-white font-light tabular-nums">
              {transaction.amount}
            </span>
            <span className="text-[10px] text-[#565f89] uppercase">@ {transaction.price.toFixed(2)}</span>
          </div>

          <div className={`text-xl font-light tabular-nums ${isBuy ? 'text-[#f7768e]' : 'text-[#9ece6a]'}`}>
            {isBuy ? '-' : '+'}${transaction.total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}