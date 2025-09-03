import Immutable from 'immutable';
import type { RefData, FieldInstance } from '../types.js';
import { extractTitleSetting } from './extractTitleSetting.js';
import { createPathBasedTitleBuilder } from './pathBasedBuilder.js';
import { createTitleBuilder } from './createTitleBuilder.js';

let titleBuilder: ((refData: RefData, removeId?: string) => string | null) | null = null;
let lastSettings: Immutable.Map<string, any> | null = null;

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

    // Reset titleBuilder if settings have changed
    if (settingsMap && (!lastSettings || !settingsMap.equals(lastSettings))) {
        titleBuilder = null;
        lastSettings = settingsMap;
    }

    // Create or reuse titleBuilder
    if (!titleBuilder && settingsMap && regFields) {
        titleBuilder = createTitleBuilder(settingsMap, regFields);
    }

    // Use titleBuilder if available
    if (titleBuilder) {
        const result = titleBuilder(data, removeId);
        // If titleBuilder returns a result (even empty string), use it
        // Don't fall back to path-based composition when fields are configured
        return result;
    }

    // Only fallback to path-based composition when no titleBuilder is available
    // This happens when no settings are provided or no regFields
    let separator = ', ';
    if (settingsMap) {
        const setting = extractTitleSetting(settingsMap);
        if (Immutable.Map.isMap(setting)) {
            separator = setting.get('separator') || ', ';
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
