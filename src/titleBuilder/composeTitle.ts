import Immutable from 'immutable';
import type { RefData, FieldInstance } from '../types.js';
import { extractTitleSetting } from './extractTitleSetting.js';
import { createPathBasedTitleBuilder } from './pathBasedBuilder.js';
import { createTitleBuilder } from './createTitleBuilder.js';
import { DEFAULT_DYNAMIC_TITLE_SEPARATOR } from '../utils/constants.js';

/**
 * Composes a title from reference data using configured settings
 * This is the main entry point for title composition
 * Similar to the original titlesFromPath function
 */
export function composeTitle(
    data: RefData,
    removeId?: string,
    settings?: Immutable.Map<string, any> | any,
    regFields?: Immutable.Map<string, FieldInstance>
): string | null {
    const settingsMap = settings ? (Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings)) : undefined;

    // Use the field-/path-based builder when both settings and regFields are available.
    // createTitleBuilder is itself memoized (lruMemoize, keyed on both args), so calling it
    // directly here already avoids rebuilding on every call while still picking up a
    // regFields change (a field added/removed/reordered/archived).
    //
    // This used to be wrapped in an extra hand-rolled cache here (a module-level
    // `titleBuilder`/`lastSettings` pair), invalidated only when `settingsMap` changed. That
    // was a real bug: it ignored `regFields` entirely, so once a builder was created for some
    // `settingsMap`, it kept being reused for every later call with an equal `settingsMap`
    // even after `regFields` changed — silently composing titles against a stale field set.
    // Do not reintroduce a cache here; if this ever needs one, key it on both arguments (i.e.
    // rely on createTitleBuilder's own memoization, don't wrap it in another).
    if (settingsMap && regFields) {
        return createTitleBuilder(settingsMap, regFields)(data, removeId);
    }

    // Only fallback to path-based composition when no titleBuilder is available
    // This happens when no settings are provided or no regFields
    let separator = DEFAULT_DYNAMIC_TITLE_SEPARATOR;
    if (settingsMap) {
        const setting = extractTitleSetting(settingsMap);
        if (Immutable.Map.isMap(setting)) {
            separator = setting.get('separator') || DEFAULT_DYNAMIC_TITLE_SEPARATOR;
        }
    }

    const result = createPathBasedTitleBuilder(separator)(data, removeId);

    // Check if the fallback result is just separators
    if (result) {
        const trimmedResult = result.trim();
        if (!trimmedResult || trimmedResult.split(separator).every((part) => !part.trim())) {
            return null;
        }
    }

    return result;
}
