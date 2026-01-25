'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Locale, messages } from './i18n';

type LanguageContextType = {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Flatten nested translation object for easy access
function flattenTranslations(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenTranslations(value as Record<string, unknown>, fullKey));
    }
  }

  return result;
}

// Pre-flatten translations for performance
const flattenedMessages: Record<Locale, Record<string, string>> = {
  en: flattenTranslations(messages.en),
  zh: flattenTranslations(messages.zh),
};

export function LanguageProvider({ children, initialLang = 'en' }: { children: ReactNode; initialLang?: Locale }) {
  const [language, setLanguageState] = useState<Locale>(initialLang);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize language from URL, localStorage, or browser preference
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred-language') as Locale | null;

    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLanguageState(savedLang);
      setIsLoading(false);
      return;
    }

    // Check browser preference
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'zh') {
      setLanguageState('zh');
    }
    setIsLoading(false);
  }, []);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);

    // Update URL if using path-based routing
    const currentPath = pathname || '/';
    let newPath: string;

    if (lang === 'zh') {
      newPath = currentPath.startsWith('/zh') ? currentPath : `/zh${currentPath}`;
    } else {
      newPath = currentPath.startsWith('/zh') ? currentPath.replace(/^\/zh/, '') || '/' : currentPath;
    }

    router.push(newPath);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = flattenedMessages[language][key] || key;

    // Replace parameters
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (match, paramName) => {
        const value = params[paramName];
        return value !== undefined ? String(value) : match;
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for components that need translation but don't want to trigger re-renders on language change
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}
