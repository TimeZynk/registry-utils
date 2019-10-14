// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.
'use strict';
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
    var weight = fi.get('weight');

    if (fi.get('archived')) {
        return -10000 + weight;
    }

    var registryId = fi.get('registry-id');

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
    var fieldId = fi.get('field-id');
    if (fieldId === 'title') {
        return item && item.get('title');
    }

    var id = fi.get('id');
    var value = values.get(id);

    return isNil(value)
        ? item.get(id)
        : value;
}

module.exports = defaultMemoize(function (regFields, regData, users) {
    var fieldInstances = (
        regFields && regFields.sortBy
            ? regFields
            : Immutable.List()
    ).sortBy(byPriority);
    cache && cache.flush && cache.flush();

    function mergeUserValues(acc, id) {
        var referencedValues = cache.get(id);

        if (!referencedValues && !visited[id]) {
            visited[id] = true;
            var d = users.get(id);
            if (d && !d.isEmpty()) {
                referencedValues = Immutable.Map({
                    users: Immutable.List([Immutable.Map({
                        name: d.get('name'),
                        id: id,
                    })]),
                }).asMutable();
                referencedValues = mergeValues(referencedValues, d);
                cache.set(id, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return (referencedValues)
            ? acc.mergeWith(weakMerger, referencedValues)
            : acc;
    }

    function mergeRegistryValues(acc, id) {
        var referencedValues = cache.get(id);

        if (!referencedValues && !visited[id]) {
            visited[id] = true;
            var d = regData.get(id);
            if (d && !d.isEmpty()) {
                var pathSegment = Immutable.Map({
                    title: d.get('title'),
                    id: id,
                    'registry-id': d.get('registry-id'),
                });

                referencedValues = Immutable.Map({
                    path: Immutable.List([pathSegment]),
                }).asMutable();

                referencedValues = mergeValues(referencedValues, d);
                cache.set(id, referencedValues.asImmutable());
            }
            delete visited[id];
        }

        return (referencedValues)
            ? acc.mergeWith(merger, referencedValues)
            : acc;
    }

    function mergeValues(acc, item) {
        if (!item || !item.get) {
            return acc;
        }
        var values = item.get('values') || Immutable.Map();

        return fieldInstances.reduce(function (innerAcc, fi) {
            var registryId = item.get('registry-id');
            if (registryId && registryId !== fi.get('registry-id')) {
                return innerAcc;
            }

            var v = getValue(item, values, fi);
            if (isEmpty(v)) {
                return innerAcc;
            }

            var id = fi.get('id');
            innerAcc = innerAcc.set(id, v);

            var fid = fi.get('field-id');
            var s = fi.get('field-section');
            if (s) {
                innerAcc = innerAcc.setIn([s, fid], v)
                    .setIn(['_mapping', s, fid], id);
            } else {
                innerAcc = innerAcc.set(fid, v);
            }

            if (item && fid === 'customer-no' && !innerAcc.getIn(['invoice-head', 'customer-name'])) {
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

    return function (item) {
        if (!item || !item.get) {
            return null;
        }

        var id = item.get('id');
        var validFrom = item.get('valid-from');
        var cacheKey = id && (id + '/' + validFrom);
        var refData = cacheKey && cache.get(cacheKey);

        if (refData) {
            return refData;
        }

        visited = {};

        var data = mergeValues(Immutable.Map().asMutable(), item);
        var userId = item.get('user-id');
        var bookedUsers = item.get('booked-users');

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
