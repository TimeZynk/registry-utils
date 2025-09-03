import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';
import { defaultRegisters } from './utils/defaultRegisters';

describe('dataBuilderFactory', () => {
    afterEach(() => {
        stopCache();
    });

    const fields = Immutable.Map({
        GENERIC_FIELD_REF: Immutable.Map({
            id: 'GENERIC_FIELD_REF',
            'field-id': 'field-reference-numeric',
            'field-type': 'field-reference',
            'field-section': 'generic',
        }),
        GENERIC_NUMBER_FIELD: Immutable.Map({
            id: 'GENERIC_NUMBER_FIELD',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        PRICELIST_REF: Immutable.Map({
            id: 'PRICELIST_REF',
            'field-id': 'registry-PRICELIST',
            'field-type': 'registry-reference',
            'field-section': 'registers',
        }),
        TASK_REF: Immutable.Map({
            id: 'TASK_REF',
            'field-id': 'registry-TASKS',
            'field-type': 'registry-reference',
            'field-section': 'registers',
        }),
        HOURLY_PRICE: Immutable.Map({
            id: 'HOURLY_PRICE',
            'registry-id': 'PRICELIST',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        TASK_PRICE_FIELD: Immutable.Map({
            id: 'TASK_PRICE_FIELD',
            'registry-id': 'TASKS',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        TASK_PRICELIST_FIELD_REF: Immutable.Map({
            id: 'TASK_PRICELIST_FIELD_REF',
            'registry-id': 'TASKS',
            'field-id': 'field-reference-numeric',
            'field-type': 'field-reference',
            'field-section': 'generic',
        }),
        TASK_INVOICE_ART_REF: Immutable.Map({
            id: 'TASK_INVOICE_ART_REF',
            'registry-id': 'TASKS',
            'field-id': 'invoice-article-reference',
            'field-type': 'article-reference',
            'field-section': 'generic',
        }),
        TASK_SALARY_ART_REF: Immutable.Map({
            id: 'TASK_SALARY_ART_REF',
            'registry-id': 'TASKS',
            'field-id': 'salary-article-reference',
            'field-type': 'article-reference',
            'field-section': 'generic',
            settings: Immutable.Map({
                'article-type': 'salary',
            }),
        }),
        PROJECT_CUSTOMER_REF: Immutable.Map({
            id: 'PROJECT_CUSTOMER_REF',
            'registry-id': 'PROJECTS',
            'field-id': 'registry-CUSTOMERS',
            'field-type': 'registry-reference',
            'field-section': 'registers',
            values: Immutable.Map({
                'default-val': 'CUSTOMER_1',
            }),
        }),
        PROJECTS_PRICELIST_REF: Immutable.Map({
            id: 'PROJECTS_PRICELIST_REF',
            'registry-id': 'PROJECTS',
            'field-id': 'registry-PRICELIST',
            'field-type': 'registry-reference',
            'field-section': 'registers',
        }),
        PROJECTS_ARCHIVED_TASK_REF: Immutable.Map({
            id: 'PROJECTS_ARCHIVED_TASK_REF',
            'field-id': 'registry-TASKS',
            'field-type': 'registry-reference',
            'field-section': 'registers',
            'registry-id': 'PROJECTS',
            archived: 1591964092000,
            values: Immutable.Map({
                'default-val': 'TASK_2',
            }),
        }),
        CUSTOMER_PRICELIST_FIELD_REF: Immutable.Map({
            id: 'CUSTOMER_PRICELIST_FIELD_REF',
            'registry-id': 'CUSTOMERS',
            'field-id': 'field-reference-numeric',
            'field-type': 'field-reference',
            'field-section': 'generic',
        }),
        TIMEREPORT_STARTEND: Immutable.Map({
            'field-id': 'start-end',
            'field-type': 'start-end',
            id: 'report-startend',
            vid: 'static',
            'registry-id': 'REPORTS',
            title: 'Start and end time',
            weight: 1,
            isStatic: true,
        }),
        TIMEREPORT_BREAKS: Immutable.Map({
            'field-id': 'breaks',
            'field-type': 'breaks',
            id: 'report-breaks',
            vid: 'static',
            'registry-id': 'REPORTS',
            title: 'Breaks',
            weight: 2,
            isStatic: true,
        }),
    });

    const users = Immutable.Map<string, Immutable.Map<string, any>>({
        USER1: Immutable.Map({
            id: 'USER1',
            name: 'User 1',
            values: Immutable.Map({
                TASK_REF: 'TASK_1',
            }),
        }),
    });

    describe('field-references', () => {
        const regData = Immutable.Map({
            PRICELIST_1: Immutable.Map({
                id: 'PRICELIST_1',
                'registry-id': 'PRICELIST',
                values: Immutable.Map({
                    HOURLY_PRICE: 98,
                }),
            }),
            TASK_1: Immutable.Map({
                id: 'TASK_1',
                'registry-id': 'TASKS',
                values: Immutable.Map({
                    TASK_PRICE_FIELD: 105,
                    TASK_PRICELIST_FIELD_REF: 'HOURLY_PRICE',
                }),
            }),
            TASK_2: Immutable.Map({
                id: 'TASK_2',
                'registry-id': 'TASKS',
                values: Immutable.Map({
                    TASK_PRICE_FIELD: 49,
                }),
            }),
            CUSTOMER_1: Immutable.Map({
                id: 'CUSTOMER_1',
                title: 'Customer 001',
                'registry-id': 'CUSTOMERS',
                values: Immutable.Map({
                    CUSTOMER_PRICELIST_FIELD_REF: 'HOURLY_PRICE',
                }),
            }),
        });

        let dataBuilder: DataBuilder;
        beforeEach(() => {
            dataBuilder = dataBuilderFactory(fields, regData, users);
        });

        it('Can resolve field references to same object', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    values: Immutable.Map({
                        GENERIC_NUMBER_FIELD: 42,
                        GENERIC_FIELD_REF: 'GENERIC_NUMBER_FIELD',
                    }),
                })
            );
            expect(refData?.get('GENERIC_NUMBER_FIELD')).toStrictEqual(42);
            expect(refData?.get('GENERIC_FIELD_REF')).toStrictEqual(42);
        });

        it('Can resolve deep field references to same object', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    values: Immutable.Map({
                        GENERIC_NUMBER_FIELD: 42,
                        GENERIC_FIELD_REF: 'HOURLY_PRICE',
                        PRICELIST_REF: 'PRICELIST_1',
                    }),
                })
            );
            expect(refData?.get('GENERIC_NUMBER_FIELD')).toStrictEqual(42);
            expect(refData?.get('GENERIC_FIELD_REF')).toStrictEqual(98);
        });

        it('Can resolve field references from siblings', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    values: Immutable.Map({
                        PRICELIST_REF: 'PRICELIST_1',
                        TASK_REF: 'TASK_1',
                    }),
                })
            );
            expect(refData?.get('TASK_PRICELIST_FIELD_REF')).toStrictEqual(98);
            expect(refData?.get('HOURLY_PRICE')).toStrictEqual(98);
        });

        it('Can fallback to field references from user', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    values: Immutable.Map({
                        PRICELIST_REF: 'PRICELIST_1',
                    }),
                    'user-id': 'USER1',
                })
            );
            expect(refData?.get('TASK_PRICELIST_FIELD_REF')).toStrictEqual(98);
        });

        it('Unresolved field reference falls back to undefined', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    values: Immutable.Map({
                        PRICELIST_REF: null,
                    }),
                    'user-id': 'USER1',
                })
            );
            expect(refData?.get('TASK_PRICELIST_FIELD_REF')).toBeUndefined();
        });

        it('Resolves field references from default registers', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    'registry-id': 'PROJECTS',
                    values: Immutable.Map({
                        PROJECTS_PRICELIST_REF: 'PRICELIST_1',
                    }),
                })
            );
            expect(refData?.get('CUSTOMER_PRICELIST_FIELD_REF')).toStrictEqual(98);
        });

        it('Skips default values from archived fields', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    'registry-id': 'PROJECTS',
                    values: Immutable.Map({}),
                })
            );
            expect(refData?.get('path').toJS()).toEqual([
                { id: 'CUSTOMER_1', title: 'Customer 001', 'registry-id': 'CUSTOMERS' },
            ]);
            expect(refData?.get('PROJECTS_ARCHIVED_TASK_REF')).toBeUndefined();
        });
    });

    describe('article-references', () => {
        const invoiceArticles = Immutable.Map({
            '5ea192366645aa73da2f59b9': Immutable.Map({
                id: '5ea192366645aa73da2f59b9',
                sku: '001',
                title: 'Worked time',
            }),
        });
        const salaryArticles = Immutable.Map({
            '5ea2ecee3743cd6ce0257314': Immutable.Map({
                id: '5ea2ecee3743cd6ce0257314',
                code: 'ARB',
                title: 'Scheduled time',
            }),
        });
        const regData = Immutable.Map<string, Immutable.Map<string, any>>();
        let dataBuilder: DataBuilder;
        beforeEach(() => {
            dataBuilder = dataBuilderFactory(fields, regData, users, invoiceArticles, salaryArticles);
        });

        it('can resolve SKU of article', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: '5ea192066645aa73da2f59b8',
                    'registry-id': 'TASKS',
                    values: Immutable.Map({
                        TASK_INVOICE_ART_REF: '5ea192366645aa73da2f59b9',
                    }),
                })
            );
            expect(refData?.getIn(['generic', 'invoice-article-reference'])).toEqual('5ea192366645aa73da2f59b9');
            expect(refData?.get('TASK_INVOICE_ART_REF')).toStrictEqual('5ea192366645aa73da2f59b9');
            expect(refData?.getIn(['articles', 'invoice', 'id'])).toStrictEqual('5ea192366645aa73da2f59b9');
            expect(refData?.getIn(['articles', 'invoice', 'sku'])).toStrictEqual('001');
        });

        it('sets field to zero if article is unresolved', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: '5ea198236645aa73da2f59ba',
                    'registry-id': 'TASKS',
                    values: Immutable.Map({
                        TASK_INVOICE_ART_REF: '555555555555555555555555',
                    }),
                })
            );
            expect(refData?.get('TASK_INVOICE_ART_REF')).toStrictEqual('555555555555555555555555');
            expect(refData?.getIn(['articles', 'invoice', 'sku'])).toBeUndefined();
        });

        it('can resolve code of salary article', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: '5ea192066645aa73da2f59b9',
                    'registry-id': 'TASKS',
                    values: Immutable.Map({
                        TASK_SALARY_ART_REF: '5ea2ecee3743cd6ce0257314',
                    }),
                })
            );
            expect(refData?.getIn(['generic', 'salary-article-reference'])).toEqual('5ea2ecee3743cd6ce0257314');
            expect(refData?.getIn(['TASK_SALARY_ART_REF'])).toStrictEqual('5ea2ecee3743cd6ce0257314');
            expect(refData?.getIn(['articles', 'invoice', 'sku'])).toBeUndefined();
            expect(refData?.getIn(['articles', 'salary', 'id'])).toStrictEqual('5ea2ecee3743cd6ce0257314');
            expect(refData?.getIn(['articles', 'salary', 'code'])).toStrictEqual('ARB');
        });

        it('no cross-wise resolving', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: '5ea192066645aa73da2f59b9',
                    'registry-id': 'TASKS',
                    values: Immutable.Map({
                        TASK_SALARY_ART_REF: '5ea192366645aa73da2f59b9',
                    }),
                })
            );
            expect(refData?.getIn(['generic', 'salary-article-reference'])).toEqual('5ea192366645aa73da2f59b9');
            expect(refData?.getIn(['TASK_SALARY_ART_REF'])).toEqual('5ea192366645aa73da2f59b9');
            expect(refData?.getIn(['articles', 'invoice', 'sku'])).toBeUndefined();
            expect(refData?.getIn(['articles', 'salary', 'code'])).toBeUndefined();
        });

        it('preserves start/end fields', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: 'REPORT1',
                    'registry-id': 'REPORTS',
                    start: '2020-08-24T08:00:00.000',
                    end: '2020-08-24T13:21:00.000',
                    breaks: [{ start: '2020-08-24T10:00:00.000', end: '2020-08-24T10:15:00.000' }],
                    values: Immutable.Map(),
                })
            );
            expect(refData?.get('start-end').size).toEqual(2);
            expect(refData?.getIn(['start-end', 0])).toEqual('2020-08-24T08:00:00.000');
            expect(refData?.getIn(['start-end', 1])).toEqual('2020-08-24T13:21:00.000');
        });

        it('preserves breaks fields', () => {
            const refData = dataBuilder(
                Immutable.Map({
                    id: 'REPORT1',
                    'registry-id': 'REPORTS',
                    start: '2020-08-24T08:00:00.000',
                    end: '2020-08-24T13:21:00.000',
                    breaks: Immutable.List([
                        Immutable.Map({ start: '2020-08-24T10:00:00.000', end: '2020-08-24T10:15:00.000' }),
                    ]),
                    values: Immutable.Map(),
                })
            );
            expect(refData?.get('breaks').size).toEqual(1);
            expect(refData?.getIn(['breaks', 0, 'start'])).toEqual('2020-08-24T10:00:00.000');
            expect(refData?.getIn(['breaks', 0, 'end'])).toEqual('2020-08-24T10:15:00.000');
        });
    });

    describe('title-composition', () => {
        const regData = Immutable.Map({
            PRICELIST_1: Immutable.Map({
                id: 'PRICELIST_1',
                'registry-id': 'PRICELIST',
                values: Immutable.Map({
                    HOURLY_PRICE: 98,
                }),
            }),
            TASK_1: Immutable.Map({
                id: 'TASK_1',
                'registry-id': 'TASKS',
                values: Immutable.Map({
                    TASK_PRICE_FIELD: 105,
                    TASK_PRICELIST_FIELD_REF: 'HOURLY_PRICE',
                }),
            }),
            TASK_2: Immutable.Map({
                id: 'TASK_2',
                'registry-id': 'TASKS',
                values: Immutable.Map({
                    TASK_PRICE_FIELD: 49,
                }),
            }),
            CUSTOMER_1: Immutable.Map({
                id: 'CUSTOMER_1',
                title: 'Customer 001',
                'registry-id': 'CUSTOMERS',
                values: Immutable.Map({
                    CUSTOMER_PRICELIST_FIELD_REF: 'HOURLY_PRICE',
                }),
            }),
        });

        it('does not compose title when dynamic is not configured', () => {
            const staticTitleFields = Immutable.Map({
                TITLE_FIELD: Immutable.Map({
                    id: 'TITLE_FIELD',
                    'field-id': 'title',
                    'field-type': 'text',
                    'field-section': 'generic',
                    // No dynamic settings
                }),
                FIELD_A: Immutable.Map({
                    id: 'FIELD_A',
                    'field-id': 'field-a',
                    'field-type': 'text',
                    'field-section': 'generic',
                }),
            });

            const staticTitleDataBuilder = dataBuilderFactory(staticTitleFields, regData, users);

            const refData = staticTitleDataBuilder(
                Immutable.Map({
                    id: 'ITEM1',
                    'registry-id': 'TEST',
                    title: 'Static Title',
                    values: Immutable.Map({
                        FIELD_A: 'Value A',
                    }),
                })
            );

            // Should use the static title from the item
            expect(refData?.get('title')).toEqual('Static Title');
        });

        it('applies title composition when enabled with settings', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
                value: {
                    separator: ' - ',
                    fields: [{ id: 'FIELD_A' }, { id: 'FIELD_B' }],
                },
            });

            const regFields = Immutable.Map({
                FIELD_A: Immutable.Map({
                    'field-id': 'field-a',
                    id: 'FIELD_A',
                    'field-type': 'string',
                    weight: 1,
                }),
                FIELD_B: Immutable.Map({
                    'field-id': 'field-b',
                    id: 'FIELD_B',
                    'field-type': 'string',
                    weight: 2,
                }),
            });

            const item = Immutable.Map({
                id: 'test-item',
                'registry-id': 'SHIFTS',
                title: 'Original Title',
                'booked-users': Immutable.List(['user1']), // Add booked-users for shift item
                values: Immutable.Map({
                    FIELD_A: 'Value A',
                    FIELD_B: 'Value B',
                }),
            });

            const refDataBuilder = dataBuilderFactory(
                regFields,
                Immutable.Map(),
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );
            const refData = refDataBuilder(item);

            expect(refData?.get('title')).toEqual('Value A - Value B');
        });

        it('uses path-based title when no fields configured', () => {
            const dynamicTitleSetting = Immutable.Map({
                [`${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`]: Immutable.Map({
                    separator: ' | ',
                    fields: Immutable.List(), // Empty fields list
                }),
            });

            const dataBuilder = dataBuilderFactory(
                Immutable.Map(),
                regData,
                users,
                undefined,
                undefined,
                dynamicTitleSetting
            );

            const refData = dataBuilder(
                Immutable.Map({
                    id: 'ITEM1',
                    'registry-id': 'SHIFTS',
                    title: 'Shift Title',
                    values: Immutable.Map({}),
                })
            );

            // Should use the path-based title (which would be the item's title)
            expect(refData?.get('title')).toEqual('Shift Title');
        });

        it('composes dynamic title with user data structure', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: '553e2f1f3029e0478fc757f2/dynamic-title',
                value: {
                    separator: ', ',
                    fields: [
                        {
                            formatId: 'standard',
                            id: 'title-6894be7bca96a32dabf1fd96',
                        },
                        {
                            formatId: 'standard',
                            id: '6894be8a6d3f9a793f88a958',
                        },
                        {
                            formatId: 'standard',
                            id: '6894be826d3f9a793f88a957',
                        },
                    ],
                },
            });

            const item = Immutable.Map({
                id: 'test-item',
                'registry-id': 'test-registry',
                title: 'Original Title',
                'booked-users': Immutable.List(['user1']), // Add booked-users for shift item
                values: Immutable.Map({
                    'title-6894be7bca96a32dabf1fd96': 'Boobatea',
                    '6894be8a6d3f9a793f88a958': '19-20',
                    '6894be826d3f9a793f88a957': 'BT',
                }),
            });

            const regFields = Immutable.Map({
                'title-6894be7bca96a32dabf1fd96': Immutable.Map({
                    'field-id': 'custom-title',
                    id: 'title-6894be7bca96a32dabf1fd96',
                    'field-type': 'string',
                    weight: 1,
                }),
                '6894be8a6d3f9a793f88a958': Immutable.Map({
                    'field-id': 'default-string',
                    id: '6894be8a6d3f9a793f88a958',
                    'field-type': 'string',
                    weight: 2,
                }),
                '6894be826d3f9a793f88a957': Immutable.Map({
                    'field-id': 'default-string',
                    id: '6894be826d3f9a793f88a957',
                    'field-type': 'string',
                    weight: 3,
                }),
            });

            const refDataBuilder = dataBuilderFactory(
                regFields,
                Immutable.Map(),
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );
            const refData = refDataBuilder(item);

            expect(refData?.get('title')).toBe('Boobatea, 19-20, BT');
        });

        it('only applies dynamic title composition to shift items with booked-users', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
                value: {
                    separator: ', ',
                    fields: [{ id: 'FIELD_A' }, { id: 'FIELD_B' }],
                },
            });

            const regFields = Immutable.Map({
                FIELD_A: Immutable.Map({
                    'field-id': 'field-a',
                    id: 'FIELD_A',
                    'field-type': 'string',
                    weight: 1,
                }),
                FIELD_B: Immutable.Map({
                    'field-id': 'field-b',
                    id: 'FIELD_B',
                    'field-type': 'string',
                    weight: 2,
                }),
            });

            // Shift item with booked-users (should apply dynamic title)
            const shiftItem = Immutable.Map({
                id: 'shift-item',
                'registry-id': 'SHIFTS',
                title: 'Original Shift Title',
                'booked-users': Immutable.List(['user1', 'user2']),
                values: Immutable.Map({
                    FIELD_A: 'Value A',
                    FIELD_B: 'Value B',
                }),
            });

            // Time report item without booked-users (should not apply dynamic title)
            const timeReportItem = Immutable.Map({
                id: 'report-item',
                'registry-id': 'REPORTS',
                title: 'Original Report Title',
                values: Immutable.Map({
                    FIELD_A: 'Value A',
                    FIELD_B: 'Value B',
                }),
            });

            const dataBuilder = dataBuilderFactory(
                regFields,
                Immutable.Map(),
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );

            // Test shift item - should have dynamic title
            const shiftRefData = dataBuilder(shiftItem);
            expect(shiftRefData?.get('title')).toBe('Value A, Value B');

            // Test time report item - should preserve original title
            const reportRefData = dataBuilder(timeReportItem);
            expect(reportRefData?.get('title')).toBe('Original Report Title');
        });

        it('uses separator from settings in fallback path-based composition', () => {
            // Settings with custom separator but no fields (triggers path-based fallback)
            const dynamicTitleSetting = Immutable.fromJS({
                id: `${defaultRegisters.SHIFTS_REG_ID}/dynamic-title`,
                value: {
                    separator: ' | ',
                    fields: [], // Empty fields triggers path-based composition
                },
            });

            const regFields = Immutable.Map({
                'registry-ref': Immutable.Map({
                    'field-id': 'registry-ref',
                    id: 'registry-ref',
                    'field-type': 'registry-reference',
                    weight: 1,
                }),
            });

            const registryData = Immutable.Map({
                'ref-item-1': Immutable.Map({
                    id: 'ref-item-1',
                    'registry-id': 'REF_REGISTRY',
                    title: 'First Item',
                }),
                'ref-item-2': Immutable.Map({
                    id: 'ref-item-2',
                    'registry-id': 'REF_REGISTRY',
                    title: 'Second Item',
                }),
            });

            // Shift item that will reference other items (creating a path)
            const shiftItem = Immutable.Map({
                id: 'shift-item',
                'registry-id': 'SHIFTS',
                title: 'Original Shift Title',
                'booked-users': Immutable.List(['user1']),
                values: Immutable.Map({
                    'registry-ref': 'ref-item-1',
                }),
            });

            const dataBuilder = dataBuilderFactory(
                regFields,
                registryData,
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );

            const refData = dataBuilder(shiftItem);

            // Should use custom separator ' | ' instead of default ', '
            expect(refData?.get('title')).toBe('First Item');
        });

        it('returns empty string when dynamic title composition results in separator-only title', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: '553e2f1f3029e0478fc757f2/dynamic-title',
                value: {
                    separator: ', ',
                    fields: [{ id: 'MISSING_FIELD_1' }, { id: 'MISSING_FIELD_2' }, { id: 'MISSING_FIELD_3' }],
                },
            });
            const regFields = Immutable.Map({
                MISSING_FIELD_1: Immutable.Map({ 'field-type': 'string' }),
                MISSING_FIELD_2: Immutable.Map({ 'field-type': 'string' }),
                MISSING_FIELD_3: Immutable.Map({ 'field-type': 'string' }),
            });
            const item = Immutable.Map({
                'booked-users': Immutable.List(['user1']),
                title: 'Original Shift Title',
            });
            const dataBuilder = dataBuilderFactory(
                regFields,
                Immutable.Map(),
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );
            const refData = dataBuilder(item);
            // Should return empty string when composition results in separator-only (matches original utility behavior)
            expect(refData?.get('title')).toBe('');
        });

        it('handles registry-reference formatId by looking up titles from path', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: '553e2f1f3029e0478fc757f2/dynamic-title',
                value: {
                    separator: ' » ',
                    fields: [
                        {
                            formatId: 'registry-reference',
                            id: '68b710c6bda6d25184246fd9',
                        },
                    ],
                },
            });

            const regFields = Immutable.Map({
                '68b710c6bda6d25184246fd9': Immutable.Map({
                    'field-id': 'registry-ref',
                    id: '68b710c6bda6d25184246fd9',
                    'field-type': 'registry-reference',
                    weight: 1,
                }),
            });

            // Create registry data for the referenced item
            const registryData = Immutable.Map({
                'ref-item-1': Immutable.Map({
                    id: 'ref-item-1',
                    'registry-id': 'REF_REGISTRY',
                    title: 'Referenced Registry Title',
                }),
            });

            // Shift item with registry reference
            const shiftItem = Immutable.Map({
                id: 'shift-item',
                'registry-id': 'SHIFTS',
                title: 'Original Shift Title',
                'booked-users': Immutable.List(['user1']),
                values: Immutable.Map({
                    '68b710c6bda6d25184246fd9': 'ref-item-1',
                }),
            });

            const dataBuilder = dataBuilderFactory(
                regFields,
                registryData,
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );

            const refData = dataBuilder(shiftItem);

            // Should use the title from the referenced registry item in the path
            expect(refData?.get('title')).toBe('Referenced Registry Title');
        });

        it('falls back to raw value when registry-reference is not found in path', () => {
            const dynamicTitleSetting = Immutable.fromJS({
                id: '553e2f1f3029e0478fc757f2/dynamic-title',
                value: {
                    separator: ' » ',
                    fields: [
                        {
                            formatId: 'registry-reference',
                            id: '68b710c6bda6d25184246fd9',
                        },
                    ],
                },
            });

            const regFields = Immutable.Map({
                '68b710c6bda6d25184246fd9': Immutable.Map({
                    'field-id': 'registry-ref',
                    id: '68b710c6bda6d25184246fd9',
                    'field-type': 'registry-reference',
                    weight: 1,
                }),
            });

            // Shift item with registry reference that doesn't exist in path
            const shiftItem = Immutable.Map({
                id: 'shift-item',
                'registry-id': 'SHIFTS',
                title: 'Original Shift Title',
                'booked-users': Immutable.List(['user1']),
                values: Immutable.Map({
                    '68b710c6bda6d25184246fd9': 'non-existent-ref',
                }),
            });

            const dataBuilder = dataBuilderFactory(
                regFields,
                Immutable.Map(), // Empty registry data - no path will be created
                Immutable.Map(),
                undefined,
                undefined,
                dynamicTitleSetting
            );

            const refData = dataBuilder(shiftItem);

            // Should fall back to the raw value when registry reference not found in path
            expect(refData?.get('title')).toBe('non-existent-ref');
        });
    });
});
