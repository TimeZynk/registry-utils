import Immutable from 'immutable';
import { defaultMemoize } from 'reselect';
import { defaultRegisters } from './defaultRegisters.js';
import type { RefData, FieldInstance } from './types.js';

const SHIFT_TITLE_SETTING_ID = `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`;

let titleBuilder: ((refData: RefData, removeId?: string) => string | null) | null = null;
let lastSettings: Immutable.Map<string, any> | null = null;

interface TitleField {
    id: string;
    formatId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TitleSetting {
    separator: string;
    fields: Immutable.List<TitleField>;
}

/**
 * Extracts title settings from the settings map
 */
const extractTitleSetting = defaultMemoize((settingsMap: Immutable.Map<string, any>): any => {
    let setting = settingsMap.get(SHIFT_TITLE_SETTING_ID);

    if (!setting) {
        // Try to find by id field
        setting = settingsMap.find((value: any) => value.get && value.get('id') === SHIFT_TITLE_SETTING_ID);
        if (setting) {
            setting = setting.get('value');
        }
    }

    if (!setting) {
        // Assume it's a direct value object
        setting = settingsMap;
    }

    // If setting has an 'id' field, extract the 'value'
    if (setting.get && setting.get('id') === SHIFT_TITLE_SETTING_ID) {
        setting = setting.get('value');
    }

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
        // Convert to Immutable.Map if it's not already
        const settingsMap = Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings);

        // Extract settings using helper function
        const setting = extractTitleSetting(settingsMap);

        const separator = setting.get('separator') || ', ';
        const fields = setting.get('fields') || Immutable.List();

        // If no fields configured, use path-based composition
        if (fields.isEmpty()) {
            return createPathBasedTitleBuilder(separator);
        }

        // Use field-based composition
        return createFieldBasedTitleBuilder(fields, separator, regFields);
    }
);

/**
 * Creates a path-based title builder (fallback method)
 * Similar to the original utility's path-based approach
 */
function createPathBasedTitleBuilder(separator: string): (refData: RefData, removeId?: string) => string | null {
    return (refData: RefData, removeId?: string): string | null => {
        let parts = (refData && refData.get('path')) || Immutable.List();

        if (removeId) {
            parts = parts.filterNot((d: any) => d.get('registry-id') === removeId);
        }

        parts = parts.map((d: any) => d.get('title'));

        const result = parts.join(separator);

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
 * Enhanced version of the original utility with registry-reference support
 */
function createFieldBasedTitleBuilder(
    fields: Immutable.List<any>,
    separator: string,
    regFields: Immutable.Map<string, FieldInstance>
): (refData: RefData) => string {
    return (refData: RefData): string => {
        const parts =
            refData &&
            fields.map((field: any) => {
                const id = field.get('id');
                const formatId = field.get('formatId');
                const value = refData.get(id);

                // Handle registry-reference formatId - look up title from path
                if (formatId === 'registry-reference') {
                    // Find the registry reference in the path
                    const path = refData.get('path') || Immutable.List();
                    const registryRef = path.find(
                        (item: any) => item.get('id') === value || item.get('registry-id') === value
                    );

                    if (registryRef) {
                        const registryTitle = registryRef.get('title');
                        if (registryTitle) {
                            return registryTitle;
                        }
                    }

                    // If no title found in path, try to get from the field value directly
                    return value ? String(value) : '';
                }

                // Handle standard formatId - return value directly (no formatter needed)
                if (formatId === 'standard') {
                    return value ? String(value) : '';
                }

                // Use formatter if available for other formatIds (similar to original utility)
                if (formatId && regFields) {
                    // Try to get formatter from regFields (similar to registryFields.getFormatter)
                    const fieldInstance = regFields.get(formatId);
                    if (fieldInstance && fieldInstance.get('formatter')) {
                        const formatter = fieldInstance.get('formatter');
                        if (typeof formatter === 'function') {
                            return formatter(value);
                        }
                    }
                }

                // Default fallback: return value as string
                return value ? String(value) : '';
            });

        const finalResult = (parts && parts.join(separator)) || '';

        // Check if the result is just separators (empty or only contains separator characters)
        const trimmedResult = finalResult.trim();

        // Check if the result is empty or consists only of separator characters
        if (!trimmedResult) {
            return '';
        }

        // Check if the result consists only of separators and empty parts
        const splitParts = trimmedResult.split(separator);
        const hasNonEmptyParts = splitParts.some((part) => part.trim());
        if (!hasNonEmptyParts) {
            return '';
        }

        // Additional check: if the result consists only of separator characters (like ", ,")
        const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
        if (separatorOnlyRegex.test(trimmedResult)) {
            return '';
        }

        return finalResult;
    };
}

/**
 * Composes a title from reference data using configured settings
 * This is the main entry point for title composition
 * Similar to the original titlesFromPath function
 */
function composeTitle(
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

// Export the main function and the builder creator for advanced usage
export { composeTitle, createTitleBuilder };
