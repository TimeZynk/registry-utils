import Immutable from 'immutable';

export type FieldInstance = Immutable.Map<string, any>;
export type RefData = Immutable.Map<string, any>;
export type RefDataAccumulator = Immutable.Map<string, any>;
export type RegistryDataInstance = Immutable.Map<string, any>;
export type User = RegistryDataInstance;
export type FieldValue = any;
export type FieldValues = Immutable.Map<string, FieldValue>;
export type InvoiceArticle = Immutable.Map<string, any>;
export type SalaryArticle = Immutable.Map<string, any>;

export interface DataBuilder {
    (item: RegistryDataInstance, notCahced?: boolean): RefData | null;
}
