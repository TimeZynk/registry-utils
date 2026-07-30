import { describe, it, expect } from 'vitest';
import stringify from './stringify';

describe('stringify', () => {
    it('exposes a formatter per key matching the tzstores shape', () => {
        expect(typeof stringify.address).toBe('function');
        expect(typeof stringify.breaks).toBe('function');
        expect(typeof stringify['registry-reference']).toBe('function');
        expect(typeof stringify['start-end']).toBe('function');
        expect(typeof stringify.boolean).toBe('function');
        expect(typeof stringify.default).toBe('function');
    });

    it('boolean formats true/false via the shared formatter', () => {
        expect(stringify.boolean(true)).toEqual(t.Yes || 'Yes');
        expect(stringify.boolean(false)).toEqual(t.No || 'No');
    });

    it('default formats a plain value', () => {
        expect(stringify.default(42)).toEqual('42');
    });
});
