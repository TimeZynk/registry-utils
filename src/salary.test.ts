import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';

describe('Multiple salary lists for users', () => {
    afterEach(() => {
        stopCache();
    });

    //TODO:
    // Use type aliases
    // Use Immutable.fromJS

    // Notes:
    // -  don't need registry SALARY_LIST but we need reference to registry (we could just fake 'registry-id')
    // -  reference should be in regData
    // -  we need a user registry which will contain 'hourly-salary' should have a standart value
    // -  get custom 'hourly-salary' value as result
    // - salary list ref should have a default value to fail the test
    // - the different salary list items need distinct values for salary

    let dataBuilder: DataBuilder;
    type FieldId = string;
    type Field = Immutable.Map<string, any>;
    type FieldIndex = Immutable.Map<FieldId, Field>;
    type RegDataId = string;
    type RegData = Immutable.Map<string, any>;
    type RegDataIndex = Immutable.Map<RegDataId, RegData>;

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
                'default-val': 'SALARY_LIST_1',
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
        SALARY_LIST_1: {
            id: 'SALARY_LIST_1',
            'registry-id': 'SALARY_LIST',
            values: {
                HOURLY_SALARY: 1.1,
            },
        },
        SALARY_LIST_2: {
            id: 'SALARY_LIST_2',
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
                SALARY_LIST_REF: 'SALARY_LIST_2',
            },
        },
    });

    it('refData should have a proper referenced value without overriden set value by default-val', () => {
        dataBuilder = dataBuilderFactory(fields, regData, users);
        const timeReport: RegData = Immutable.Map({
            id: 'REPORT_1',
            start: '',
            end: '',
            'registry-id': 'REPORTS',
            'user-id': 'USER_1',
        });
        const refData = dataBuilder(timeReport);
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.2);
    });
});
