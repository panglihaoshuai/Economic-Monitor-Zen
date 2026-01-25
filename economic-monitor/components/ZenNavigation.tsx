'use client';

import type { View } from '../app/page';

interface ZenNavigationProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function ZenNavigation({ activeView, onViewChange }: ZenNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* 背景模糊效果 */}
      <div className="absolute inset-0" style={{ background: 'rgba(26, 27, 38, 0.8)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(65, 72, 104, 0.2)' }} />
      
      {/* 导航内容 */}
      <div className="relative flex justify-center items-center" style={{ padding: '1.5rem 0' }}>
        <div className="flex items-center gap-8 rounded-full px-8 py-4" style={{ 
          background: 'rgba(36, 40, 59, 0.4)', 
          backdropFilter: 'blur(4px)', 
          border: '1px solid rgba(65, 72, 104, 0.3)' 
        }}>
          {/* 经济数据看板按钮 */}
          <button
            type="button"
            onClick={() => onViewChange('dashboard')}
            className="flex flex-col items-center gap-2 px-6 py-3 rounded-full transition-all duration-500"
            style={{
              background: activeView === 'dashboard' ? '#7aa2f7' : 'transparent',
              color: activeView === 'dashboard' ? '#1a1b26' : '#9aa5ce',
              boxShadow: activeView === 'dashboard' ? '0 10px 15px -3px rgba(122, 162, 247, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'dashboard') {
                e.currentTarget.style.color = '#c0caf5';
                e.currentTarget.style.background = 'rgba(65, 72, 104, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'dashboard') {
                e.currentTarget.style.color = '#9aa5ce';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <div className="relative">
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
              {activeView === 'dashboard' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#9ece6a' }} />
              )}
            </div>
            <span className="text-sm font-medium tracking-wide">
              经济数据看板
            </span>
          </button>

          {/* 交易记录按钮 */}
          <button
            type="button"
            onClick={() => onViewChange('records')}
            className="flex flex-col items-center gap-2 px-6 py-3 rounded-full transition-all duration-500"
            style={{
              background: activeView === 'records' ? '#7aa2f7' : 'transparent',
              color: activeView === 'records' ? '#1a1b26' : '#9aa5ce',
              boxShadow: activeView === 'records' ? '0 10px 15px -3px rgba(122, 162, 247, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'records') {
                e.currentTarget.style.color = '#c0caf5';
                e.currentTarget.style.background = 'rgba(65, 72, 104, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'records') {
                e.currentTarget.style.color = '#9aa5ce';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <div className="relative">
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              {activeView === 'records' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#9ece6a' }} />
              )}
            </div>
            <span className="text-sm font-medium tracking-wide">
              交易记录
            </span>
          </button>
        </div>
      </div>

      {/* 底部安全区域 */}
      <div style={{ height: '0.5rem', background: 'linear-gradient(to top, #1a1b26, transparent)' }} />
    </nav>
  );
}