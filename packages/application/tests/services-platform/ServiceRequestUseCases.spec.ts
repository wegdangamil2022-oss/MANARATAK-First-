import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IServiceCatalogRepository,
  IServiceFinanceGateway,
  IServiceRequestRepository,
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceCompletenessStatus,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  ServiceRequestStatus,
  ServiceStatus,
} from '@manaratak/domain';
import {
  AdminServiceFulfillmentUseCases,
  StudentServiceRequestUseCases,
} from '../../src/services-platform/use-cases/ServiceRequestUseCases';

const service = {
  id: 'svc-1',
  publicId: 'svc_public',
  slug: 'visa-review-12345678',
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
  status: ServiceStatus.PUBLISHED,
  completenessStatus: ServiceCompletenessStatus.COMPLETE,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

const request = {
  id: 'req-1',
  publicId: 'svc_req_public',
  studentReferenceId: 'student-1',
  serviceId: 'svc-1',
  status: ServiceRequestStatus.REQUESTED,
  requestParameters: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

describe('Phase 20 service request ownership and finance handoff', () => {
  let catalog: IServiceCatalogRepository;
  let requests: IServiceRequestRepository;
  let finance: IServiceFinanceGateway;

  beforeEach(() => {
    catalog = {
      create: vi.fn(), update: vi.fn(), findById: vi.fn().mockResolvedValue(service),
      findBySlug: vi.fn(), findByDedupKey: vi.fn(), updateStatus: vi.fn(), list: vi.fn(), listPublished: vi.fn(),
    };
    requests = {
      createRequest: vi.fn().mockImplementation(async (data) => ({ ...request, ...data })),
      findRequestById: vi.fn().mockResolvedValue(request),
      findRequestByPublicId: vi.fn(),
      listRequests: vi.fn(),
      updateRequestStatus: vi.fn(),
      linkFinanceInvoice: vi.fn().mockImplementation(async (_id, financeInvoiceId, financeInvoicePublicId) => ({
        ...request,
        status: ServiceRequestStatus.AWAITING_PAYMENT,
        financeInvoiceId,
        financeInvoicePublicId,
      })),
      assignProvider: vi.fn(),
    };
    finance = {
      createDraftInvoice: vi.fn().mockResolvedValue({ id: 'fin-1', publicId: 'fin-public-1' }),
      getInvoiceClearance: vi.fn().mockResolvedValue({
        invoiceId: 'fin-1', invoiceStatus: 'PAID', amountDueMinorUnits: '0', financiallyCleared: true,
      }),
    };
  });

  it('allows a student request only for a published owner service', async () => {
    const useCases = new StudentServiceRequestUseCases(catalog, requests);
    await useCases.createRequest({ studentReferenceId: 'student-1', serviceId: 'svc-1' });
    expect(requests.createRequest).toHaveBeenCalledWith(expect.objectContaining({
      studentReferenceId: 'student-1', serviceId: 'svc-1', status: ServiceRequestStatus.REQUESTED,
    }));

    vi.mocked(catalog.findById).mockResolvedValueOnce({ ...service, status: ServiceStatus.READY_TO_REVIEW });
    await expect(useCases.createRequest({ studentReferenceId: 'student-1', serviceId: 'svc-1' }))
      .rejects.toThrow('SERVICE_NOT_AVAILABLE');
  });

  it('keeps finance authority behind IServiceFinanceGateway and stores only returned invoice identity', async () => {
    const useCases = new AdminServiceFulfillmentUseCases(catalog, requests, finance);
    const result = await useCases.createFinanceInvoice({
      requestId: 'req-1', amountMinorUnits: '12500', currencyCode: 'USD', scale: 2, actorId: 'admin-1', expectedVersion: 1,
    });
    expect(finance.createDraftInvoice).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'req-1', requestPublicId: 'svc_req_public', studentReferenceId: 'student-1',
      amountMinorUnits: '12500', currencyCode: 'USD', scale: 2, actorId: 'admin-1',
    }));
    expect(requests.linkFinanceInvoice).toHaveBeenCalledWith('req-1', 'fin-1', 'fin-public-1', 1);
    expect(result.financeInvoiceId).toBe('fin-1');
  });
  it('blocks paid-service fulfillment until Finance proves clearance', async () => {
    vi.mocked(requests.findRequestById).mockResolvedValueOnce({
      ...request,
      status: ServiceRequestStatus.AWAITING_PAYMENT,
      financeInvoiceId: 'fin-1',
      financeInvoicePublicId: 'fin-public-1',
    });
    vi.mocked(finance.getInvoiceClearance).mockResolvedValueOnce({
      invoiceId: 'fin-1', invoiceStatus: 'ISSUED', amountDueMinorUnits: '12500', financiallyCleared: false,
    });
    const useCases = new AdminServiceFulfillmentUseCases(catalog, requests, finance);

    await expect(useCases.transitionRequest('req-1', ServiceRequestStatus.IN_PROGRESS, 1))
      .rejects.toThrow('SERVICE_FINANCIAL_CLEARANCE_REQUIRED:ISSUED');
    expect(requests.updateRequestStatus).not.toHaveBeenCalled();
  });

  it('allows fulfillment only after Finance-owned clearance is proven', async () => {
    vi.mocked(requests.findRequestById).mockResolvedValueOnce({
      ...request,
      status: ServiceRequestStatus.AWAITING_PAYMENT,
      financeInvoiceId: 'fin-1',
      financeInvoicePublicId: 'fin-public-1',
    });
    const useCases = new AdminServiceFulfillmentUseCases(catalog, requests, finance);

    await useCases.transitionRequest('req-1', ServiceRequestStatus.IN_PROGRESS, 1);

    expect(finance.getInvoiceClearance).toHaveBeenCalledWith('fin-1');
    expect(requests.updateRequestStatus).toHaveBeenCalledWith('req-1', ServiceRequestStatus.IN_PROGRESS, 1, undefined);
  });

});
