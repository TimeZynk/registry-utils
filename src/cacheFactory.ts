import forEach from 'lodash/forEach';
import isUndefined from 'lodash/isUndefined';
import flow from 'lodash/fp/flow';
import sortBy from 'lodash/fp/sortBy';
import reduce from 'lodash/fp/reduce';

const DEFAULT_LIFETIME = 120000;
const DEFAULT_MAXSIZE = 1024;

const caches: Record<string, any> = {};
let nextId = 1;
let gcInterval: number | null = null;

function gc(): void {
    const now = new Date().getTime();
    forEach(caches, function (c, id) {
        const limit = now - c.lifetime;
        c.vacuum();
        if (c.ts < limit) {
            delete caches[id];
        }
    });
}

interface Cache {
    get(id: string): any;
    evict(id: string): Cache;
    set(id: string, item: any): any;
    flush(): Cache;
}

export function stopCache(): void {
    if (gcInterval) {
        clearInterval(gcInterval);
        gcInterval = null;
    }
}

export function cacheFactory(
    name: string,
    lifetime: number = DEFAULT_LIFETIME,
    maxSize: number = DEFAULT_MAXSIZE
): Cache {
    const cacheId = name + '-' + nextId;
    nextId += 1;
    let data: Record<string, any> = {};
    let used: Record<string, [string, number]> = {};

    if (!gcInterval) {
        gcInterval = setInterval(gc, 60000);
    }

    function mostRecentlyUsed(entry: [string, number]): number {
        const ts = entry[1];
        return -ts;
    }

    function vacuum(): void {
        const limit = Date.now() - lifetime;
        let size = 0;

        const tmpData = flow(
            sortBy(mostRecentlyUsed),
            reduce(function (acc: Record<string, any>, entry) {
                const id = entry[0];
                const ts = entry[1];
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
        get(id: string): any {
            const item = data[id];
            if (!isUndefined(item)) {
                const now = Date.now();
                if (used[id][1] > now - lifetime) {
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

        evict(id: string): Cache {
            if (id) {
                delete data[id];
                delete used[id];
            }
            vacuum();
            return this;
        },

        set(id: string, item: any): any {
            const ts = new Date().getTime();

            data[id] = item;
            used[id] = [id, ts];
            caches[cacheId] = {
                lifetime: lifetime,
                vacuum: vacuum,
                ts: ts,
            };

            return item;
        },

        flush(): Cache {
            data = [];
            used = {};
            return this;
        },
    };
}
