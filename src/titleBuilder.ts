import Immutable from 'immutable';
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

interface RegistryFieldsWithFormatter {
    getFormatter?: (formatId: string) => (value: any) => string;
}

function createTitleBuilder(
    settings: Immutable.Map<string, any> | any,
    regFields: Immutable.Map<string, FieldInstance>
): (refData: RefData, removeId?: string) => string {
    // Convert to Immutable.Map if it's not already
    const settingsMap = Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings);

    // Handle different possible structures:
    // 1. Map with key: { "SHIFT_TITLE_SETTING_ID": { separator: "...", fields: [...] } }
    // 2. Direct object: { id: "SHIFT_TITLE_SETTING_ID", value: { separator: "...", fields: [...] } }
    // 3. Direct value object: { separator: "...", fields: [...] }

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

    // If setting has an 'id' field, it means we found the wrapper object, so extract the 'value'
    if (setting.get && setting.get('id') === SHIFT_TITLE_SETTING_ID) {
        setting = setting.get('value');
    }

    const separator = setting.get('separator') || ', ';
    const fields = setting.get('fields') || Immutable.List();

    if (fields.isEmpty()) {
        // Path-based title composition
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

            const result = parts.join(separator);
            return result;
        };
    }

    // Field-based title composition
    return (refData: RefData): string => {
        const parts =
            refData &&
            fields.map((field: any) => {
                const id = field.get('id');
                const formatId = field.get('formatId');
                const value = refData.get(id);

                if (formatId && regFields) {
                    // Try to get formatter from regFields if it has a getFormatter method
                    const fieldInstance = regFields.get(formatId);
                    if (fieldInstance && fieldInstance.get && typeof fieldInstance.get === 'function') {
                        const formatter = fieldInstance.get('formatter');
                        if (formatter && typeof formatter === 'function') {
                            const formattedValue = formatter(value);
                            return formattedValue;
                        }
                    }
                }

                const result = value ? String(value) : '';
                return result;
            });

        const result = (parts && parts.join(separator)) || '';
        return result;
    };
}

function titlesFromPath(
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

    if (!titleBuilder && settingsMap && regFields) {
        titleBuilder = createTitleBuilder(settingsMap, regFields);
    }

    if (!titleBuilder) {
        // Fallback to path-based title if no settings available
        let parts = (data && data.get('path')) || Immutable.List();
        if (removeId) {
            parts = parts.filterNot((d: any) => d.get('registry-id') === removeId);
        }
        parts = parts.map((d: any) => d.get('title'));
        const result = parts.join(', ');
        return result;
    }

    const result = titleBuilder(data, removeId);
    console.log('@registry-utils: titleBuilder result', result);
    return result;
}

export { titlesFromPath, createTitleBuilder };
