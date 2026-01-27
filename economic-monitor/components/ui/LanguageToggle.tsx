'use client';

import { useLanguage } from '@/lib/language-context';

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 uppercase tracking-wider opacity-60 hover:opacity-100"
            title="Switch Language"
        >
            {language === 'en' ? 'EN / 中' : '中 / EN'}
        </button>
    );
}
