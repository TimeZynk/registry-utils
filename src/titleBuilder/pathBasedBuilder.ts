import Immutable from 'immutable';
import type { RefData } from '../types.js';
import { processSeparator } from './utils/processSeparator.js';

type PathBasedBuilderFunction = (refData: RefData, removeId?: string) => string | null;
/**
 * Creates a path-based title builder (fallback method)
 * Similar to the original utility's path-based approach
 */
export function createPathBasedTitleBuilder(separator: string): PathBasedBuilderFunction {
    return (refData: RefData, removeId?: string): string | null => {
        let parts = (refData && refData.get('path')) || Immutable.List();

        if (removeId) {
            parts = parts.filterNot((d: any) => d.get('registry-id') === removeId);
        }

        parts = parts.map((d: any) => d.get('title'));

        // Filter out null/undefined/empty values before processing
        const validParts = parts.filter((part) => part && part.trim());
        return processSeparator(validParts.toArray(), separator) || null;
    };
}
