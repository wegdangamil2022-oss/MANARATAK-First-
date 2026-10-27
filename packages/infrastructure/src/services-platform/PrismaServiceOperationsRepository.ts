import { randomUUID } from 'node:crypto';
import { decodeStableCursor, encodeStableCursor } from '../api-foundation/StableCursor';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  CreateServiceBookingInput,
  IServiceOperationsRepository,
  ServiceAvailabilitySlotDto,
  ServiceBookingDto,
  ServiceBookingStatus,
  ServiceDeliveryArtifactDto,
  ServiceDiscountDto,
  ServicePackageDto,
  ServicePackageStatus,
  ServicePricingDto,
  ServicePricingStatus,
  ServicePromotionDto,
  ServicePromotionStatus,
  ServiceProviderDto,
  ServiceProviderStatus,
  ServiceWorkflowDefinitionDto,
  ServiceWorkflowDefinitionStatus,
  ServiceWorkflowExecutionDto,
} from '@manaratak/domain';

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const array = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export class PrismaServiceOperationsRepository implements IServiceOperationsRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly context?: { actorId: string; correlationId: string; reason: string },
  ) {}
  withActor(context: { actorId: string; correlationId: string; reason: string }) {
    return new PrismaServiceOperationsRepository(this.prisma, context);
  }
  async findBookingByPublicId(publicId: string) {
    const row = await this.p().serviceBookingRecord.findUnique({
      where: { publicId },
      include: { items: true },
    });
    return row ? this.mapBooking(row) : null;
  }
  async findBookingForRequest(requestId: string) {
    const row = await this.p().serviceBookingRecord.findUnique({
      where: { requestId },
      include: { items: true },
    });
    return row ? this.mapBooking(row) : null;
  }
  async listActivePackages(serviceId: string, cursor?: string) {
    const after = decodeStableCursor(cursor);
    const rows = await this.p().servicePackageRecord.findMany({
      where: {
        status: 'ACTIVE',
        items: { some: { serviceId } },
        ...(after ? { id: { gt: after } } : {}),
      },
      include: { items: { orderBy: { sequence: 'asc' } } },
      orderBy: { id: 'asc' },
      take: 21,
    });
    return {
      data: rows.slice(0, 20).map((row: any) => this.mapPackage(row)),
      nextCursor: rows.length > 20 ? encodeStableCursor(rows[19].id) : null,
    };
  }
  async listAvailableSlots(serviceId: string, cursor?: string) {
    const after = decodeStableCursor(cursor);
    const rows = await this.p().serviceAvailabilitySlotRecord.findMany({
      where: {
        serviceId,
        status: 'AVAILABLE',
        startsAt: { gt: new Date() },
        provider: {
          status: 'QUALIFIED',
          AND: [
            {
              qualificationMetadata: {
                path: ['reviewEvidence', 'authorityReviewed'],
                equals: true,
              },
            },
            { qualificationMetadata: { path: ['expiresAt'], gt: new Date().toISOString() } },
          ],
        },
        ...(after ? { id: { gt: after } } : {}),
      },
      select: { id: true, startsAt: true, endsAt: true, timezone: true },
      orderBy: { id: 'asc' },
      take: 51,
    });
    const data = rows.slice(0, 50);
    return {
      data,
      nextCursor: rows.length > 50 ? encodeStableCursor(data[data.length - 1].id) : null,
    };
  }
  async listOperations(kind: string, page: number, assignedStaffId?: string, search?: string) {
    const names: Record<string, string> = {
      providers: 'serviceProviderRecord',
      packages: 'servicePackageRecord',
      pricing: 'servicePricingRecord',
      promotions: 'servicePromotionRecord',
      slots: 'serviceAvailabilitySlotRecord',
      bookings: 'serviceBookingRecord',
      workflows: 'serviceWorkflowDefinitionRecord',
      executions: 'serviceWorkflowExecutionRecord',
      deliveries: 'serviceDeliveryArtifactRecord',
      discounts: 'serviceDiscountRecord',
    };
    const model = names[kind];
    const query = search?.trim();
    if (!model || !Number.isSafeInteger(page) || page < 1 || page > 10000)
      throw new Error('SERVICE_OPERATION_QUERY_INVALID');
    if (query && query.length > 120) throw new Error('SERVICE_OPERATION_QUERY_INVALID');
    const scope = assignedStaffId
      ? kind === 'bookings'
        ? { request: { assignedStaffId } }
        : ['executions', 'deliveries'].includes(kind)
          ? { booking: { request: { assignedStaffId } } }
          : {}
      : {};
    const searchFields = kind === 'deliveries'
      ? ['id', 'artifactType']
      : ['id', 'publicId', ...(
        ['providers','packages'].includes(kind) ? ['displayName']
        : ['workflows','promotions'].includes(kind) ? ['name']
        : kind === 'discounts' ? ['code'] : []
      )];
    const where = {
      ...scope,
      ...(query && { OR: searchFields.map(field => ({[field]: {contains: query, mode: 'insensitive'}})) }),
    };
    const [data, total] = await Promise.all([
      this.p()[model].findMany({ where, take: 20, skip: (page - 1) * 20, orderBy: { id: 'asc' } }),
      this.p()[model].count({ where }),
    ]);
    return {
      data: kind === 'bookings' ? data.map(({ inputSnapshot: _inputs, ...row }: any) => row) : data,
      total, page,
    };
  }
  private async event(tx: any, model: string, value: any, action: string) {
    if (!this.context?.actorId || !this.context.reason || !tx.transactionalOutboxRecord?.create)
      throw new Error('SERVICE_OPERATIONS_AUDIT_REQUIRED');
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        eventType: 'ServiceOperationChanged.v1',
        domain: 'SERVICES',
        aggregateType: model,
        aggregateId: value.id,
        payload: { id: value.id, version: value.version, status: value.status, action },
        metadata: { schemaVersion: 1, ...this.context },
        correlationId: this.context.correlationId,
        state: 'PENDING',
        attempts: 0,
        availableAt: new Date(),
        createdAt: new Date(),
      },
    });
  }
  private async write(model: string, action: 'create' | 'update', args: any) {
    if (!this.context) throw new Error('SERVICE_OPERATIONS_AUDIT_REQUIRED');
    return this.prisma.$transaction(
      async (tx: any) => {
        if (
          action === 'create' &&
          !['serviceDiscountRecord', 'serviceDeliveryArtifactRecord'].includes(model)
        )
          args.data.makerActorId = this.context!.actorId;
        if (action === 'update') {
          const version = args.where.version;
          if (!Number.isSafeInteger(version) || version < 1)
            throw new Error('SERVICE_OPERATION_EXPECTED_VERSION_REQUIRED');
          const existing = await tx[model].findUnique({ where: { id: args.where.id } });
          if (!existing || existing.version !== version)
            throw new Error('SERVICE_OPERATION_VERSION_CONFLICT');
          if (['RETIRED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(existing.status))
            throw new Error('SERVICE_OPERATION_TERMINAL');
          if (
            ['QUALIFIED', 'ACTIVE'].includes(args.data.status) &&
            (!existing.makerActorId || existing.makerActorId === this.context!.actorId)
          )
            throw new Error('SERVICE_INDEPENDENT_REVIEW_REQUIRED');
          if (model === 'serviceProviderRecord' && args.data.status === 'QUALIFIED') {
            const proof = args.reviewEvidence;
            if (
              !proof ||
              proof.legalReviewed !== true ||
              proof.authorityReviewed !== true ||
              proof.scopeReviewed !== true ||
              !proof.documentSha256
            )
              throw new Error('SERVICE_PROVIDER_REVIEW_REQUIRED');
            args.data.qualificationMetadata = {
              ...existing.qualificationMetadata,
              reviewEvidence: {
                ...proof,
                subjectProviderId: existing.id,
                reviewerActorId: this.context!.actorId,
                reviewedVersion: version,
                reviewedAt: new Date().toISOString(),
              },
            };
            delete args.reviewEvidence;
          }
          if (model === 'servicePricingRecord' && args.data.status === 'ACTIVE') {
            const overlap = await tx.servicePricingRecord.findFirst({
              where: {
                id: { not: existing.id },
                serviceId: existing.serviceId,
                packageId: existing.packageId,
                status: 'ACTIVE',
                ...(existing.effectiveTo ? { effectiveFrom: { lt: existing.effectiveTo } } : {}),
                OR: [{ effectiveTo: null }, { effectiveTo: { gt: existing.effectiveFrom } }],
              },
            });
            if (overlap) throw new Error('SERVICE_PRICING_ACTIVE_VERSION_EXISTS');
          }
          if (model === 'serviceBookingRecord') {
            if (
              args.data.status === 'CONFIRMED' &&
              (!existing.holdExpiresAt || existing.holdExpiresAt <= new Date())
            )
              throw new Error('SERVICE_BOOKING_HOLD_EXPIRED');
            if (args.data.status === 'CANCELLED' && existing.discountState === 'RESERVED') {
              if (existing.pricingSnapshot?.discountId)
                await tx.serviceDiscountRecord.updateMany({
                  where: { id: existing.pricingSnapshot.discountId, redemptionCount: { gt: 0 } },
                  data: { redemptionCount: { decrement: 1 } },
                });
              args.data.discountState = 'RELEASED';
            }
            if (args.data.status === 'CONFIRMED') {
              args.data.discountState = 'COMMITTED';
              args.data.holdExpiresAt = null;
            }
          }
          args.data.version = { increment: 1 };
        }
        const value = await tx[model][action](args);
        await this.event(tx, model, value, action);
        return value;
      },
      { isolationLevel: 'Serializable' },
    );
  }
  private p(client: any = this.prisma as any) {
    return client;
  }

  async createProvider(
    data: Omit<ServiceProviderDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceProviderDto> {
    const row = await this.write('serviceProviderRecord', 'create', {
      data: {
        publicId: data.publicId,
        displayName: data.displayName,
        status: data.status,
        timezone: data.timezone,
        capacity: data.capacity,
        countryReferenceId: data.countryReferenceId ?? null,
        qualificationMetadata: data.qualificationMetadata ?? null,
        supportedServices: { create: data.supportedServiceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { supportedServices: true },
    });
    return this.mapProvider(row);
  }

  async updateProviderEvidence(
    id: string,
    evidence: { assetId: string; expiresAt: string },
    expectedVersion: number,
  ) {
    return this.mapProvider(
      await this.write('serviceProviderRecord', 'update', {
        where: { id, version: expectedVersion },
        data: {
          qualificationMetadata: evidence,
          status: 'DRAFT',
          makerActorId: this.context?.actorId,
        },
        include: { supportedServices: true },
      }),
    );
  }
  async updateProviderStatus(
    id: string,
    status: ServiceProviderStatus,
    expectedVersion?: number,
    reviewEvidence?: Record<string, unknown>,
  ): Promise<ServiceProviderDto> {
    return this.mapProvider(
      await this.write('serviceProviderRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
        reviewEvidence,
        include: { supportedServices: true },
      }),
    );
  }

  async findProviderById(id: string): Promise<ServiceProviderDto | null> {
    const row = await this.p().serviceProviderRecord.findUnique({
      where: { id },
      include: { supportedServices: true },
    });
    return row ? this.mapProvider(row) : null;
  }

  async createPackage(
    data: Omit<ServicePackageDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServicePackageDto> {
    const row = await this.write('servicePackageRecord', 'create', {
      data: {
        publicId: data.publicId,
        displayName: data.displayName,
        status: data.status,
        metadata: data.metadata ?? null,
        items: {
          create: data.items.map((item) => ({
            serviceId: item.serviceId,
            sequence: item.sequence,
            quantity: item.quantity,
            required: item.required,
          })),
        },
      },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    return this.mapPackage(row);
  }

  async updatePackageStatus(
    id: string,
    status: ServicePackageStatus,
    expectedVersion?: number,
  ): Promise<ServicePackageDto> {
    return this.mapPackage(
      await this.write('servicePackageRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
        include: { items: { orderBy: { sequence: 'asc' } } },
      }),
    );
  }

  async findPackageById(id: string): Promise<ServicePackageDto | null> {
    const row = await this.p().servicePackageRecord.findUnique({
      where: { id },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    return row ? this.mapPackage(row) : null;
  }

  async createPricing(
    data: Omit<ServicePricingDto, 'id' | 'createdAt'>,
  ): Promise<ServicePricingDto> {
    return this.mapPricing(await this.write('servicePricingRecord', 'create', { data }));
  }

  async updatePricingStatus(
    id: string,
    status: ServicePricingStatus,
    expectedVersion?: number,
  ): Promise<ServicePricingDto> {
    return this.mapPricing(
      await this.write('servicePricingRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
      }),
    );
  }
  async findPricingById(id: string): Promise<ServicePricingDto | null> {
    const row = await this.p().servicePricingRecord.findUnique({ where: { id } });
    return row ? this.mapPricing(row) : null;
  }

  async retirePricing(id: string, effectiveTo: Date, expectedVersion?: number): Promise<void> {
    await this.write('servicePricingRecord', 'update', {
      where: { id, version: expectedVersion },
      data: { status: ServicePricingStatus.RETIRED, effectiveTo },
    });
  }

  async findActivePricing(
    serviceId: string | null,
    packageId: string | null,
    at: Date,
  ): Promise<ServicePricingDto | null> {
    const row = await this.p().servicePricingRecord.findFirst({
      where: {
        serviceId,
        packageId,
        status: ServicePricingStatus.ACTIVE,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
    return row ? this.mapPricing(row) : null;
  }

  async createDiscount(
    data: Omit<ServiceDiscountDto, 'id' | 'createdAt'>,
  ): Promise<ServiceDiscountDto> {
    return this.mapDiscount(await this.write('serviceDiscountRecord', 'create', { data }));
  }
  async findDiscountById(id: string): Promise<ServiceDiscountDto | null> {
    const row = await this.p().serviceDiscountRecord.findUnique({ where: { id } });
    return row ? this.mapDiscount(row) : null;
  }
  async createPromotion(
    data: Omit<ServicePromotionDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServicePromotionDto> {
    return this.mapPromotion(await this.write('servicePromotionRecord', 'create', { data }));
  }
  async updatePromotionStatus(
    id: string,
    status: ServicePromotionStatus,
    expectedVersion?: number,
  ): Promise<ServicePromotionDto> {
    return this.mapPromotion(
      await this.write('servicePromotionRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
      }),
    );
  }
  async findPromotionById(id: string): Promise<ServicePromotionDto | null> {
    const row = await this.p().servicePromotionRecord.findUnique({ where: { id } });
    return row ? this.mapPromotion(row) : null;
  }

  async createAvailabilitySlot(
    data: Omit<ServiceAvailabilitySlotDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceAvailabilitySlotDto> {
    return this.mapSlot(await this.write('serviceAvailabilitySlotRecord', 'create', { data }));
  }
  async findAvailabilitySlotById(id: string): Promise<ServiceAvailabilitySlotDto | null> {
    const row = await this.p().serviceAvailabilitySlotRecord.findUnique({ where: { id } });
    return row ? this.mapSlot(row) : null;
  }

  private async expireHolds(tx: any, limit: number, now: Date) {
    const rows = await tx.serviceBookingRecord.findMany({
      where: { status: 'PENDING', holdExpiresAt: { lte: now } },
      orderBy: [{ holdExpiresAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    let count = 0;
    for (const old of rows) {
      const changed = await tx.serviceBookingRecord.updateMany({
        where: { id: old.id, version: old.version, status: 'PENDING', holdExpiresAt: { lte: now } },
        data: { status: 'CANCELLED', version: { increment: 1 }, discountState: 'RELEASED' },
      });
      if (changed.count !== 1) continue;
      if (old.discountState === 'RESERVED' && old.pricingSnapshot?.discountId)
        await tx.serviceDiscountRecord.updateMany({
          where: { id: old.pricingSnapshot.discountId, redemptionCount: { gt: 0 } },
          data: { redemptionCount: { decrement: 1 } },
        });
      const pending = await tx.serviceRequestRecord.updateMany({
        where: {
          id: old.requestId,
          OR: [{ financeInvoiceId: { not: null } }, { invoiceLinkState: 'LINK_PENDING' }],
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        data: { cancellationState: 'PENDING_FINANCE', version: { increment: 1 } },
      });
      if (pending.count) {
        const request = await tx.serviceRequestRecord.findUnique({ where: { id: old.requestId } });
        await this.event(tx, 'ServiceRequest', request, 'CANCELLATION_FINANCE_PENDING');
      }
      await this.event(
        tx,
        'ServiceBooking',
        { ...old, version: old.version + 1, status: 'CANCELLED' },
        'EXPIRE',
      );
      count++;
    }
    return count;
  }
  async sweepExpiredHolds(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error('SERVICE_MAINTENANCE_LIMIT_INVALID');
    return this.prisma.$transaction(
      async (tx: any) => {
        const now = new Date();
        const count = await this.expireHolds(tx, limit, now);
        const expiredInputs = await tx.serviceBookingRecord.findMany({
          where: {
            inputsErasedAt: null,
            status: { in: ['COMPLETED', 'CANCELLED'] },
            request: {
              status: { in: ['COMPLETED', 'CANCELLED'] },
              retentionUntil: { lte: now },
              OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }],
            },
          },
          orderBy: { id: 'asc' },
          take: limit,
        });
        for (const row of expiredInputs) {
          const changed = await tx.serviceBookingRecord.updateMany({
            where: { id: row.id, version: row.version, inputsErasedAt: null },
            data: { inputSnapshot: Prisma.DbNull, inputsErasedAt: now, version: { increment: 1 } },
          });
          if (changed.count)
            await this.event(
              tx,
              'ServiceBooking',
              { ...row, version: row.version + 1 },
              'ERASE_PACKAGE_INPUTS',
            );
        }
        return count;
      },
      { isolationLevel: 'Serializable' },
    );
  }
  async createBookingWithCapacity(data: CreateServiceBookingInput): Promise<ServiceBookingDto> {
    const transaction = (this.prisma as any).$transaction;
    if (typeof transaction !== 'function') throw new Error('SERVICE_BOOKING_TRANSACTION_REQUIRED');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await transaction.call(
          this.prisma,
          async (tx: any) => {
            const replay = await tx.serviceBookingRecord.findUnique({
              where: { publicId: data.publicId },
              include: { items: true },
            });
            if (replay) {
              if (replay.payloadFingerprint !== data.payloadFingerprint)
                throw new Error('SERVICE_BOOKING_PAYLOAD_CONFLICT');
              return this.mapBooking(replay);
            }
            await this.expireHolds(tx, 100, new Date());
            if (!data.requestId) throw new Error('SERVICE_BOOKING_REQUEST_REQUIRED');
            const request = await tx.serviceRequestRecord.findUnique({
              where: { id: data.requestId },
            });
            if (
              !request ||
              request.studentReferenceId !== data.studentReferenceId ||
              request.serviceId !== data.serviceId ||
              ['CANCELLED', 'COMPLETED'].includes(request.status)
            )
              throw new Error('SERVICE_BOOKING_REQUEST_MISMATCH');
            if (request.financeInvoiceId || request.invoiceIntent)
              throw new Error('SERVICE_BOOKING_BEFORE_INVOICE_REQUIRED');
            const reserved = await tx.serviceRequestRecord.updateMany({
              where: { id: request.id, version: request.version, financeInvoiceId: null },
              data: { version: { increment: 1 } },
            });
            if (reserved.count !== 1) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
            const slot = await tx.serviceAvailabilitySlotRecord.findUnique({
              where: { id: data.slotId },
            });
            const provider = await tx.serviceProviderRecord.findUnique({
              where: { id: data.providerId },
              include: { supportedServices: true },
            });
            if (!slot || !provider) throw new Error('SERVICE_BOOKING_CAPACITY_AUTHORITY_MISSING');
            if (provider.status !== ServiceProviderStatus.QUALIFIED)
              throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
            if (slot.status !== 'AVAILABLE') throw new Error('SERVICE_BOOKING_SLOT_UNAVAILABLE');
            if (slot.providerId !== data.providerId)
              throw new Error('SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH');
            if (!data.items.some((item) => item.serviceId === slot.serviceId))
              throw new Error('SERVICE_BOOKING_SLOT_SERVICE_MISMATCH');
            const supportedServiceIds = new Set(
              (provider.supportedServices ?? []).map((item: any) => item.serviceId),
            );
            if (!data.items.every((item) => supportedServiceIds.has(item.serviceId)))
              throw new Error('SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH');
            const now = new Date();
            if (slot.startsAt <= now) throw new Error('SERVICE_BOOKING_SLOT_ALREADY_STARTED');
            const price = await tx.servicePricingRecord.findUnique({
              where: { id: data.pricingSnapshot.pricingId },
            });
            if (
              !price ||
              price.status !== ServicePricingStatus.ACTIVE ||
              price.immutableFingerprint !== data.pricingSnapshot.pricingFingerprint ||
              price.effectiveFrom > now ||
              (price.effectiveTo && price.effectiveTo <= now) ||
              price.serviceId !== (data.packageId ? null : (data.serviceId ?? null)) ||
              price.packageId !== (data.packageId ?? null)
            ) {
              throw new Error('SERVICE_BOOKING_PRICING_SNAPSHOT_STALE');
            }
            if (data.pricingSnapshot.discountId) {
              const discount = await tx.serviceDiscountRecord.findUnique({
                where: { id: data.pricingSnapshot.discountId },
              });
              if (
                !discount ||
                discount.activeFrom > now ||
                (discount.activeTo && discount.activeTo <= now)
              )
                throw new Error('SERVICE_DISCOUNT_NOT_ACTIVE');
              if (discount.serviceId && discount.serviceId !== (data.serviceId ?? null))
                throw new Error('SERVICE_DISCOUNT_SCOPE_MISMATCH');
              if (discount.packageId && discount.packageId !== (data.packageId ?? null))
                throw new Error('SERVICE_DISCOUNT_SCOPE_MISMATCH');
              if (
                discount.maxRedemptions != null &&
                discount.redemptionCount >= discount.maxRedemptions
              )
                throw new Error('SERVICE_DISCOUNT_REDEMPTION_LIMIT_REACHED');
              const redeemed = await tx.serviceDiscountRecord.updateMany({
                where: { id: discount.id, redemptionCount: discount.redemptionCount },
                data: { redemptionCount: { increment: 1 } },
              });
              if (redeemed.count !== 1)
                throw new Error('SERVICE_DISCOUNT_ATOMIC_REDEMPTION_CONFLICT');
            }
            const capacity = Math.min(slot.capacity, provider.capacity);
            const activeStatuses = [
              ServiceBookingStatus.PENDING,
              ServiceBookingStatus.CONFIRMED,
              ServiceBookingStatus.IN_PROGRESS,
            ];
            const activeCount = await tx.serviceBookingRecord.count({
              where: {
                slotId: data.slotId,
                status: { in: activeStatuses },
                OR: [{ status: { not: 'PENDING' } }, { holdExpiresAt: { gt: now } }],
              },
            });
            if (activeCount >= capacity) throw new Error('SERVICE_BOOKING_CAPACITY_EXHAUSTED');
            const overlappingAssignments = await tx.serviceBookingRecord.count({
              where: {
                OR: [{ status: { not: 'PENDING' } }, { holdExpiresAt: { gt: now } }],
                providerId: data.providerId,
                status: { in: activeStatuses },
                startsAt: { lt: slot.endsAt },
                endsAt: { gt: slot.startsAt },
              },
            });
            if (overlappingAssignments >= provider.capacity)
              throw new Error('SERVICE_PROVIDER_CONCURRENT_CAPACITY_EXHAUSTED');
            const row = await tx.serviceBookingRecord.create({
              data: {
                publicId: data.publicId,
                inputSnapshot: data.inputSnapshot,
                requestId: data.requestId,
                payloadFingerprint: data.payloadFingerprint,
                holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
                makerActorId: this.context?.actorId,
                studentReferenceId: data.studentReferenceId,
                serviceId: data.serviceId ?? null,
                packageId: data.packageId ?? null,
                providerId: data.providerId,
                slotId: data.slotId,
                status: ServiceBookingStatus.PENDING,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                timezone: slot.timezone,
                pricingSnapshot: data.pricingSnapshot,
                items: {
                  create: data.items.map((item) => ({
                    serviceId: item.serviceId,
                    packageItemId: item.packageItemId ?? null,
                    sequence: item.sequence,
                    quantity: item.quantity,
                    status: item.status,
                  })),
                },
              },
              include: { items: { orderBy: { sequence: 'asc' } } },
            });
            await this.event(tx, 'ServiceBooking', row, 'RESERVE');
            return this.mapBooking(row);
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if ((error as any)?.code !== 'P2034' || attempt === 2)
          throw (error as any)?.code === 'P2034'
            ? new Error('SERVICE_BOOKING_CAPACITY_CONFLICT')
            : error;
      }
    }
    throw new Error('SERVICE_BOOKING_CAPACITY_CONFLICT');
  }

  async findBookingById(id: string): Promise<ServiceBookingDto | null> {
    const row = await this.p().serviceBookingRecord.findUnique({
      where: { id },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    return row ? this.mapBooking(row) : null;
  }
  async updateBookingStatus(
    id: string,
    status: ServiceBookingStatus,
    expectedVersion?: number,
  ): Promise<ServiceBookingDto> {
    return this.mapBooking(
      await this.write('serviceBookingRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
        include: { items: { orderBy: { sequence: 'asc' } } },
      }),
    );
  }

  async createWorkflowDefinition(
    data: Omit<ServiceWorkflowDefinitionDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceWorkflowDefinitionDto> {
    return this.mapWorkflowDefinition(
      await this.write('serviceWorkflowDefinitionRecord', 'create', {
        data: { ...data, steps: data.steps },
      }),
    );
  }
  async updateWorkflowDefinitionStatus(
    id: string,
    status: ServiceWorkflowDefinitionStatus,
    expectedVersion?: number,
  ): Promise<ServiceWorkflowDefinitionDto> {
    return this.mapWorkflowDefinition(
      await this.write('serviceWorkflowDefinitionRecord', 'update', {
        where: { id, version: expectedVersion },
        data: { status },
      }),
    );
  }
  async findWorkflowDefinitionById(id: string): Promise<ServiceWorkflowDefinitionDto | null> {
    const row = await this.p().serviceWorkflowDefinitionRecord.findUnique({ where: { id } });
    return row ? this.mapWorkflowDefinition(row) : null;
  }
  async findActiveWorkflowDefinition(
    serviceId: string | null,
    packageId: string | null,
  ): Promise<ServiceWorkflowDefinitionDto | null> {
    const row = await this.p().serviceWorkflowDefinitionRecord.findFirst({
      where: { serviceId, packageId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? this.mapWorkflowDefinition(row) : null;
  }
  async createWorkflowExecution(
    data: Omit<ServiceWorkflowExecutionDto, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceWorkflowExecutionDto> {
    try {
      return this.mapWorkflowExecution(
        await this.write('serviceWorkflowExecutionRecord', 'create', {
          data: { ...data, executionClaim: data.bookingId },
        }),
      );
    } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const replay = await this.findWorkflowExecutionForBooking(data.bookingId);
      if (!replay || replay.workflowDefinitionId !== data.workflowDefinitionId)
        throw new Error('SERVICE_OPERATION_VERSION_CONFLICT');
      return replay;
    }
  }
  async updateWorkflowExecution(
    id: string,
    data: Partial<
      Pick<
        ServiceWorkflowExecutionDto,
        'status' | 'currentStepKey' | 'startedAt' | 'completedAt' | 'failureReason'
      >
    >,
    expectedVersion?: number,
  ): Promise<ServiceWorkflowExecutionDto> {
    return this.mapWorkflowExecution(
      await this.write('serviceWorkflowExecutionRecord', 'update', {
        where: { id, version: expectedVersion },
        data,
      }),
    );
  }
  async addDeliveryArtifact(
    data: Omit<ServiceDeliveryArtifactDto, 'id' | 'deliveredAt'>,
  ): Promise<ServiceDeliveryArtifactDto> {
    return this.mapArtifact(await this.write('serviceDeliveryArtifactRecord', 'create', { data }));
  }

  async findWorkflowExecutionById(id: string) {
    const row = await this.p().serviceWorkflowExecutionRecord.findUnique({ where: { id } });
    return row ? this.mapWorkflowExecution(row) : null;
  }
  async findWorkflowExecutionForBooking(bookingId: string) {
    const row = await this.p().serviceWorkflowExecutionRecord.findUnique({
      where: { executionClaim: bookingId },
    });
    return row ? this.mapWorkflowExecution(row) : null;
  }
  async listDeliveryArtifacts(bookingId: string) {
    return (
      await this.p().serviceDeliveryArtifactRecord.findMany({ where: { bookingId }, take: 100 })
    ).map((row: any) => this.mapArtifact(row));
  }
  private mapProvider(row: any): ServiceProviderDto {
    return {
      ...row,
      supportedServiceIds: (row.supportedServices ?? []).map((item: any) => item.serviceId),
      qualificationMetadata: object(row.qualificationMetadata),
    };
  }
  private mapPackage(row: any): ServicePackageDto {
    return {
      ...row,
      items: (row.items ?? []).map((item: any) => ({
        id: item.id,
        packageId: item.packageId,
        serviceId: item.serviceId,
        sequence: item.sequence,
        quantity: item.quantity,
        required: item.required,
      })),
      metadata: object(row.metadata),
    };
  }
  private mapPricing(row: any): ServicePricingDto {
    return { ...row };
  }
  private mapDiscount(row: any): ServiceDiscountDto {
    return { ...row };
  }
  private mapPromotion(row: any): ServicePromotionDto {
    return { ...row, metadata: object(row.metadata) };
  }
  private mapSlot(row: any): ServiceAvailabilitySlotDto {
    return { ...row };
  }
  private mapBooking(row: any): ServiceBookingDto {
    return {
      ...row,
      pricingSnapshot: object(row.pricingSnapshot) as any,
      items: array(row.items).map((item: any) => ({ ...item })),
    };
  }
  private mapWorkflowDefinition(row: any): ServiceWorkflowDefinitionDto {
    return { ...row, steps: array(row.steps) as any };
  }
  private mapWorkflowExecution(row: any): ServiceWorkflowExecutionDto {
    return { ...row };
  }
  private mapArtifact(row: any): ServiceDeliveryArtifactDto {
    return { ...row };
  }
}
