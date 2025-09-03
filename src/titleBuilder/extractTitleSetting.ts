import { defaultMemoize } from 'reselect';
import { defaultRegisters } from '../utils/defaultRegisters.js';

export const SHIFT_TITLE_SETTING_ID = `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`;

/**
 * Extracts title settings from the settings map
 */
export const extractTitleSetting = defaultMemoize((settingsMap: any): any => {
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
