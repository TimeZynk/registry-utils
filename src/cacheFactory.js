// Don't change the import/export syntax. Needs to be working with nodejs.
// Maybe on next LTS release we will be able to change this.
const forEach = require('lodash/forEach');
const isUndefined = require('lodash/isUndefined');
const flow = require('lodash/fp/flow');
const sortBy = require('lodash/fp/sortBy');
const reduce = require('lodash/fp/reduce');

const DEFAULT_LIFETIME = 120000;
const DEFAULT_MAXSIZE = 1024;

const caches = {};
let nextId = 1;
let gcInterval = null;

function gc() {
    const now = new Date().getTime();
    forEach(caches, (c, id) => {
        const limit = now - c.lifetime;
        c.vacuum();
        if (c.ts < limit) {
            delete caches[id];
        }
    });
}

function cacheFactory(name, lifetime = DEFAULT_LIFETIME, maxSize = DEFAULT_MAXSIZE) {
    const cacheId = `${name}-${nextId++}`;
    let data = {};
    let used = {};

    if (!gcInterval) {
        gcInterval = setInterval(gc, 60000);
    }

    function mostRecentlyUsed([id, ts]) {
        return -ts;
    }

    function vacuum() {
        const limit = new Date() - lifetime;
        let size = 0;

        const tmpData = flow(
            sortBy(mostRecentlyUsed),
            reduce((acc, [id, ts]) => {
                if (size < maxSize && (ts || 0) > limit) {
                    acc[id] = data[id];
                    size += 1;
                } else {
                    delete used[id];
                }
                return acc;
            }, {}),
        )(used);

        data = tmpData;
    }

    return {
        get(id) {
            const item = data[id];
            if (!isUndefined(item)) {
                const now = new Date();
                if (used[id][1] > (now - lifetime)) {
                    used[id][1] = now;
                    caches[cacheId] = { lifetime, vacuum, now };
                    return item;
                }
                delete data[id];
                delete used[id];
                return null;
            }
            return null;
        },

        evict(id) {
            if (id) {
                delete data[id];
                delete used[id];
            }
            vacuum();
            return this;
        },

        set(id, item) {
            const ts = new Date().getTime();

            data[id] = item;
            used[id] = [id, ts];
            caches[cacheId] = { lifetime, vacuum, ts };

            return item;
        },

        flush() {
            data = [];
            used = [];
            return this;
        },
    };
}

module.exports = cacheFactory;
