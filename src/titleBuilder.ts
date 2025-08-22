import Immutable from 'immutable';
import { defaultMemoize } from 'reselect';
import { defaultRegisters } from './defaultRegisters';
import type { RefData, RefDataAccumulator, FieldInstance } from './types';

const SHIFT_TITLE_SETTING_ID = `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`;

let titleBuilder: ((refData: RefData, removeId?: string) => string | null) | null = null;
let lastSettings: Immutable.Map<string, any> | null = null;

interface TitleField {
    id: string;
    formatId?: string;
}

interface TitleSetting {
    separator: string;
    fields: Immutable.List<TitleField>;
}

/**
 * Extracts title settings from the settings map
 */
const extractTitleSetting = defaultMemoize((settingsMap: Immutable.Map<string, any>): any => {
    console.log('🔍 [extractTitleSetting] Starting extraction with settingsMap:', settingsMap?.toJS?.() || settingsMap);
    console.log('🔍 [extractTitleSetting] Looking for SHIFT_TITLE_SETTING_ID:', SHIFT_TITLE_SETTING_ID);

    let setting = settingsMap.get(SHIFT_TITLE_SETTING_ID);
    console.log('🔍 [extractTitleSetting] Direct lookup result:', setting?.toJS?.() || setting);

    if (!setting) {
        console.log('🔍 [extractTitleSetting] Direct lookup failed, trying to find by id field...');
        // Try to find by id field
        setting = settingsMap.find((value: any) => value.get && value.get('id') === SHIFT_TITLE_SETTING_ID);
        console.log('🔍 [extractTitleSetting] Find by id result:', setting?.toJS?.() || setting);
        if (setting) {
            setting = setting.get('value');
            console.log('🔍 [extractTitleSetting] Extracted value from id field:', setting?.toJS?.() || setting);
        }
    }

    if (!setting) {
        console.log('🔍 [extractTitleSetting] No setting found, assuming direct value object');
        // Assume it's a direct value object
        setting = settingsMap;
    }

    // If setting has an 'id' field, extract the 'value'
    if (setting.get && setting.get('id') === SHIFT_TITLE_SETTING_ID) {
        console.log('🔍 [extractTitleSetting] Setting has matching id, extracting value...');
        setting = setting.get('value');
        console.log('🔍 [extractTitleSetting] Final extracted value:', setting?.toJS?.() || setting);
    }

    console.log('🔍 [extractTitleSetting] Final result:', setting?.toJS?.() || setting);
    return setting;
});

/**
 * Creates a title composition function based on settings
 */
const createTitleBuilder = defaultMemoize(
    (
        settings: Immutable.Map<string, any> | any,
        regFields: Immutable.Map<string, FieldInstance>
    ): ((refData: RefData, removeId?: string) => string | null) => {
        console.log('🏗️ [createTitleBuilder] Starting with settings:', settings?.toJS?.() || settings);
        console.log('🏗️ [createTitleBuilder] regFields keys:', regFields?.keySeq?.()?.toArray?.() || []);

        // Convert to Immutable.Map if it's not already
        const settingsMap = Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings);
        console.log('🏗️ [createTitleBuilder] Converted settingsMap:', settingsMap?.toJS?.() || settingsMap);

        // Extract settings using helper function
        const setting = extractTitleSetting(settingsMap);
        console.log('🏗️ [createTitleBuilder] Extracted setting:', setting?.toJS?.() || setting);

        const separator = setting.get('separator') || ', ';
        const fields = setting.get('fields') || Immutable.List();
        console.log('🏗️ [createTitleBuilder] Separator:', separator);
        console.log('🏗️ [createTitleBuilder] Fields:', fields?.toJS?.() || fields);

        // If no fields configured, use path-based composition
        if (fields.isEmpty()) {
            console.log('🏗️ [createTitleBuilder] No fields configured, using path-based composition');
            return createPathBasedTitleBuilder(separator);
        }

        // Use field-based composition
        console.log('🏗️ [createTitleBuilder] Using field-based composition');
        return createFieldBasedTitleBuilder(fields, separator, regFields);
    }
);

/**
 * Creates a path-based title builder (fallback method)
 */
function createPathBasedTitleBuilder(separator: string): (refData: RefData, removeId?: string) => string | null {
    return (refData: RefData, removeId?: string): string | null => {
        console.log('🛤️ [createPathBasedTitleBuilder] Starting with separator:', separator);
        console.log('🛤️ [createPathBasedTitleBuilder] refData keys:', refData?.keySeq?.()?.toArray?.() || []);
        console.log('🛤️ [createPathBasedTitleBuilder] removeId:', removeId);

        let parts = (refData && refData.get('path')) || Immutable.List();
        console.log('🛤️ [createPathBasedTitleBuilder] Initial path parts:', parts?.toJS?.() || parts);

        if (removeId) {
            console.log('🛤️ [createPathBasedTitleBuilder] Filtering out removeId:', removeId);
            parts = parts.filterNot((d: any) => d.get('registry-id') === removeId);
            console.log('🛤️ [createPathBasedTitleBuilder] After filtering:', parts?.toJS?.() || parts);
        }

        parts = parts.map((d: any) => d.get('title'));
        console.log('🛤️ [createPathBasedTitleBuilder] Extracted titles:', parts?.toJS?.() || parts);

        // If no path data, try to use the item's title from the original
        if (parts.isEmpty()) {
            console.log('🛤️ [createPathBasedTitleBuilder] No path parts, trying original title...');
            const original = refData.get('original');
            console.log('🛤️ [createPathBasedTitleBuilder] Original item:', original?.toJS?.() || original);
            if (original && original.get('title')) {
                const originalTitle = original.get('title');
                console.log('🛤️ [createPathBasedTitleBuilder] Using original title:', originalTitle);
                return originalTitle;
            }
        }

        const result = parts.join(separator);
        console.log('🛤️ [createPathBasedTitleBuilder] Final result:', result);

        // Check if the result is just separators (empty or only contains separator characters)
        const trimmedResult = result.trim();

        // Check if the result is empty or consists only of separator characters
        if (!trimmedResult) {
            return null;
        }

        // Check if the result consists only of separators and empty parts
        const splitParts = trimmedResult.split(separator);
        const hasNonEmptyParts = splitParts.some((part) => part.trim());
        if (!hasNonEmptyParts) {
            return null;
        }

        // Additional check: if the result consists only of separator characters (like ", ,")
        const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
        if (separatorOnlyRegex.test(trimmedResult)) {
            return null;
        }

        return result;
    };
}

/**
 * Creates a field-based title builder (primary method)
 */
function createFieldBasedTitleBuilder(
    fields: Immutable.List<any>,
    separator: string,
    regFields: Immutable.Map<string, FieldInstance>
): (refData: RefData) => string | null {
    return (refData: RefData): string | null => {
        console.log('🏷️ [createFieldBasedTitleBuilder] Starting with separator:', separator);
        console.log('🏷️ [createFieldBasedTitleBuilder] Fields:', fields?.toJS?.() || fields);
        console.log('🏷️ [createFieldBasedTitleBuilder] refData keys:', refData?.keySeq?.()?.toArray?.() || []);

        const parts =
            refData &&
            fields.map((field: any) => {
                const id = field.get('id');
                const formatId = field.get('formatId');
                const value = refData.get(id);

                console.log('🏷️ [createFieldBasedTitleBuilder] Processing field:', { id, formatId, value });

                if (formatId && regFields) {
                    console.log('🏷️ [createFieldBasedTitleBuilder] Looking for formatter with formatId:', formatId);
                    // Try to get formatter from regFields
                    const fieldInstance = regFields.get(formatId);
                    console.log(
                        '🏷️ [createFieldBasedTitleBuilder] Found fieldInstance:',
                        fieldInstance?.toJS?.() || fieldInstance
                    );

                    if (fieldInstance && fieldInstance.get && typeof fieldInstance.get === 'function') {
                        const formatter = fieldInstance.get('formatter');
                        console.log('🏷️ [createFieldBasedTitleBuilder] Found formatter:', typeof formatter);

                        if (formatter && typeof formatter === 'function') {
                            const formattedValue = formatter(value);
                            console.log('🏷️ [createFieldBasedTitleBuilder] Formatted value:', formattedValue);
                            return formattedValue;
                        }
                    }
                }

                const result = value ? String(value) : '';
                console.log('🏷️ [createFieldBasedTitleBuilder] Final field result:', result);
                return result;
            });

        const finalResult = (parts && parts.join(separator)) || '';
        console.log('🏷️ [createFieldBasedTitleBuilder] Final result:', finalResult);

        // Check if the result is just separators (empty or only contains separator characters)
        const trimmedResult = finalResult.trim();

        // Check if the result is empty or consists only of separator characters
        if (!trimmedResult) {
            return null;
        }

        // Check if the result consists only of separators and empty parts
        const splitParts = trimmedResult.split(separator);
        const hasNonEmptyParts = splitParts.some((part) => part.trim());
        if (!hasNonEmptyParts) {
            return null;
        }

        // Additional check: if the result consists only of separator characters (like ", ,")
        const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
        if (separatorOnlyRegex.test(trimmedResult)) {
            return null;
        }

        return finalResult;
    };
}

/**
 * Composes a title from reference data using configured settings
 * This is the main entry point for title composition
 */
function composeTitle(
    data: RefData,
    removeId?: string,
    settings?: Immutable.Map<string, any> | any,
    regFields?: Immutable.Map<string, FieldInstance>
): string | null {
    console.log('🎯 [composeTitle] Starting composition...');
    console.log('🎯 [composeTitle] data keys:', data?.keySeq?.()?.toArray?.() || []);
    console.log('🎯 [composeTitle] removeId:', removeId);
    console.log('🎯 [composeTitle] settings:', settings?.toJS?.() || settings);
    console.log('🎯 [composeTitle] regFields keys:', regFields?.keySeq?.()?.toArray?.() || []);

    // Convert settings to Immutable.Map if needed
    const settingsMap = settings ? (Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings)) : undefined;
    console.log('🎯 [composeTitle] Converted settingsMap:', settingsMap?.toJS?.() || settingsMap);

    // Reset titleBuilder if settings have changed
    if (settingsMap && (!lastSettings || !settingsMap.equals(lastSettings))) {
        console.log('🎯 [composeTitle] Settings changed, resetting titleBuilder');
        titleBuilder = null;
        lastSettings = settingsMap;
    } else {
        console.log('🎯 [composeTitle] Settings unchanged, reusing titleBuilder');
    }

    // Create or reuse titleBuilder
    if (!titleBuilder && settingsMap && regFields) {
        console.log('🎯 [composeTitle] Creating new titleBuilder...');
        titleBuilder = createTitleBuilder(settingsMap, regFields);
    }

    // Use titleBuilder if available, otherwise fallback to path-based
    if (titleBuilder) {
        console.log('🎯 [composeTitle] Using existing titleBuilder');
        const result = titleBuilder(data, removeId);
        console.log('🎯 [composeTitle] titleBuilder result:', result);
        return result;
    }

    // Fallback to simple path-based title composition
    console.log('🎯 [composeTitle] No titleBuilder available, using fallback path-based composition');
    // Try to extract separator from settings, fallback to ', '
    let separator = ', ';
    if (settingsMap) {
        const setting = extractTitleSetting(settingsMap);
        if (Immutable.Map.isMap(setting)) {
            separator = setting.get('separator') || ', ';
        }
    }
    console.log('🎯 [composeTitle] Fallback separator:', separator);

    const result = createPathBasedTitleBuilder(separator)(data, removeId);
    console.log('🎯 [composeTitle] Fallback result:', result);

    // Check if the fallback result is just separators
    if (result) {
        const trimmedResult = result.trim();
        if (!trimmedResult || trimmedResult.split(separator).every((part) => !part.trim())) {
            console.log('🎯 [composeTitle] Fallback result is just separators, returning null');
            return null;
        }
    }

    return result;
}

// Export the main function and the builder creator for advanced usage
export { composeTitle, createTitleBuilder };
