import Immutable from 'immutable';
import { stopCache } from './cacheFactory';
import { dataBuilderFactory, DataBuilder } from './dataBuilderFactory';

describe('mob', () => {

    afterEach(() => {
        stopCache();
    });

    //TODO:
    // Use type aliases
    // Use Immutable.fromJS
    //

    // Notes:
    // -  don't need registry SALARY_LIST but we need reference to registry (we could just fake 'registry-id')
    // -  reference should be in regData
    // -  we need a user registry which will contain 'hourly-salary' should have a standart value
    // -  get custom 'hourly-salary' value as result
    // - salary list ref should have a default value to fail the test
    // - the different salary list items need distinct values for salary


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
        expect(refData?.get('HOURLY_SALARY')).toEqual(1.1);
    });
});
