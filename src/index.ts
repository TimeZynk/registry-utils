import { cacheFactory } from './cacheFactory.js';
import { memoizedDataBuilderFactory } from './dataBuilderFactory.js';
import * as registryDefaultData from './registryDefaultData.js';
import { defaultRegisters } from './defaultRegisters.js';
import { composeTitle, createTitleBuilder } from './titleBuilder.js';

export {
    cacheFactory,
    memoizedDataBuilderFactory as dataBuilderFactory,
    registryDefaultData,
    defaultRegisters,
    composeTitle,
    createTitleBuilder,
};

export type {
    FieldInstance,
    RefData,
    RefDataAccumulator,
    RegistryDataInstance,
    User,
    FieldValue,
    FieldValues,
    InvoiceArticle,
    SalaryArticle,
    DataBuilder,
} from './types.js';

export default memoizedDataBuilderFactory;
