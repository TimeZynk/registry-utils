import { USERS_REG_ID, SHIFTS_REG_ID, REPORTS_REG_ID } from './defaultRegisters.js';

export function registryRestPath(registryId: string): string {
    switch (registryId) {
        case USERS_REG_ID:
            return '/users';
        case SHIFTS_REG_ID:
            return '/shifts';
        case REPORTS_REG_ID:
            return '/timereports';
        default:
            return '/registry-data';
    }
}
