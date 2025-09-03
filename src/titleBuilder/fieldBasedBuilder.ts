import Immutable from 'immutable';
import type { RefData, FieldInstance } from '../types.js';
import { getFormatter } from './getFormatter.js';
import { processSeparator } from './utils/processSeparator.js';

type FieldBasedBuilderFunction = (refData: RefData) => string;
/**
 * Creates a field-based title builder (primary method)
 * Enhanced version of the original utility with registry-reference support
 */
export function createFieldBasedTitleBuilder(
    fields: Immutable.List<any>,
    separator: string,
    regFields: Immutable.Map<string, FieldInstance>
): FieldBasedBuilderFunction {
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

                // Use formatter if available for other formatIds
                if (formatId && regFields) {
                    // First try to get custom formatter from field instance
                    const fieldInstance = regFields.get(formatId);
                    if (fieldInstance && fieldInstance.get('formatter')) {
                        const formatter = fieldInstance.get('formatter');
                        if (typeof formatter === 'function') {
                            return formatter(value);
                        }
                    }

                    // If no custom formatter, use the built-in formatter
                    // Note: registry-reference is handled above, so this won't be called for that formatId
                    try {
                        const builtInFormatter = getFormatter(formatId);
                        const result = builtInFormatter(value) || '';
                        return result;
                    } catch {
                        // Fallback to string conversion if formatter fails
                        return value ? String(value) : '';
                    }
                }

                // Default fallback: return value as string
                return value ? String(value) : '';
            });

        return processSeparator(parts ? parts.toArray() : [], separator);
    };
}
