import { describe, it, expect, afterEach, vi } from 'vitest';
import { cacheFactory, stopCache } from './cacheFactory';

// Regression coverage for the boundary dataBuilderFactory's maxSize bump (1024 -> 8192) and
// the removal of its per-construction cache.flush() both lean on: with no active flush, the
// 'fieldData' cache only ever shrinks via this module's maxSize/lifetime vacuum, so that vacuum
// actually enforcing the cap (not just tracking it) is now load-bearing rather than incidental.
describe('cacheFactory', () => {
    afterEach(() => {
        stopCache();
        vi.useRealTimers();
    });

    describe('eviction boundary', () => {
        it('caps the cache at maxSize, evicting the least recently used entries first', () => {
            vi.useFakeTimers();
            const maxSize = 5;
            const cache = cacheFactory('eviction-maxsize-test', 120000, maxSize);

            const ids = Array.from({ length: maxSize + 3 }, (_, i) => `item-${i}`);
            ids.forEach((id) => {
                cache.set(id, `value-${id}`);
                vi.advanceTimersByTime(10);
            });

            // set() doesn't enforce maxSize itself (see vacuum()'s doc comment in
            // dataBuilderFactory.ts) — only vacuum() does, and nothing here calls it except
            // evict() or the 60s gc() interval. Force it deterministically via an evict() on a
            // key that doesn't exist, so the forced vacuum doesn't remove anything of its own.
            cache.evict('__force-vacuum__');

            const survivingIds = ids.filter((id) => cache.get(id) !== null);
            expect(survivingIds).toHaveLength(maxSize);
            // The most-recently-set entries are the ones kept; the oldest overflow entries are gone.
            expect(survivingIds).toEqual(ids.slice(-maxSize));
        });

        it('treats get() as a use, protecting an older entry from eviction over one never read again', () => {
            vi.useFakeTimers();
            const maxSize = 3;
            const cache = cacheFactory('eviction-lru-test', 120000, maxSize);

            cache.set('a', 'A');
            vi.advanceTimersByTime(10);
            cache.set('b', 'B');
            vi.advanceTimersByTime(10);
            cache.set('c', 'C');
            vi.advanceTimersByTime(10);

            // Touch 'a' again so it becomes the most recently used, ahead of 'b' and 'c'.
            expect(cache.get('a')).toBe('A');
            vi.advanceTimersByTime(10);

            // One more entry pushes the cache over maxSize; the forced vacuum below should drop
            // the least-recently-used survivor ('b', never re-read) rather than 'a'.
            cache.set('d', 'D');
            vi.advanceTimersByTime(10);
            cache.evict('__force-vacuum__');

            expect(cache.get('a')).toBe('A');
            expect(cache.get('d')).toBe('D');
            expect(cache.get('b')).toBeNull();
        });

        it('expires an entry once its lifetime elapses, independent of maxSize headroom', () => {
            vi.useFakeTimers();
            const lifetime = 1000;
            const cache = cacheFactory('eviction-ttl-test', lifetime, 100);

            cache.set('stale', 'value');
            vi.advanceTimersByTime(lifetime + 1);

            expect(cache.get('stale')).toBeNull();
        });
    });
});
