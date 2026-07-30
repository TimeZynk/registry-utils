import Immutable from 'immutable';
import { isString, isEmpty, identity } from 'lodash-es';
import { getFieldValueFormatter, listFormatters } from './fields.js';
import type { FieldInstance } from '../types.js';

const SEPARATOR = ' » ';

function setInIf(acc: any, fid: string, val: any, isStatic: boolean) {
    if (val !== undefined) {
        return isStatic ? acc.set(fid, val) : acc.setIn(['values', fid], val);
    }
    return acc;
}

export type FetchNextSerial = (serialId: string) => Promise<string | number | null>;
export type ResolveRefData = (item: any, notCached?: boolean) => any;
export type ResolveReferenceTitle = (referencedId: any) => string | undefined;
export type ResolveFieldInstanceById = (id: string) => FieldInstance | undefined;

// Serial-derived values: the only real network dependency in this module. fetchNextSerial is
// injected rather than imported (this package stays network-free) — see @timezynk/tzredux's
// fetchNextSerial for the actual XHR implementation.
export async function processSerials(
    data: any,
    fieldInstances: Immutable.Map<string, FieldInstance>,
    fetchNextSerial: FetchNextSerial
): Promise<any> {
    const q: Array<Promise<{ fid: string; val: any; isStatic: boolean }>> = fieldInstances.reduce(
        (reduction: any[] | undefined, maybeF: FieldInstance | undefined) => {
            const acc = reduction as any[];
            const f = maybeF as FieldInstance;
            const input = f.getIn(['settings', 'input']);
            const fid = f.get('id');
            const isStatic = f.get('isStatic');

            if (input === 'from-serial' && !f.get('archived')) {
                const curVal = isStatic ? data.get(fid) : data.getIn(['values', fid]);

                if (curVal === null || curVal === undefined) {
                    const serialId = f.getIn(['values', input]);
                    if (serialId) {
                        acc.push(
                            fetchNextSerial(serialId).then(
                                (val) => ({ fid, val, isStatic }),
                                () => ({ fid, val: null, isStatic })
                            )
                        );
                    }
                }
            }

            return acc;
        },
        []
    );

    if (isEmpty(q)) {
        return data;
    }

    const results = await Promise.all(q);
    return results.reduce((acc: any, s: any) => setInIf(acc, s.fid, s.val, s.isStatic), data);
}

function unpackField(field: any) {
    return isString(field) ? Immutable.Map({ id: field }) : field;
}

function unpackFields(value: any) {
    const fields = Immutable.Iterable.isIndexed(value) ? value : value.get('fields');
    return (fields || Immutable.List()).map(unpackField);
}

function resolveFormatter(
    fieldInstances: Immutable.Map<string, FieldInstance>,
    fid: string,
    formatId: string | undefined,
    resolveReferenceTitle: ResolveReferenceTitle | undefined,
    resolveFieldInstanceById: ResolveFieldInstanceById | undefined
) {
    let id = formatId;
    if (!id) {
        // tzstores' original always looked this up globally (fieldInstanceById), independent of
        // whatever fieldInstances collection processFields was called with. fieldInstances.get(fid)
        // covers the common same-registry case; resolveFieldInstanceById is an optional fallback
        // for a field referenced from a from-fields config that belongs to a different registry
        // than the caller's fieldInstances — restores the original's unscoped lookup behavior.
        const fi = fieldInstances.get(fid) || resolveFieldInstanceById?.(fid);
        const type = (fi && fi.get('field-type')) || 'default';
        id = listFormatters(type).keySeq().first();
    }
    return getFieldValueFormatter(id, resolveReferenceTitle);
}

// from-fields derivation: needs a refData resolver (built once, lazily, per call — matches
// the original's single dataBuilder(acc, true) build reused across every from-fields field in
// the same pass) instead of reading tzstores' own dataBuilder singleton.
export function processFields(
    data: any,
    fieldInstances: Immutable.Map<string, FieldInstance>,
    resolveRefData: ResolveRefData,
    resolveReferenceTitle?: ResolveReferenceTitle,
    resolveFieldInstanceById?: ResolveFieldInstanceById
): any {
    let refData: any;

    return fieldInstances.reduce((reduction: any | undefined, maybeF: FieldInstance | undefined) => {
        const acc = reduction || data;
        const f = maybeF as FieldInstance;
        if (f.get('archived')) {
            return acc;
        }

        const input = f.getIn(['settings', 'input']);
        const fid = f.get('id');
        const isStatic = f.get('isStatic');
        let val;

        if (input === 'from-fields') {
            const fromFields = f.getIn(['values', input]) || Immutable.Map();
            const fields = unpackFields(fromFields);
            let separator = fromFields.get('separator');
            if (typeof separator !== 'string') {
                separator = SEPARATOR;
            }

            if (!fields || fields.isEmpty()) {
                return acc;
            }

            if (!refData) {
                refData = resolveRefData(acc, true);
            }

            const parts = fields
                .map((field: any) => {
                    const id = field.get('id');
                    const formatId = field.get('formatId');
                    const value = refData.get(id) || acc.getIn(['values', id]);
                    if (value === null || value === undefined) {
                        return null;
                    }
                    const formatter = resolveFormatter(
                        fieldInstances,
                        id,
                        formatId,
                        resolveReferenceTitle,
                        resolveFieldInstanceById
                    );
                    return formatter(value);
                })
                .filter(identity);

            val = parts.join(separator);
        }

        return setInIf(acc, fid, val, isStatic);
    }, data);
}

export function cleanUp(data: any, titlePath: string[]): any {
    if (data instanceof Immutable.Record) {
        return data;
    }
    return data.set('title', data.getIn(titlePath) || data.get('title')).deleteIn(titlePath);
}

export interface ProcessDataDeps {
    fetchNextSerial: FetchNextSerial;
    resolveRefData: ResolveRefData;
    resolveReferenceTitle?: ResolveReferenceTitle;
    resolveFieldInstanceById?: ResolveFieldInstanceById;
}

// fieldInstances is required (unlike tzstores' original, which fell back to a registryFields(rid)
// singleton read when omitted, plus a requestAnimationFrame yield hack that only existed to
// cover that fallback path). Every current tzcontrol call site already passes fields explicitly.
export default async function processData(
    data: any,
    fieldInstances: Immutable.Map<string, FieldInstance>,
    deps: ProcessDataDeps
): Promise<any> {
    if (!fieldInstances || fieldInstances.isEmpty()) {
        return data;
    }

    const rid = data.get('registry-id');
    const titlePath = [`title-${rid}`];

    const afterSerials = await processSerials(data, fieldInstances, deps.fetchNextSerial);
    const afterFields = processFields(
        afterSerials,
        fieldInstances,
        deps.resolveRefData,
        deps.resolveReferenceTitle,
        deps.resolveFieldInstanceById
    );
    return cleanUp(afterFields, titlePath);
}
