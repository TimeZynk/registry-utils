import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';
import { defaultRegisters } from './defaultRegisters';

describe('Custom value', () => {
    afterEach(() => {
        stopCache();
    });

    // Notes:
    // -  don't need registry SALARY_LIST but we need reference to registry (we could just fake 'registry-id')
    // -  reference should be in regData
    // -  we need a user registry which will contain 'hourly-salary'
    // -  get custom 'hourly-salary' value as result
    // - salary list ref should have a default value
    // - the different salary list items need distinct values for salary

    // Things to try to find the bug:
    // - Debug the test that pass in the debugger
    // - Debug the actual code from the ui
    // - More complex test date — copy from browser?
    // - memoized
    // - global state - cache
    // - call functions twice
    // - write a test for tzcontrol
    // - write other tests for inspiration
    // - weight order of the field

    let dataBuilder: DataBuilder;
    type FieldId = string;
    type Field = Immutable.Map<string, any>;
    type FieldIndex = Immutable.Map<FieldId, Field>;
    type RegDataId = string;
    type RegData = Immutable.Map<string, any>;
    type RegDataIndex = Immutable.Map<RegDataId, RegData>;

    it('should override default value', () => {
        const fields: FieldIndex = Immutable.fromJS({
            SALARY_LIST_REF: {
                id: 'SALARY_LIST_REF',
                'registry-id': 'USERS',
                title: 'HOURLY_SALARY_REF',
                'field-type': 'registry-reference',
                settings: {
                    'registry-id': 'SALARY_LIST',
                },
                values: {
                    'default-val': 'SALARY_LIST_DEFAULT',
                },
            },
            HOURLY_SALARY: {
                id: 'HOURLY_SALARY',
                'registry-id': 'SALARY_LIST',
                'field-type': 'number',
                'field-section': 'generic',
            },
        });
        const regData: RegDataIndex = Immutable.fromJS({
            SALARY_LIST_DEFAULT: {
                id: 'SALARY_LIST_DEFAULT',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.1,
                },
            },
            SALARY_LIST_CUSTOM: {
                id: 'SALARY_LIST_CUSTOM',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.2,
                },
            },
        });

        const users: RegDataIndex = Immutable.fromJS({
            USER_1: {
                id: 'USER_1',
                'registry-id': 'USERS',
                values: {
                    SALARY_LIST_REF: 'SALARY_LIST_CUSTOM',
                },
            },
        });

        dataBuilder = dataBuilderFactory(fields, regData, users);
        const timeReport: RegData = Immutable.Map({
            id: 'REPORT_1',
            start: '',
            end: '',
            'registry-id': defaultRegisters.REPORTS_REG_ID,
            'user-id': 'USER_1',
        });
        const refData = dataBuilder(timeReport);
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.2);
    });

    it('should override default value even when input has blank registry-id', () => {
        const fields: FieldIndex = Immutable.fromJS({
            SALARY_LIST_REF: {
                id: 'SALARY_LIST_REF',
                'registry-id': 'USERS',
                title: 'HOURLY_SALARY_REF',
                'field-type': 'registry-reference',
                settings: {
                    'registry-id': 'SALARY_LIST',
                },
                values: {
                    'default-val': 'SALARY_LIST_DEFAULT',
                },
            },
            HOURLY_SALARY: {
                id: 'HOURLY_SALARY',
                'registry-id': 'SALARY_LIST',
                'field-type': 'number',
                'field-section': 'generic',
            },
        });
        const regData: RegDataIndex = Immutable.fromJS({
            SALARY_LIST_DEFAULT: {
                id: 'SALARY_LIST_DEFAULT',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.1,
                },
            },
            SALARY_LIST_CUSTOM: {
                id: 'SALARY_LIST_CUSTOM',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.2,
                },
            },
        });

        const users: RegDataIndex = Immutable.fromJS({
            USER_1: {
                id: 'USER_1',
                'registry-id': 'USERS',
                values: {
                    SALARY_LIST_REF: 'SALARY_LIST_CUSTOM',
                },
            },
        });

        dataBuilder = dataBuilderFactory(fields, regData, users);
        const timeReport: RegData = Immutable.Map({
            id: 'REPORT_1',
            start: '',
            end: '',
            'user-id': 'USER_1',
            // Time reports are not real registry data instances, but rather
            // a more specialized data type that needs to interpret fields
            // from both reports and shifts. It is therefore missing the
            // registry-id attribute.
        });
        const refData = dataBuilder(timeReport);
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.2);
    });

    it('should override default value even when passing on the report', () => {
        const fields: FieldIndex = Immutable.fromJS({
            SALARY_LIST_REF: {
                id: 'SALARY_LIST_REF',
                'registry-id': 'USERS',
                title: 'HOURLY_SALARY_REF',
                'field-type': 'registry-reference',
                settings: {
                    'registry-id': 'SALARY_LIST',
                },
                values: {
                    'default-val': 'SALARY_LIST_DEFAULT',
                },
            },
            TIMEREPORT_REF: {
                id: 'TIMEREPORT_REF',
                'registry-id': defaultRegisters.REPORTS_REG_ID,
                title: 'HOURLY_SALARY_REF',
                'field-type': 'registry-reference',
                settings: {
                    'registry-id': 'SALARY_LIST',
                },
                values: {
                    'default-val': 'SALARY_LIST_DEFAULT',
                },
            },
            HOURLY_SALARY: {
                id: 'HOURLY_SALARY',
                'registry-id': 'SALARY_LIST',
                'field-type': 'number',
                'field-section': 'generic',
            },
        });
        const regData: RegDataIndex = Immutable.fromJS({
            SALARY_LIST_DEFAULT: {
                id: 'SALARY_LIST_DEFAULT',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.1,
                },
            },
            SALARY_LIST_CUSTOM: {
                id: 'SALARY_LIST_CUSTOM',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.2,
                },
            },
            SALARY_LIST_CUSTOM2: {
                id: 'SALARY_LIST_CUSTOM2',
                'registry-id': 'SALARY_LIST',
                values: {
                    HOURLY_SALARY: 1.3,
                },
            },
        });

        const users: RegDataIndex = Immutable.fromJS({
            USER_1: {
                id: 'USER_1',
                'registry-id': 'USERS',
                values: {
                    SALARY_LIST_REF: 'SALARY_LIST_CUSTOM',
                },
            },
        });

        dataBuilder = dataBuilderFactory(fields, regData, users);
        const timeReport: RegData = Immutable.Map({
            id: 'REPORT_1',
            start: '',
            end: '',
            'user-id': 'USER_1',
            values: Immutable.fromJS({
                TIMEREPORT_REF: 'SALARY_LIST_CUSTOM2',
            }),
            'registry-id': defaultRegisters.REPORTS_REG_ID,
            // Time reports are not real registry data instances, but rather
            // a more specialized data type that needs to interpret fields
            // from both reports and shifts. It is therefore missing the
            // registry-id attribute.
        });
        const refData = dataBuilder(timeReport);
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.3);
    });
});
