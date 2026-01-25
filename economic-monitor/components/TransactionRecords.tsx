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
    <div className="space-y-10">
      <header className="text-center space-y-4">
        <h1 className="text-4xl tracking-tight" style={{ fontSize: '2.25rem', color: '#c0caf5', fontWeight: '300', letterSpacing: '-0.02em' }}>
          交易记录
        </h1>
        <p className="text-light max-w-2xl mx-auto" style={{ color: '#9aa5ce', fontWeight: '300', maxWidth: '42rem', margin: '0 auto' }}>
          记录每一笔交易，追踪投资决策
        </p>
        <div className="w-24 h-0-5 mx-auto" style={{ width: '6rem', height: '2px', background: 'linear-gradient(to right, transparent, #414868, transparent)', margin: '1rem auto' }}></div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总交易数" value={stats.total.toString()} color="#7aa2f7" />
        <StatCard label="已完成" value={stats.completed.toString()} color="#9ece6a" />
        <StatCard label="待处理" value={stats.pending.toString()} color="#e0af68" />
        <StatCard label="总交易额" value={`$${(stats.totalVolume / 1000).toFixed(0)}K`} color="#bb9af7" />
      </section>

      <section className="flex justify-center">
        <div className="inline-flex rounded-lg p-1" style={{ 
          background: 'rgba(36, 40, 59, 0.4)', 
          border: '1px solid rgba(65, 72, 104, 0.3)' 
        }}>
          {(['all', 'buy', 'sell'] as const).map((filterType) => (
            <button
              key={filterType}
              type="button"
              onClick={() => setFilter(filterType)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                background: filter === filterType ? '#7aa2f7' : 'transparent',
                color: filter === filterType ? '#1a1b26' : '#9aa5ce',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem'
              }}
            >
              {filterType === 'all' ? '全部' : filterType === 'buy' ? '买入' : '卖出'}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto space-y-4">
        {filteredTransactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div style={{ color: '#9aa5ce', fontWeight: '300' }}>
              暂无{filter === 'all' ? '' : filter === 'buy' ? '买入' : '卖出'}交易记录
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="zen-card text-center" style={{
      borderRadius: '0.75rem',
      padding: '1.5rem',
      border: '1px solid rgba(65, 72, 104, 0.5)'
    }}>
      <div style={{ fontSize: '1.5rem', color: '#c0caf5', fontWeight: '300', fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#9aa5ce', fontWeight: '300' }}>
        {label}
      </div>
      <div style={{ width: '2rem', height: '2px', margin: '0.5rem auto 0', borderRadius: '9999px', backgroundColor: color }}></div>
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const isBuy = transaction.type === 'buy';
  
  const statusConfig = {
    completed: { text: '已完成', color: '#9ece6a', bg: 'rgba(158, 206, 106, 0.1)' },
    pending: { text: '待处理', color: '#e0af68', bg: 'rgba(224, 175, 104, 0.1)' },
    failed: { text: '失败', color: '#f7768e', bg: 'rgba(247, 118, 142, 0.1)' }
  };

  const status = statusConfig[transaction.status];

  return (
    <div className="zen-card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: '1px solid rgba(65, 72, 104, 0.3)'
      }}>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: isBuy ? '#9ece6a' : '#f7768e' }}></div>
            <span style={{ fontSize: '1.125rem', color: '#c0caf5', fontWeight: '300' }}>
              {isBuy ? '买入' : '卖出'} {transaction.asset}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: status.bg, color: status.color, padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
              {status.text}
            </span>
          </div>
          
          <div style={{ fontSize: '0.875rem', color: '#9aa5ce', fontWeight: '300' }}>
            {transaction.date}
          </div>
          
          {transaction.notes && (
            <div style={{ fontSize: '0.875rem', color: '#565f89', fontStyle: 'italic' }}>
              "{transaction.notes}"
            </div>
          )}
        </div>

        <div className="text-right space-y-1">
          <div className="flex items-baseline gap-2 justify-end">
            <span style={{ fontSize: '1.125rem', color: '#c0caf5', fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}>
              {transaction.amount}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#9aa5ce' }}>
              @ ${transaction.price.toFixed(2)}
            </span>
          </div>
          
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '300', 
            fontVariantNumeric: 'tabular-nums',
            color: isBuy ? '#f7768e' : '#9ece6a'
          }}>
            {isBuy ? '-' : '+'}${transaction.total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}