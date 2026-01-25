// Internationalization utilities

import en from '@/messages/en.json';
import zh from '@/messages/zh.json';

type Messages = typeof en;

export type Locale = 'en' | 'zh';

export const messages: Record<Locale, Messages> = {
  en,
  zh,
};

export function getLocaleFromPath(path: string): Locale {
  if (path.startsWith('/zh') || path.startsWith('/zh/')) {
    return 'zh';
  }
  return 'en';
}

export function isZhPath(path: string): boolean {
  return path.startsWith('/zh') || path.startsWith('/zh/');
}

export function createPathWithLocale(path: string, locale: Locale): string {
  if (locale === 'zh') {
    return `/zh${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/zh') ? path.replace(/^\/zh/, '') || '/' : path;
}
