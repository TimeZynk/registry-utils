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

    // First, handle consecutive separators by replacing them with a single separator
    // This handles cases like "SomeValue » » AnotherValue" -> "SomeValue » AnotherValue"
    let normalizedResult = result;

    // Replace consecutive separators with a single separator
    // Handle multiple cases:
    // 1. "SomeValue » » AnotherValue" -> "SomeValue » AnotherValue" (single space)
    // 2. "SomeValue »  » AnotherValue" -> "SomeValue » AnotherValue" (multiple spaces)

    // Use a regex approach that can handle both cases
    const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // This regex matches separator + optional whitespace + separator
    // It will catch both " » » " and " »  » " patterns
    const consecutiveSeparators = new RegExp(`${escapedSeparator}\\s*${escapedSeparator}`, 'g');

    // Replace consecutive separators with a single separator
    // Continue replacing until no more consecutive separators exist
    while (consecutiveSeparators.test(normalizedResult)) {
        normalizedResult = normalizedResult.replace(consecutiveSeparators, separator);
    }

    // Split by separator and filter out empty/whitespace-only parts
    const parts = normalizedResult.split(separator);
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
    const separatorOnlyRegex = new RegExp(`^[${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]*$`);
    return separatorOnlyRegex.test(result.trim());
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

    // Filter out empty/undefined values before joining
    const nonEmptyParts = parts.filter((part) => part && part.trim().length > 0);

    if (nonEmptyParts.length === 0) {
        return '';
    }

    const result = nonEmptyParts.join(separator);

    const cleanedResult = cleanSeparatorResult(result, separator);

    if (isSeparatorOnly(cleanedResult, separator)) {
        return '';
    }

    return cleanedResult;
}
