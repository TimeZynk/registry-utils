import { cacheFactory } from './cacheFactory';
import { memoizedDataBuilderFactory } from './dataBuilderFactory';
import * as registryDefaultData from './registryDefaultData';
import { defaultRegisters } from './defaultRegisters';
import { titlesFromPath, createTitleBuilder } from './titleBuilder';

export {
    cacheFactory,
    memoizedDataBuilderFactory as dataBuilderFactory,
    registryDefaultData,
    defaultRegisters,
    titlesFromPath,
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
} from './types';

export default memoizedDataBuilderFactory;
