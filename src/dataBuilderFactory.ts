/* eslint-disable @typescript-eslint/no-use-before-define */
import Immutable from 'immutable';
import { defaultMemoize } from 'reselect'; // eslint-disable-li;
import isNil from 'lodash/isNil';
import isString from 'lodash/isString';
import _isEmpty from 'lodash/isEmpty';
import { defaultRegisters } from './defaultRegisters';
import { cacheFactory } from './cacheFactory';
import type {
    FieldInstance,
    RefData,
    RefDataAccumulator,
    RegistryDataInstance,
    User,
    FieldValue,
    FieldValues,
    InvoiceArticle,
    SalaryArticle,
    DataBuilder,
} from './types';

const cache = cacheFactory('fieldData');
let visited: Record<string, boolean> = {};

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
    if (isNil(v) || (isString(v) && _isEmpty(v))) {
        return true;
    }
    if (Immutable.Iterable.isIterable(v)) {
        return v.get('isEmpty') || v.every(isEmpty);
    }
    return false;
}

function getValue(item: RegistryDataInstance, values: FieldValues, fi: FieldInstance): FieldValue {
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

    return value;
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
    regFields: Immutable.Map<string, FieldInstance> | undefined,
    regData: Immutable.Map<string, RegistryDataInstance>,
    users: Immutable.Map<string, User>,
    invoiceArticles?: Immutable.Map<string, InvoiceArticle>,
    salaryArticles?: Immutable.Map<string, SalaryArticle>
): DataBuilder {
    const fieldInstances = regFields ? regFields.sortBy(byPriority) : Immutable.Map<string, FieldInstance>();
    cache && cache.flush && cache.flush();

    function mergeUserValues(acc: RefDataAccumulator, id: string): RefDataAccumulator {
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

        return referencedValues ? acc.mergeWith(merger, referencedValues) : acc;
    }

    function mergeRegistryValues(acc: RefDataAccumulator, id: string): RefDataAccumulator {
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
        return fieldInstances.reduce((reduction: unknown, maybeFieldInstance: unknown) => {
            const innerAcc = reduction as RefDataAccumulator;
            const fieldInstance = maybeFieldInstance as FieldInstance;
            const value = fieldInstance.getIn(['values', 'default-val']);
            if (isEmpty(value) || fieldInstance.get('archived')) {
                return innerAcc;
            }

            return applyValue(innerAcc, fieldInstance, value);
        }, acc);
    }

    function mergeValues(acc: RefDataAccumulator, item: RegistryDataInstance): RefDataAccumulator {
        if (!item || !item.get) {
            return acc;
        }
        const values = item.get('values') || Immutable.Map();
        const registryId = item.get('registry-id');

        const refData = fieldInstances.reduce((reduction: unknown, maybeFieldInstance: unknown) => {
            const innerAcc = reduction as RefDataAccumulator;
            const fi = maybeFieldInstance as FieldInstance;
            if (registryId && registryId !== fi.get('registry-id')) {
                return innerAcc;
            }

            const v = getValue(item, values, fi);
            if (isEmpty(v)) {
                return innerAcc;
            }

            const fid = fi.get('field-id');
            let nextAcc = applyValue(innerAcc, fi, v);
            if (item && fid === 'customer-no' && !nextAcc.getIn(['invoice-head', 'customer-name'])) {
                // Copy customer name from title
                nextAcc = nextAcc.setIn(['invoice-head', 'customer-name'], item.get('title'));
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
    function resolveFieldReferences(refData: RefDataAccumulator): RefDataAccumulator {
        if (!refData || refData.isEmpty()) {
            return refData;
        }
        return fieldInstances
            .reduce((reduction: unknown, maybeFieldInstance: unknown) => {
                const innerAcc = reduction as RefDataAccumulator;
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

    return (item: RegistryDataInstance): RefData | null => {
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
        data = data.remove('_visited');
        data = data.asImmutable();

        if (cacheKey) {
            cache.set(cacheKey, data);
        }

        return data;
    };
}

const memoizedDataBuilderFactory = defaultMemoize(dataBuilderFactory);

export { dataBuilderFactory, memoizedDataBuilderFactory, DataBuilder };
