/* eslint-disable @typescript-eslint/no-use-before-define */
import Immutable from 'immutable';
import { lruMemoize } from 'reselect';
import { isNil, isString, isEmpty as lodashIsEmpty } from 'lodash-es';
import { defaultRegisters } from './utils/defaultRegisters.js';
import { cacheFactory } from './cacheFactory.js';
import { composeTitle } from './titleBuilder/index.js';
import type {
    RefData,
    RefDataAccumulator,
    FieldInstance,
    FieldValue,
    InvoiceArticle,
    SalaryArticle,
    DataBuilder,
} from './types.js';

// A single month's shift view can hold more distinct cache entries (shifts + referenced
// registry-data rows + users, across possibly several generations — see below) than
// cacheFactory's 1024 default. See docs/caching.md for the full sizing rationale.
const FIELD_DATA_CACHE_MAXSIZE = 8192;

const cache = cacheFactory('fieldData', undefined, FIELD_DATA_CACHE_MAXSIZE);
let visited: Record<string, boolean> = {};

// Every cache key is prefixed with a "generation" derived from the *reference identity* of this
// construction's six inputs, via makeVersionTagger below. Two constructions built from the same
// underlying data (same references — Immutable structures only get new references when they
// actually change, matching the memoization convention already used throughout this codebase's
// reselect selectors) resolve to the same generation and share cache entries, even across
// different call sites. A construction from *different* data gets a different generation, so its
// keys never collide with another generation's — entries from an abandoned generation simply
// become unreachable and age out via cacheFactory's normal TTL/LRU eviction.
//
// See docs/caching.md for the full design rationale and what callers need to do to actually
// benefit from this (short version: pass stable, reference-equal Immutable structures).
function makeVersionTagger(): (value: object | null | undefined) => string {
    const tags = new WeakMap<object, string>();
    let nextId = 1;

    return (value) => {
        if (value === null || value === undefined) {
            return 'none';
        }
        let tag = tags.get(value);
        if (!tag) {
            tag = String(nextId);
            nextId += 1;
            tags.set(value, tag);
        }
        return tag;
    };
}

const tagRegFields = makeVersionTagger();
const tagRegData = makeVersionTagger();
const tagUsers = makeVersionTagger();
const tagInvoiceArticles = makeVersionTagger();
const tagSalaryArticles = makeVersionTagger();
const tagDynamicTitleSetting = makeVersionTagger();

// Separate 7th tagger for the *item* passed into the returned DataBuilder closure per call — not
// one of the six construction-time inputs above, and needed in addition to them: `id + '/' +
// valid-from` alone isn't a safe cache key, since an item's *content* can change (e.g. a shift
// edited to a different custom-field value) without its id/valid-from changing and without the
// six construction inputs changing either (callers typically only reconstruct the builder on
// registry-fields/registry-data/users/dynamic-title-setting changes, not on every item edit).
// Tagging the item reference itself closes that gap: an edited item is always a new Immutable
// reference, so it always gets a new cache key.
const tagItem = makeVersionTagger();

function byPriority(value: unknown): number {
    const fi = value as FieldInstance;
    const weight: number = fi.get('weight');

    if (fi.get('archived')) {
        return -10000 + weight;
    }

    const registryId = fi.get('registry-id');

    switch (registryId) {
        case defaultRegisters.REPORTS_REG_ID:
            return 10000 + weight;
        case defaultRegisters.SHIFTS_REG_ID:
            return 1000 + weight;
        default:
            return weight;
    }
}

function merger(prev: any, next?: any): Immutable.Collection<any, any> {
    if (Immutable.List.isList(prev)) {
        return (prev as Immutable.List<any>).concat(next);
    }
    if (Immutable.Map.isMap(prev)) {
        return (prev as Immutable.Map<any, any>).mergeWith(merger, next);
    }
    if (Immutable.Set.isSet(prev)) {
        return (prev as Immutable.Set<any>).union(next);
    }

    return isNil(next) ? prev : next;
}

function isEmpty(v: any): boolean {
    if (isNil(v) || (isString(v) && lodashIsEmpty(v))) {
        return true;
    }
    if (Immutable.Iterable.isIterable(v)) {
        return v.get('isEmpty') || v.every(isEmpty);
    }
    return false;
}

function trim(value: FieldValue): FieldValue {
    if (value) {
        if (isString(value)) {
            return value.trim();
        } else if (Immutable.Iterable.isIterable(value)) {
            return value.map((v) => trim(v));
        }
    }
    return value;
}

function trimAddress(value: FieldValue): FieldValue {
    if (value && Immutable.Iterable.isIterable(value)) {
        return value.map((v) => {
            if (v) {
                return v.trim();
            }
            return '';
        });
    }
    return value;
}

function getValue(item: any, values: Immutable.Map<string, any>, fi: FieldInstance): FieldValue {
    const fieldId = fi.get('field-id');
    if (fieldId === 'title') {
        return item && item.get('title');
    }

    let value = null;
    const id = fi.get('id');
    let itemValue = item.get(id);
    value = itemValue;

    switch (fi.get('field-type')) {
        case 'breaks':
            itemValue = item.get('breaks');
            break;
        case 'start-end':
            itemValue =
                item.get('role') && item.get('username') // Check if item is a user
                    ? itemValue
                    : Immutable.List([item.get('start'), item.get('end')]);
            break;
        default:
            itemValue = values.get(id);
            break;
    }

    if (!isNil(itemValue)) {
        value = itemValue;
    }

    return fi.get('field-type') === 'address' ? trimAddress(value) : trim(value);
}

/**
 *  Create a new dataBuilder function.
 * @param {Immutable.Map} regFields Registry fields
 * @param {Immutable.Map} regData Registry data
 * @param {Immutable.Map} users Users
 * @param {Immutable.Map} invoiceArticles Invoice articles (optional)
 * @param {Immutable.Map} salaryArticles Salary articles (optional)
 * @param {Immutable.Map} dynamicTitleSetting Dynamic title composition settings (optional)
 */
function dataBuilderFactory(
    regFields: Immutable.Map<string, FieldInstance> | undefined,
    regData: Immutable.Map<string, any>,
    users: Immutable.Map<string, any>,
    invoiceArticles?: Immutable.Map<string, InvoiceArticle>,
    salaryArticles?: Immutable.Map<string, SalaryArticle>,
    dynamicTitleSetting?: Immutable.Map<string, any>
): DataBuilder {
    const fieldInstances = regFields ? regFields.sortBy(byPriority) : Immutable.Map<string, FieldInstance>();
    const generation = [
        tagRegFields(regFields),
        tagRegData(regData),
        tagUsers(users),
        tagInvoiceArticles(invoiceArticles),
        tagSalaryArticles(salaryArticles),
        tagDynamicTitleSetting(dynamicTitleSetting),
    ].join(':');

    function mergeUserValues(acc: RefDataAccumulator, id: string): RefDataAccumulator {
        const cacheKey = generation + ':' + id;
        let referencedValues = cache.get(cacheKey);

        if (users && !referencedValues && !visited[id]) {
            visited[id] = true;
            const d = users.get(id);
            if (d && !d.isEmpty()) {
                referencedValues = Immutable.Map({
                    users: Immutable.List([
                        Immutable.Map({
                            name: d.get('name'),
                            id: id,
                        }),
                    ]),
                }).asMutable();
                referencedValues = mergeValues(referencedValues, d);
                cache.set(cacheKey, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return referencedValues ? acc.mergeWith(merger, referencedValues) : acc;
    }

    function mergeRegistryValues(acc: RefDataAccumulator, id: string): RefDataAccumulator {
        const cacheKey = generation + ':' + id;
        let referencedValues = cache.get(cacheKey);

        if (!referencedValues && !visited[id]) {
            visited[id] = true;
            const d = regData.get(id);
            if (d && !d.isEmpty()) {
                const pathSegment = Immutable.Map({
                    title: d.get('title'),
                    id: id,
                    'registry-id': d.get('registry-id'),
                });

                referencedValues = Immutable.Map({
                    path: Immutable.List([pathSegment]),
                }).asMutable();
                const titleKey = 'title-' + d.get('registry-id');
                referencedValues = referencedValues.set(titleKey, d.get('title'));

                referencedValues = mergeValues(referencedValues, d);
                cache.set(cacheKey, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return referencedValues ? acc.mergeWith(merger, referencedValues) : acc;
    }

    function applyValue(
        innerAcc: RefDataAccumulator,
        fieldInstance: FieldInstance,
        value: FieldValue
    ): RefDataAccumulator {
        const id = fieldInstance.get('id');
        let nextAcc = innerAcc.set(id, value);

        const fid = fieldInstance.get('field-id');
        const s = fieldInstance.get('field-section');
        if (s) {
            nextAcc = nextAcc.setIn([s, fid], value).setIn(['_mapping', s, fid], id);
        } else {
            nextAcc = nextAcc.set(fid, value);
        }

        const fieldType = fieldInstance.get('field-type');
        if (fieldType === 'registry-reference') {
            nextAcc = mergeRegistryValues(nextAcc, value);
        } else if (fieldType === 'user-reference') {
            nextAcc = mergeUserValues(nextAcc, value);
        } else if (fieldType === 'article-reference') {
            const type = fieldInstance.getIn(['settings', 'article-type']) || 'invoice';
            if (type === 'salary') {
                const article = salaryArticles?.get(value);
                nextAcc = nextAcc.setIn(
                    ['articles', type],
                    Immutable.Map({
                        id: article?.get('id'),
                        code: article?.get('code'),
                    })
                );
            } else {
                const article = invoiceArticles?.get(value);
                nextAcc = nextAcc.setIn(
                    ['articles', type],
                    Immutable.Map({
                        id: article?.get('id'),
                        sku: article?.get('sku'),
                    })
                );
            }
        }

        return nextAcc;
    }

    function mergeDefaultValues(acc: RefDataAccumulator): RefDataAccumulator {
        return fieldInstances.reduce(
            (reduction: RefDataAccumulator | undefined, maybeFieldInstance: FieldInstance | undefined) => {
                const innerAcc = reduction || acc;
                const fieldInstance = maybeFieldInstance as FieldInstance;
                const value = fieldInstance.getIn(['values', 'default-val']);
                if (isEmpty(value) || fieldInstance.get('archived')) {
                    return innerAcc;
                }

                return applyValue(innerAcc, fieldInstance, value);
            },
            acc
        );
    }

    function mergeValues(acc: RefDataAccumulator, item: any): RefDataAccumulator {
        if (!item || !item.get) {
            return acc;
        }
        const values = item.get('values') || Immutable.Map();
        const registryId = item.get('registry-id');

        const refData = fieldInstances.reduce(
            (reduction: RefDataAccumulator | undefined, maybeFieldInstance: FieldInstance | undefined) => {
                const innerAcc = reduction || acc;
                const fi = maybeFieldInstance as FieldInstance;
                const fieldRegistryId = fi.get('registry-id');

                // Skip if field has a specific registry-id that doesn't match the item's registry-id
                if (fieldRegistryId && registryId && registryId !== fieldRegistryId) {
                    return innerAcc;
                }

                const fid = fi.get('field-id');

                const v = getValue(item, values, fi);

                if (isEmpty(v)) {
                    return innerAcc;
                }

                let nextAcc = applyValue(innerAcc, fi, v);
                if (item && fid === 'customer-no' && !nextAcc.getIn(['invoice-head', 'customer-name'])) {
                    // Copy customer name from title
                    nextAcc = nextAcc.setIn(['invoice-head', 'customer-name'], item.get('title'));
                }

                return nextAcc;
            },
            acc
        );

        return refData;
    }

    /**
     * Resolve field references.
     * Process field references after everything else is resolved
     * @param {*} refData
     */
    function resolveFieldReferences(refData: RefDataAccumulator): RefDataAccumulator {
        if (!refData || refData.isEmpty()) {
            return refData;
        }
        return fieldInstances
            .reduce((reduction: RefDataAccumulator | undefined, maybeFieldInstance: FieldInstance | undefined) => {
                const innerAcc = reduction || refData.asMutable();
                const fieldInstance = maybeFieldInstance as FieldInstance;
                if (fieldInstance.get('field-type') !== 'field-reference') {
                    return innerAcc;
                }
                const id = fieldInstance.get('id');
                const referencedField = innerAcc.get(id);
                if (!referencedField) {
                    return innerAcc;
                }
                const referencedValue = innerAcc.get(referencedField);
                return innerAcc.set(id, referencedValue);
            }, refData.asMutable())
            .asImmutable();
    }

    return (item: any, notCahced?: boolean): RefData | null => {
        if (!item || !item.get) {
            return null;
        }
        if (item.get('original')) {
            // original is a marker to know that we are feeding it refData not Raw Data
            return item;
        }
        const id = item.get('id');
        const validFrom = item.get('valid-from');
        const cacheKey = id && generation + ':' + tagItem(item) + ':' + id + '/' + validFrom;
        const refData = !notCahced && cacheKey && cache.get(cacheKey);

        if (refData) {
            return refData;
        }

        visited = {};
        let data: RefDataAccumulator = Immutable.Map<string, any>().asMutable();
        data = mergeDefaultValues(data);
        const userId = item.get('user-id');
        if (userId) {
            data = mergeUserValues(data, userId);
        }
        const bookedUsers = item.get('booked-users');
        if (bookedUsers && !bookedUsers.isEmpty()) {
            data = bookedUsers.reduce(mergeUserValues, data);
        }
        data = mergeValues(data, item);

        data = resolveFieldReferences(data);

        data = data.set('original', item);

        // Apply title composition for shift-like items: shifts carry `booked-users`, and
        // timereports/inquiries carry `shift-id`/`user-id` plus a copy of the shift's
        // `values` (see tzcontrol's reportFromShift), so they compose the same dynamic
        // title from the same field set. Registry-data rows (Customers, Projects, etc.)
        // carry none of these three, so they're unaffected and keep their authored title.
        const isShiftEntity = Boolean(bookedUsers || item.get('shift-id') || userId);

        if (isShiftEntity) {
            // For shift-like items, try to compose title - composeTitle has fallback logic
            const composedTitle = composeTitle(data.asImmutable(), undefined, dynamicTitleSetting, regFields);

            if (composedTitle !== null && composedTitle !== undefined) {
                // If composeTitle returns a string (even empty), use it. None of the
                // entities reached by isShiftEntity carry an authored `title` of their
                // own to protect: ShiftRecord/TimeReportRecord/InquiryRecord have no
                // `title` prop (tzcontrol's reportFromShift never copies one either), so
                // there's nothing here for an empty composition to overwrite.
                data = data.set('title', composedTitle);
            } else {
                // Only fallback to original title if composeTitle returns null/undefined
                const originalTitle = item.get('title');
                if (originalTitle) {
                    data = data.set('title', originalTitle);
                }
                // If no original title, don't set anything (let it be undefined)
            }
        } else {
            // For non-shift items, preserve the original title
            const originalTitle = item.get('title');
            if (originalTitle) {
                data = data.set('title', originalTitle);
            }
        }

        data = data.remove('_visited');
        data = data.asImmutable();

        if (cacheKey) {
            cache.set(cacheKey, data);
        }
        return data;
    };
}

const memoizedDataBuilderFactory = lruMemoize(dataBuilderFactory);

export { dataBuilderFactory, memoizedDataBuilderFactory, DataBuilder };
