import Immutable from 'immutable';
import { defaultMemoize } from 'reselect';
import { defaultRegisters } from './defaultRegisters';
import type { RefData, RefDataAccumulator, FieldInstance } from './types';

const SHIFT_TITLE_SETTING_ID = `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`;

let titleBuilder: ((refData: RefData, removeId?: string) => string) | null = null;
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
    ): ((refData: RefData, removeId?: string) => string) => {
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
 */
function createPathBasedTitleBuilder(separator: string): (refData: RefData, removeId?: string) => string {
    return (refData: RefData, removeId?: string): string => {
        let parts = (refData && refData.get('path')) || Immutable.List();

        if (removeId) {
            parts = parts.filterNot((d: any) => d.get('registry-id') === removeId);
        }
        parts = parts.map((d: any) => d.get('title'));

        // If no path data, try to use the item's title from the original
        if (parts.isEmpty()) {
            const original = refData.get('original');
            if (original && original.get('title')) {
                return original.get('title');
            }
        }

        return parts.join(separator);
    };
}

/**
 * Creates a field-based title builder (primary method)
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

                if (formatId && regFields) {
                    // Try to get formatter from regFields
                    const fieldInstance = regFields.get(formatId);
                    if (fieldInstance && fieldInstance.get && typeof fieldInstance.get === 'function') {
                        const formatter = fieldInstance.get('formatter');
                        if (formatter && typeof formatter === 'function') {
                            return formatter(value);
                        }
                    }
                }

                return value ? String(value) : '';
            });

        return (parts && parts.join(separator)) || '';
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
): string {
    // Convert settings to Immutable.Map if needed
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

    // Use titleBuilder if available, otherwise fallback to path-based
    if (titleBuilder) {
        return titleBuilder(data, removeId);
    }

    // Fallback to simple path-based title composition
    // Try to extract separator from settings, fallback to ', '
    let separator = ', ';
    if (settingsMap) {
        const setting = extractTitleSetting(settingsMap);
        if (Immutable.Map.isMap(setting)) {
            separator = setting.get('separator') || ', ';
        }
    }

    return createPathBasedTitleBuilder(separator)(data, removeId);
}

// Create a memoized version of composeTitle for performance
const memoizedComposeTitle = defaultMemoize(composeTitle);

// Export the main function and the builder creator for advanced usage
export { composeTitle, createTitleBuilder, memoizedComposeTitle };
