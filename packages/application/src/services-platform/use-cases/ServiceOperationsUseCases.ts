import { serviceFingerprint, serviceInput } from '../ServiceSafety';
import { createHash, randomUUID } from 'node:crypto';
import {
  IServiceCatalogRepository,
  IServiceOperationsRepository,
  IServiceRequestRepository,
  IServiceFinanceGateway,
  IServiceDeliveryGateway,
  IServiceReferenceGateway,
  AssetSecurityClassification,
  ServiceBookingDto,
  ServiceBookingPricingSnapshot,
  ServiceBookingStatus,
  ServiceDiscountDto,
  ServiceDiscountType,
  ServicePackageDto,
  ServicePackageStatus,
  ServicePricingDto,
  ServicePricingStatus,
  ServicePromotionDto,
  ServicePromotionStatus,
  ServiceProviderAvailabilityStatus,
  ServiceProviderDto,
  ServiceProviderStatus,
  ServiceStatus,
  ServiceWorkflowDefinitionDto,
  ServiceWorkflowDefinitionStatus,
  ServiceWorkflowExecutionDto,
  ServiceWorkflowExecutionStatus,
} from '@manaratak/domain';
import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../../asset-platform/AssetReferencePolicy';

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));
const within = (at: Date, from: Date | string, to?: Date | string | null) =>
  at.getTime() >= asDate(from).getTime() && (!to || at.getTime() < asDate(to).getTime());

export class ServiceOperationsUseCases {
  constructor(
    private readonly catalog: IServiceCatalogRepository,
    private readonly operations: IServiceOperationsRepository,
    private readonly assetReferences?: AssetReferencePolicy,
    private readonly requests?: IServiceRequestRepository,
    private readonly finance?: IServiceFinanceGateway,
    private readonly delivery?: IServiceDeliveryGateway,
    private readonly references?: IServiceReferenceGateway,
  ) {}

  forActor(context: { actorId: string; correlationId: string; reason: string }) {
    if (!this.operations.withActor) throw new Error('SERVICE_OPERATIONS_AUDIT_REQUIRED');
    return new ServiceOperationsUseCases(
      this.catalog,
      this.operations.withActor(context),
      this.assetReferences,
      this.requests,
      this.finance,
      this.delivery,
      this.references,
    );
  }
  async myDeliverables(studentId: string, requestId: string) {
    const request = await this.requests?.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    const booking = await this.operations.findBookingForRequest?.(request.id);
    if (!booking || booking.status !== ServiceBookingStatus.COMPLETED) return [];
    await this.assertBookingClearance(booking);
    return ((await this.operations.listDeliveryArtifacts?.(booking.id)) ?? []).map((row) => ({
      id: row.id,
      artifactType: row.artifactType,
      deliveredAt: row.deliveredAt,
    }));
  }
  async myDeliveryGrant(studentId: string, requestId: string, artifactId: string) {
    const request = await this.requests?.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    const booking = await this.operations.findBookingForRequest?.(request.id);
    if (!booking || booking.status !== ServiceBookingStatus.COMPLETED)
      throw new Error('SERVICE_DELIVERY_REVIEW_REQUIRED');
    await this.assertBookingClearance(booking);
    const artifact = ((await this.operations.listDeliveryArtifacts?.(booking.id)) ?? []).find(
      (row) => row.id === artifactId,
    );
    const execution = await this.operations.findWorkflowExecutionForBooking?.(booking.id);
    if (
      !artifact ||
      artifact.workflowExecutionId !== execution?.id ||
      execution?.status !== ServiceWorkflowExecutionStatus.COMPLETED
    )
      throw new Error('SERVICE_DELIVERY_WORKFLOW_MISMATCH');
    await assertAssetReferenceUsable(this.assetReferences, artifact.assetId, {
      purpose: 'SERVICE_STUDENT_DELIVERY',
      expectedOwnerId: booking.id,
      allowedClassifications: [
        AssetSecurityClassification.PUBLIC,
        AssetSecurityClassification.INTERNAL,
        AssetSecurityClassification.RESTRICTED,
        AssetSecurityClassification.CONFIDENTIAL,
      ],
    });
    if (!this.delivery) throw new Error('SERVICE_SECURE_DELIVERY_NOT_CONFIGURED');
    return this.delivery.grant(artifact.assetId);
  }
  async packagesForRequest(studentId: string, requestId: string, cursor?: string) {
    const request = await this.requests?.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    const page = (await this.operations.listActivePackages?.(request.serviceId, cursor)) ?? {
      data: [],
      nextCursor: null,
    };
    const data = await Promise.all(
      page.data.map(async (pkg) => {
        const items = await Promise.all(
          pkg.items.map(async (item) => {
            const raw = await this.catalog.findById(item.serviceId);
            const service = raw?.publishedSnapshot
              ? ({ ...raw, ...raw.publishedSnapshot } as typeof raw)
              : raw;
            if (!service || service.status !== 'PUBLISHED')
              throw new Error('SERVICE_PACKAGE_ITEM_NOT_PUBLISHED');
            return {
              serviceId: service.id,
              displayName: service.displayName,
              localizedContent: service.localizedContent,
              inputSchema: service.inputSchema ?? [],
              quantity: item.quantity,
            };
          }),
        );
        const price = await this.operations.findActivePricing(null, pkg.id, new Date());
        return {
          id: pkg.id,
          displayName: pkg.displayName,
          items,
          price: price
            ? {
                amountMinorUnits: price.amountMinorUnits,
                currencyCode: price.currencyCode,
                scale: price.scale,
              }
            : null,
        };
      }),
    );
    return { data, nextCursor: page.nextCursor };
  }
  async sweepExpiredHolds(limit: number) {
    if (!this.operations.sweepExpiredHolds) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    return this.operations.sweepExpiredHolds(limit);
  }
  async assertCaseActor(reference: string, actorId: string, all: boolean, execution = false) {
    const run = execution ? await this.operations.findWorkflowExecutionById?.(reference) : null;
    const booking = await this.operations.findBookingById(
      execution ? (run?.bookingId ?? '') : reference,
    );
    const request = booking?.requestId
      ? await this.requests?.findRequestById(booking.requestId)
      : null;
    if (!request || (!all && request.assignedStaffId !== actorId))
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
  }
  async availableForRequest(studentId: string, requestId: string, cursor?: string) {
    const request = await this.requests?.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    const service = await this.catalog.findById(request.serviceId);
    if (!service || service.serviceAvailabilityStatus !== 'AVAILABLE')
      return { data: [], nextCursor: null };
    return (
      this.operations.listAvailableSlots?.(request.serviceId, cursor) ?? {
        data: [],
        nextCursor: null,
      }
    );
  }
  async bookRequest(
    studentId: string,
    requestId: string,
    slotId: string,
    idempotencyKey: string,
    packageId?: string,
    packageConsent?: boolean,
    packageParameters?: Record<string, Record<string, unknown>>,
  ) {
    if (!/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey))
      throw new Error('SERVICE_IDEMPOTENCY_KEY_REQUIRED');
    const request = await this.requests?.findRequestById(requestId);
    if (!request || request.studentReferenceId !== studentId)
      throw new Error('SERVICE_REQUEST_NOT_FOUND');
    const slot = await this.operations.findAvailabilitySlotById(slotId);
    if (!slot || slot.serviceId !== request.serviceId)
      throw new Error('SERVICE_BOOKING_SLOT_UNAVAILABLE');
    const result = await this.createBooking({
      studentReferenceId: studentId,
      requestId,
      serviceId: packageId ? undefined : request.serviceId,
      packageId,
      packageConsent,
      packageParameters,
      slotId,
      providerId: slot.providerId,
      idempotencyKey,
    });
    return {
      id: result.id,
      publicId: result.publicId,
      status: result.status,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      timezone: result.timezone,
      pricingSnapshot: result.pricingSnapshot,
      holdExpiresAt: result.holdExpiresAt,
    };
  }
  listOperations(kind: string, page: number, assignedStaffId?: string) {
    if (!this.operations.listOperations) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    return this.operations.listOperations(kind, page, assignedStaffId);
  }
  async registerProvider(input: {
    displayName: string;
    timezone: string;
    capacity: number;
    countryReferenceId?: string | null;
    supportedServiceIds: string[];
    qualificationMetadata?: Record<string, unknown> | null;
  }): Promise<ServiceProviderDto> {
    if (!input.displayName.trim()) throw new Error('SERVICE_PROVIDER_NAME_REQUIRED');
    this.assertTimezone(input.timezone);
    if (!Number.isInteger(input.capacity) || input.capacity < 1)
      throw new Error('SERVICE_PROVIDER_CAPACITY_INVALID');
    const supportedServiceIds = [...new Set(input.supportedServiceIds.filter(Boolean))];
    if (supportedServiceIds.length === 0)
      throw new Error('SERVICE_PROVIDER_SUPPORTED_SERVICE_REQUIRED');
    for (const serviceId of supportedServiceIds) {
      if (!(await this.catalog.findById(serviceId)))
        throw new Error(`SERVICE_PROVIDER_SERVICE_NOT_FOUND:${serviceId}`);
    }
    return this.operations.createProvider({
      publicId: `svc_provider_${randomUUID()}`,
      displayName: input.displayName.trim(),
      status: ServiceProviderStatus.DRAFT,
      timezone: input.timezone,
      capacity: input.capacity,
      countryReferenceId: input.countryReferenceId
        ? this.references
          ? (await this.references.resolveCountryReference(input.countryReferenceId)).id
          : (() => {
              throw new Error('SERVICE_REFERENCE_GATEWAY_REQUIRED');
            })()
        : null,
      supportedServiceIds,
      qualificationMetadata: input.qualificationMetadata ?? null,
    });
  }

  async updateProviderEvidence(
    id: string,
    evidence: { assetId: string; expiresAt: string },
    expectedVersion: number,
  ) {
    if (!this.operations.updateProviderEvidence)
      throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
    if (
      !Number.isFinite(Date.parse(evidence.expiresAt)) ||
      Date.parse(evidence.expiresAt) <= Date.now()
    )
      throw new Error('SERVICE_PROVIDER_ACCREDITATION_REQUIRED');
    await assertAssetReferenceUsable(this.assetReferences, evidence.assetId, {
      purpose: 'SERVICE_PROVIDER_ACCREDITATION',
      allowedMimeTypePrefixes: ['application/pdf', 'image/'],
    });
    return this.operations.updateProviderEvidence(id, evidence, expectedVersion);
  }
  async qualifyProvider(
    providerId: string,
    expectedVersion?: number,
    review?: { legalReviewed: boolean; authorityReviewed: boolean; scopeReviewed: boolean },
  ): Promise<ServiceProviderDto> {
    const provider = await this.requireProvider(providerId);
    if (provider.status === ServiceProviderStatus.RETIRED)
      throw new Error('SERVICE_PROVIDER_RETIRED');
    const evidence = provider.qualificationMetadata;
    if (
      !evidence?.assetId ||
      typeof evidence.expiresAt !== 'string' ||
      new Date(evidence.expiresAt).getTime() <= Date.now() ||
      !Number.isFinite(new Date(evidence.expiresAt).getTime())
    )
      throw new Error('SERVICE_PROVIDER_ACCREDITATION_REQUIRED');
    if (
      !review ||
      review.legalReviewed !== true ||
      review.authorityReviewed !== true ||
      review.scopeReviewed !== true
    )
      throw new Error('SERVICE_PROVIDER_REVIEW_REQUIRED');
    const document = await assertAssetReferenceUsable(
      this.assetReferences,
      String(evidence.assetId),
      {
        purpose: 'SERVICE_PROVIDER_ACCREDITATION',
        allowedMimeTypePrefixes: ['application/pdf', 'image/'],
      },
    );
    if (!document?.checksum?.hash) throw new Error('SERVICE_PROVIDER_ACCREDITATION_REQUIRED');
    return this.operations.updateProviderStatus(
      providerId,
      ServiceProviderStatus.QUALIFIED,
      expectedVersion,
      {
        ...review,
        documentSha256: document.checksum.hash,
        evidenceAssetId: String(evidence.assetId),
      },
    );
  }

  async createPackage(input: {
    displayName: string;
    items: Array<{ serviceId: string; sequence: number; quantity?: number; required?: boolean }>;
    metadata?: Record<string, unknown> | null;
  }): Promise<ServicePackageDto> {
    if (!input.displayName.trim()) throw new Error('SERVICE_PACKAGE_NAME_REQUIRED');
    if (input.items.length === 0) throw new Error('SERVICE_PACKAGE_ITEM_REQUIRED');
    const sequences = new Set<number>();
    const items = [];
    for (const item of input.items) {
      if (!(await this.catalog.findById(item.serviceId)))
        throw new Error(`SERVICE_PACKAGE_SERVICE_NOT_FOUND:${item.serviceId}`);
      if (!Number.isInteger(item.sequence) || item.sequence < 1 || sequences.has(item.sequence))
        throw new Error('SERVICE_PACKAGE_SEQUENCE_INVALID');
      sequences.add(item.sequence);
      const quantity = item.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity < 1)
        throw new Error('SERVICE_PACKAGE_QUANTITY_INVALID');
      items.push({
        serviceId: item.serviceId,
        sequence: item.sequence,
        quantity,
        required: item.required ?? true,
      });
    }
    return this.operations.createPackage({
      publicId: `svc_package_${randomUUID()}`,
      displayName: input.displayName.trim(),
      status: ServicePackageStatus.DRAFT,
      items: items.sort((a, b) => a.sequence - b.sequence),
      metadata: input.metadata ?? null,
    });
  }

  async createPricing(input: {
    serviceId?: string | null;
    packageId?: string | null;
    currencyCode: string;
    scale: number;
    amountMinorUnits: string;
    effectiveFrom?: Date;
    effectiveTo?: Date | null;
  }): Promise<ServicePricingDto> {
    await this.assertServiceOrPackage(input.serviceId ?? null, input.packageId ?? null, true);
    const amount = this.money(input.amountMinorUnits);
    if (amount < 0n) throw new Error('SERVICE_PRICING_AMOUNT_INVALID');
    if (!/^[A-Z]{3}$/.test(input.currencyCode)) throw new Error('SERVICE_PRICING_CURRENCY_INVALID');
    if (!Number.isInteger(input.scale) || input.scale < 0 || input.scale > 6)
      throw new Error('SERVICE_PRICING_SCALE_INVALID');
    const effectiveFrom = input.effectiveFrom ?? new Date();
    if (input.effectiveTo && input.effectiveTo <= effectiveFrom)
      throw new Error('SERVICE_PRICING_EFFECTIVE_WINDOW_INVALID');
    // Immutable price identity excludes lifecycle fields (status/effectiveTo) that may change when a price is retired.
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          serviceId: input.serviceId ?? null,
          packageId: input.packageId ?? null,
          currencyCode: input.currencyCode,
          scale: input.scale,
          amountMinorUnits: amount.toString(),
          effectiveFrom: effectiveFrom.toISOString(),
        }),
      )
      .digest('hex');
    return this.operations.createPricing({
      publicId: `svc_price_${randomUUID()}`,
      serviceId: input.serviceId ?? null,
      packageId: input.packageId ?? null,
      currencyCode: input.currencyCode,
      scale: input.scale,
      amountMinorUnits: amount.toString(),
      status: ServicePricingStatus.DRAFT,
      effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      immutableFingerprint: fingerprint,
    });
  }

  async createDiscount(input: {
    code?: string | null;
    discountType: ServiceDiscountType;
    valueMinorUnits?: string | null;
    percentageBasisPoints?: number | null;
    currencyCode?: string | null;
    serviceId?: string | null;
    packageId?: string | null;
    activeFrom?: Date;
    activeTo?: Date | null;
    maxRedemptions?: number | null;
  }): Promise<ServiceDiscountDto> {
    await this.assertServiceOrPackage(input.serviceId ?? null, input.packageId ?? null, true);
    if (input.discountType === ServiceDiscountType.FIXED) {
      if (
        input.valueMinorUnits == null ||
        this.money(input.valueMinorUnits) <= 0n ||
        !input.currencyCode
      )
        throw new Error('SERVICE_DISCOUNT_FIXED_VALUE_INVALID');
    } else {
      if (
        !Number.isInteger(input.percentageBasisPoints) ||
        (input.percentageBasisPoints ?? 0) <= 0 ||
        (input.percentageBasisPoints ?? 0) > 10000
      )
        throw new Error('SERVICE_DISCOUNT_PERCENTAGE_INVALID');
    }
    const activeFrom = input.activeFrom ?? new Date();
    if (input.activeTo && input.activeTo <= activeFrom)
      throw new Error('SERVICE_DISCOUNT_WINDOW_INVALID');
    if (
      input.maxRedemptions != null &&
      (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1)
    )
      throw new Error('SERVICE_DISCOUNT_MAX_REDEMPTIONS_INVALID');
    return this.operations.createDiscount({
      publicId: `svc_discount_${randomUUID()}`,
      code: input.code?.trim() || null,
      discountType: input.discountType,
      valueMinorUnits: input.valueMinorUnits ?? null,
      percentageBasisPoints: input.percentageBasisPoints ?? null,
      currencyCode: input.currencyCode ?? null,
      serviceId: input.serviceId ?? null,
      packageId: input.packageId ?? null,
      activeFrom,
      activeTo: input.activeTo ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      redemptionCount: 0,
    });
  }

  async createPromotion(input: {
    name: string;
    discountId: string;
    serviceId?: string | null;
    packageId?: string | null;
    activeFrom?: Date;
    activeTo?: Date | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ServicePromotionDto> {
    if (!input.name.trim()) throw new Error('SERVICE_PROMOTION_NAME_REQUIRED');
    await this.assertServiceOrPackage(input.serviceId ?? null, input.packageId ?? null, true);
    const discount = await this.operations.findDiscountById(input.discountId);
    if (!discount) throw new Error('SERVICE_PROMOTION_DISCOUNT_NOT_FOUND');
    if (discount.serviceId && discount.serviceId !== (input.serviceId ?? null))
      throw new Error('SERVICE_PROMOTION_DISCOUNT_SCOPE_MISMATCH');
    if (discount.packageId && discount.packageId !== (input.packageId ?? null))
      throw new Error('SERVICE_PROMOTION_DISCOUNT_SCOPE_MISMATCH');
    const activeFrom = input.activeFrom ?? new Date();
    if (input.activeTo && input.activeTo <= activeFrom)
      throw new Error('SERVICE_PROMOTION_WINDOW_INVALID');
    return this.operations.createPromotion({
      publicId: `svc_promo_${randomUUID()}`,
      name: input.name.trim(),
      status: ServicePromotionStatus.DRAFT,
      discountId: input.discountId,
      serviceId: input.serviceId ?? null,
      packageId: input.packageId ?? null,
      activeFrom,
      activeTo: input.activeTo ?? null,
      metadata: input.metadata ?? null,
    });
  }

  async activatePackage(packageId: string, expectedVersion?: number): Promise<ServicePackageDto> {
    const pkg = await this.operations.findPackageById(packageId);
    if (!pkg) throw new Error('SERVICE_PACKAGE_NOT_FOUND');
    if (pkg.status !== ServicePackageStatus.DRAFT) throw new Error('SERVICE_PACKAGE_NOT_DRAFT');
    for (const item of pkg.items) {
      const service = await this.catalog.findById(item.serviceId);
      if (!service || service.status !== ServiceStatus.PUBLISHED)
        throw new Error(`SERVICE_PACKAGE_ITEM_NOT_PUBLISHED:${item.serviceId}`);
    }
    return this.operations.updatePackageStatus(
      packageId,
      ServicePackageStatus.ACTIVE,
      expectedVersion,
    );
  }

  async activatePricing(pricingId: string, expectedVersion?: number): Promise<ServicePricingDto> {
    const pricing = await this.operations.findPricingById(pricingId);
    if (!pricing) throw new Error('SERVICE_PRICING_NOT_FOUND');
    if (pricing.status !== ServicePricingStatus.DRAFT) throw new Error('SERVICE_PRICING_NOT_DRAFT');
    const existing = await this.operations.findActivePricing(
      pricing.serviceId ?? null,
      pricing.packageId ?? null,
      new Date(),
    );
    if (existing && existing.id !== pricing.id)
      throw new Error('SERVICE_PRICING_ACTIVE_VERSION_EXISTS');
    return this.operations.updatePricingStatus(
      pricingId,
      ServicePricingStatus.ACTIVE,
      expectedVersion,
    );
  }

  async activatePromotion(
    promotionId: string,
    expectedVersion?: number,
  ): Promise<ServicePromotionDto> {
    const promotion = await this.operations.findPromotionById(promotionId);
    if (!promotion) throw new Error('SERVICE_PROMOTION_NOT_FOUND');
    if (
      promotion.status !== ServicePromotionStatus.DRAFT &&
      promotion.status !== ServicePromotionStatus.PAUSED
    )
      throw new Error('SERVICE_PROMOTION_NOT_ACTIVATABLE');
    return this.operations.updatePromotionStatus(
      promotionId,
      ServicePromotionStatus.ACTIVE,
      expectedVersion,
    );
  }

  async activateWorkflowDefinition(
    definitionId: string,
    expectedVersion?: number,
  ): Promise<ServiceWorkflowDefinitionDto> {
    const definition = await this.operations.findWorkflowDefinitionById(definitionId);
    if (!definition) throw new Error('SERVICE_WORKFLOW_DEFINITION_NOT_FOUND');
    if (definition.status !== ServiceWorkflowDefinitionStatus.DRAFT)
      throw new Error('SERVICE_WORKFLOW_DEFINITION_NOT_DRAFT');
    const existing = await this.operations.findActiveWorkflowDefinition(
      definition.serviceId ?? null,
      definition.packageId ?? null,
    );
    if (existing && existing.id !== definition.id)
      throw new Error('SERVICE_WORKFLOW_ACTIVE_VERSION_EXISTS');
    if (definition.packageId) {
      const pkg = await this.operations.findPackageById(definition.packageId);
      if (!pkg || pkg.status !== ServicePackageStatus.ACTIVE)
        throw new Error('SERVICE_PACKAGE_NOT_ACTIVE');
      const declared = new Set(
        definition.steps.flatMap((step) => step.requiredArtifactTypes ?? []),
      );
      for (const item of pkg.items) {
        const raw = await this.catalog.findById(item.serviceId);
        const service = raw?.publishedSnapshot
          ? ({ ...raw, ...raw.publishedSnapshot } as typeof raw)
          : raw;
        if (!service || (service.deliveryArtifactTypes ?? []).some((type) => !declared.has(type)))
          throw new Error('SERVICE_PACKAGE_DELIVERY_POLICY_REQUIRED');
      }
    }
    return this.operations.updateWorkflowDefinitionStatus(
      definitionId,
      ServiceWorkflowDefinitionStatus.ACTIVE,
      expectedVersion,
    );
  }

  async createAvailabilitySlot(input: {
    providerId: string;
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    capacity?: number;
  }) {
    const provider = await this.requireProvider(input.providerId);
    if (provider.status !== ServiceProviderStatus.QUALIFIED)
      throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
    if (!provider.supportedServiceIds.includes(input.serviceId))
      throw new Error('SERVICE_PROVIDER_SERVICE_NOT_SUPPORTED');
    if (!(await this.catalog.findById(input.serviceId)))
      throw new Error('SERVICE_SLOT_SERVICE_NOT_FOUND');
    this.assertTimezone(input.timezone);
    if (input.timezone !== provider.timezone)
      throw new Error('SERVICE_SLOT_TIMEZONE_PROVIDER_MISMATCH');
    if (input.startsAt >= input.endsAt) throw new Error('SERVICE_SLOT_WINDOW_INVALID');
    const capacity = input.capacity ?? provider.capacity;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > provider.capacity)
      throw new Error('SERVICE_SLOT_CAPACITY_INVALID');
    return this.operations.createAvailabilitySlot({
      publicId: `svc_slot_${randomUUID()}`,
      providerId: provider.id,
      serviceId: input.serviceId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      capacity,
      status: ServiceProviderAvailabilityStatus.AVAILABLE,
    });
  }

  async createBooking(input: {
    studentReferenceId: string;
    requestId?: string;
    idempotencyKey?: string;
    serviceId?: string | null;
    packageId?: string | null;
    providerId: string;
    slotId: string;
    discountId?: string | null;
    promotionId?: string | null;
    packageConsent?: boolean;
    packageParameters?: Record<string, Record<string, unknown>>;
  }): Promise<ServiceBookingDto> {
    const replay = await this.operations.findBookingByPublicId?.(
      `svc_booking_${serviceFingerprint({ student: input.studentReferenceId, key: input.idempotencyKey }).slice(0, 40)}`,
    );
    if (replay) {
      if ((replay as any).payloadFingerprint !== serviceFingerprint(input))
        throw new Error('SERVICE_BOOKING_PAYLOAD_CONFLICT');
      return replay;
    }
    if (!input.studentReferenceId.trim()) throw new Error('SERVICE_BOOKING_STUDENT_REQUIRED');
    if (!input.requestId || !input.idempotencyKey || !this.requests)
      throw new Error('SERVICE_BOOKING_REQUEST_REQUIRED');
    const request = await this.requests.findRequestById(input.requestId);
    if (
      !request ||
      request.studentReferenceId !== input.studentReferenceId ||
      (!input.packageId && request.serviceId !== input.serviceId)
    )
      throw new Error('SERVICE_BOOKING_REQUEST_MISMATCH');
    if (request.financeInvoiceId || request.invoiceIntent)
      throw new Error('SERVICE_BOOKING_BEFORE_INVOICE_REQUIRED');
    const { service, pkg } = await this.assertServiceOrPackage(
      input.serviceId ?? null,
      input.packageId ?? null,
    );
    if (pkg) {
      if (
        input.packageConsent !== true ||
        !pkg.items.some((item) => item.serviceId === request.serviceId)
      )
        throw new Error('SERVICE_PACKAGE_CONSENT_REQUIRED');
      if (
        Object.keys(input.packageParameters ?? {}).some(
          (id) => !pkg.items.some((item) => item.serviceId === id),
        )
      )
        throw new Error('SERVICE_INPUT_UNKNOWN_FIELD');
      for (const item of pkg.items) {
        const raw = await this.catalog.findById(item.serviceId);
        const published = raw?.publishedSnapshot
          ? ({ ...raw, ...raw.publishedSnapshot } as typeof raw)
          : raw;
        if (
          !published ||
          published.status !== 'PUBLISHED' ||
          published.serviceAvailabilityStatus !== 'AVAILABLE'
        )
          throw new Error('SERVICE_PACKAGE_ITEM_NOT_PUBLISHED');
        const params = serviceInput(
          published,
          input.packageParameters?.[item.serviceId] ??
            (item.serviceId === request.serviceId ? request.requestParameters : {}),
        );
        for (const field of published.inputSchema ?? [])
          if (field.type === 'ASSET' && params[field.key])
            await assertAssetReferenceUsable(this.assetReferences, String(params[field.key]), {
              purpose: 'SERVICE_PACKAGE_INPUT',
              expectedOwnerId: input.studentReferenceId,
              allowedClassifications: [
                AssetSecurityClassification.PUBLIC,
                AssetSecurityClassification.INTERNAL,
                AssetSecurityClassification.RESTRICTED,
                AssetSecurityClassification.CONFIDENTIAL,
              ],
            });
      }
    }
    const provider = await this.requireProvider(input.providerId);
    if (provider.status !== ServiceProviderStatus.QUALIFIED)
      throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
    const slot = await this.operations.findAvailabilitySlotById(input.slotId);
    if (!slot || slot.status !== ServiceProviderAvailabilityStatus.AVAILABLE)
      throw new Error('SERVICE_BOOKING_SLOT_UNAVAILABLE');
    if (slot.providerId !== provider.id) throw new Error('SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH');
    const bookingServiceIds = pkg ? pkg.items.map((item) => item.serviceId) : [service!.id];
    if (!bookingServiceIds.every((id) => provider.supportedServiceIds.includes(id)))
      throw new Error('SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH');
    if (!bookingServiceIds.includes(slot.serviceId))
      throw new Error('SERVICE_BOOKING_SLOT_SERVICE_MISMATCH');

    const now = new Date();
    if (asDate(slot.startsAt).getTime() <= now.getTime())
      throw new Error('SERVICE_BOOKING_SLOT_ALREADY_STARTED');
    const pricing = await this.operations.findActivePricing(
      service?.id ?? null,
      pkg?.id ?? null,
      now,
    );
    if (
      !pricing ||
      pricing.status !== ServicePricingStatus.ACTIVE ||
      !within(now, pricing.effectiveFrom, pricing.effectiveTo)
    )
      throw new Error('SERVICE_BOOKING_ACTIVE_PRICING_REQUIRED');
    const { discount, promotion } = await this.resolveDiscountPromotion(
      input.discountId ?? null,
      input.promotionId ?? null,
      service?.id ?? null,
      pkg?.id ?? null,
      now,
    );
    const pricingSnapshot = this.quote(pricing, discount, promotion, now);
    if (
      pricingSnapshot.finalAmountMinorUnits === '0' &&
      request.serviceSnapshot?.fulfillmentPolicy !== 'FREE'
    )
      throw new Error('SERVICE_FREE_POLICY_REQUIRED');
    const items = pkg
      ? pkg.items.map((item) => ({
          serviceId: item.serviceId,
          packageItemId: item.id ?? null,
          sequence: item.sequence,
          quantity: item.quantity,
          status: ServiceBookingStatus.PENDING,
        }))
      : [
          {
            serviceId: service!.id,
            packageItemId: null,
            sequence: 1,
            quantity: 1,
            status: ServiceBookingStatus.PENDING,
          },
        ];
    return this.operations.createBookingWithCapacity({
      publicId: `svc_booking_${serviceFingerprint({ student: input.studentReferenceId, key: input.idempotencyKey }).slice(0, 40)}`,
      requestId: input.requestId,
      payloadFingerprint: serviceFingerprint(input),
      inputSnapshot: input.packageParameters,
      studentReferenceId: input.studentReferenceId,
      serviceId: request.serviceId,
      packageId: pkg?.id ?? null,
      providerId: provider.id,
      slotId: slot.id,
      pricingSnapshot,
      items,
    });
  }

  async createWorkflowDefinition(input: {
    name: string;
    serviceId?: string | null;
    packageId?: string | null;
    steps: Array<{
      key: string;
      sequence: number;
      slaMinutes?: number | null;
      requiredArtifactTypes?: string[] | null;
    }>;
  }): Promise<ServiceWorkflowDefinitionDto> {
    await this.assertServiceOrPackage(input.serviceId ?? null, input.packageId ?? null, true);
    if (!input.name.trim() || input.steps.length === 0)
      throw new Error('SERVICE_WORKFLOW_DEFINITION_INVALID');
    const sequences = new Set<number>();
    const keys = new Set<string>();
    for (const step of input.steps) {
      if (
        !step.key.trim() ||
        !Number.isInteger(step.sequence) ||
        step.sequence < 1 ||
        sequences.has(step.sequence) ||
        keys.has(step.key)
      )
        throw new Error('SERVICE_WORKFLOW_STEP_INVALID');
      if (step.slaMinutes != null && (!Number.isInteger(step.slaMinutes) || step.slaMinutes < 1))
        throw new Error('SERVICE_WORKFLOW_SLA_INVALID');
      sequences.add(step.sequence);
      keys.add(step.key);
    }
    return this.operations.createWorkflowDefinition({
      publicId: `svc_workflow_${randomUUID()}`,
      name: input.name.trim(),
      serviceId: input.serviceId ?? null,
      packageId: input.packageId ?? null,
      status: ServiceWorkflowDefinitionStatus.DRAFT,
      steps: [...input.steps].sort((a, b) => a.sequence - b.sequence),
    });
  }

  async startWorkflow(bookingId: string): Promise<ServiceWorkflowExecutionDto> {
    const booking = await this.operations.findBookingById(bookingId);
    if (!booking) throw new Error('SERVICE_BOOKING_NOT_FOUND');
    await this.assertBookingClearance(booking);
    if (
      ![ServiceBookingStatus.CONFIRMED, ServiceBookingStatus.IN_PROGRESS].includes(booking.status)
    )
      throw new Error('SERVICE_BOOKING_NOT_CONFIRMED');
    const existing = await this.operations.findWorkflowExecutionForBooking?.(bookingId);
    if (existing) return existing;
    const definition = await this.operations.findActiveWorkflowDefinition(
      booking.serviceId ?? null,
      booking.packageId ?? null,
    );
    if (!definition || definition.status !== ServiceWorkflowDefinitionStatus.ACTIVE)
      throw new Error('SERVICE_WORKFLOW_ACTIVE_DEFINITION_REQUIRED');
    return this.operations.createWorkflowExecution({
      publicId: `svc_execution_${randomUUID()}`,
      bookingId,
      workflowDefinitionId: definition.id,
      status: ServiceWorkflowExecutionStatus.RUNNING,
      currentStepKey: definition.steps[0]?.key ?? null,
      startedAt: new Date(),
      completedAt: null,
      failureReason: null,
    });
  }

  async addDeliveryArtifact(input: {
    bookingId: string;
    workflowExecutionId?: string | null;
    artifactType: string;
    assetId: string;
    deliveredBy: string;
  }) {
    if (!input.artifactType.trim() || !input.deliveredBy.trim())
      throw new Error('SERVICE_DELIVERY_ARTIFACT_METADATA_REQUIRED');
    await assertAssetReferenceUsable(this.assetReferences, input.assetId, {
      purpose: 'SERVICE_DELIVERY_ARTIFACT',
      expectedOwnerId: input.bookingId,
    });
    const booking = await this.operations.findBookingById(input.bookingId);
    if (!booking) throw new Error('SERVICE_BOOKING_NOT_FOUND');
    await this.assertBookingClearance(booking);
    if (!input.workflowExecutionId || !this.operations.findWorkflowExecutionById)
      throw new Error('SERVICE_WORKFLOW_EXECUTION_REQUIRED');
    const execution = await this.operations.findWorkflowExecutionById(input.workflowExecutionId);
    if (
      !execution ||
      execution.bookingId !== booking.id ||
      execution.status !== ServiceWorkflowExecutionStatus.RUNNING
    )
      throw new Error('SERVICE_DELIVERY_WORKFLOW_MISMATCH');
    const definition = await this.operations.findWorkflowDefinitionById(
      execution.workflowDefinitionId,
    );
    if (
      !definition?.steps
        .find((step) => step.key === execution.currentStepKey)
        ?.requiredArtifactTypes?.includes(input.artifactType)
    )
      throw new Error('SERVICE_DELIVERY_ARTIFACT_TYPE_INVALID');
    return this.operations.addDeliveryArtifact({
      bookingId: input.bookingId,
      workflowExecutionId: input.workflowExecutionId ?? null,
      stepKey: execution.currentStepKey,
      artifactType: input.artifactType,
      assetId: input.assetId,
      deliveredBy: input.deliveredBy,
    });
  }

  async transitionBooking(id: string, status: ServiceBookingStatus, expectedVersion: number) {
    const booking = await this.operations.findBookingById(id);
    if (!booking) throw new Error('SERVICE_BOOKING_NOT_FOUND');
    if (booking.status === status) return booking;
    const allowed: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED'],
      CANCELLED: [],
      COMPLETED: [],
    };
    if (!allowed[booking.status]?.includes(status))
      throw new Error('SERVICE_BOOKING_TRANSITION_INVALID');
    if (status !== ServiceBookingStatus.CANCELLED) await this.assertBookingClearance(booking);
    else {
      const request =
        booking.requestId && (await this.requests?.findRequestById(booking.requestId));
      if (request && (request.financeInvoiceId || request.invoiceLinkState === 'LINK_PENDING')) {
        if (
          !request.financeInvoiceId ||
          !this.finance ||
          !(
            await this.finance.getInvoiceClearance(request.financeInvoiceId, {
              requestPublicId: request.publicId,
              studentReferenceId: request.studentReferenceId,
            })
          ).cancellationCleared
        )
          throw new Error('SERVICE_FINANCE_CANCELLATION_PENDING');
      }
    }
    if (status === ServiceBookingStatus.COMPLETED) {
      const execution = await this.operations.findWorkflowExecutionForBooking?.(id);
      if (execution?.status !== ServiceWorkflowExecutionStatus.COMPLETED)
        throw new Error('SERVICE_DELIVERY_REVIEW_REQUIRED');
    }
    return this.operations.updateBookingStatus(id, status, expectedVersion);
  }
  async advanceWorkflow(id: string, expectedVersion: number) {
    const execution = await this.operations.findWorkflowExecutionById?.(id);
    if (!execution || execution.status !== ServiceWorkflowExecutionStatus.RUNNING)
      throw new Error('SERVICE_WORKFLOW_EXECUTION_NOT_FOUND');
    const booking = await this.operations.findBookingById(execution.bookingId);
    if (!booking) throw new Error('SERVICE_BOOKING_NOT_FOUND');
    await this.assertBookingClearance(booking);
    const definition = await this.operations.findWorkflowDefinitionById(
      execution.workflowDefinitionId,
    );
    const steps = definition?.steps ?? [];
    const index = steps.findIndex((step) => step.key === execution.currentStepKey);
    if (index < 0) throw new Error('SERVICE_WORKFLOW_STEP_INVALID');
    const artifacts = (await this.operations.listDeliveryArtifacts?.(execution.bookingId)) ?? [];
    if (
      (steps[index].requiredArtifactTypes ?? []).some(
        (type) =>
          !artifacts.some(
            (a) =>
              a.workflowExecutionId === id &&
              a.stepKey === execution.currentStepKey &&
              a.artifactType === type,
          ),
      )
    )
      throw new Error('SERVICE_DELIVERY_REVIEW_REQUIRED');
    const next = steps[index + 1];
    return this.operations.updateWorkflowExecution(
      id,
      {
        status: next
          ? ServiceWorkflowExecutionStatus.RUNNING
          : ServiceWorkflowExecutionStatus.COMPLETED,
        currentStepKey: next?.key ?? null,
        completedAt: next ? null : new Date(),
      },
      expectedVersion,
    );
  }
  private async assertBookingClearance(booking: ServiceBookingDto) {
    if (!booking.requestId || !this.requests || !this.finance)
      throw new Error('SERVICE_BOOKING_REQUEST_REQUIRED');
    const provider = await this.requireProvider(booking.providerId);
    if (provider.status !== ServiceProviderStatus.QUALIFIED)
      throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
    const request = await this.requests.findRequestById(booking.requestId);
    if (
      !request ||
      request.studentReferenceId !== booking.studentReferenceId ||
      request.serviceId !== booking.serviceId
    )
      throw new Error('SERVICE_BOOKING_REQUEST_MISMATCH');
    if (
      request.serviceSnapshot?.fulfillmentPolicy !== 'FREE' ||
      BigInt(booking.pricingSnapshot.finalAmountMinorUnits) > 0n
    ) {
      if (
        !request.financeInvoiceId ||
        !(
          await this.finance.getInvoiceClearance(request.financeInvoiceId, {
            requestPublicId: request.publicId,
            studentReferenceId: request.studentReferenceId,
          })
        ).financiallyCleared
      )
        throw new Error('SERVICE_FINANCIAL_CLEARANCE_REQUIRED');
    }
    if (
      booking.status === ServiceBookingStatus.PENDING &&
      (!booking.holdExpiresAt || new Date(booking.holdExpiresAt).getTime() <= Date.now())
    )
      throw new Error('SERVICE_BOOKING_HOLD_EXPIRED');
  }

  private async requireProvider(id: string) {
    const provider = await this.operations.findProviderById(id);
    if (!provider) throw new Error('SERVICE_PROVIDER_NOT_FOUND');
    if (
      provider.status === ServiceProviderStatus.QUALIFIED &&
      (!provider.qualificationMetadata?.assetId ||
        (provider.qualificationMetadata.reviewEvidence as any)?.subjectProviderId !== provider.id ||
        (provider.qualificationMetadata.reviewEvidence as any)?.authorityReviewed !== true ||
        !Number.isFinite(new Date(String(provider.qualificationMetadata.expiresAt)).getTime()) ||
        new Date(String(provider.qualificationMetadata.expiresAt)).getTime() <= Date.now())
    )
      throw new Error('SERVICE_PROVIDER_ACCREDITATION_REQUIRED');
    return provider;
  }

  private async assertServiceOrPackage(
    serviceId: string | null,
    packageId: string | null,
    allowEmpty = false,
  ): Promise<{
    service: Awaited<ReturnType<IServiceCatalogRepository['findById']>>;
    pkg: ServicePackageDto | null;
  }> {
    if (!serviceId && !packageId) {
      if (allowEmpty) return { service: null, pkg: null };
      throw new Error('SERVICE_OR_PACKAGE_REQUIRED');
    }
    if (serviceId && packageId) throw new Error('SERVICE_AND_PACKAGE_MUTUALLY_EXCLUSIVE');
    const service = serviceId ? await this.catalog.findById(serviceId) : null;
    if (serviceId && !service) throw new Error('SERVICE_NOT_FOUND');
    if (
      service &&
      service.status !== ServiceStatus.PUBLISHED &&
      !service.publishedSnapshot &&
      !allowEmpty
    )
      throw new Error('SERVICE_NOT_PUBLISHED');
    const pkg = packageId ? await this.operations.findPackageById(packageId) : null;
    if (packageId && !pkg) throw new Error('SERVICE_PACKAGE_NOT_FOUND');
    if (pkg && pkg.status !== ServicePackageStatus.ACTIVE && !allowEmpty)
      throw new Error('SERVICE_PACKAGE_NOT_ACTIVE');
    return { service, pkg };
  }

  private async resolveDiscountPromotion(
    discountId: string | null,
    promotionId: string | null,
    serviceId: string | null,
    packageId: string | null,
    at: Date,
  ) {
    let promotion: ServicePromotionDto | null = null;
    let discount: ServiceDiscountDto | null = null;
    if (promotionId) {
      promotion = await this.operations.findPromotionById(promotionId);
      if (
        !promotion ||
        promotion.status !== ServicePromotionStatus.ACTIVE ||
        !within(at, promotion.activeFrom, promotion.activeTo)
      )
        throw new Error('SERVICE_PROMOTION_NOT_ACTIVE');
      if (
        (promotion.serviceId && promotion.serviceId !== serviceId) ||
        (promotion.packageId && promotion.packageId !== packageId)
      )
        throw new Error('SERVICE_PROMOTION_SCOPE_MISMATCH');
      discountId = promotion.discountId;
    }
    if (discountId) {
      discount = await this.operations.findDiscountById(discountId);
      if (!discount || !within(at, discount.activeFrom, discount.activeTo))
        throw new Error('SERVICE_DISCOUNT_NOT_ACTIVE');
      if (
        (discount.serviceId && discount.serviceId !== serviceId) ||
        (discount.packageId && discount.packageId !== packageId)
      )
        throw new Error('SERVICE_DISCOUNT_SCOPE_MISMATCH');
    }
    return { discount, promotion };
  }

  private quote(
    pricing: ServicePricingDto,
    discount: ServiceDiscountDto | null,
    promotion: ServicePromotionDto | null,
    at: Date,
  ): ServiceBookingPricingSnapshot {
    const base = this.money(pricing.amountMinorUnits);
    let reduction = 0n;
    if (discount?.discountType === ServiceDiscountType.FIXED) {
      if (discount.currencyCode !== pricing.currencyCode)
        throw new Error('SERVICE_DISCOUNT_CURRENCY_MISMATCH');
      reduction = this.money(discount.valueMinorUnits ?? '0');
    } else if (discount?.discountType === ServiceDiscountType.PERCENTAGE) {
      reduction = (base * BigInt(discount.percentageBasisPoints ?? 0)) / 10000n;
    }
    if (reduction > base) reduction = base;
    return {
      pricingId: pricing.id,
      baseAmountMinorUnits: base.toString(),
      discountId: discount?.id ?? null,
      promotionId: promotion?.id ?? null,
      discountMinorUnits: reduction.toString(),
      finalAmountMinorUnits: (base - reduction).toString(),
      currencyCode: pricing.currencyCode,
      scale: pricing.scale,
      capturedAt: at,
      pricingFingerprint: pricing.immutableFingerprint,
    };
  }

  private money(value: string) {
    if (!/^(?:0|[1-9]\d{0,29})$/.test(value)) throw new Error('SERVICE_MONEY_MINOR_UNITS_INVALID');
    return BigInt(value);
  }

  private assertTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      throw new Error('SERVICE_TIMEZONE_INVALID');
    }
  }
}
