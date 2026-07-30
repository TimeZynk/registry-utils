import { describe, it, expect } from 'vitest';
import Immutable from 'immutable';
import { processDefaults } from './defaultValues';

describe('processDefaults', () => {
    it('copies a static field default value keyed by field id', () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', values: { 'default-val': 'hello' } },
        });
        expect(processDefaults(fieldInstances).get('f1')).toEqual('hello');
    });

    it('skips archived fields', () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', archived: true, values: { 'default-val': 'hello' } },
        });
        expect(processDefaults(fieldInstances).has('f1')).toBe(false);
    });

    it('skips fields with no default value', () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', values: {} },
        });
        expect(processDefaults(fieldInstances).has('f1')).toBe(false);
    });

    it('skips dynamic fields (settings.input present), even with a default-val set', () => {
        const fieldInstances = Immutable.fromJS({
            f1: {
                id: 'f1',
                settings: { input: 'from-serial' },
                values: { 'default-val': 'x', 'from-serial': 'SERIAL_1' },
            },
        });
        expect(processDefaults(fieldInstances).has('f1')).toBe(false);
    });

    it('preserves an empty-string default value (isNil check only, not isEmpty)', () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', values: { 'default-val': '' } },
        });
        expect(processDefaults(fieldInstances).get('f1')).toEqual('');
    });

    it('preserves a zero/false default value', () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', values: { 'default-val': 0 } },
            f2: { id: 'f2', values: { 'default-val': false } },
        });
        const result = processDefaults(fieldInstances);
        expect(result.get('f1')).toEqual(0);
        expect(result.get('f2')).toEqual(false);
    });
});
