import { ServiceSupportTriageFilters } from '@manaratak/domain';
import { serviceFingerprint, serviceInput } from '../ServiceSafety';
import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../../asset-platform/AssetReferencePolicy';
import {
  IServiceCatalogRepository,
  IServiceOperationsRepository,
  AssetSecurityClassification,
  IServiceFinanceGateway,
  IServiceRequestRepository,
  PaginatedServiceRequestResult,
  ServiceRequestDto,
  ServiceRequestFilters,
  ServiceRequestStatus,
  ServiceAvailabilityStatus,
  ServiceStatus,
} from '@manaratak/domain';

export class StudentServiceRequestUseCases {
  constructor(
    private readonly catalog: IServiceCatalogRepository,
    private readonly requests: IServiceRequestRepository,
    private readonly assets?: AssetReferencePolicy,
  ) {}

  async createRequest(input: {
    studentReferenceId: string;
    serviceId: string;
    requestParameters?: Record<string, unknown>;
    idempotencyKey?: string;
    consent?: boolean;
  }): Promise<ServiceRequestDto> {
    const service =
      (await this.catalog.findById(input.serviceId)) ??
      (await this.catalog.findBySlug(input.serviceId));
    if (
      !service ||
      (service.status !== ServiceStatus.PUBLISHED && !service.publishedSnapshot) ||
      (service.publishedSnapshot?.serviceAvailabilityStatus ??
        service.serviceAvailabilityStatus) !== ServiceAvailabilityStatus.AVAILABLE
    )
      throw new Error('SERVICE_NOT_AVAILABLE');
    if (!input.idempotencyKey || !/^[A-Za-z0-9._:-]{8,160}$/.test(input.idempotencyKey))
      throw new Error('SERVICE_IDEMPOTENCY_KEY_REQUIRED');
    if (input.consent !== true) throw new Error('SERVICE_INPUT_CONSENT_REQUIRED');
    const published = service.publishedSnapshot
      ? ({ ...service, ...service.publishedSnapshot } as typeof service)
      : service;
    const parameters = serviceInput(published, input.requestParameters ?? {});
    for (const field of published.inputSchema ?? []) {
      if (field.type === 'ASSET' && parameters[field.key])
        await assertAssetReferenceUsable(this.assets, String(parameters[field.key]), {
          purpose: 'SERVICE_REQUEST_DOCUMENT',
          expectedOwnerId: input.studentReferenceId,
          allowedClassifications: [
            AssetSecurityClassification.PUBLIC,
            AssetSecurityClassification.INTERNAL,
            AssetSecurityClassification.RESTRICTED,
            AssetSecurityClassification.CONFIDENTIAL,
          ],
        });
    }
    const publicId = `svc_req_${serviceFingerprint({ student: input.studentReferenceId, key: input.idempotencyKey }).slice(0, 40)}`;
    const payloadFingerprint = serviceFingerprint({
      serviceId: service.id,
      parameters,
      consent: true,
    });
    const previous = await this.requests.findRequestByPublicId(publicId);
    if (previous) {
      if (previous.payloadFingerprint !== payloadFingerprint)
        throw new Error('SERVICE_IDEMPOTENCY_PAYLOAD_CONFLICT');
      return this.studentProjection(previous);
    }
    return this.studentProjection(
      await this.requests.createRequest({
        publicId,
        payloadFingerprint,
        retentionUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        dueAt: new Date(
          Date.now() +
            Math.min(Math.max(Number(published.slaPolicy?.minutes) || 1440, 1), 525600) * 60000,
        ),
        serviceSnapshot: {
          serviceId: service.id,
          version: published.version,
          fulfillmentPolicy: published.fulfillmentPolicy ?? 'QUOTE_REQUIRED',
          fulfillmentType: published.fulfillmentType,
          displayName: published.displayName,
          inputSchema: published.inputSchema ?? [],
          deliveryArtifactTypes: published.deliveryArtifactTypes ?? [],
          pricingReferenceId: published.pricingReferenceId ?? null,
          consentAt: new Date().toISOString(),
        },
        studentReferenceId: input.studentReferenceId,
        serviceId: service.id,
        status: ServiceRequestStatus.REQUESTED,
        requestParameters: parameters,
      }),
    );
  }

  async listMyRequests(
    studentReferenceId: string,
    filters: Omit<ServiceRequestFilters, 'studentReferenceId'> = {},
  ): Promise<PaginatedServiceRequestResult> {
    const page = await this.requests.listRequests({ ...filters, studentReferenceId });
    return { ...page, data: page.data.map((r) => this.studentProjection(r)) };
  }

  async getMyRequest(studentReferenceId: string, requestId: string): Promise<ServiceRequestDto> {
    const request =
      (await this.requests.findRequestById(requestId)) ??
      (await this.requests.findRequestByPublicId(requestId));
    if (!request || request.studentReferenceId !== studentReferenceId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return this.studentProjection(request);
  }
  async eraseMyRequestInputs(studentReferenceId: string, id: string, expectedVersion: number) {
    await this.getMyRequest(studentReferenceId, id);
    if (!this.requests.eraseRequestInputs) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    return this.studentProjection(
      await this.requests.eraseRequestInputs(id, studentReferenceId, expectedVersion),
    );
  }
  private studentProjection(request: ServiceRequestDto): ServiceRequestDto {
    return {
      ...request,
      fulfillmentMetadata: null,
      invoiceIntent: undefined,
      serviceSnapshot: undefined,
      payloadFingerprint: undefined,
      assignedStaffId: undefined,
      providerReferenceId: undefined,
    };
  }
}

export class AdminServiceFulfillmentUseCases {
  constructor(
    private readonly catalog: IServiceCatalogRepository,
    private readonly requests: IServiceRequestRepository,
    private readonly finance: IServiceFinanceGateway,
    private readonly operations?: IServiceOperationsRepository,
  ) {}

  /** Owner-domain read for explicitly permitted staff triage only (P20). */
  listSupportAwaitingPaymentStudents(page = 1, limit = 20, filters: ServiceSupportTriageFilters = {}) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new Error('SERVICE_SUPPORT_TRIAGE_QUERY_INVALID');
    if (!this.requests.listSupportAwaitingPaymentStudents)
      throw new Error('SERVICE_SUPPORT_TRIAGE_NOT_CONFIGURED');
    return this.requests.listSupportAwaitingPaymentStudents(page, limit, filters);
  }

  async listRequests(filters: ServiceRequestFilters): Promise<PaginatedServiceRequestResult> {
    return this.requests.listRequests(filters);
  }

  async getRequest(reference: string): Promise<ServiceRequestDto> {
    const normalized = reference.trim();
    if (!normalized) throw new Error('SERVICE_REQUEST_REFERENCE_REQUIRED');
    const request =
      (await this.requests.findRequestById(normalized)) ??
      (await this.requests.findRequestByPublicId(normalized));
    if (!request) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return request;
  }

  async transitionRequest(
    id: string,
    status: ServiceRequestStatus,
    expectedVersion: number,
    fulfillmentMetadata?: Record<string, unknown> | null,
  ) {
    this.assertExpectedVersion(expectedVersion);
    const request = await this.requireRequest(id);
    if (request.version !== expectedVersion) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    if (request.invoiceLinkState === 'LINK_PENDING')
      throw new Error('SERVICE_INVOICE_LINK_PENDING');
    this.assertTransition(request.status, status);

    const resumesFulfillment = [
      ServiceRequestStatus.IN_PROGRESS,
      ServiceRequestStatus.COMPLETED,
    ].includes(status);
    const booking = await this.operations?.findBookingForRequest?.(request.id);
    const policy =
      booking && BigInt(booking.pricingSnapshot.finalAmountMinorUnits) > 0n
        ? 'CHARGEABLE'
        : (request.serviceSnapshot?.fulfillmentPolicy ?? 'QUOTE_REQUIRED');
    if (
      resumesFulfillment &&
      booking &&
      !['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)
    )
      throw new Error('SERVICE_BOOKING_NOT_CONFIRMED');
    if (resumesFulfillment && (policy !== 'FREE' || request.financeInvoiceId)) {
      if (!request.financeInvoiceId) throw new Error('SERVICE_FINANCE_INVOICE_REQUIRED');
      const clearance = await this.finance.getInvoiceClearance(request.financeInvoiceId, {
        requestPublicId: request.publicId,
        studentReferenceId: request.studentReferenceId,
      });
      if (!clearance.financiallyCleared) throw new Error('SERVICE_FINANCIAL_CLEARANCE_REQUIRED');
    }
    if (
      status === ServiceRequestStatus.CANCELLED &&
      (request.invoiceLinkState === 'LINK_PENDING' || request.financeInvoiceId)
    ) {
      if (!request.financeInvoiceId) throw new Error('SERVICE_INVOICE_LINK_PENDING');
      const clearance = await this.finance.getInvoiceClearance(request.financeInvoiceId, {
        requestPublicId: request.publicId,
        studentReferenceId: request.studentReferenceId,
      });
      if (!clearance.cancellationCleared) {
        if (request.cancellationState === 'PENDING_FINANCE') return request;
        if (this.requests.markCancellationPending)
          return this.requests.markCancellationPending(id, expectedVersion);
        throw new Error('SERVICE_FINANCE_CANCELLATION_PENDING');
      }
    }
    if (
      status === ServiceRequestStatus.COMPLETED &&
      (request.serviceSnapshot?.deliveryArtifactTypes as string[] | undefined)?.length
    ) {
      const booking = await this.operations?.findBookingForRequest?.(request.id);
      const execution =
        booking && (await this.operations?.findWorkflowExecutionForBooking?.(booking.id));
      if (
        !booking ||
        booking.status !== 'COMPLETED' ||
        !execution ||
        execution.status !== 'COMPLETED'
      )
        throw new Error('SERVICE_DELIVERY_REVIEW_REQUIRED');
    }

    return this.requests.updateRequestStatus(id, status, expectedVersion, fulfillmentMetadata);
  }

  async assignProvider(id: string, providerReferenceId: string, expectedVersion: number) {
    this.assertExpectedVersion(expectedVersion);
    const request = await this.requireRequest(id);
    if (request.version !== expectedVersion) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    if (request.invoiceLinkState === 'LINK_PENDING')
      throw new Error('SERVICE_INVOICE_LINK_PENDING');
    if ([ServiceRequestStatus.CANCELLED, ServiceRequestStatus.COMPLETED].includes(request.status))
      throw new Error('SERVICE_REQUEST_PROVIDER_ASSIGNMENT_CLOSED');
    const provider = providerReferenceId.trim();
    if (!provider) throw new Error('SERVICE_PROVIDER_REFERENCE_REQUIRED');
    if (!this.operations) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    const qualified = await this.operations.findProviderById(provider);
    if (
      !qualified ||
      qualified.status !== 'QUALIFIED' ||
      !qualified.qualificationMetadata?.assetId ||
      !Number.isFinite(new Date(String(qualified.qualificationMetadata.expiresAt)).getTime()) ||
      new Date(String(qualified.qualificationMetadata.expiresAt)).getTime() <= Date.now() ||
      !qualified.supportedServiceIds.includes(request.serviceId)
    )
      throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
    const service = await this.catalog.findById(request.serviceId);
    if (
      service?.supportedCountryReferenceIds?.length &&
      (!qualified.countryReferenceId ||
        !service.supportedCountryReferenceIds.includes(qualified.countryReferenceId))
    )
      throw new Error('SERVICE_PROVIDER_COUNTRY_MISMATCH');
    return this.requests.assignProvider(id, qualified.id, expectedVersion);
  }

  async maintenance(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error('SERVICE_MAINTENANCE_LIMIT_INVALID');
    const erased = (await this.requests.purgeExpiredInputs?.(limit)) ?? 0;
    const escalations = (await this.requests.escalateOverdueRequests?.(limit)) ?? 0;
    let invoices = 0,
      cancellations = 0;
    for (const request of (await this.requests.listRecoverableInvoiceIntents?.(limit)) ?? []) {
      try {
        const intent = request.invoiceIntent;
        if (!intent) continue;
        await this.createFinanceInvoice({
          requestId: request.id,
          amountMinorUnits: String(intent.amountMinorUnits),
          currencyCode: String(intent.currencyCode),
          scale: Number(intent.scale),
          actorId: String(intent.actorId),
          expectedVersion: request.version,
        });
        invoices++;
      } catch {
        await this.requests.deferServiceRecovery?.(request.id, 'invoice');
      }
    }
    for (const request of (await this.requests.listPendingCancellations?.(limit)) ?? []) {
      try {
        if (request.financeInvoiceId)
          await this.finance.resolveCancellation?.(request.financeInvoiceId, {
            requestPublicId: request.publicId,
            studentReferenceId: request.studentReferenceId,
          });
        const saved = await this.transitionRequest(
          request.id,
          ServiceRequestStatus.CANCELLED,
          request.version,
        );
        if (saved.status === ServiceRequestStatus.CANCELLED) cancellations++;
        else await this.requests.deferServiceRecovery?.(request.id, 'cancellation');
      } catch {
        await this.requests.deferServiceRecovery?.(request.id, 'cancellation');
      }
    }
    return { erased, invoices, cancellations, escalations };
  }
  async claimRequest(id: string, actorId: string, expectedVersion: number) {
    if (!this.requests.claimRequest) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    return this.requests.claimRequest(id, actorId, expectedVersion);
  }
  async requestTimeline(id: string) {
    return this.requests.requestTimeline?.(id) ?? [];
  }

  async getRequestQuote(reference: string): Promise<Record<string, unknown>> {
    const request = await this.getRequest(reference);
    if (request.invoiceIntent) return request.invoiceIntent;
    const booking = await this.operations?.findBookingForRequest?.(request.id);
    if (booking) {
      if (
        booking.status === 'CANCELLED' ||
        (booking.status === 'PENDING' &&
          (!booking.holdExpiresAt || new Date(booking.holdExpiresAt).getTime() <= Date.now()))
      )
        throw new Error('SERVICE_BOOKING_HOLD_EXPIRED');
      const quote = booking.pricingSnapshot;
      return {
        pricingId: quote.pricingId,
        pricingFingerprint: quote.pricingFingerprint,
        amountMinorUnits: quote.finalAmountMinorUnits,
        currencyCode: quote.currencyCode,
        scale: quote.scale,
        quantity: 1,
        bookingId: booking.id,
        packageId: booking.packageId ?? null,
      };
    }
    const catalog = await this.catalog.findById(request.serviceId);
    if ((request.serviceSnapshot?.fulfillmentType ?? catalog?.fulfillmentType) === 'BOOKING')
      throw new Error('SERVICE_BOOKING_REQUIRED');
    const price = await this.operations?.findActivePricing(request.serviceId, null, new Date());
    if (
      !price ||
      (request.serviceSnapshot?.pricingReferenceId &&
        request.serviceSnapshot.pricingReferenceId !== price.id)
    )
      throw new Error('SERVICE_APPROVED_PRICING_REQUIRED');
    return {
      pricingId: price.id,
      amountMinorUnits: price.amountMinorUnits,
      currencyCode: price.currencyCode,
      scale: price.scale,
      quantity: 1,
      pricingFingerprint: price.immutableFingerprint,
    };
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
    if (request.financeInvoiceId) {
      if (
        request.invoiceIntent &&
        (input.amountMinorUnits !== request.invoiceIntent.amountMinorUnits ||
          input.currencyCode !== request.invoiceIntent.currencyCode ||
          input.scale !== request.invoiceIntent.scale ||
          (input.quantity ?? 1) !== 1)
      )
        throw new Error('SERVICE_PRICE_QUOTE_MISMATCH');
      return request;
    }
    if ([ServiceRequestStatus.CANCELLED, ServiceRequestStatus.COMPLETED].includes(request.status))
      throw new Error('SERVICE_REQUEST_NOT_INVOICEABLE');
    const service = await this.catalog.findById(request.serviceId);
    if (!service) throw new Error('SERVICE_NOT_FOUND');
    let prepared = request;
    if (!request.invoiceIntent) {
      if (request.version !== input.expectedVersion)
        throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
      if (!this.requests.prepareInvoiceIntent) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      const quote = await this.getRequestQuote(request.id);
      const units = String(quote.amountMinorUnits);
      if (BigInt(units) <= 0n) throw new Error('SERVICE_FREE_INVOICE_FORBIDDEN');
      if (request.serviceSnapshot?.fulfillmentPolicy === 'FREE' && !quote.bookingId)
        throw new Error('SERVICE_FREE_INVOICE_FORBIDDEN');
      if (
        input.amountMinorUnits !== units ||
        input.currencyCode !== quote.currencyCode ||
        input.scale !== quote.scale ||
        (input.quantity ?? 1) !== 1
      )
        throw new Error('SERVICE_PRICE_QUOTE_MISMATCH');
      const intent = {
        ...quote,
        description: String(request.serviceSnapshot?.displayName ?? service.displayName),
        quantity: 1,
        actorId: input.actorId,
        capturedAt: new Date().toISOString(),
      };
      prepared = await this.requests.prepareInvoiceIntent(
        request.id,
        intent,
        input.expectedVersion,
      );
    }
    const intent = prepared.invoiceIntent!;
    if (
      input.amountMinorUnits !== intent.amountMinorUnits ||
      input.currencyCode !== intent.currencyCode ||
      input.scale !== intent.scale ||
      (input.quantity ?? 1) !== 1
    )
      throw new Error('SERVICE_PRICE_QUOTE_MISMATCH');
    const invoice = await this.finance.createDraftInvoice({
      requestId: request.id,
      requestPublicId: request.publicId,
      studentReferenceId: request.studentReferenceId,
      description: String(intent.description),
      quantity: 1,
      amountMinorUnits: String(intent.amountMinorUnits),
      currencyCode: String(intent.currencyCode),
      scale: Number(intent.scale),
      actorId: String(intent.actorId),
    });
    // The immutable intent remains LINK_PENDING if this CAS loses; retry reuses the same Finance key.
    return this.requests.linkFinanceInvoice(
      request.id,
      invoice.id,
      invoice.publicId,
      prepared.version,
    );
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1)
      throw new Error('SERVICE_REQUEST_EXPECTED_VERSION_REQUIRED');
  }

  private async requireRequest(id: string) {
    const request = await this.requests.findRequestById(id);
    if (!request) throw new Error('SERVICE_REQUEST_NOT_FOUND');
    return request;
  }

  private assertTransition(from: ServiceRequestStatus, to: ServiceRequestStatus) {
    const allowed: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
      [ServiceRequestStatus.REQUESTED]: [
        ServiceRequestStatus.ACCEPTED,
        ServiceRequestStatus.CANCELLED,
      ],
      [ServiceRequestStatus.ACCEPTED]: [
        ServiceRequestStatus.IN_PROGRESS,
        ServiceRequestStatus.AWAITING_PAYMENT,
        ServiceRequestStatus.CANCELLED,
      ],
      [ServiceRequestStatus.IN_PROGRESS]: [
        ServiceRequestStatus.AWAITING_PAYMENT,
        ServiceRequestStatus.COMPLETED,
        ServiceRequestStatus.CANCELLED,
      ],
      [ServiceRequestStatus.AWAITING_PAYMENT]: [
        ServiceRequestStatus.IN_PROGRESS,
        ServiceRequestStatus.COMPLETED,
        ServiceRequestStatus.CANCELLED,
      ],
      [ServiceRequestStatus.COMPLETED]: [],
      [ServiceRequestStatus.CANCELLED]: [],
    };
    if (!allowed[from]?.includes(to))
      throw new Error(`INVALID_SERVICE_REQUEST_TRANSITION:${from}->${to}`);
  }
}
