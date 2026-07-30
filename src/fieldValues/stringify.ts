import { getFieldValueFormatter } from './fields.js';

// Matches the shape of the single real consumer (utils/registers/components/address.jsx,
// stringify.address(value)). registry-reference has no resolver here since nothing calls it
// today — callers that need it should call getFieldValueFormatter('registry-reference', resolver)
// directly instead.
const stringify = {
    address: getFieldValueFormatter('address'),
    breaks: getFieldValueFormatter('breaks'),
    'registry-reference': getFieldValueFormatter('registry-reference'),
    'start-end': getFieldValueFormatter('start-end'),
    boolean: getFieldValueFormatter('boolean'),
    default: getFieldValueFormatter('standard'),
};

export default stringify;
