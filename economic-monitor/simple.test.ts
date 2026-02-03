/**
 * 简单测试文件，用于验证测试环境
 */

import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2);
    });

    it('should handle basic math', () => {
        expect(2 * 3).toBe(6);
        expect(10 / 2).toBe(5);
    });
});
