import { cacheFactory } from './cacheFactory';
import { memoizedDataBuilderFactory } from './dataBuilderFactory';
import * as registryDefaultData from './registryDefaultData';
import { defaultRegisters } from './defaultRegisters';

export { cacheFactory, memoizedDataBuilderFactory as dataBuilderFactory, registryDefaultData, defaultRegisters };

export default memoizedDataBuilderFactory;
