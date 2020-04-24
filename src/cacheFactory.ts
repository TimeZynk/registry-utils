// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.
import forEach from 'lodash/forEach';
import isUndefined from 'lodash/isUndefined';
import flow from 'lodash/fp/flow';
import sortBy from 'lodash/fp/sortBy';
import reduce from 'lodash/fp/reduce';

const DEFAULT_LIFETIME = 120000;
const DEFAULT_MAXSIZE = 1024;

const caches: Record<string, any> = {};
var nextId = 1;
var gcInterval: number | null = null;

function gc() {
    var now = new Date().getTime();
    forEach(caches, function (c, id) {
        var limit = now - c.lifetime;
        c.vacuum();
        if (c.ts < limit) {
            delete caches[id];
        }
    });
}

function cacheFactory(name, lifetime, maxSize) {
    lifetime = lifetime || DEFAULT_LIFETIME;
    maxSize = maxSize || DEFAULT_MAXSIZE;
    var cacheId = name + '-' + nextId;
    nextId += 1;
    var data = {};
    var used = {};

    if (!gcInterval) {
        gcInterval = setInterval(gc, 60000);
    }

    function mostRecentlyUsed(entry) {
        var ts = entry[1];
        return -ts;
    }

    function vacuum() {
        var limit = new Date() - lifetime;
        var size = 0;

        var tmpData = flow(
            sortBy(mostRecentlyUsed),
            reduce(function (acc, entry) {
                var id = entry[0];
                var ts = entry[1];
                if (size < maxSize && (ts || 0) > limit) {
                    acc[id] = data[id];
                    size += 1;
                } else {
                    delete used[id];
                }
                return acc;
            }, {})
        )(used);

        data = tmpData;
    }

    return {
        get: function(id) {
            var item = data[id];
            if (!isUndefined(item)) {
                var now = new Date();
                if (used[id][1] > (now - lifetime)) {
                    used[id][1] = now;
                    caches[cacheId] = {
                        lifetime: lifetime,
                        vacuum: vacuum,
                        ts: now,
                    };
                    return item;
                }
                delete data[id];
                delete used[id];
                return null;
            }
            return null;
        },

        evict: function(id) {
            if (id) {
                delete data[id];
                delete used[id];
            }
            vacuum();
            return this;
        },

        set: function(id, item) {
            var ts = new Date().getTime();

            data[id] = item;
            used[id] = [id, ts];
            caches[cacheId] = {
                lifetime: lifetime,
                vacuum: vacuum,
                ts: ts,
            };

            return item;
        },

        flush: function() {
            data = [];
            used = [];
            return this;
        },
    };
}

module.exports = cacheFactory;
