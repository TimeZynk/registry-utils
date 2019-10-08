const dataBuilderFactory = require('./dataBuilderFactory');
const registryDefaultData = require('./registryDefaultData');
const defaultRegisters = require('./defaultRegisters');

module.exports = {
    dataBuilderFactory,
    registryDefaultData,
    defaultRegisters,
    default: dataBuilderFactory,
};
