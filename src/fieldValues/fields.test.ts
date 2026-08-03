import { describe, it, expect } from 'vitest';
import Immutable from 'immutable';
import {
    canPack,
    getPackFunction,
    canClear,
    getClearFunction,
    canModify,
    getModifyFunction,
    listFormatters,
    getFieldValueFormatter,
    getFormatterByFieldInstance,
} from './fields';

describe('pack', () => {
    it('disables pack for known-disabled ids', () => {
        expect(canPack('email', 'text')).toBe(false);
        expect(canPack('username', 'text')).toBe(false);
        expect(canPack('id-no', 'text')).toBe(false);
    });

    it('allows pack for a normal id/type', () => {
        expect(canPack('some-field', 'text')).toBe(true);
    });

    it('getPackFunction falls back to the standard packer, which sets into values', () => {
        const fn = getPackFunction('unknown-id');
        const item = Immutable.fromJS({ values: {} });
        const result = fn(item, 'hello', 'unknown-id');
        expect(result.getIn(['values', 'unknown-id'])).toEqual('hello');
    });

    it('resolves a known static-string packer that trims and nullifies empty values', () => {
        const fn = getPackFunction('name');
        const item = Immutable.Map({ name: 'old' });
        expect(fn(item, '  new  ', 'name').get('name')).toEqual('new');
        expect(fn(item, '   ', 'name').get('name')).toEqual(null);
    });
});

describe('clear', () => {
    it('getClearFunction falls back to the standard clearer, which deletes from values', () => {
        const fn = getClearFunction('unknown-id');
        const item = Immutable.fromJS({ values: { 'unknown-id': 'x' } });
        expect(fn(item, undefined, 'unknown-id').getIn(['values', 'unknown-id'])).toBeUndefined();
    });

    it('canClear is true by default', () => {
        expect(canClear('some-field', 'text')).toBe(true);
    });
});

describe('modify', () => {
    it('canModify is false for ids with no modify function', () => {
        expect(canModify('some-field', 'text')).toBe(false);
    });

    it('canModify is true for a known modifiable id', () => {
        expect(canModify('shift-startend', 'text')).toBe(true);
    });

    // Locks in a legacy quirk from tzstores: modField.standard was never defined, so unknown
    // ids intentionally return undefined, not a no-op function. Do not silently change this.
    it('getModifyFunction returns undefined for an unknown id', () => {
        expect(getModifyFunction('some-unknown-field')).toBeUndefined();
    });

    it('getModifyFunction resolves a known modifier', () => {
        expect(typeof getModifyFunction('shift-startend')).toBe('function');
    });
});

describe('listFormatters', () => {
    it('returns the standard list for an unknown type', () => {
        const list = listFormatters('unknown-type');
        expect(list.has('standard')).toBe(true);
    });

    it('returns a memoized (identity-stable) map across calls', () => {
        expect(listFormatters('address')).toBe(listFormatters('address'));
    });

    it('lists all address sub-formatters', () => {
        const list = listFormatters('address');
        expect(list.keySeq().toSet()).toEqual(
            Immutable.Set([
                'address',
                'addressAddress1',
                'addressAddress2',
                'addressCity',
                'addressZip',
                'addressCountry',
            ])
        );
    });
});

describe('getFieldValueFormatter', () => {
    it('formats a boolean value', () => {
        expect(getFieldValueFormatter('boolean')(true)).toEqual(t.Yes || 'Yes');
        expect(getFieldValueFormatter('boolean')(false)).toEqual(t.No || 'No');
    });

    it('falls back to the standard formatter for an unknown id', () => {
        expect(getFieldValueFormatter('nonexistent')(42)).toEqual('42');
    });

    it('registry-reference returns empty string with no resolver injected', () => {
        expect(getFieldValueFormatter('registry-reference')('some-id')).toEqual('');
    });

    it('registry-reference uses the injected resolver', () => {
        const formatter = getFieldValueFormatter('registry-reference', (id) =>
            id === 'ref-1' ? 'Referenced Title' : undefined
        );
        expect(formatter('ref-1')).toEqual('Referenced Title');
        expect(formatter('missing')).toEqual('');
    });
});

describe('getFormatterByFieldInstance', () => {
    it('returns the standard formatter when no field instance is given', () => {
        expect(getFormatterByFieldInstance(undefined)('x')).toEqual('x');
    });

    it('resolves a formatter from the field instance field-type', () => {
        const fieldInstance = Immutable.fromJS({ id: 'f1', 'field-type': 'boolean' });
        expect(getFormatterByFieldInstance(fieldInstance)(true)).toEqual(t.Yes || 'Yes');
    });

    it('resolves registry-reference with an injected resolver', () => {
        const fieldInstance = Immutable.fromJS({ id: 'f1', 'field-type': 'registry-reference' });
        const formatter = getFormatterByFieldInstance(fieldInstance, () => 'Resolved Title');
        expect(formatter('any-id')).toEqual('Resolved Title');
    });
});
