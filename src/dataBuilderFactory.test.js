var Immutable = require('immutable');
var dataBuilderFactory = require('./dataBuilderFactory');

describe('dataBuilderFactory', () => {
    var fields = Immutable.List([
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
            id: '5e96e3b3c37c4a58ef75dff8',
            'registry-id': '5e96e36fb0bef821551bcd58',
            'field-id': 'default-number',
            'field-type': 'number',
            'field-section': 'generic',
        }),
    ]);
    var regData = Immutable.Map({
        '5e96e38bb0bef821551bcd59': Immutable.Map({
            id: '5e96e38bb0bef821551bcd59',
            'registry-id': '5e96e36fb0bef821551bcd58',
            values: Immutable.Map({
                '5e96e3b3c37c4a58ef75dff8': 98,
            }),
        })
    });
    var users = Immutable.Map({

    });
    var dataBuilder;

    beforeEach(() => {
        dataBuilder = dataBuilderFactory(fields, regData, users);
    });

    it('Can resolve field references to same object', () => {
        var refData = dataBuilder(Immutable.Map({
            values: Immutable.Map({
                '5e96dfdf5c8220db1589d9f6': 42,
                '5e96e019758f29f06c8565e2': '5e96dfdf5c8220db1589d9f6',
            })
        }));
        expect(refData.get('5e96dfdf5c8220db1589d9f6')).toStrictEqual(42);
        expect(refData.get('5e96e019758f29f06c8565e2')).toStrictEqual(42);
    });

    it('Can resolve deep field references to same object', () => {
        var refData = dataBuilder(Immutable.Map({
            values: Immutable.Map({
                '5e96dfdf5c8220db1589d9f6': 42,
                '5e96e019758f29f06c8565e2': '5e96e3b3c37c4a58ef75dff8',
                '5e96e355b0bef821551bcd57': '5e96e38bb0bef821551bcd59',
            })
        }));
        expect(refData.get('5e96dfdf5c8220db1589d9f6')).toStrictEqual(42);
        expect(refData.get('5e96e019758f29f06c8565e2')).toStrictEqual(98);
    });
});
