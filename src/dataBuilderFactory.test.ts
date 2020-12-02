import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';

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
});

describe('mob', () => {
    let dataBuilder: DataBuilder;



    const fields = Immutable.Map<string, Immutable.Map<string, any>>(
        {
            SALARY_LIST_REF: Immutable.Map({
                id: 'SALARY_LIST_REF',
                'registry-id': 'USERS',
                'title': 'HOURLY_SALARY_REF',
                'field-type': 'registry-reference',
                'settings': Immutable.Map({
                    'registry-id': 'SALARY_LIST',
                })
            }),
            HOURLY_SALARY: Immutable.Map({
                id: 'HOURLY_SALARY',
                'registry-id': 'SALARY_LIST',
                'field-type': 'number',
                'field-section': 'generic',
            })
        },

    );
    const regData = Immutable.Map<string, Immutable.Map<string, any>>(
        {
            SALARY_LIST_1: Immutable.Map({
                id: 'SALARY_LIST_1',
                "registry-id": "SALARY_LIST",
                values: Immutable.Map({
                    HOURLY_SALARY: 1.1,
                }),
            }),
            SALARY_LIST_2: Immutable.Map({
                id: 'SALARY_LIST_2',
                "registry-id": "SALARY_LIST",
                values: Immutable.Map({
                    HOURLY_SALARY: 1.1,
                }),
            }),
            SALARY_LIST_3: Immutable.Map({
                id: 'SALARY_LIST_3',
                "registry-id": "SALARY_LIST",
                values: Immutable.Map({
                    HOURLY_SALARY: 1.1,
                }),
            }),
            SALARY_LIST_4: Immutable.Map({
                id: 'SALARY_LIST_4',
                "registry-id": "SALARY_LIST",
                values: Immutable.Map({
                    HOURLY_SALARY: 1.1,
                }),
            }),
        }
    );
    //const users = Immutable.Map() as Immutable.Map<string, Immutable.Map<string, any>>;
    const users = Immutable.Map({
        USER_1: Immutable.Map({
            id: 'USER_1',
            'registry-id': 'USERS',
            values: Immutable.Map({
                SALARY_LIST_REF: 'SALARY_LIST_1',
            })
        })
    })

    // TODO:
    // 1. don't need registry SALARY_LIST but we need reference to registry (we could just fake 'registry-id')
    // 2. reference should be in regData
    // 3. we need a user registry which will contain 'hourly-salary' should have a standart value
    // 4. get custom 'hourly-salary' value as result

    it('test', () => {
        dataBuilder = dataBuilderFactory(fields, regData, users);
        const refData = dataBuilder(Immutable.Map({
            id: 'REPORT_1',
            start: '',
            end: '',
            'registry-id': 'REPORTS',
            'user-id': 'USER_1'
        }));
        expect(refData?.get('HOURLY_SALARY')).toBeDefined();
    });
});
