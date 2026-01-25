'use client';

import { useState } from 'react';
import type { MacroSignal, Trade, TradeDirection, EmotionTag } from '@/shared/types';

interface TradeFormProps {
  signals: MacroSignal[];
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

export function TradeForm({ signals, onClose, onSave }: TradeFormProps) {
  const [form, setForm] = useState({
    symbol: '',
    direction: 'long' as TradeDirection,
    entryPrice: '',
    exitPrice: '',
    quantity: '1',
    tags: [] as string[],
    note: '',
  });

  const allTags = ['#趋势', '#SOFR', '#GDP', '#通胀', '#财报'];

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 2
          ? [...prev.tags, tag]
          : prev.tags
    }));
  };

  const pnlPercent = form.entryPrice && form.exitPrice
    ? ((Number(form.exitPrice) - Number(form.entryPrice)) / Number(form.entryPrice) * 100)
    : 0;

  const handleSave = () => {
    const hour = new Date().getHours();
    let emotion: EmotionTag = 'calm';
    if (hour >= 0 && hour < 6) emotion = 'panic';
    else if (form.tags.length >= 2 && pnlPercent > 5) emotion = 'greed';

    const correlations = signals
      .filter(s => form.tags.some(t => t.includes(s.indicatorId)))
      .map(s => ({
        indicatorId: s.indicatorId,
        signalType: s.type,
        action: 'followed' as const,
        confidence: s.confidence,
      }));

    onSave({
      symbol: form.symbol,
      assetClass: 'stock',
      direction: form.direction,
      tradeType: 'swing',
      entryPrice: Number(form.entryPrice),
      exitPrice: Number(form.exitPrice),
      quantity: Number(form.quantity),
      positionSize: 0.2,
      leverage: 1,
      entryTime: new Date().toISOString(),
      pnlPercent,
      pnlAmount: Number(form.entryPrice) * Number(form.quantity) * (pnlPercent / 100),
      status: 'closed' as const,
      tags: form.tags,
      note: form.note,
      macroCorrelations: correlations,
      emotionTag: emotion,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-medium text-white">记录交易</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* 交易对和方向 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="交易对"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
            <div className="flex rounded overflow-hidden">
              <button
                onClick={() => setForm({ ...form, direction: 'long' })}
                className={`px-3 py-2 ${
                  form.direction === 'long' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                多
              </button>
              <button
                onClick={() => setForm({ ...form, direction: 'short' })}
                className={`px-3 py-2 ${
                  form.direction === 'short' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                空
              </button>
            </div>
          </div>

          {/* 价格 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">入场价</label>
              <input
                type="number"
                placeholder="入场价"
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">出场价</label>
              <input
                type="number"
                placeholder="出场价"
                value={form.exitPrice}
                onChange={(e) => setForm({ ...form, exitPrice: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white mt-1"
              />
            </div>
          </div>

          {/* 盈亏 */}
          {form.entryPrice && form.exitPrice && (
            <div className={`text-center py-2 rounded ${
              pnlPercent >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'
            }`}>
              <span className={`text-xl font-bold ${
                pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
            </div>
          )}

          {/* 标签 */}
          <div>
            <label className="text-xs text-slate-500">标签</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded text-xs ${
                    form.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="text-xs text-slate-500">备注</label>
            <textarea
              placeholder="交易理由..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white mt-1 resize-none"
            />
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-2 p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 rounded text-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!form.symbol || !form.entryPrice || !form.exitPrice}
            className="flex-1 py-2 bg-blue-600 rounded text-white disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
