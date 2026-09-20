import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IServiceCatalogRepository,
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceCompletenessStatus,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  ServiceStatus
} from '@manaratak/domain';
import { AdminServiceCatalogUseCases } from '../../src/services-platform/use-cases/AdminServiceCatalogUseCases';

describe('AdminServiceCatalogUseCases', () => {
  let repository: IServiceCatalogRepository;
  let useCases: AdminServiceCatalogUseCases;

  const completeService = {
    id: 'svc-1',
    publicId: 'svc_public',
    slug: 'visa-review',
    canonicalName: 'visa review',
    canonicalDedupKey: 'visa review|VISA_SERVICES|CONSULTATION|ONLINE',
    displayName: 'Visa Review',
    serviceCategory: ServiceCategory.VISA_SERVICES,
    fulfillmentType: ServiceFulfillmentType.CONSULTATION,
    serviceDescription: 'Review visa readiness.',
    serviceAvailabilityStatus: ServiceAvailabilityStatus.AVAILABLE,
    requiredInputsOrDocuments: ['Passport'],
    deliveryMode: ServiceDeliveryMode.ONLINE,
    responsibleServiceOwnerType: 'MANARATAK_TEAM',
    status: ServiceStatus.READY_TO_PUBLISH,
    completenessStatus: ServiceCompletenessStatus.COMPLETE,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  beforeEach(() => {
    repository = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'svc-1', createdAt: new Date(), updatedAt: new Date(), version: 1, ...data })),
      update: vi.fn(),
      findById: vi.fn().mockResolvedValue(completeService),
      findBySlug: vi.fn(),
      findByDedupKey: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn(),
      list: vi.fn(),
      listPublished: vi.fn()
    };
    useCases = new AdminServiceCatalogUseCases(repository, {
      resolveCountryReference: vi.fn(async (value: string) => ({ id: `country:${value}`, label: value })),
      resolveLanguageReference: vi.fn(async (value: string) => ({ id: `language:${value}`, label: value })),
    });
  });

  it('creates a complete service catalog item with generated identity fields', async () => {
    const result = await useCases.createService({
      displayName: 'Visa Review',
      serviceCategory: ServiceCategory.VISA_SERVICES,
      fulfillmentType: ServiceFulfillmentType.CONSULTATION,
      serviceDescription: 'Review visa readiness.',
      serviceAvailabilityStatus: ServiceAvailabilityStatus.AVAILABLE,
      requiredInputsOrDocuments: ['Passport'],
      deliveryMode: ServiceDeliveryMode.ONLINE,
      responsibleServiceOwnerType: 'MANARATAK_TEAM'
    });

    expect(result.slug).toMatch(/^visa-review-[0-9a-f]{8}$/);
    expect(result.completenessStatus).toBe(ServiceCompletenessStatus.COMPLETE);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      canonicalDedupKey: 'visa review|VISA_SERVICES|CONSULTATION|ONLINE'
    }));
  });


  it('preserves Arabic identity and keeps distinct Arabic service names distinct under identical dimensions', async () => {
    const first = await useCases.createService({
      displayName: 'خِدمةُ التأشيرات',
      serviceCategory: ServiceCategory.VISA_SERVICES,
      fulfillmentType: ServiceFulfillmentType.CONSULTATION,
      serviceDescription: 'خدمة تأشيرات.',
      serviceAvailabilityStatus: ServiceAvailabilityStatus.AVAILABLE,
      requiredInputsOrDocuments: ['Passport'],
      deliveryMode: ServiceDeliveryMode.ONLINE,
      responsibleServiceOwnerType: 'MANARATAK_TEAM'
    });
    const second = await useCases.createService({
      displayName: 'استشارات التأشيرات',
      serviceCategory: ServiceCategory.VISA_SERVICES,
      fulfillmentType: ServiceFulfillmentType.CONSULTATION,
      serviceDescription: 'استشارات تأشيرات.',
      serviceAvailabilityStatus: ServiceAvailabilityStatus.AVAILABLE,
      requiredInputsOrDocuments: ['Passport'],
      deliveryMode: ServiceDeliveryMode.ONLINE,
      responsibleServiceOwnerType: 'MANARATAK_TEAM'
    });

    expect(first.canonicalName).toBe('خدمة التاشيرات');
    expect(first.slug).toMatch(/^خدمة-التاشيرات-[0-9a-f]{8}$/u);
    expect(second.canonicalName).toBe('استشارات التاشيرات');
    expect(first.canonicalDedupKey).not.toBe(second.canonicalDedupKey);
  });

  it('recomputes Unicode canonical identity on Arabic display-name update', async () => {
    vi.mocked(repository.update).mockImplementation(async (_id, data) => ({ ...completeService, ...data }));
    const result = await useCases.updateService('svc-1', { displayName: 'إدارةُ التأشيرات' }, 1);
    expect(result.canonicalName).toBe('ادارة التاشيرات');
    expect(result.canonicalDedupKey).toContain('ادارة التاشيرات|');
  });

  it('prevents publishing unless the service is ready to publish', async () => {
    vi.mocked(repository.findById).mockResolvedValueOnce({
      ...completeService,
      status: ServiceStatus.READY_TO_REVIEW
    });

    await expect(useCases.publish('svc-1', 1)).rejects.toThrow('READY_TO_PUBLISH');
  });
});
