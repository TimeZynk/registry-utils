/**
 * Cleans a string by removing empty parts and normalizing separators
 * @param result - The string to clean
 * @param separator - The separator string used
 * @returns Cleaned string with empty parts removed
 */
export function cleanSeparatorResult(result: string, separator: string): string {
    if (!result) {
        return '';
    }

    // Since we're now filtering out empty values at the source,
    // this function is mainly for edge cases and final cleanup
    // Split by separator and filter out any remaining empty/whitespace-only parts
    const parts = result.split(separator);
    const nonEmptyParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);

    // Join non-empty parts with the separator
    return nonEmptyParts.join(separator);
}

/**
 * Checks if a string consists only of separator characters
 * @param result - The string to check
 * @param separator - The separator string used
 * @returns true if the result consists only of separator characters
 */
export function isSeparatorOnly(result: string, separator: string): boolean {
    const trimmedResult = result.trim();

    // Handle empty separator case first
    if (!separator) {
        return trimmedResult === '';
    }

    // Empty strings and whitespace-only strings are not separator-only
    if (!trimmedResult) {
        return false;
    }

    // Check if the result consists only of separator characters
    const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
    return separatorOnlyRegex.test(trimmedResult);
}

/**
 * Processes parts array and handles separator logic consistently
 * @param parts - Array of parts to process
 * @param separator - The separator string to use
 * @returns Processed string with proper separator handling
 */
export function processSeparator(parts: (string | undefined | null)[], separator: string): string {
    if (!parts || parts.length === 0) {
        return '';
    }

    // Since we're now filtering out empty values at the source,
    // we can just join the parts and do final cleanup
    const result = parts.join(separator);

    const cleanedResult = cleanSeparatorResult(result, separator);

    if (isSeparatorOnly(cleanedResult, separator)) {
        return '';
    }

    return cleanedResult;
}
