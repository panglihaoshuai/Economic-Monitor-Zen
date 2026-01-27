'use client';

import { useState, useRef, useEffect } from 'react';
import { useTradeJournal } from '@/hooks/useTradeJournal';
import { useTranslation } from '@/lib/language-context';

interface SmartAssetInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function SmartAssetInput({ value, onChange, className, placeholder }: SmartAssetInputProps) {
    const { entries } = useTradeJournal();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    // 提取历史资产，按频率排序
    useEffect(() => {
        if (!value) {
            setSuggestions([]);
            return;
        }

        const frequencyMap = new Map<string, number>();
        entries.forEach(entry => {
            const asset = entry.asset.toUpperCase();
            frequencyMap.set(asset, (frequencyMap.get(asset) || 0) + 1);
        });

        // 默认热门资产（如果是空库的话）
        if (frequencyMap.size === 0) {
            frequencyMap.set('BTC', 1);
            frequencyMap.set('ETH', 1);
            frequencyMap.set('SOL', 1);
            frequencyMap.set('AAPL', 1);
            frequencyMap.set('NVDA', 1);
            frequencyMap.set('TSLA', 1);
            frequencyMap.set('EURUSD', 1);
            frequencyMap.set('XAUUSD', 1);
        }

        const uniqueAssets = Array.from(frequencyMap.keys());

        // 过滤匹配项
        const filtered = uniqueAssets
            .filter(asset => asset.startsWith(value.toUpperCase()) && asset !== value.toUpperCase())
            .sort((a, b) => (frequencyMap.get(b) || 0) - (frequencyMap.get(a) || 0))
            .slice(0, 5); // 最多显示5个建议

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
    }, [value, entries]);

    // 点击外部关闭
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (asset: string) => {
        onChange(asset);
        setShowSuggestions(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                className={className}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                }}
                onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                }}
            />

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[var(--stroke-medium)] rounded-lg shadow-lg overflow-hidden animate-fade-in">
                    {suggestions.map((asset) => (
                        <button
                            key={asset}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors flex justify-between items-center"
                            onClick={() => handleSelect(asset)}
                        >
                            <span className="font-medium">{asset}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{t('zen.journal.history')}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
