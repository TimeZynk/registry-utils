import Immutable from 'immutable';

export interface TitleField {
    id: string;
    formatId?: string;
}

export interface TitleSetting {
    separator: string;
    fields: Immutable.List<TitleField>;
}
