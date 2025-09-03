import { defaultMemoize } from 'reselect';
import Immutable from 'immutable';
import type { FieldInstance, RefData } from '../types.js';
import { extractTitleSetting } from './extractTitleSetting.js';
import { createPathBasedTitleBuilder } from './pathBasedBuilder.js';
import { createFieldBasedTitleBuilder } from './fieldBasedBuilder.js';

type TitleBuilderFunction = (refData: RefData, removeId?: string) => string | null;
/**
 * Creates a title composition function based on settings
 */
export const createTitleBuilder = defaultMemoize(
    (
        settings: Immutable.Map<string, any> | any,
        regFields: Immutable.Map<string, FieldInstance>
    ): TitleBuilderFunction => {
        // Convert to Immutable.Map if it's not already
        const settingsMap = Immutable.Map.isMap(settings) ? settings : Immutable.fromJS(settings);

        // Extract settings using helper function
        const setting = extractTitleSetting(settingsMap);

        const separator = setting.get('separator') || ', ';
        const fields = setting.get('fields') || Immutable.List();

        // If no fields configured - builds title from registry hierarchy with path-based composition
        if (fields.isEmpty()) {
            return createPathBasedTitleBuilder(separator);
        }

        // Used when fields are configured - builds title from specific field values
        return createFieldBasedTitleBuilder(fields, separator, regFields);
    }
);
