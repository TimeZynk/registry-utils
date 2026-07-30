import { describe, it, expect, vi } from 'vitest';
import Immutable from 'immutable';
import { processSerials, processFields, cleanUp } from './processData';
import processData from './processData';

describe('processSerials', () => {
    it('fetches the next serial for a from-serial field with a null value', async () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
        });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn().mockResolvedValue('S-0001');

        const result = await processSerials(data, fieldInstances, fetchNextSerial);

        expect(fetchNextSerial).toHaveBeenCalledWith('SERIAL_1');
        expect(result.getIn(['values', 'f1'])).toEqual('S-0001');
    });

    it('does not fetch when the field already has a value', async () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
        });
        const data = Immutable.fromJS({ id: 'x', values: { f1: 'already-set' } });
        const fetchNextSerial = vi.fn().mockResolvedValue('S-0001');

        const result = await processSerials(data, fieldInstances, fetchNextSerial);

        expect(fetchNextSerial).not.toHaveBeenCalled();
        expect(result.getIn(['values', 'f1'])).toEqual('already-set');
    });

    it('maps a rejected fetch to null rather than throwing', async () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
        });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn().mockRejectedValue(new Error('network error'));

        const result = await processSerials(data, fieldInstances, fetchNextSerial);

        expect(result.getIn(['values', 'f1'])).toEqual(null);
    });

    it('skips archived fields', async () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', archived: true, settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
        });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn().mockResolvedValue('S-0001');

        await processSerials(data, fieldInstances, fetchNextSerial);

        expect(fetchNextSerial).not.toHaveBeenCalled();
    });

    it('sets a static field at the top level instead of under values', async () => {
        const fieldInstances = Immutable.fromJS({
            f1: { id: 'f1', isStatic: true, settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
        });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn().mockResolvedValue('S-0001');

        const result = await processSerials(data, fieldInstances, fetchNextSerial);

        expect(result.get('f1')).toEqual('S-0001');
        expect(result.getIn(['values', 'f1'])).toBeUndefined();
    });

    it('resolves immediately with unchanged data when there are no from-serial fields', async () => {
        const fieldInstances = Immutable.fromJS({ f1: { id: 'f1' } });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn();

        const result = await processSerials(data, fieldInstances, fetchNextSerial);

        expect(result).toBe(data);
        expect(fetchNextSerial).not.toHaveBeenCalled();
    });
});

describe('processFields', () => {
    it('joins referenced field values with the default separator', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'a' }, { id: 'b' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { a: 'Alpha', b: 'Beta' } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        const result = processFields(data, fieldInstances, resolveRefData);

        expect(result.getIn(['values', 'composed'])).toEqual('Alpha » Beta');
    });

    it('uses a custom separator when configured', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'a' }, { id: 'b' }], separator: ' - ' } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { a: 'Alpha', b: 'Beta' } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        const result = processFields(data, fieldInstances, resolveRefData);

        expect(result.getIn(['values', 'composed'])).toEqual('Alpha - Beta');
    });

    it('filters out falsy formatted values', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'a' }, { id: 'b' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { a: 'Alpha' } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        const result = processFields(data, fieldInstances, resolveRefData);

        expect(result.getIn(['values', 'composed'])).toEqual('Alpha');
    });

    it('prefers refData over the raw accumulator value', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'a' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { a: 'raw-value' } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map({ a: 'ref-value' }));

        const result = processFields(data, fieldInstances, resolveRefData);

        expect(result.getIn(['values', 'composed'])).toEqual('ref-value');
    });

    // Regression: tzstores' original always resolved a referenced field's type via a global
    // fieldInstanceById lookup, independent of whatever fieldInstances collection processFields
    // was called with. Without the resolveFieldInstanceById fallback, a from-fields config
    // referencing a field belonging to a different registry than the caller's fieldInstances
    // would silently fall back to the 'default'/standard formatter instead of the field's real
    // type-specific one.
    it('resolves a referenced field not present in the local fieldInstances via resolveFieldInstanceById', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'externalBoolField' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { externalBoolField: true } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());
        const resolveFieldInstanceById = vi.fn((id: string) =>
            id === 'externalBoolField' ? Immutable.fromJS({ id, 'field-type': 'boolean' }) : undefined
        );

        const result = processFields(data, fieldInstances, resolveRefData, undefined, resolveFieldInstanceById);

        expect(resolveFieldInstanceById).toHaveBeenCalledWith('externalBoolField');
        expect(result.getIn(['values', 'composed'])).toEqual(t.Yes || 'Yes');
    });

    it('falls back to the default formatter when resolveFieldInstanceById is not provided and the field is not local', () => {
        const fieldInstances = Immutable.fromJS({
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'externalBoolField' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', values: { externalBoolField: true } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        const result = processFields(data, fieldInstances, resolveRefData);

        // 'default' -> standard formatter stringifies the raw boolean instead of Yes/No.
        expect(result.getIn(['values', 'composed'])).toEqual('true');
    });

    it('builds refData only once even when multiple from-fields fields need it', () => {
        const fieldInstances = Immutable.fromJS({
            c1: { id: 'c1', settings: { input: 'from-fields' }, values: { 'from-fields': { fields: [{ id: 'a' }] } } },
            c2: { id: 'c2', settings: { input: 'from-fields' }, values: { 'from-fields': { fields: [{ id: 'b' }] } } },
        });
        const data = Immutable.fromJS({ id: 'x', values: { a: 'A', b: 'B' } });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        processFields(data, fieldInstances, resolveRefData);

        expect(resolveRefData).toHaveBeenCalledTimes(1);
    });

    it('leaves the field untouched when its from-fields config has no fields', () => {
        const fieldInstances = Immutable.fromJS({
            composed: { id: 'composed', settings: { input: 'from-fields' }, values: { 'from-fields': {} } },
        });
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map());

        const result = processFields(data, fieldInstances, resolveRefData);

        expect(result.hasIn(['values', 'composed'])).toBe(false);
        expect(resolveRefData).not.toHaveBeenCalled();
    });
});

describe('cleanUp', () => {
    it('moves the registry-specific title path into title', () => {
        const data = Immutable.fromJS({ id: 'x', 'title-REG1': 'Composed Title' });
        const result = cleanUp(data, ['title-REG1']);
        expect(result.get('title')).toEqual('Composed Title');
        expect(result.has('title-REG1')).toBe(false);
    });

    it('falls back to the existing title if the title path has no value', () => {
        const data = Immutable.fromJS({ id: 'x', title: 'Existing Title' });
        const result = cleanUp(data, ['title-REG1']);
        expect(result.get('title')).toEqual('Existing Title');
    });

    it('skips Immutable.Record instances unchanged', () => {
        const ShiftRecord = Immutable.Record({ id: '', title: 'orig' });
        const record = new ShiftRecord({ id: 'x' });
        expect(cleanUp(record, ['title-REG1'])).toBe(record);
    });
});

describe('processData orchestration', () => {
    it('returns data unchanged when fieldInstances is empty', async () => {
        const data = Immutable.fromJS({ id: 'x', values: {} });
        const fetchNextSerial = vi.fn();
        const resolveRefData = vi.fn();

        const result = await processData(data, Immutable.Map(), { fetchNextSerial, resolveRefData });

        expect(result).toBe(data);
        expect(fetchNextSerial).not.toHaveBeenCalled();
        expect(resolveRefData).not.toHaveBeenCalled();
    });

    it('runs serials then fields then cleanup in order', async () => {
        const fieldInstances = Immutable.fromJS({
            serial: { id: 'serial', settings: { input: 'from-serial' }, values: { 'from-serial': 'SERIAL_1' } },
            composed: {
                id: 'composed',
                settings: { input: 'from-fields' },
                values: { 'from-fields': { fields: [{ id: 'serial' }] } },
            },
        });
        const data = Immutable.fromJS({ id: 'x', 'registry-id': 'REG1', values: {} });
        const fetchNextSerial = vi.fn().mockResolvedValue('S-0001');
        const resolveRefData = vi.fn().mockReturnValue(Immutable.Map({ serial: 'S-0001' }));

        const result = await processData(data, fieldInstances, { fetchNextSerial, resolveRefData });

        expect(result.getIn(['values', 'serial'])).toEqual('S-0001');
        expect(result.getIn(['values', 'composed'])).toEqual('S-0001');
    });
});
