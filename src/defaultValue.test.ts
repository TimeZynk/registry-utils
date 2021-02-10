import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';
import { defaultRegisters } from './defaultRegisters';

describe('Custom value', () => {
    afterEach(() => {
        stopCache();
    });

    let dataBuilder: DataBuilder;
    type FieldId = string;
    type Field = Immutable.Map<string, any>;
    type FieldIndex = Immutable.Map<FieldId, Field>;
    type RegDataId = string;
    type RegData = Immutable.Map<string, any>;
    type RegDataIndex = Immutable.Map<RegDataId, RegData>;
    it('should use default value, if no value was passed', () => {
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
                values: {},
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
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.1);
    });
});
