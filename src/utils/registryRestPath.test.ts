import { describe, it, expect } from 'vitest';
import { registryRestPath } from './registryRestPath.js';
import { USERS_REG_ID, SHIFTS_REG_ID, REPORTS_REG_ID } from './defaultRegisters.js';

describe('registryRestPath', () => {
    it('maps USERS_REG_ID to /users', () => {
        expect(registryRestPath(USERS_REG_ID)).toBe('/users');
    });

    it('maps SHIFTS_REG_ID to /shifts', () => {
        expect(registryRestPath(SHIFTS_REG_ID)).toBe('/shifts');
    });

    it('maps REPORTS_REG_ID to /timereports', () => {
        expect(registryRestPath(REPORTS_REG_ID)).toBe('/timereports');
    });

    it('maps any other registry id to /registry-data', () => {
        expect(registryRestPath('5564a98431cd2f70ae1fc5d1')).toBe('/registry-data');
        expect(registryRestPath('some-custom-registry-id')).toBe('/registry-data');
    });
});
