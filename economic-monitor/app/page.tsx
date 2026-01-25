'use client';

import { useState, useEffect } from 'react';
import { EconomicDashboard } from '@/components/EconomicDashboard';
import { TransactionRecords } from '@/components/TransactionRecords';
import { ZenNavigation } from '@/components/ZenNavigation';

type View = 'dashboard' | 'records';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 初始加载动画
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a1b26] flex items-center justify-center">
        <div className="animate-pulse-zen">
          <div className="text-4xl text-[#c0caf5] font-light">•</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-main">
      {/* 主内容区域 */}
      <main className="min-h-screen pb-20">
        <div className="container py-8">
          {activeView === 'dashboard' ? (
            <EconomicDashboard />
          ) : (
            <TransactionRecords />
          )}
        </div>
      </main>

      {/* 禅意底部导航 */}
      <ZenNavigation 
        activeView={activeView}
        onViewChange={setActiveView}
      />
    </div>
  );
}