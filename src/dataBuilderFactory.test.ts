var Immutable = require('immutable');
var dataBuilderFactory = require('./dataBuilderFactory').dataBuilderFactory;

describe('dataBuilderFactory', () => {
    const fields = Immutable.List([
        Immutable.Map({
            id: '5e96e019758f29f06c8565e2',
            'field-id': 'field-reference-numeric',
            'field-type': 'field-reference',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5e96dfdf5c8220db1589d9f6',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5e96e355b0bef821551bcd57',
            'field-id': 'registry-5e96e36fb0bef821551bcd58',
            'field-type': 'registry-reference',
            'field-section': 'registers',
        }),
        Immutable.Map({
            id: '5e96f46794237e07620f914d',
            'field-id': 'registry-5e96f47994237e07620f914e',
            'field-type': 'registry-reference',
            'field-section': 'registers',
        }),
        Immutable.Map({
            id: '5e96e3b3c37c4a58ef75dff8',
            'registry-id': '5e96e36fb0bef821551bcd58',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5e96f4a594237e07620f9150',
            'registry-id': '5e96f47994237e07620f914e',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5e96f4d994237e07620f9151',
            'registry-id': '5e96f47994237e07620f914e',
            'field-id': 'field-reference-numeric',
            'field-type': 'field-reference',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5ea14bad6645aa73da2f59b7',
            'registry-id': '5e96f47994237e07620f914e',
            'field-id': 'invoice-article-reference',
            'field-type': 'article-reference',
            'field-section': 'generic',
        }),
        Immutable.Map({
            id: '5ea2ed39c9d26a4c5cfeb921',
            'registry-id': '5e96f47994237e07620f914e',
            'field-id': 'salary-article-reference',
            'field-type': 'article-reference',
            'field-section': 'generic',
            settings: Immutable.Map({
                'article-type': 'salary',
            }),
        }),
    ]);

    const users = Immutable.Map({});

    describe('field-references', () => {
        const regData = Immutable.Map({
            '5e96e38bb0bef821551bcd59': Immutable.Map({
                id: '5e96e38bb0bef821551bcd59',
                'registry-id': '5e96e36fb0bef821551bcd58',
                values: Immutable.Map({
                    '5e96e3b3c37c4a58ef75dff8': 98,
                }),
            }),
            '5e96f48b94237e07620f914f': Immutable.Map({
                id: '5e96f48b94237e07620f914f',
                'registry-id': '5e96f47994237e07620f914e',
                values: Immutable.Map({
                    '5e96f4a594237e07620f9150': 105,
                    '5e96f4d994237e07620f9151': '5e96e3b3c37c4a58ef75dff8',
                }),
            }),
        });

        let dataBuilder;
        beforeEach(() => {
            dataBuilder = dataBuilderFactory(fields, regData, users);
        });

        it('Can resolve field references to same object', () => {
            const refData = dataBuilder(Immutable.Map({
                    values: Immutable.Map({
                        '5e96dfdf5c8220db1589d9f6': 42,
                        '5e96e019758f29f06c8565e2': '5e96dfdf5c8220db1589d9f6',
                    }),
                }));
            expect(refData.get('5e96dfdf5c8220db1589d9f6')).toStrictEqual(42);
            expect(refData.get('5e96e019758f29f06c8565e2')).toStrictEqual(42);
        });

        it('Can resolve deep field references to same object', () => {
            const refData = dataBuilder(Immutable.Map({
                    values: Immutable.Map({
                        '5e96dfdf5c8220db1589d9f6': 42,
                        '5e96e019758f29f06c8565e2': '5e96e3b3c37c4a58ef75dff8',
                        '5e96e355b0bef821551bcd57': '5e96e38bb0bef821551bcd59',
                    }),
                }));
            expect(refData.get('5e96dfdf5c8220db1589d9f6')).toStrictEqual(42);
            expect(refData.get('5e96e019758f29f06c8565e2')).toStrictEqual(98);
        });

        it('Can resolve field references from siblings', () => {
            const refData = dataBuilder(Immutable.Map({
                    values: Immutable.Map({
                        '5e96e355b0bef821551bcd57': '5e96e38bb0bef821551bcd59',
                        '5e96f46794237e07620f914d': '5e96f48b94237e07620f914f',
                    }),
                }));
            expect(refData.get('5e96f4d994237e07620f9151')).toStrictEqual(98);
            expect(refData.get('5e96e3b3c37c4a58ef75dff8')).toStrictEqual(98);
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
        const regData = Immutable.Map({});
        let dataBuilder;
        beforeEach(() => {
            dataBuilder = dataBuilderFactory(fields, regData, users, invoiceArticles, salaryArticles);
        });

        it('can resolve SKU of article', () => {
            const refData = dataBuilder(
                Immutable.Map({
                id: '5ea192066645aa73da2f59b8',
                'registry-id': '5e96f47994237e07620f914e',
                values: Immutable.Map({
                    '5ea14bad6645aa73da2f59b7': '5ea192366645aa73da2f59b9',
                }),
            })
            );
            expect(refData.getIn(['generic', 'invoice-article-reference'])).toEqual('5ea192366645aa73da2f59b9');
            expect(refData.getIn(['5ea14bad6645aa73da2f59b7', 'sku'])).toStrictEqual('001');
        });

        it('sets field to zero if article is unresolved', () => {
            const refData = dataBuilder(
                Immutable.Map({
                id: '5ea198236645aa73da2f59ba',
                'registry-id': '5e96f47994237e07620f914e',
                values: Immutable.Map({
                    '5ea14bad6645aa73da2f59b7': '555555555555555555555555',
                }),
            })
            );
            expect(refData.get('5ea14bad6645aa73da2f59b7')).toBeNull();
        });

        it('can resolve code of salary article', () => {
            const refData = dataBuilder(
                Immutable.Map({
                id: '5ea192066645aa73da2f59b9',
                'registry-id': '5e96f47994237e07620f914e',
                values: Immutable.Map({
                    '5ea2ed39c9d26a4c5cfeb921': '5ea2ecee3743cd6ce0257314',
                }),
            })
            );
            expect(refData.getIn(['generic', 'salary-article-reference'])).toEqual('5ea2ecee3743cd6ce0257314');
            expect(refData.getIn(['5ea2ed39c9d26a4c5cfeb921', 'code'])).toStrictEqual('ARB');
        });

        it('no cross-wise resolving', () => {
            const refData = dataBuilder(
                Immutable.Map({
                id: '5ea192066645aa73da2f59b9',
                'registry-id': '5e96f47994237e07620f914e',
                values: Immutable.Map({
                    '5ea2ed39c9d26a4c5cfeb921': '5ea192366645aa73da2f59b9',
                }),
            })
            );
            expect(refData.getIn(['generic', 'salary-article-reference'])).toEqual('5ea192366645aa73da2f59b9');
            expect(refData.getIn(['5ea2ed39c9d26a4c5cfeb921'])).toBeNull();
        });
    });
});
