import isNull from 'lodash-es/isNull.js';
import isUndefined from 'lodash-es/isUndefined.js';
import find from 'lodash-es/find.js';
import dateFormat from 'dateformat-light';
import { parseISODateTime } from 'tzdateutils';

import countries from '../utils/countries.js';

function get(v, k) {
    if (isNull(v) || isUndefined(v)) {
        return null;
    }
    if (v.get) {
        return v.get(k);
    }
    return v[k];
}

const formatters = {
    address(value) {
        const countryCode = get(value, 'country');
        const country = find(countries, (c) => c.id === countryCode);
        const countryTitle = country ? country.title : countryCode;
        const address1 = get(value, 'address1');
        const address2 = get(value, 'address2');
        const zip = get(value, 'zip');
        const city = get(value, 'city');
        let s = '';

        if (!address1 && !address2 && !city && !zip && !countryTitle) {
            return s;
        }

        s += address1;
        if (address2) {
            s += ', ' + address2;
        }
        if (city || zip) {
            s += ', ' + (zip || '') + (zip && ' ') + (city || '');
        }
        if (countryTitle) {
            s += ', ' + countryTitle;
        }

        return s;
    },

    addressAddress1(value) {
        return (get(value, 'address1') || '').trim().toUpperCase() || null;
    },

    addressAddress2(value) {
        return (get(value, 'address2') || '').trim().toUpperCase() || null;
    },

    addressCity(value) {
        return (get(value, 'city') || '').trim().toUpperCase() || null;
    },

    addressZip(value) {
        return (get(value, 'zip') || '').trim() || null;
    },

    addressCountry(value) {
        return (get(value, 'country') || '').trim().toUpperCase() || null;
    },

    breaks(breaks) {
        if (!breaks || breaks.size === 0) {
            return;
        }
        const formatted = breaks.map((b) => {
            const s = parseISODateTime(b.get('start') || new Date());
            const e = parseISODateTime(b.get('end') || new Date());
            return dateFormat(s, 'HH:MM') + '-' + dateFormat(e, 'HH:MM');
        });
        return formatted.join(', ');
    },

    'start-end'(val) {
        const start = get(val, 0) || new Date();
        const end = get(val, 1) || new Date();
        return dateFormat(start, t.dateTimeFormat || 'yyyy-mm-dd HH:MM') + ', ' + dateFormat(end, 'HH:MM');
    },

    color(value) {
        return value ? String(value).trim().toLowerCase() : '5bc0de';
    },

    boolean(value) {
        if (isNull(value) || isUndefined(value)) {
            return '';
        } else if (value) {
            return t.Yes || 'Yes';
        } else {
            return t.No || 'No';
        }
    },

    standard(value) {
        if (isNull(value) || isUndefined(value)) {
            return '';
        }
        return String(value).trim();
    },
};

export function getFormatter(id: string) {
    id = id || 'standard';
    return formatters[id] || formatters.standard;
}
