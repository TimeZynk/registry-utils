import { describe, it, expect } from 'vitest';
import { processSeparator, cleanSeparatorResult, isSeparatorOnly } from './processSeparator.js';

describe('processSeparator', () => {
    it('should handle normal parts correctly', () => {
        const parts = ['SomeValue', 'AnotherValue'];
        const separator = ' » ';
        const result = processSeparator(parts, separator);
        expect(result).toBe('SomeValue » AnotherValue');
    });

    it('should handle empty array', () => {
        const parts: string[] = [];
        const separator = ' » ';
        const result = processSeparator(parts, separator);
        expect(result).toBe('');
    });

    it('should filter out undefined values', () => {
        const parts = ['SomeValue', undefined, 'AnotherValue'];
        const separator = ' » ';
        const result = processSeparator(parts, separator);
        expect(result).toBe('SomeValue » AnotherValue');
    });
});

describe('cleanSeparatorResult', () => {
    it('should handle empty string', () => {
        expect(cleanSeparatorResult('', ' » ')).toBe('');
    });

    it('should clean normal string', () => {
        const result = cleanSeparatorResult('SomeValue » AnotherValue', ' » ');
        expect(result).toBe('SomeValue » AnotherValue');
    });
});

describe('isSeparatorOnly', () => {
    it('should return false for strings with content', () => {
        expect(isSeparatorOnly('SomeValue » AnotherValue', ' » ')).toBe(false);
    });

    it('should return true for separator-only strings', () => {
        expect(isSeparatorOnly(' » ', ' » ')).toBe(true);
    });
});
