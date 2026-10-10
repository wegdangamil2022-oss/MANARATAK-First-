import { describe, it, expect, vi } from 'vitest';
import type { IReferenceDataRepository } from '@manaratak/domain';
import { ReferenceDataUseCases } from '../../src';

describe('P7 canonical active relationship resolution', () => {
  it('rejects an ACTIVE-lifecycle but disabled country as city parent', async () => {
    const upsertCity = vi.fn();
    const owner = {
      getCountry: vi.fn().mockResolvedValue({ id: 'country-ye', iso2Code: 'YE',
        lifecycleState: 'ACTIVE', isActive: false }),
      upsertCity,
    } as unknown as IReferenceDataRepository;
    const useCases = new ReferenceDataUseCases(owner);
    await expect(useCases.upsertCity({ countryIso2Code: 'YE', name: 'Taiz' }))
      .rejects.toMatchObject({ reference: 'YE' });
    expect(upsertCity).not.toHaveBeenCalled();
  });

  it('does not return an inactive compatibility-flag currency from direct lookup', async () => {
    const useCases = new ReferenceDataUseCases({
      getCurrency: vi.fn().mockResolvedValue({ id: 'sar', isoCode: 'SAR',
        lifecycleState: 'ACTIVE', isActive: false }),
    } as unknown as IReferenceDataRepository);
    await expect(useCases.getCurrency('SAR')).rejects.toMatchObject({ reference: 'SAR' });
  });
});
