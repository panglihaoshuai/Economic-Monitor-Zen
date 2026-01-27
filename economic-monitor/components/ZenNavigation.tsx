'use client';

import type { View } from '../app/page';

interface ZenNavigationProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function ZenNavigation({ activeView, onViewChange }: ZenNavigationProps) {
  return (
    <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 p-2 rounded-full bg-[#1a1b26]/70 backdrop-blur-2xl border border-[#414868]/30 shadow-2xl shadow-black/50 overflow-hidden">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`relative flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group ${activeView === 'dashboard' ? 'text-[#16161e]' : 'text-[#565f89] hover:text-[#9aa5ce]'
            }`}
        >
          {activeView === 'dashboard' && (
            <div className="absolute inset-0 bg-[#7aa2f7] rounded-full shadow-lg shadow-[#7aa2f7]/20"></div>
          )}
          <div className="relative z-10 flex items-center gap-3">
            <svg
              className={`w-5 h-5 transition-transform duration-500 ${activeView === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium tracking-wide">看板</span>
          </div>
        </button>

        <button
          onClick={() => onViewChange('records')}
          className={`relative flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group ${activeView === 'records' ? 'text-[#16161e]' : 'text-[#565f89] hover:text-[#9aa5ce]'
            }`}
        >
          {activeView === 'records' && (
            <div className="absolute inset-0 bg-[#7aa2f7] rounded-full shadow-lg shadow-[#7aa2f7]/20"></div>
          )}
          <div className="relative z-10 flex items-center gap-3">
            <svg
              className={`w-5 h-5 transition-transform duration-500 ${activeView === 'records' ? 'scale-110' : 'group-hover:scale-110'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium tracking-wide">轨迹</span>
          </div>
        </button>
      </div>
    </nav>
  );
}