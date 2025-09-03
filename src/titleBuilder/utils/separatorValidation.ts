/**
 * Utility functions for validating separator results in title composition
 */

/**
 * Checks if a string consists only of separator characters
 * @param result - The string to check
 * @param separator - The separator string used
 * @returns true if the result consists only of separator characters
 */
export function isSeparatorOnly(result: string, separator: string): boolean {
    const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
    return separatorOnlyRegex.test(result.trim());
}

/**
 * Checks if a string has any non-empty parts when split by separator
 * @param result - The string to check
 * @param separator - The separator string used
 * @returns true if there are non-empty parts
 */
export function hasNonEmptyParts(result: string, separator: string): boolean {
    const trimmedResult = result.trim();
    if (!trimmedResult) {
        return false;
    }

    const splitParts = trimmedResult.split(separator);
    return splitParts.some((part) => part.trim());
}

/**
 * Comprehensive validation of separator result
 * @param result - The string to validate
 * @param separator - The separator string used
 * @returns true if the result is valid (not empty and not separator-only)
 */
export function isValidSeparatorResult(result: string, separator: string): boolean {
    const trimmedResult = result.trim();

    if (!trimmedResult) {
        return false;
    }

    if (!hasNonEmptyParts(trimmedResult, separator)) {
        return false;
    }

    if (isSeparatorOnly(trimmedResult, separator)) {
        return false;
    }

    return true;
}
