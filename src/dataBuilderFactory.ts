/* eslint-disable @typescript-eslint/no-use-before-define */
import Immutable from 'immutable';
import { defaultMemoize } from 'reselect'; // eslint-disable-li;
import isNil from 'lodash/isNil';
import isString from 'lodash/isString';
import _isEmpty from 'lodash/isEmpty';
import { defaultRegisters } from './defaultRegisters';
import { cacheFactory } from './cacheFactory';

const cache = cacheFactory('fieldData');
let visited: Record<string, boolean> = {};

function byPriority(value: unknown): number {
    const fi = value as Immutable.Map<string, any>;
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

function weakMerger(prev: any, next: any): Immutable.Collection<any, any> {
    if (Immutable.List.isList(prev)) {
        return (prev as Immutable.List<any>).concat(next);
    }
    if (Immutable.Map.isMap(prev)) {
        return (prev as Immutable.Map<any, any>).mergeWith(weakMerger, next);
    }
    if (Immutable.Set.isSet(prev)) {
        return (prev as Immutable.Set<any>).union(next);
    }
    return prev;
}

function isEmpty(v: any): boolean {
    if (isNil(v) || (isString(v) && _isEmpty(v))) {
        return true;
    }
    if (Immutable.Iterable.isIterable(v)) {
        return v.get('isEmpty') || v.every(isEmpty);
    }
    return false;
}

function getValue(
    item: Immutable.Map<string, any>,
    values: Immutable.Map<string, any>,
    fi: Immutable.Map<string, any>
): any {
    let value = fi.getIn(['values', 'default-val']);
    const id = fi.get('id');
    let itemValue = item.get(id);
    if (!isNil(itemValue)) {
        value = itemValue;
    }

    switch (fi.get('field-type')) {
        case 'breaks':
            itemValue = item.get('breaks');
            break;
        case 'start-end':
            itemValue = Immutable.List([item.get('start'), item.get('end')]);
            break;
        default:
            itemValue = values.get(id);
            break;
    }

    const fieldId = fi.get('field-id');
    if (fieldId === 'title') {
        return item && item.get('title');
    }

    return value;
}

export interface DataBuilder {
    (item: Immutable.Map<string, any>): Immutable.Map<string, any> | null;
}

/**
 *  Create a new dataBuilder function.
 * @param {Immutable.Map} regFields Registry fields
 * @param {Immutable.Map} regData Registry data
 * @param {Immutable.Map} users Users
 * @param {Immutable.Map} invoiceArticles Invoice articles (optional)
 * @param {Immutable.Map} salaryArticles Salary articles (optional)
 */
function dataBuilderFactory(
    regFields: Immutable.Map<string, Immutable.Map<string, any>> | undefined,
    regData: Immutable.Map<string, Immutable.Map<string, any>>,
    users: Immutable.Map<string, Immutable.Map<string, any>>,
    invoiceArticles?: Immutable.Map<string, Immutable.Map<string, any>>,
    salaryArticles?: Immutable.Map<string, Immutable.Map<string, any>>
): DataBuilder {
    const fieldInstances = regFields
        ? regFields.sortBy(byPriority)
        : Immutable.Map<string, Immutable.Map<string, any>>();
    cache && cache.flush && cache.flush();

    function mergeUserValues(acc: Immutable.Map<string, any>, id: string): Immutable.Map<string, any> {
        let referencedValues = cache.get(id);

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
                cache.set(id, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return referencedValues ? acc.mergeWith(weakMerger, referencedValues) : acc;
    }

    function mergeRegistryValues(acc: Immutable.Map<string, any>, id: string): Immutable.Map<string, any> {
        let referencedValues = cache.get(id);

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
                cache.set(id, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return referencedValues ? acc.mergeWith(merger, referencedValues) : acc;
    }

    function mergeValues(
        acc: Immutable.Map<string, any>,
        item: Immutable.Map<string, any>
    ): Immutable.Map<string, any> {
        if (!item || !item.get) {
            return acc;
        }
        const values = item.get('values') || Immutable.Map();
        const registryId = item.get('registry-id');

        const refData = fieldInstances.reduce((reduction: unknown, maybeFieldInstance: unknown) => {
            const innerAcc = reduction as Immutable.Map<string, any>;
            const fi = maybeFieldInstance as Immutable.Map<string, any>;
            if (registryId && registryId !== fi.get('registry-id')) {
                return innerAcc;
            }

            const v = getValue(item, values, fi);
            if (isEmpty(v)) {
                return innerAcc;
            }

            const id = fi.get('id');
            let nextAcc = innerAcc.set(id, v);

            const fid = fi.get('field-id');
            const s = fi.get('field-section');
            if (s) {
                nextAcc = nextAcc.setIn([s, fid], v).setIn(['_mapping', s, fid], id);
            } else {
                nextAcc = nextAcc.set(fid, v);
            }

            if (item && fid === 'customer-no' && !nextAcc.getIn(['invoice-head', 'customer-name'])) {
                // Copy customer name from title
                nextAcc = nextAcc.setIn(['invoice-head', 'customer-name'], item.get('title'));
            }

            const fieldType = fi.get('field-type');
            if (fieldType === 'registry-reference') {
                nextAcc = mergeRegistryValues(nextAcc, v);
            } else if (fieldType === 'user-reference') {
                nextAcc = mergeUserValues(nextAcc, v);
            } else if (fieldType === 'article-reference') {
                const type = fi.getIn(['settings', 'article-type']) || 'invoice';
                if (type === 'salary') {
                    const article = salaryArticles?.get(v);
                    nextAcc = nextAcc.setIn(
                        ['articles', type],
                        Immutable.Map({
                            id: article?.get('id'),
                            code: article?.get('code'),
                        })
                    );
                } else {
                    const article = invoiceArticles?.get(v);
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
        }, acc);

        return refData;
    }

    /**
     * Resolve field references.
     * Process field references after everything else is resolved
     * @param {*} refData
     */
    function resolveFieldReferences(refData: Immutable.Map<string, any>): Immutable.Map<string, any> {
        if (!refData || refData.isEmpty()) {
            return refData;
        }
        return fieldInstances
            .reduce((reduction: unknown, item: unknown) => {
                const innerAcc = reduction as Immutable.Map<string, any>;
                const fi = item as Immutable.Map<string, any>;
                if (fi.get('field-type') !== 'field-reference') {
                    return innerAcc;
                }
                const id = fi.get('id');
                const referencedField = innerAcc.get(id);
                if (!referencedField) {
                    return innerAcc;
                }
                const referencedValue = innerAcc.get(referencedField);
                return innerAcc.set(id, referencedValue);
            }, refData.asMutable())
            .asImmutable();
    }

    return (item: Immutable.Map<string, any>): Immutable.Map<string, any> | null => {
        if (!item || !item.get) {
            return null;
        }

        const id = item.get('id');
        const validFrom = item.get('valid-from');
        const cacheKey = id && id + '/' + validFrom;
        const refData = cacheKey && cache.get(cacheKey);

        if (refData) {
            return refData;
        }

        visited = {};

        let data = mergeValues(Immutable.Map<string, any>().asMutable(), item);
        const userId = item.get('user-id');
        const bookedUsers = item.get('booked-users');

        if (userId) {
            data = mergeUserValues(data, userId);
        }

        if (bookedUsers && !bookedUsers.isEmpty()) {
            data = bookedUsers.reduce(mergeUserValues, data);
        }
        data = resolveFieldReferences(data);
        data = data.remove('_visited');
        data = data.asImmutable();

        if (cacheKey) {
            cache.set(cacheKey, data);
        }

        return data;
    };
}

const memoizedDataBuilderFactory = defaultMemoize(dataBuilderFactory);

export { dataBuilderFactory, memoizedDataBuilderFactory };
