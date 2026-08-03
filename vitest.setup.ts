// `t` (translations) and `TIMEZYNK_REST` are ambient globals declared in src/types/global.ts
// for typing purposes, but the app runtime that normally provides them isn't present under
// Vitest. Stub them here so formatter/date code that references t.* doesn't crash in tests —
// falls back to returning the key itself, matching common i18n-mock behavior.
(globalThis as any).t = new Proxy(
    {},
    {
        get: (_target, prop) => (typeof prop === 'string' ? prop : undefined),
    },
);
(globalThis as any).TIMEZYNK_REST = 'https://example.test';
