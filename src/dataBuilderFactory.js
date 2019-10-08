// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.
const Immutable = require('immutable');
const defaultMemoize = require('reselect').defaultMemoize; // eslint-disable-line
const isNil = require('lodash/isNil');
const isString = require('lodash/isString');
const _isEmpty = require('lodash/isEmpty');
const { REPORTS_REG_ID, SHIFTS_REG_ID } = require('./defaultRegisters');
const cacheFactory = require('./cacheFactory');

const cache = cacheFactory('fieldData');
const visited = new Set();

function byPriority(fi) {
    const weight = fi.get('weight');

    if (fi.get('archived')) {
        return -10000 + weight;
    }

    const registryId = fi.get('registry-id');

    switch (registryId) {
    case REPORTS_REG_ID:
        return 10000 + weight;
    case SHIFTS_REG_ID:
        return 1000 + weight;
    default:
        return weight;
    }
}

function merger(prev, next) {
    try {
        if (Immutable.List.isList(prev)) {
            return prev.concat(next);
        }
        if (Immutable.Map.isMap(prev)) {
            return prev.mergeWith(merger, next);
        }
        if (Immutable.Set.isSet(prev)) {
            return prev.union(next);
        }
    } catch (e) {
        console.log('Error when merging data') // eslint-disable-line
        console.log(e) // eslint-disable-line
    }

    return isNil(next)
        ? prev
        : next;
}
function weakMerger(prev, next) {
    try {
        if (Immutable.List.isList(prev)) {
            return prev.concat(next);
        }
        if (Immutable.Map.isMap(prev)) {
            return prev.mergeWith(weakMerger, next);
        }
        if (Immutable.Set.isSet(prev)) {
            return prev.union(next);
        }
    } catch (e) {
        console.log('Error when merging data') // eslint-disable-line
        console.log(e) // eslint-disable-line
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

    return isNil(value)
        ? item.get(id)
        : value;
}

module.exports = defaultMemoize((regFields, regData, users) => {
    const fieldInstances = (
        regFields && regFields.sortBy
            ? regFields
            : Immutable.List()
    ).sortBy(byPriority);
    cache && cache.flush && cache.flush();

    function mergeUserValues(acc, id) {
        let referencedValues = cache.get(id);

        if (!referencedValues && !visited.has(id)) {
            visited.add(id);
            const d = users.get(id);
            if (d && !d.isEmpty()) {
                referencedValues = Immutable.Map({
                    users: Immutable.List([Immutable.Map({
                        name: d.get('name'),
                        id,
                    })]),
                }).asMutable();
                referencedValues = mergeValues(referencedValues, d);
                cache.set(id, referencedValues.asImmutable());
            }
            visited.delete(id);
        }

        return (referencedValues)
            ? acc.mergeWith(weakMerger, referencedValues)
            : acc;
    }

    function mergeRegistryValues(acc, id) {
        let referencedValues = cache.get(id);

        if (!referencedValues && !visited.has(id)) {
            visited.add(id);
            const d = regData.get(id);
            if (d && !d.isEmpty()) {
                const pathSegment = Immutable.Map({
                    title: d.get('title'),
                    id,
                    'registry-id': d.get('registry-id'),
                });

                referencedValues = Immutable.Map({
                    path: Immutable.List([pathSegment]),
                }).asMutable();

                referencedValues = mergeValues(referencedValues, d);
                cache.set(id, referencedValues.asImmutable());
            }
            visited.delete(id);
        }

        return (referencedValues)
            ? acc.mergeWith(merger, referencedValues)
            : acc;
    }

    function mergeValues(acc, item) {
        const values = item.get('values') || Immutable.Map();

        return fieldInstances.reduce((innerAcc, fi) => {
            const registryId = item.get('registry-id');
            if (registryId && registryId !== fi.get('registry-id')) {
                return innerAcc;
            }

            const v = getValue(item, values, fi);
            if (isEmpty(v)) {
                return innerAcc;
            }

            const id = fi.get('id');
            innerAcc = innerAcc.set(id, v);

            const fid = fi.get('field-id');
            const s = fi.get('field-section');
            if (s) {
                innerAcc = innerAcc.setIn([s, fid], v)
                    .setIn(['_mapping', s, fid], id);
            } else {
                innerAcc = innerAcc.set(fid, v);
            }

            if (item && fid === 'customer-no' &&
        !innerAcc.getIn(['invoice-head', 'customer-name'])) {
                // Copy customer name from title
                innerAcc = innerAcc.setIn(['invoice-head', 'customer-name'], item.get('title'));
            }

            if (fi.get('field-type') === 'registry-reference') {
                innerAcc = mergeRegistryValues(innerAcc, v);
            }

            if (fi.get('field-type') === 'user-reference') {
                innerAcc = mergeUserValues(innerAcc, v);
            }

            return innerAcc;
        }, acc);
    }

    return (item) => {
        if (!item || !item.get) {
            return null;
        }

        const id = item.get('id');
        const validFrom = item.get('valid-from');
        const cacheKey = id && `${id}/${validFrom}`;
        const refData = cacheKey && cache.get(cacheKey);

        if (refData) {
            return refData;
        }

        visited.clear();

        let data = mergeValues(Immutable.Map().asMutable(), item);
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
});
