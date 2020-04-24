// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.

var Immutable = require('immutable');
var defaultMemoize = require('reselect').defaultMemoize; // eslint-disable-line
var isNil = require('lodash/isNil');
var isString = require('lodash/isString');
var _isEmpty = require('lodash/isEmpty');
var defaultRegisters = require('./defaultRegisters');
var cacheFactory = require('./cacheFactory');

var cache = cacheFactory('fieldData');
var visited = {};

function byPriority(fi) {
    const weight = fi.get('weight');

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

function merger(prev, next) {
    if (Immutable.List.isList(prev)) {
        return prev.concat(next);
    }
    if (Immutable.Map.isMap(prev)) {
        return prev.mergeWith(merger, next);
    }
    if (Immutable.Set.isSet(prev)) {
        return prev.union(next);
    }

    return isNil(next) ? prev : next;
}

function weakMerger(prev, next) {
    if (Immutable.List.isList(prev)) {
        return prev.concat(next);
    }
    if (Immutable.Map.isMap(prev)) {
        return prev.mergeWith(weakMerger, next);
    }
    if (Immutable.Set.isSet(prev)) {
        return prev.union(next);
    }
    return prev;
}

function isEmpty(v) {
    if (isNil(v) || (isString(v) && _isEmpty(v))) {
        return true;
    }
    if (Immutable.Iterable.isIterable(v)) {
        return v.get('isEmpty') || v.every(isEmpty);
    }
    return false;
}

function getValue(item, values, fi) {
    const fieldId = fi.get('field-id');
    if (fieldId === 'title') {
        return item && item.get('title');
    }

    const id = fi.get('id');
    const value = values.get(id);

    return isNil(value) ? item.get(id) : value;
}

/**
 *  Create a new dataBuilder function.
 * @param {Immutable.Map} regFields Registry fields
 * @param {Immutable.Map} regData Registry data
 * @param {Immutable.Map} users Users
 * @param {Immutable.Map} invoiceArticles Invoice articles (optional)
 * @param {Immutable.Map} salaryArticles Salary articles (optional)
 */
function dataBuilderFactory(regFields, regData, users, invoiceArticles, salaryArticles) {
    const fieldInstances = (regFields && regFields.sortBy ? regFields : Immutable.List()).sortBy(byPriority);
    cache && cache.flush && cache.flush();

    function mergeUserValues(acc, id) {
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

    function mergeRegistryValues(acc, id) {
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

    function mergeValues(acc, item) {
        if (!item || !item.get) {
            return acc;
        }
        const values = item.get('values') || Immutable.Map();
        const registryId = item.get('registry-id');

        const refData = fieldInstances.reduce(function (innerAcc, fi) {
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
                const type = fi.getIn(['settings', 'article-type']);
                const article =
                    type === 'salary'
                        ? salaryArticles && salaryArticles.get(v)
                        : invoiceArticles && invoiceArticles.get(v);
                nextAcc = nextAcc.set(id, article || null);
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
    function resolveFieldReferences(refData) {
        if (!refData || refData.isEmpty()) {
            return refData;
        }
        return fieldInstances
            .reduce(function (innerAcc, fi) {
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

    return function (item) {
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

        let data = mergeValues(Immutable.Map().asMutable(), item);
        data = resolveFieldReferences(data);
        const userId = item.get('user-id');
        const bookedUsers = item.get('booked-users');

        if (userId) {
            data = mergeUserValues(data, userId);
        }

        if (bookedUsers && !bookedUsers.isEmpty()) {
            data = bookedUsers.reduce(mergeUserValues, data);
        }

        data = data.remove('_visited');
        data = data.asImmutable();

        if (cacheKey) {
            cache.set(cacheKey, data);
        }

        return data;
    };
}

module.exports = {
    dataBuilderFactory: dataBuilderFactory,
    memoizedDataBuilderFactory: defaultMemoize(dataBuilderFactory),
};
