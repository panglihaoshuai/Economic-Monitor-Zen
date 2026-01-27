'use client';

import { useState } from 'react';
import { ZenNavigation } from '@/components/ZenNavigation';
import { RealEconomicDashboard } from '@/components/RealEconomicDashboard';
import { TradeJournal } from '@/components/TradeJournal';
import { ZenButton } from '@/components/ui/ZenUI';
import { BarChart3, BookOpen } from 'lucide-react';

import { useTranslation } from '@/lib/language-context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal'>('dashboard');
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pb-20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--stroke-light)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-sage)] flex items-center justify-center text-white font-serif font-bold text-lg">
              Z
            </div>
            <span className="font-serif text-xl tracking-tight text-[var(--text-primary)]">
              {t('common.appName')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-[var(--bg-subtle)] p-1 rounded-full">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <BarChart3 className="w-4 h-4" />
                {t('zen.nav.monitor')}
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === 'journal' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <BookOpen className="w-4 h-4" />
                {t('zen.nav.journal')}
              </button>
            </div>

            <LanguageToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
        {activeTab === 'dashboard' ? (
          <RealEconomicDashboard />
        ) : (
          <TradeJournal />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-10 text-[var(--text-secondary)] text-sm">
        <p>© 2026 Zen Economic Monitor. Data provided by FRED St. Louis API.</p>
      </footer>
    </div>
  );
}