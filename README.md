![npm](https://img.shields.io/npm/v/timezynk-registry-utils?style=for-the-badge)

# Timezynk Registry Utils

A utility library for building reference data from registry structures in Timezynk.

## Features

- **Data Builder Factory**: Creates functions that build reference data from registry items
- **Field Reference Resolution**: Automatically resolves field references across registry structures
- **Dynamic Title Composition**: Compose dynamic titles from multiple registry fields with custom separators
- **Caching**: Built-in caching for performance optimization
- **Memoization Support**: Export memoized builder factory for performance optimization

## Installation

```bash
npm install timezynk-registry-utils
```

## Basic Usage

```typescript
import { dataBuilderFactory, memoizedDataBuilderFactory } from 'timezynk-registry-utils';

// Basic usage
const refDataBuilder = dataBuilderFactory(fieldInstances, registryData, users);
const refData = refDataBuilder(shift);

// With memoization (recommended for performance)
const refDataBuilder = memoizedDataBuilderFactory(fieldInstances, registryData, users);
const refData = refDataBuilder(shift);
```

## Dynamic Title Composition

The library supports dynamic title composition that can combine multiple registry fields into a single title string. This is particularly useful for creating searchable, human-readable titles from complex registry data.

**Note**: Dynamic title composition is only applied to shift registry items (items that have a `booked-users` field). This ensures that time reports and other registry types preserve their original titles.

### Enhanced Features

This implementation is based on the original utility but includes several improvements:

- **Registry Reference Support**: Automatically resolves `formatId: "registry-reference"` by looking up titles from the `path` property
- **Separator-Only Detection**: Prevents malformed titles like `", , "` by returning empty string when composition results in separator-only strings
- **Performance Optimization**: Uses memoization to avoid recreating title builders unnecessarily
- **Graceful Fallbacks**: Handles missing registry references gracefully without breaking title composition
- **Original Behavior Preservation**: Maintains the original utility's behavior where field-based composition takes precedence over path-based fallbacks

### Supported Title Composition Methods

This library handles the following title composition scenarios:

1. **Field-Based Composition**: Combines values from specific registry fields using a custom separator
2. **Path-Based Composition**: Uses registry reference paths to build hierarchical titles (fallback only when no fields configured)
3. **Separator-Only Detection**: Returns empty string when composition results in separator-only strings (no fallback to path)

### Additional Title Composition Use Cases

The following title composition scenarios are handled separately in the main application (`tzcontrol`) and are not processed by this library:

#### 1. Shift Title from Order (`shiftTitleFromOrder`)

Creates titles from order form fields and supplier information:

```typescript
if (item.status === 'order-outgoing') {
    title = shiftTitleFromOrder(item, form, supplier);
}
```

#### 2. Shift Title from RFQ (`shiftTitleFromRFQ`)

Creates titles from RFQ (Request for Quote) relations:

```typescript
if (item.getIn?.(['relations', 'incoming-rfq-id'])) {
    title = shiftTitleFromRFQ(item);
}
```

**Important**: These additional title composition methods are intentionally kept separate from this library to:

- Prevent additional Redux store dependencies
- Avoid increasing registry utility complexity
- Keep UI-specific title logic in the main application
- Maintain clear separation of concerns

These methods are used for UI display purposes only and should not be expected to be processed in the `refData` object.

### Configuration Structure

The dynamic title settings follow this structure:

```typescript
{
    "id": "553e2f1f3029e0478fc757f2/dynamic-title", // registry-id/dynamic-title
    "value": {
        "separator": " » ", // Custom separator between field values
        "fields": [
            {
                "formatId": "standard", // Standard field formatter
                "id": "title-6894be7bca96a32dabf1fd96" // Field ID to include
            },
            {
                "formatId": "registry-reference", // Registry reference formatter
                "id": "6894be8a6d3f9a793f88a958" // Field ID that references another registry
            }
        ]
    }
}
```

#### Field Format Types

- **`standard`**: Uses the field value directly or applies a custom formatter if defined
- **`registry-reference`**: Looks up the title from the referenced registry item in the `path` property
- **Custom formatters**: Can be defined in the registry fields using the `formatter` property

### Basic Title Composition

```typescript
import { dataBuilderFactory } from 'timezynk-registry-utils';
import { defaultRegisters } from 'timezynk-registry-utils';

// Define your fields
const fields = Immutable.Map({
    FIELD_A: Immutable.Map({
        id: 'FIELD_A',
        'field-id': 'field-a',
        'field-type': 'text',
        'field-section': 'generic',
    }),
    FIELD_B: Immutable.Map({
        id: 'FIELD_B',
        'field-id': 'field-b',
        'field-type': 'text',
        'field-section': 'generic',
    }),
});

// Configure title composition settings
const dynamicTitleSetting = Immutable.fromJS({
    id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
    value: {
        separator: ' - ',
        fields: [{ id: 'FIELD_A' }, { id: 'FIELD_B' }],
    },
});

// Create data builder with title composition enabled
const dataBuilder = dataBuilderFactory(fields, registryData, users, undefined, undefined, dynamicTitleSetting);

// Use the data builder
const refData = dataBuilder(
    Immutable.Map({
        id: 'ITEM1',
        'registry-id': 'SHIFTS',
        values: Immutable.Map({
            FIELD_A: 'Value A',
            FIELD_B: 'Value B',
        }),
    })
);

// Result: refData.get('title') === "Value A - Value B"
```

### Registry Reference Title Composition

When a field in your dynamic title settings has `formatId: "registry-reference"`, the system will automatically look up the title from the referenced registry item in the `path` property:

````typescript
const dynamicTitleSetting = Immutable.fromJS({
    id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
    value: {
        separator: ' » ',
        fields: [
            {
                formatId: 'registry-reference',
                id: '68b710c6bda6d25184246fd9', // Field that references another registry
            },
        ],
    },
});

// This will compose the title using the referenced registry's title from the path
// Result: "Referenced Registry Title" instead of just the registry ID

**Note**: If the referenced registry item is not found in the `path`, the system falls back to using the raw field value (e.g., the registry ID) to ensure the title composition doesn't fail.

### Path-Based Title Composition (Fallback)

When no specific fields are configured or when fields list is empty, the system falls back to path-based title composition:

```typescript
const settings = Immutable.fromJS({
    id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
    value: {
        separator: ' | ',
        fields: [], // Empty fields list triggers path-based composition
    },
});

// This will use the path data (registry references) or fall back to the item's title
// Result: "Parent Registry Title | Child Registry Title"
````

### Manual Title Composition

You can also use the title composition functions directly:

```typescript
import { composeTitle, createTitleBuilder } from 'timezynk-registry-utils';

// Compose title from existing refData
const composedTitle = composeTitle(refData, undefined, settings, registryFields);

// Create a reusable title builder
const titleBuilder = createTitleBuilder(settings, registryFields);
const title = titleBuilder(refData);
```

**Note**: `composeTitle` is the main entry point that handles both field-based and path-based title composition automatically based on your settings configuration.

**Important**: In most cases, you should get the title directly from `refData.get('title')` rather than calling `composeTitle` manually. The `dataBuilderFactory` automatically applies title composition when building refData, so React components and other consumers should simply use the pre-computed title from the refData object.

### Behavior When Field-Based Composition Fails

When field-based composition is configured but fails (e.g., all fields are empty or result in separator-only strings):

- **Returns empty string `''`** instead of falling back to path-based composition
- **No fallback to original title** - the empty string is used as-is
- **Maintains original utility behavior** where field-based composition takes precedence

This ensures that when you configure specific fields for title composition, the system respects your configuration and doesn't unexpectedly fall back to path-based or original titles.

## Integration with Redux Store

For applications using Redux, you can create a connected data builder:

```typescript
import { defaultMemoize } from 'reselect';
import { dataBuilderFactory } from 'timezynk-registry-utils';
import store from 'state/store';
import { getAllRegistryFields, getRegistryData, getAllUsers, getCompanySetting } from 'state/selectors';
import { defaultRegisters } from 'timezynk-registry-utils';

const SHIFT_TITLE_SETTING_ID = `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`;

// Memoized builder factory
const getDataBuilder = defaultMemoize(dataBuilderFactory);

interface RefDataBuilderOptions {
    dynamicTitle?: boolean;
}

export function createConnectedRefDataBuilder(options: RefDataBuilderOptions = {}) {
    return function (item) {
        const state = store.getState();
        const registryFields = getAllRegistryFields(state);
        const registryData = getRegistryData(state);
        const users = getAllUsers(state);

        if (options.dynamicTitle) {
            const titleSettings = getCompanySetting(state, SHIFT_TITLE_SETTING_ID);

            return getDataBuilder(registryFields, registryData, users, undefined, undefined, titleSettings)(item);
        }

        return getDataBuilder(registryFields, registryData, users)(item);
    };
}

// Export for direct usage
export { getDataBuilder };

// Usage
const refDataBuilder = createConnectedRefDataBuilder({ dynamicTitle: true });
const refData = refDataBuilder(item);
```

## API Reference

### dataBuilderFactory

Creates a function that builds reference data from registry items.

```typescript
function dataBuilderFactory(
    regFields: Immutable.Map<string, FieldInstance> | undefined,
    regData: Immutable.Map<string, RegistryDataInstance>,
    users: Immutable.Map<string, User>,
    invoiceArticles?: Immutable.Map<string, InvoiceArticle>,
    salaryArticles?: Immutable.Map<string, SalaryArticle>,
    dynamicTitleSetting?: Immutable.Map<string, any> | any
): DataBuilder;
```

**Parameters:**

- `regFields`: Registry field definitions
- `regData`: Registry data instances
- `users`: User data
- `invoiceArticles`: Optional invoice articles data
- `salaryArticles`: Optional salary articles data
- `dynamicTitleSetting`: Optional dynamic title composition settings

### memoizedDataBuilderFactory

A memoized version of `dataBuilderFactory` for performance optimization.

```typescript
const memoizedDataBuilderFactory = defaultMemoize(dataBuilderFactory);
```

### composeTitle

Composes a title from reference data using configured settings.

```typescript
function composeTitle(
    data: RefData,
    removeId?: string,
    settings?: Immutable.Map<string, any> | any,
    regFields?: Immutable.Map<string, FieldInstance>
): string | null;
```

**Parameters:**

- `data`: The reference data object
- `removeId`: Optional registry ID to exclude from path-based composition
- `settings`: Dynamic title composition settings
- `regFields`: Registry field definitions for formatter support

### createTitleBuilder

Creates a reusable title builder function from settings.

```typescript
function createTitleBuilder(
    settings: Immutable.Map<string, any> | any,
    regFields: Immutable.Map<string, FieldInstance>
): (refData: RefData, removeId?: string) => string | null;
```

## Best Practices

### Using Titles in React Components

**✅ Recommended**: Get title from refData

```tsx
const MyComponent = ({ item }) => {
    const refData = dataBuilder(item);
    const title = refData.get('title'); // Pre-computed by dataBuilderFactory

    return <div>{title}</div>;
};
```

**❌ Not recommended**: Manual title composition

```tsx
const MyComponent = ({ item, settings, regFields }) => {
    const refData = dataBuilder(item);
    // Don't do this - title is already computed in refData
    const title = composeTitle(refData, undefined, settings, regFields);

    return <div>{title}</div>;
};
```

The `dataBuilderFactory` automatically handles title composition during refData creation, so consumers should use the pre-computed `title` field rather than calling title composition functions directly.

## How Path Works

The `path` property in `refData` contains a hierarchical trail of registry references:

```typescript
// Example path structure
{
  "path": [
    {
      "title": "Parent Registry Item",
      "id": "parent-id",
      "registry-id": "parent-registry-id"
    },
    {
      "title": "Child Registry Item",
      "id": "child-id",
      "registry-id": "child-registry-id"
    }
  ],
  "title-parent-registry-id": "Parent Registry Item",
  "title-child-registry-id": "Child Registry Item"
}
```

- **`path`**: Contains registry references (items that reference other registry items)
- **`title-{registry-id}`**: Created for each registry reference to store the referenced item's title
- **Direct field values**: Appear at the root level for regular fields

## Configuration

### Title Composition Settings

The title composition is configured through settings with the key pattern: `${registryId}/dynamic-title`

```typescript
{
    separator: string,           // Separator between field values (default: ', ')
    fields: Immutable.List([     // List of fields to compose
        { id: 'FIELD_ID' },      // Field ID to include
        { id: 'FIELD_ID', formatId: 'FORMATTER_ID' } // With optional formatter
    ])
}
```

**Fallback Behavior**:

- **Fields configured**: Uses field-based composition exclusively, no path fallback
- **No fields configured**: Falls back to path-based composition
- **No settings**: No title composition applied

### Field Formatters

Formatters can be defined in the registry fields themselves using the `formatter` property:

```typescript
const fieldWithFormatter = Immutable.Map({
    id: 'FIELD_ID',
    'field-id': 'field-name',
    'field-type': 'text',
    formatter: (value) => `Formatted: ${value}`, // Custom formatter function
});
```

## Examples

See the test files for comprehensive examples of how to use the library:

- `src/dataBuilderFactory.test.ts` - Core functionality tests
- `src/defaultValue.test.ts` - Default value handling
- `src/salary.test.ts` - Salary-specific functionality

## Migration from Legacy dataBuilder

If you're migrating from the legacy `dataBuilder` pattern:

```typescript
// Legacy pattern (deprecated)
import { makeDataBuilder } from 'state/selectors';
import { setDataBuilder } from '@timezynk/tzstores';
import store from 'state/store';

let currentBuilder;
export default function dataBuilder(item) {
    return currentBuilder?.(item);
}

// New pattern (recommended)
import { createConnectedRefDataBuilder } from './your-new-file';

const refDataBuilder = createConnectedRefDataBuilder({ dynamicTitle: true });
const refData = refDataBuilder(item);
```
