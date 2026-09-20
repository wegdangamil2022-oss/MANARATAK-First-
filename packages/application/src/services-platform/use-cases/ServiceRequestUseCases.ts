import { randomUUID } from 'node:crypto';
import {
  IServiceCatalogRepository,
  IServiceFinanceGateway,
  IServiceRequestRepository,
  PaginatedServiceRequestResult,
  ServiceRequestDto,
  ServiceRequestFilters,
  ServiceRequestStatus,
  ServiceStatus,
} from '@manaratak/domain';

export class StudentServiceRequestUseCases {
  constructor(
    private readonly catalog: IServiceCatalogRepository,
    private readonly requests: IServiceRequestRepository,
  ) {}

  async createRequest(input: {
    studentReferenceId: string;
    serviceId: string;
    requestParameters?: Record<string, unknown>;
  }): Promise<ServiceRequestDto> {
    const service = await this.catalog.findById(input.serviceId);
    if (!service || service.status !== ServiceStatus.PUBLISHED) throw new Error('SERVICE_NOT_AVAILABLE');
    return this.requests.createRequest({
      publicId: `svc_req_${randomUUID()}`,
      studentReferenceId: input.studentReferenceId,
      serviceId: service.id,
      status: ServiceRequestStatus.REQUESTED,
      requestParameters: input.requestParameters ?? {},
    });
  }

  async listMyRequests(studentReferenceId: string, filters: Omit<ServiceRequestFilters, 'studentReferenceId'> = {}): Promise<PaginatedServiceRequestResult> {
    return this.requests.listRequests({ ...filters, studentReferenceId });
  }

  async getMyRequest(studentReferenceId: string, requestId: string): Promise<ServiceRequestDto> {
    const request = await this.requests.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentReferenceId) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return request;
  }
}

export class AdminServiceFulfillmentUseCases {
  constructor(
    private readonly catalog: IServiceCatalogRepository,
    private readonly requests: IServiceRequestRepository,
    private readonly finance: IServiceFinanceGateway,
  ) {}

  async listRequests(filters: ServiceRequestFilters): Promise<PaginatedServiceRequestResult> {
    return this.requests.listRequests(filters);
  }

  async getRequest(reference: string): Promise<ServiceRequestDto> {
    const normalized = reference.trim();
    if (!normalized) throw new Error('SERVICE_REQUEST_REFERENCE_REQUIRED');
    const request = await this.requests.findRequestById(normalized) ?? await this.requests.findRequestByPublicId(normalized);
    if (!request) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return request;
  }

  async transitionRequest(id: string, status: ServiceRequestStatus, expectedVersion: number, fulfillmentMetadata?: Record<string, unknown> | null) {
    this.assertExpectedVersion(expectedVersion);
    const request = await this.requireRequest(id);
    if (request.version !== expectedVersion) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    this.assertTransition(request.status, status);

    const resumesFulfillment = [ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.COMPLETED].includes(status);
    if (resumesFulfillment && request.status === ServiceRequestStatus.AWAITING_PAYMENT && !request.financeInvoiceId)
      throw new Error('SERVICE_FINANCE_INVOICE_REQUIRED');
    if (resumesFulfillment && request.financeInvoiceId) {
      const clearance = await this.finance.getInvoiceClearance(request.financeInvoiceId);
      if (!clearance.financiallyCleared)
        throw new Error(`SERVICE_FINANCIAL_CLEARANCE_REQUIRED:${clearance.invoiceStatus}`);
    }

    return this.requests.updateRequestStatus(id, status, expectedVersion, fulfillmentMetadata);
  }

  async assignProvider(id: string, providerReferenceId: string, expectedVersion: number) {
    this.assertExpectedVersion(expectedVersion);
    const request = await this.requireRequest(id);
    if (request.version !== expectedVersion) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    if ([ServiceRequestStatus.CANCELLED, ServiceRequestStatus.COMPLETED].includes(request.status))
      throw new Error('SERVICE_REQUEST_PROVIDER_ASSIGNMENT_CLOSED');
    const provider = providerReferenceId.trim();
    if (!provider) throw new Error('SERVICE_PROVIDER_REFERENCE_REQUIRED');
    return this.requests.assignProvider(id, provider, expectedVersion);
  }

  async createFinanceInvoice(input: {
    requestId: string;
    description?: string;
    quantity?: number;
    amountMinorUnits: string;
    currencyCode: string;
    scale: number;
    actorId: string;
    expectedVersion: number;
  }) {
    this.assertExpectedVersion(input.expectedVersion);
    const request = await this.requireRequest(input.requestId);
    if (request.version !== input.expectedVersion) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    if (request.financeInvoiceId) throw new Error('SERVICE_REQUEST_INVOICE_ALREADY_LINKED');
    if ([ServiceRequestStatus.CANCELLED, ServiceRequestStatus.COMPLETED].includes(request.status))
      throw new Error('SERVICE_REQUEST_NOT_INVOICEABLE');
    const service = await this.catalog.findById(request.serviceId);
    if (!service) throw new Error('SERVICE_NOT_FOUND');
    const invoice = await this.finance.createDraftInvoice({
      requestId: request.id,
      requestPublicId: request.publicId,
      studentReferenceId: request.studentReferenceId,
      description: input.description?.trim() || service.displayName,
      quantity: input.quantity ?? 1,
      amountMinorUnits: input.amountMinorUnits,
      currencyCode: input.currencyCode,
      scale: input.scale,
      actorId: input.actorId,
    });
    return this.requests.linkFinanceInvoice(request.id, invoice.id, invoice.publicId, input.expectedVersion);
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('SERVICE_REQUEST_EXPECTED_VERSION_REQUIRED');
  }

  private async requireRequest(id: string) {
    const request = await this.requests.findRequestById(id);
    if (!request) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return request;
  }

  private assertTransition(from: ServiceRequestStatus, to: ServiceRequestStatus) {
    const allowed: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
      [ServiceRequestStatus.REQUESTED]: [ServiceRequestStatus.ACCEPTED, ServiceRequestStatus.CANCELLED],
      [ServiceRequestStatus.ACCEPTED]: [ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.AWAITING_PAYMENT, ServiceRequestStatus.CANCELLED],
      [ServiceRequestStatus.IN_PROGRESS]: [ServiceRequestStatus.AWAITING_PAYMENT, ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED],
      [ServiceRequestStatus.AWAITING_PAYMENT]: [ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED],
      [ServiceRequestStatus.COMPLETED]: [],
      [ServiceRequestStatus.CANCELLED]: [],
    };
    if (!allowed[from]?.includes(to)) throw new Error(`INVALID_SERVICE_REQUEST_TRANSITION:${from}->${to}`);
  }
}
