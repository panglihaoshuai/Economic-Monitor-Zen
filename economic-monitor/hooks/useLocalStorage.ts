// 通用本地存储 Hook
// 使用 localStorage 持久化数据，支持 SSR

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for syncing state with localStorage
 * @param key - The localStorage key
 * @param initialValue - Default value if nothing in storage
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
    // State to store our value
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize from localStorage on mount (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
        setIsInitialized(true);
    }, [key]);

    // Return a wrapped version of useState's setter function that persists to localStorage
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Save state
            setStoredValue(valueToStore);

            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Clear this key from localStorage
    const clearValue = useCallback(() => {
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
            setStoredValue(initialValue);
        } catch (error) {
            console.warn(`Error clearing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, clearValue];
}

/**
 * Export all data from multiple localStorage keys as JSON
 */
export function exportLocalStorageAsJSON(keys: string[]): string {
    if (typeof window === 'undefined') return '{}';

    const data: Record<string, unknown> = {};

    keys.forEach(key => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                data[key] = JSON.parse(item);
            }
        } catch (error) {
            console.warn(`Error exporting key "${key}":`, error);
        }
    });

    return JSON.stringify(data, null, 2);
}

/**
 * Export data as CSV string
 */
export function exportAsCSV<T extends Record<string, unknown>>(
    data: T[],
    columns?: (keyof T)[]
): string {
    if (!data.length) return '';

    const cols = columns || (Object.keys(data[0]) as (keyof T)[]);

    // Header row
    const header = cols.map(col => `"${String(col)}"`).join(',');

    // Data rows
    const rows = data.map(item =>
        cols.map(col => {
            const value = item[col];
            if (value === null || value === undefined) return '""';
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
    );

    return [header, ...rows].join('\n');
}

/**
 * Download string as file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
