import Immutable from 'immutable';
import { addDays, addHours, addMinutes, firstTimeAfter, parseISODateTime, withTime } from 'tzdateutils';
import dateFormat from 'dateformat-light';
import { getFormatter as getTitleFormatter } from '../titleBuilder/getFormatter.js';
import type { FieldInstance, FieldValue } from '../types.js';

// --- Pack ---------------------------------------------------------------
// Ported from @timezynk/tzstores' src/fields.js. These are real, field-id-specific
// business rules (shift/report date shifting, break offsetting, duplicity clamping),
// not generic boilerplate — kept verbatim rather than genericized.

function offsetBreaks(breaks: any, start: any, end: any, offset: number) {
    return breaks
        .reduce((acc: any, br: any) => {
            const s = addDays(parseISODateTime(br.get('start'))!, offset);
            const e = addDays(parseISODateTime(br.get('end'))!, offset);

            if (s.getTime() >= start.getTime() && e.getTime() <= end.getTime()) {
                return acc.push(br.set('start', dateFormat(s, 'isoDateTime')).set('end', dateFormat(e, 'isoDateTime')));
            }

            return acc;
        }, Immutable.List().asMutable())
        .asImmutable();
}

function packStaticString(item: any, value: any, id: string) {
    value = (value || '').trim() || null;
    return item.set(id, value);
}

function packNewBreaks(item: any, value: any) {
    if (!value || !value.length) {
        return item;
    }

    const itemStart = parseISODateTime(item.get('start'));
    const itemEnd = parseISODateTime(item.get('end'));
    if (!itemStart || !itemEnd) {
        return item;
    }

    let breaks = Immutable.List();
    const min = itemStart;
    value.forEach(({ start, end }: any) => {
        let bs = start;
        let be = end;
        if (start.getTime() < itemStart.getTime()) {
            bs = withTime(min, start);
        }
        if (end.getTime() > itemEnd.getTime()) {
            be = firstTimeAfter(end, bs);
        }
        if (bs.getTime() >= itemStart.getTime() && be.getTime() <= itemEnd.getTime()) {
            breaks = breaks.push(
                Immutable.Map({
                    start: dateFormat(bs, 'isoDateTime'),
                    end: dateFormat(be, 'isoDateTime'),
                })
            );
        }
    });
    if (breaks.isEmpty()) {
        return item;
    }
    return item.set('breaks', breaks);
}

const packField: Record<string, any> = {
    username: false,
    'id-no': false,
    email: false,

    'shift-startend'(shift: any, value: any) {
        if (!value) {
            return shift;
        }

        const oldStart = parseISODateTime(shift.get('start'))!;
        const oldEnd = parseISODateTime(shift.get('end'))!;
        let start = value.start;
        let end = value.end;
        const timeDiff = start.getTime() - oldStart.getTime();
        let offset =
            oldStart.getHours() < 12
                ? Math.floor(timeDiff / (1000 * 3600 * 24))
                : Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (value.keepDate) {
            start = oldStart;
            start = withTime(start, value.start);
            offset = 0;
        }

        if (value.keepTime) {
            start = withTime(start, oldStart);
            end = addDays(oldEnd, offset);
        } else {
            end = firstTimeAfter(end, start);
        }

        if (value.days > 0) {
            end = end.addDays(value.days);
        }

        // BUG, faithfully preserved from tzstores' src/fields.js (verified present there today):
        // this discards offsetBreaks' return value — Immutable's .set() never mutates in place,
        // so shifting a shift's start/end via this packer has never actually re-offset its
        // breaks, despite offsetBreaks existing for exactly that purpose. Not fixed here since
        // this migration's job is to preserve existing behavior, not silently correct it — file
        // a separate ticket if this turns out to matter in practice. IMPORTANT if this code is
        // ever ported off Immutable.js: a plain object/mutating `.set` would make this line
        // start "working" and silently change behavior — don't let that happen by accident: if
        // that migration wants to fix this, it should be a deliberate, called-out decision, and if
        // it wants to preserve today's (buggy) behavior, this line should be removed instead of
        // just having its result start being used.
        shift.set('breaks', offsetBreaks(shift.get('breaks'), start, end, offset));

        return shift.set('start', dateFormat(start, 'isoDateTime')).set('end', dateFormat(end, 'isoDateTime'));
    },

    'report-breaks': packNewBreaks,
    'shift-breaks': packNewBreaks,

    'shift-duplicity'(shift: any, value: any) {
        value = value && Math.floor(value);
        const bookedUsers = shift.get('booked-users');
        const booked = (bookedUsers && bookedUsers.size) || 0;
        value = value && value >= booked ? value : booked;
        return shift.set('duplicity', value);
    },

    standard(item: any, value: any, id: string) {
        return item.setIn(['values', id], value);
    },
};
packField['report-startend'] = packField['shift-startend'];

[
    'name',
    'employee-no',
    'department',
    'company',
    'country-code',
    'mobile',
    'home-phone',
    'address',
    'zip',
    'city',
    'relative-name',
    'relative-phone',
    'notes',
].forEach((k) => {
    packField[k] = packStaticString;
});

// --- Clear ---------------------------------------------------------------

function defaultClear(item: any, value: any, id: string) {
    return item.deleteIn(['values', id]);
}

function clearBreaks(item: any) {
    return item.set('breaks', Immutable.List());
}

const clearField: Record<string, any> = {
    'shift-duplicity'(item: any) {
        const bookedUsers = item.get('booked-users');
        const booked = (bookedUsers && bookedUsers.size) || 0;
        return item.set('duplicity', booked);
    },

    'report-breaks': clearBreaks,
    'shift-breaks': clearBreaks,

    standard: defaultClear,
};

// --- Modify ----------------------------------------------------------------

function moveDate(dateString: any, value: number[] = []) {
    const date = addMinutes(
        addHours(addDays(parseISODateTime(dateString)!, value[0] || 0), value[1] || 0),
        value[2] || 0
    );

    return dateFormat(date, 'isoDateTime');
}

function moveBreaks(breaks: any, value: number[]) {
    return breaks.map((b: any) => {
        const s = moveDate(b.get('start'), value);
        const e = moveDate(b.get('end'), value);
        return b.set('start', s).set('end', e);
    });
}

const modField: Record<string, any> = {
    'shift-duplicity'(shift: any, mod: number) {
        let d = shift.get('duplicity') + mod;
        d = Math.round(d);
        const bookedUsers = shift.get('booked-users');
        const booked = (bookedUsers && bookedUsers.size) || 0;
        d = d && d >= booked ? d : booked;
        return shift.set('duplicity', d);
    },

    'shift-startend'(shift: any, value: number[] = []) {
        const s = moveDate(shift.get('start'), value);
        const e = moveDate(shift.get('end'), value);
        const b = moveBreaks(shift.get('breaks'), value);
        return shift.set('start', s).set('end', e).set('breaks', b);
    },
    'shift-breaks'(shift: any, value: number[] = []) {
        const b = moveBreaks(shift.get('breaks'), value);
        return shift.set('breaks', b);
    },
};

export function canPack(id: string, type: string): boolean {
    return packField[id] !== false && packField[type] !== false;
}

export function getPackFunction(id: string) {
    const fn = id && packField[id];
    return fn || packField.standard;
}

export function canClear(id: string, type: string): boolean {
    return clearField[id] !== false && clearField[type] !== false;
}

export function getClearFunction(id: string) {
    const fn = id && clearField[id];
    return fn || clearField.standard;
}

export function canModify(id: string, type: string): boolean {
    return Boolean(modField[id]) && modField[type] !== false;
}

// NOTE: preserves a legacy quirk from tzstores — modField.standard was never defined,
// so unknown ids intentionally return undefined here. Do not "fix" this without checking
// every call site; some may rely on the undefined check.
export function getModifyFunction(id: string) {
    const fn = id && modField[id];
    return fn || modField.standard;
}

// --- Formatters --------------------------------------------------------------
// address/addressAddress1/2/City/Zip/Country/breaks/start-end/color/boolean/standard are
// already implemented in titleBuilder/getFormatter.ts (same logic, ported from the same
// tzstores source) — reused directly rather than duplicated. Only registry-reference is new
// here, since it needs an injected resolver instead of tzstores' registry singleton.

let formattersByType: Immutable.Map<string, any> | undefined;
function makeFormatters() {
    return Immutable.fromJS({
        address: {
            address: {},
            addressAddress1: { title: `${t.user_address_column}1` },
            addressAddress2: { title: `${t.user_address_column}2` },
            addressCity: { title: t.City },
            addressZip: { title: t['Zip-code'] },
            addressCountry: { title: t.Country },
        },
        breaks: { breaks: {} },
        'registry-reference': { 'registry-reference': {} },
        'start-end': { 'start-end': {} },
        color: { color: {} },
        boolean: { boolean: {} },
    });
}

const standardList = Immutable.fromJS({ standard: {} });

export function listFormatters(type: string): Immutable.Map<string, any> {
    if (!formattersByType) {
        formattersByType = makeFormatters();
    }
    return formattersByType!.get(type) || standardList;
}

export function getFieldValueFormatter(
    id?: string,
    resolveReferenceTitle?: (referencedId: any) => string | undefined
): (value: any) => string {
    const formatterId = id || 'standard';
    if (formatterId === 'registry-reference') {
        return (value: any) => resolveReferenceTitle?.(value) || '';
    }
    return getTitleFormatter(formatterId);
}

export function getFormatterByFieldInstance(
    fieldInstance: FieldInstance | undefined,
    resolveReferenceTitle?: (referencedId: any) => string | undefined
): (value: FieldValue) => string {
    if (!fieldInstance) {
        return getFieldValueFormatter('standard');
    }

    const fieldFormatters = listFormatters(fieldInstance.get('field-type'));
    const formatId = fieldFormatters && fieldFormatters.keySeq().first();
    return getFieldValueFormatter(formatId, resolveReferenceTitle);
}
