var dataBuilderFactory = require('./dataBuilderFactory').memoizedDataBuilderFactory;
var registryDefaultData = require('./registryDefaultData');
var defaultRegisters = require('./defaultRegisters');

module.exports = {
    dataBuilderFactory: dataBuilderFactory,
    registryDefaultData: registryDefaultData,
    defaultRegisters: defaultRegisters,
    default: dataBuilderFactory,
};
