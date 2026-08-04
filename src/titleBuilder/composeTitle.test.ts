import { describe, it, expect } from 'vitest';
import Immutable from 'immutable';
import { composeTitle } from './composeTitle.js';
import { defaultRegisters } from '../utils/defaultRegisters.js';

describe('composeTitle', () => {
    const settings = Immutable.fromJS({
        id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
        value: {
            separator: ' - ',
            fields: [{ id: 'FIELD_A' }],
        },
    });

    it('composes a title from the configured field', () => {
        const regFields = Immutable.Map({
            FIELD_A: Immutable.Map({ id: 'FIELD_A', 'field-id': 'field-a', 'field-type': 'string', weight: 1 }),
        });
        const data = Immutable.Map({ FIELD_A: 'Value A' });

        expect(composeTitle(data, undefined, settings, regFields)).toEqual('Value A');
    });

    // Regression test: composeTitle used to cache its titleBuilder in a module-level
    // singleton keyed only on `settings`, never on `regFields`. Once a builder existed for a
    // given `settings` value, it kept being reused for every later call with an equal
    // `settings`, even if `regFields` went from present to completely absent — silently
    // continuing field-based composition instead of correctly falling back to path-based
    // composition. (Note: this is the only behavioral difference the old cache actually
    // caused in practice — regFields' *content*, as opposed to its mere presence, only ever
    // fed into composition via a per-field custom `.formatter` function branch in
    // fieldBasedBuilder.ts that nothing in this codebase currently sets, so a regFields
    // content change alone — the scenario originally suspected here — does not reproduce
    // observably different output either before or after this fix.)
    it('falls back to path-based composition when regFields becomes unavailable, even with unchanged settings', () => {
        const regFieldsV1 = Immutable.Map({
            FIELD_A: Immutable.Map({ id: 'FIELD_A', 'field-id': 'field-a', 'field-type': 'string', weight: 1 }),
        });
        const dataV1 = Immutable.Map({ FIELD_A: 'Field Value' });

        // First call establishes a builder for (settings, regFieldsV1).
        expect(composeTitle(dataV1, undefined, settings, regFieldsV1)).toEqual('Field Value');

        // regFields is no longer available (e.g. not yet loaded) but `settings` is the exact
        // same object — the old buggy cache would keep using the field-based builder anyway.
        const dataV2 = Immutable.Map({
            path: Immutable.List([Immutable.Map({ title: 'Parent' }), Immutable.Map({ title: 'Child' })]),
        });

        expect(composeTitle(dataV2, undefined, settings, undefined)).toEqual('Parent - Child');
    });

    it('falls back to path-based composition when no regFields are provided', () => {
        const data = Immutable.Map({
            path: Immutable.List([Immutable.Map({ title: 'Parent' }), Immutable.Map({ title: 'Child' })]),
        });

        expect(composeTitle(data, undefined, settings, undefined)).toEqual('Parent - Child');
    });

    it('returns null when composition yields only separators', () => {
        const data = Immutable.Map({
            path: Immutable.List([Immutable.Map({ title: '' }), Immutable.Map({ title: '' })]),
        });

        expect(composeTitle(data, undefined, settings, undefined)).toBeNull();
    });
});
