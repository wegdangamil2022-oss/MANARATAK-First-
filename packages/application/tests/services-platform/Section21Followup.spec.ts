import { describe, expect, it, vi } from 'vitest';
import { AdminServiceCatalogUseCases } from '../../src/services-platform/use-cases/AdminServiceCatalogUseCases';
import { ServiceOperationsUseCases } from '../../src/services-platform/use-cases/ServiceOperationsUseCases';
const references = () => ({
  resolveCountryReference: vi.fn().mockResolvedValue({ id: 'canonical-country' }),
  resolveLanguageReference: vi.fn().mockResolvedValue({ id: 'canonical-language' }),
});
describe('Section 21 canonical catalog filters', () => {
  it('resolves country/language through the owner and preserves composed filters/page', async () => {
    const refs = references();
    const repository = { list: vi.fn().mockResolvedValue({ data: [], total: 0 }) };
    await new AdminServiceCatalogUseCases(repository as never, refs).listServices({
      supportedCountryReferenceId: 'merged-country',
      supportedLanguageReferenceId: 'alias',
      page: 2,
      serviceCategory: 'STUDENT_SERVICES' as never,
    });
    expect(repository.list).toHaveBeenCalledWith({
      supportedCountryReferenceId: 'canonical-country',
      supportedLanguageReferenceId: 'canonical-language',
      page: 2,
      serviceCategory: 'STUDENT_SERVICES',
    });
    expect(refs.resolveCountryReference).toHaveBeenCalledWith('merged-country');
  });
  it('does not broaden a filter if the reference owner denies it', async () => {
    const refs = references();
    refs.resolveCountryReference.mockRejectedValue(
      new Error('SERVICE_COUNTRY_REFERENCE_NOT_ACTIVE'),
    );
    const repository = { list: vi.fn() };
    await expect(
      new AdminServiceCatalogUseCases(repository as never, refs).listServices({
        supportedCountryReferenceId: 'archived',
      }),
    ).rejects.toThrow('NOT_ACTIVE');
    expect(repository.list).not.toHaveBeenCalled();
  });
});
describe('Section 21 operational time windows', () => {
  for (const end of [false, true]) {
    it(`rejects invalid pricing ${end ? 'end' : 'start'} before a write`, async () => {
      const operations = { createPricing: vi.fn() };
      const catalog = { findById: vi.fn().mockResolvedValue({ id: 'service' }) };
      const uc = new ServiceOperationsUseCases(catalog as never, operations as never);
      await expect(
        uc.createPricing({
          serviceId: 'service',
          currencyCode: 'USD',
          scale: 2,
          amountMinorUnits: '100',
          effectiveFrom: end ? new Date() : new Date(NaN),
          effectiveTo: end ? new Date(NaN) : null,
        }),
      ).rejects.toThrow('SERVICE_PRICING_EFFECTIVE_WINDOW_INVALID');
      expect(operations.createPricing).not.toHaveBeenCalled();
    });
    it(`rejects invalid discount ${end ? 'end' : 'start'} before a write`, async () => {
      const operations = { createDiscount: vi.fn() };
      const catalog = { findById: vi.fn().mockResolvedValue({ id: 'service' }) };
      const uc = new ServiceOperationsUseCases(catalog as never, operations as never);
      await expect(
        uc.createDiscount({
          serviceId: 'service',
          discountType: 'PERCENTAGE' as never,
          percentageBasisPoints: 100,
          activeFrom: end ? new Date() : new Date(NaN),
          activeTo: end ? new Date(NaN) : null,
        }),
      ).rejects.toThrow('SERVICE_DISCOUNT_WINDOW_INVALID');
      expect(operations.createDiscount).not.toHaveBeenCalled();
    });
    it(`rejects invalid promotion ${end ? 'end' : 'start'} before a write`, async () => {
      const operations = {
        createPromotion: vi.fn(),
        findDiscountById: vi.fn().mockResolvedValue({ id: 'discount', serviceId: 'service' }),
      };
      const catalog = { findById: vi.fn().mockResolvedValue({ id: 'service' }) };
      const uc = new ServiceOperationsUseCases(catalog as never, operations as never);
      await expect(
        uc.createPromotion({
          serviceId: 'service',
          name: 'Promotion',
          discountId: 'discount',
          activeFrom: end ? new Date() : new Date(NaN),
          activeTo: end ? new Date(NaN) : null,
        }),
      ).rejects.toThrow('SERVICE_PROMOTION_WINDOW_INVALID');
      expect(operations.createPromotion).not.toHaveBeenCalled();
    });
    it(`rejects invalid slot ${end ? 'end' : 'start'} before a write`, async () => {
      const operations = {
        createAvailabilitySlot: vi.fn(),
        findProviderById: vi
          .fn()
          .mockResolvedValue({
            id: 'provider',
            status: 'QUALIFIED',
            qualificationMetadata: {
              assetId: 'proof',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              reviewEvidence: { subjectProviderId: 'provider', authorityReviewed: true },
            },
            supportedServiceIds: ['service'],
            timezone: 'UTC',
            capacity: 1,
          }),
      };
      const catalog = { findById: vi.fn().mockResolvedValue({ id: 'service' }) };
      const uc = new ServiceOperationsUseCases(catalog as never, operations as never);
      await expect(
        uc.createAvailabilitySlot({
          serviceId: 'service',
          providerId: 'provider',
          timezone: 'UTC',
          startsAt: end ? new Date() : new Date(NaN),
          endsAt: end ? new Date(NaN) : new Date(Date.now() + 10000),
        }),
      ).rejects.toThrow('SERVICE_SLOT_WINDOW_INVALID');
      expect(operations.createAvailabilitySlot).not.toHaveBeenCalled();
    });
  }
});
