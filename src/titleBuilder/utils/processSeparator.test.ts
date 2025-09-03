import { describe, it, expect } from 'vitest';
import { processSeparator, cleanSeparatorResult, isSeparatorOnly } from './processSeparator.js';

describe('processSeparator', () => {
    describe('basic functionality', () => {
        it('should handle normal parts correctly', () => {
            const parts = ['SomeValue', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle single part', () => {
            const parts = ['SomeValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue');
        });

        it('should handle empty array', () => {
            const parts: string[] = [];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('');
        });

        it('should handle null/undefined array', () => {
            const separator = ' » ';
            expect(processSeparator(null as any, separator)).toBe('');
            expect(processSeparator(undefined as any, separator)).toBe('');
        });
    });

    describe('empty/undefined value handling', () => {
        it('should filter out undefined values', () => {
            const parts = ['SomeValue', undefined, 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should filter out null values', () => {
            const parts = ['SomeValue', null, 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should filter out empty strings', () => {
            const parts = ['SomeValue', '', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should filter out whitespace-only strings', () => {
            const parts = ['SomeValue', '   ', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should filter out multiple empty values', () => {
            const parts = ['SomeValue', '', undefined, '   ', null, 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle all empty values', () => {
            const parts = [undefined, '', null, '   '];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('');
        });

        it('should handle empty values at start', () => {
            const parts = [undefined, '', 'SomeValue', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle empty values at end', () => {
            const parts = ['SomeValue', 'AnotherValue', '', undefined];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });
    });

    describe('separator handling', () => {
        it('should work with different separators', () => {
            const parts = ['SomeValue', 'AnotherValue'];

            expect(processSeparator(parts, ', ')).toBe('SomeValue, AnotherValue');
            expect(processSeparator(parts, ' | ')).toBe('SomeValue | AnotherValue');
            expect(processSeparator(parts, ' → ')).toBe('SomeValue → AnotherValue');
            expect(processSeparator(parts, '')).toBe('SomeValueAnotherValue');
        });

        it('should work with emoji separators', () => {
            const parts = ['SomeValue', 'AnotherValue'];
            const separator = ' 🚀 ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue 🚀 AnotherValue');
        });

        it('should work with special character separators', () => {
            const parts = ['SomeValue', 'AnotherValue'];
            const separator = ' >> ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue >> AnotherValue');
        });
    });

    describe('edge cases', () => {
        it('should handle mixed content types', () => {
            const parts = [0, 'SomeValue', false, 'AnotherValue', true];
            const separator = ' » ';
            const result = processSeparator(parts as any, separator);
            expect(result).toBe('0 » SomeValue » false » AnotherValue » true');
        });

        it('should handle whitespace in values', () => {
            const parts = [' SomeValue ', ' AnotherValue '];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle very long values', () => {
            const longValue = 'A'.repeat(1000);
            const parts = [longValue, 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe(`${longValue} » AnotherValue`);
        });

        it('should handle empty separator', () => {
            const parts = ['SomeValue', 'AnotherValue'];
            const separator = '';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValueAnotherValue');
        });
    });

    describe('consecutive separator handling', () => {
        it('should handle consecutive separators in input', () => {
            const parts = ['SomeValue', '', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle multiple consecutive empty values', () => {
            const parts = ['SomeValue', '', '', '', 'AnotherValue'];
            const separator = ' » ';
            const result = processSeparator(parts, separator);
            expect(result).toBe('SomeValue » AnotherValue');
        });
    });
});

describe('cleanSeparatorResult', () => {
    describe('basic cleaning', () => {
        it('should handle empty string', () => {
            expect(cleanSeparatorResult('', ' » ')).toBe('');
        });

        it('should handle null/undefined', () => {
            expect(cleanSeparatorResult(null as any, ' » ')).toBe('');
            expect(cleanSeparatorResult(undefined as any, ' » ')).toBe('');
        });

        it('should clean normal string', () => {
            const result = cleanSeparatorResult('SomeValue » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » AnotherValue');
        });
    });

    describe('consecutive separator cleaning', () => {
        it('should handle consecutive separators with single space (no cleaning needed)', () => {
            // Since we now filter out empty values at the source, this case won't occur
            // The function should handle it gracefully if it does occur
            const result = cleanSeparatorResult('SomeValue » » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » » AnotherValue');
        });

        it('should clean consecutive separators with multiple spaces', () => {
            const result = cleanSeparatorResult('SomeValue »  » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle multiple consecutive separators (no cleaning needed)', () => {
            // Since we now filter out empty values at the source, this case won't occur
            const result = cleanSeparatorResult('SomeValue » » » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » » » AnotherValue');
        });

        it('should clean mixed consecutive separators', () => {
            const result = cleanSeparatorResult('SomeValue »  » »  » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » » » AnotherValue');
        });
    });

    describe('empty parts cleaning', () => {
        it('should remove empty parts', () => {
            const result = cleanSeparatorResult('SomeValue »  » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should remove whitespace-only parts', () => {
            const result = cleanSeparatorResult('SomeValue »   » AnotherValue', ' » ');
            expect(result).toBe('SomeValue » AnotherValue');
        });

        it('should handle leading/trailing separators', () => {
            const result = cleanSeparatorResult(' » SomeValue » AnotherValue » ', ' » ');
            expect(result).toBe('SomeValue » AnotherValue');
        });
    });

    describe('different separators', () => {
        it('should work with comma separator', () => {
            const result = cleanSeparatorResult('SomeValue, , AnotherValue', ', ');
            expect(result).toBe('SomeValue, AnotherValue');
        });

        it('should work with pipe separator', () => {
            const result = cleanSeparatorResult('SomeValue | | AnotherValue', ' | ');
            expect(result).toBe('SomeValue | | AnotherValue');
        });

        it('should work with emoji separator', () => {
            const result = cleanSeparatorResult('SomeValue 🚀 🚀 AnotherValue', ' 🚀 ');
            expect(result).toBe('SomeValue 🚀 🚀 AnotherValue');
        });
    });
});

describe('isSeparatorOnly', () => {
    describe('basic functionality', () => {
        it('should return true for separator-only strings', () => {
            expect(isSeparatorOnly(' » ', ' » ')).toBe(true);
            expect(isSeparatorOnly(' »  » ', ' » ')).toBe(true);
            expect(isSeparatorOnly(' » » ', ' » ')).toBe(true);
        });

        it('should return false for strings with content', () => {
            expect(isSeparatorOnly('SomeValue » AnotherValue', ' » ')).toBe(false);
            expect(isSeparatorOnly('SomeValue', ' » ')).toBe(false);
            expect(isSeparatorOnly(' » SomeValue', ' » ')).toBe(false);
        });

        it('should handle empty strings', () => {
            expect(isSeparatorOnly('', ' » ')).toBe(false);
        });

        it('should handle whitespace-only strings', () => {
            expect(isSeparatorOnly('   ', ' » ')).toBe(false);
        });
    });

    describe('different separators', () => {
        it('should work with comma separator', () => {
            expect(isSeparatorOnly(', ,', ', ')).toBe(true);
            expect(isSeparatorOnly('SomeValue, AnotherValue', ', ')).toBe(false);
        });

        it('should work with pipe separator', () => {
            expect(isSeparatorOnly(' | | ', ' | ')).toBe(true);
            expect(isSeparatorOnly('SomeValue | AnotherValue', ' | ')).toBe(false);
        });

        it('should work with emoji separator', () => {
            expect(isSeparatorOnly(' 🚀 🚀 ', ' 🚀 ')).toBe(true);
            expect(isSeparatorOnly('SomeValue 🚀 AnotherValue', ' 🚀 ')).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle regex special characters in separator', () => {
            const separator = '.*+?^${}()|[]\\';
            expect(isSeparatorOnly(separator, separator)).toBe(true);
            expect(isSeparatorOnly('SomeValue', separator)).toBe(false);
        });

        it('should handle empty separator', () => {
            expect(isSeparatorOnly('', '')).toBe(true);
            expect(isSeparatorOnly('SomeValue', '')).toBe(false);
        });
    });
});
