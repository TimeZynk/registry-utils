# Caching in `dataBuilderFactory`

`dataBuilderFactory` resolves registry-reference and user-reference field values by looking up
the referenced item and merging its values into the built `refData`. Those lookups are cached so
that resolving the same reference across many items (e.g. every shift in a month view sharing the
same customer) doesn't redo the same merge work.

This doc covers how that cache is keyed and evicted, and — most importantly — what a caller needs
to do to actually benefit from it.

## What's cached

A single module-level cache (`'fieldData'`, built via [`cacheFactory`](../src/cacheFactory.ts)) is
shared by every `dataBuilderFactory`/`memoizedDataBuilderFactory` construction in the process. Two
things get cached against it:

- **Reference lookups** — the merged values for a given registry-reference or user-reference id
  (`mergeRegistryValues`/`mergeUserValues`).
- **Whole-item builds** — the fully-built `refData` for a given item (keyed by `id` + `valid-from`),
  skipped if you call the returned builder as `builder(item, /* notCached */ true)`.

## How keys are generated

`dataBuilderFactory(regFields, regData, users, invoiceArticles, salaryArticles, dynamicTitleSetting)`
takes six inputs. Every cache key is prefixed with a **generation** string derived from those six
inputs' *reference identity* — not their content — via a `WeakMap` per input
(see `makeVersionTagger` in [`dataBuilderFactory.ts`](../src/dataBuilderFactory.ts)):

- Two constructions built from the **same references** (e.g. the same `Immutable.Map` object,
  unchanged) resolve to the same generation and **share** cache entries — even across different
  call sites.
- A construction built from **different references** gets a different generation, so its entries
  never collide with an older generation's. The item cache adds a 7th tag on the item reference
  itself, so an edited item (a new Immutable reference) always misses regardless of generation.

This is why `notCached` aside, nothing here does content-equality checks (`Immutable.is`, deep
comparison, hashing) — reference identity is intentional, because that's the same convention this
codebase's `reselect` selectors already rely on, and it's a `WeakMap` lookup instead of a hash/diff
on every call.

### The one thing that matters for callers

**The cache only helps if you pass the same object reference when the underlying data hasn't
changed.** If `regFields`/`regData`/`users`/etc. are rebuilt from scratch on every call — even from
identical source data — every call gets a brand-new generation, and nothing is ever shared. This
isn't a correctness bug (you still get the right `refData`, and old entries just age out normally,
see [Eviction](#eviction) below), but it silently defeats the entire point of this cache for that
caller.

```ts
// ❌ Defeats the cache: a fresh Immutable.Map every call, even if the source array is unchanged.
function buildRefData(item, rawFieldInstances, rawRegistryData, rawUsers) {
    const regFields = Immutable.Map(rawFieldInstances.map((f) => [f.id, Immutable.fromJS(f)]));
    const regData = Immutable.Map(rawRegistryData.map((d) => [d.id, Immutable.fromJS(d)]));
    const users = Immutable.Map(rawUsers.map((u) => [u.id, Immutable.fromJS(u)]));
    return dataBuilderFactory(regFields, regData, users)(item);
}
```

```ts
// ✅ Reuses the same reference as long as the source data hasn't changed — e.g. a reselect
// selector over normalized store state, which only produces a new Immutable reference when
// that collection actually changes.
const selectRegistryFields = createSelector(/* ... */);
const selectRegistryData = createSelector(/* ... */);
const selectUsers = createSelector(/* ... */);

const makeDataBuilder = createSelector(
    [selectRegistryFields, selectRegistryData, selectUsers],
    (regFields, regData, users) => dataBuilderFactory(regFields, regData, users),
);
```

If you're calling `dataBuilderFactory` (or `memoizedDataBuilderFactory`) directly rather than
through a store-backed selector — e.g. building `refData` from an API response outside Redux —
make sure whatever converts that response into `Immutable` structures is itself memoized (or at
least skipped when the response is unchanged), not rebuilt unconditionally on every call.

`memoizedDataBuilderFactory` (`lruMemoize(dataBuilderFactory)`, cache size 1) only saves you from
recomputing the generation string when called twice in a row with the *exact same* six arguments —
it doesn't change any of the above, since the generation tagging (and therefore the actual cache
sharing) lives inside the wrapped `dataBuilderFactory` regardless of whether that outer memoization
hits or misses.

## Eviction

The `'fieldData'` cache is bounded by:

- **`maxSize`** — currently 8192 entries.
- **`lifetime`** — 120s (the `cacheFactory` default): an entry not read again within that window
  is treated as expired the next time it's read.

Neither is enforced on every `set()`. Both are enforced by `vacuum()`, which only runs when
`cache.evict(id)` is called or via a background sweep every 60s
(see [`cacheFactory.ts`](../src/cacheFactory.ts)) — so between sweeps the cache can briefly hold
more than `maxSize` entries. `vacuum()` keeps the `maxSize` most-recently-*used* (not
most-recently-*inserted*) non-expired entries and drops the rest; see
[`cacheFactory.test.ts`](../src/cacheFactory.test.ts) for the exact boundary behavior.

Older, no-longer-referenced generations aren't actively cleared — they just become unreachable
(nothing computes their generation string again) and age out via the above like any other entry.
This is a deliberate trade-off: generation-tagging guarantees correctness without ever needing to
flush the cache (stale generations can't collide with the current one), at the cost of relying on
`maxSize`/`lifetime` rather than an immediate flush to reclaim memory from abandoned generations.

## Summary

- Cache correctness doesn't depend on you doing anything — reference tagging means stale data is
  never served, no matter how the six inputs are constructed.
- Cache *effectiveness* does: pass stable, reference-equal `Immutable` structures across calls
  (typically via memoized selectors) whenever the underlying data hasn't changed, or every call
  gets a fresh generation and nothing is ever shared — still correct, just uncached.
