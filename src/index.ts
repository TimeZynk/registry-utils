import { cacheFactory } from './cacheFactory.js';
import { memoizedDataBuilderFactory } from './dataBuilderFactory.js';
import * as registryDefaultData from './registryDefaultData.js';
import { defaultRegisters } from './utils/defaultRegisters.js';
import { composeTitle, createTitleBuilder, getFormatter } from './titleBuilder/index.js';

export {
    cacheFactory,
    memoizedDataBuilderFactory as dataBuilderFactory,
    registryDefaultData,
    defaultRegisters,
    composeTitle,
    createTitleBuilder,
    getFormatter,
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
