import { describe, expect, it } from 'vitest';
import { ReferenceDataValidationService } from '../../src/reference-data/services/ReferenceDataValidationService';

const service = new ReferenceDataValidationService();
const city = { countryIso2Code: 'SA', name: 'Riyadh' };
describe('P7 runtime IANA canonical city validation', () => {
  it('accepts a known canonical city timezone', () => {
    expect(service.validateCity({ ...city, timezone: 'Asia/Riyadh' }).issues.some(i => i.code === 'NON_CANONICAL_IANA_TIMEZONE')).toBe(false);
  });
  it('rejects arbitrary identifiers and offset strings', () => {
    for (const timezone of ['Moon/Base', '+03:00', 'Not/AZone']) {
      expect(service.validateCity({ ...city, timezone }).issues.some(i => i.code === 'NON_CANONICAL_IANA_TIMEZONE')).toBe(true);
    }
  });
});
