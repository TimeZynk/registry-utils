export interface Translations {
    [key: string]: string | undefined;
}

declare global {
    const t: Translations;
    const TIMEZYNK_REST: string;
}

export {};
