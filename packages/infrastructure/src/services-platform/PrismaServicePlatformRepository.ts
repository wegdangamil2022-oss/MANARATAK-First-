import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  CreateServiceCatalogItemDto,
  CreateServiceRequestDto,
  IServiceCatalogRepository,
  IServiceRequestRepository,
  PaginatedServiceCatalogResult,
  PaginatedServiceRequestResult,
  PublicServiceCatalogFilters,
  ServiceCatalogFilters,
  ServiceCatalogItemDto,
  ServiceRequestDto,
  ServiceRequestFilters,
  ServiceRequestStatus,
  ServiceStatus,
  ServiceCatalogRepositoryUpdateDto,
} from '@manaratak/domain';

import {
  boundedCursorLimit,
  decodeStableCursor,
  encodeStableCursor,
} from '../api-foundation/StableCursor';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const asStrings = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;

export class PrismaServicePlatformRepository
  implements IServiceCatalogRepository, IServiceRequestRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  private catalog(client: any = this.prisma) {
    return client.serviceCatalogRecord;
  }
  private requests(client: any = this.prisma) {
    return client.serviceRequestRecord;
  }

  private async atomicEvent<T extends { id: string; publicId?: string; version?: number }>(
    eventType: string,
    aggregateType: string,
    mutate: (tx: any) => Promise<T>,
    payload: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx: any) => {
        const value = await mutate(tx);
        if (!tx.transactionalOutboxRecord?.create)
          throw new Error('SERVICE_DURABLE_OUTBOX_REQUIRED');
        const now = new Date();
        await tx.transactionalOutboxRecord.create({
          data: {
            id: randomUUID(),
            eventType,
            domain: 'SERVICES',
            aggregateType,
            aggregateId: value.id,
            payload: payload(value),
            metadata: { schemaVersion: 1, ownerDomain: 'SERVICES' },
            correlationId: randomUUID(),
            state: 'PENDING',
            attempts: 0,
            availableAt: now,
            createdAt: now,
          },
        });
        return value;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async create(data: CreateServiceCatalogItemDto): Promise<ServiceCatalogItemDto> {
    const row = await this.atomicEvent(
      'ServiceCatalogCreated.v1',
      'ServiceCatalogItem',
      async (tx) =>
        this.catalog(tx).create({
          data: {
            publicId: data.publicId,
            approvedPrice: data.approvedPrice === null ? Prisma.DbNull : data.approvedPrice,
            cancellationPolicyCode: data.cancellationPolicyCode,
            reviewEvidence: data.reviewEvidence === null ? Prisma.DbNull : data.reviewEvidence,
            fulfillmentPolicy: data.fulfillmentPolicy,
            inputSchema: data.inputSchema,
            localizedContent: data.localizedContent,
            makerActorId: data.makerActorId,
            reviewerActorId: data.reviewerActorId,
            reviewedVersion: data.reviewedVersion,
            publishedSnapshot:
              data.publishedSnapshot === null ? Prisma.DbNull : data.publishedSnapshot,
            slug: data.slug,
            canonicalName: data.canonicalName,
            canonicalDedupKey: data.canonicalDedupKey,
            displayName: data.displayName,
            status: data.status,
            completenessStatus: data.completenessStatus,
            serviceCategory: data.serviceCategory,
            fulfillmentType: data.fulfillmentType,
            serviceDescription: data.serviceDescription,
            serviceAvailabilityStatus: data.serviceAvailabilityStatus,
            requiredInputsOrDocuments: data.requiredInputsOrDocuments,
            deliveryMode: data.deliveryMode,
            responsibleServiceOwnerType: data.responsibleServiceOwnerType,
            providerName: data.providerName,
            providerReferenceId: data.providerReferenceId,
            estimatedDeliveryTime: data.estimatedDeliveryTime,
            slaPolicy: data.slaPolicy,
            appointmentRequired: data.appointmentRequired,
            supportedCountryLabels: data.supportedCountries,
            supportedLanguageLabels: data.supportedLanguages,
            servicePrerequisites: data.servicePrerequisites,
            deliveryArtifactTypes: data.deliveryArtifactTypes,
            pricingReferenceId: data.pricingReferenceId,
            thumbnailAssetId: data.thumbnailAssetId,
            publicDisplayMetadata: data.publicDisplayMetadata,
            optionalFields: data.optionalFields,
            supportedCountries: data.supportedCountryReferenceIds?.length
              ? {
                  create: data.supportedCountryReferenceIds.map((countryReferenceId) => ({
                    countryReferenceId,
                  })),
                }
              : undefined,
            supportedLanguages: data.supportedLanguageReferenceIds?.length
              ? {
                  create: data.supportedLanguageReferenceIds.map((languageReferenceId) => ({
                    languageReferenceId,
                  })),
                }
              : undefined,
          },
          include: this.catalogInclude(),
        }),
      (row) => ({
        serviceId: row.id,
        publicId: row.publicId,
        status: row.status,
        version: row.version,
      }),
    );
    return this.mapCatalog(row);
  }

  async update(
    id: string,
    data: ServiceCatalogRepositoryUpdateDto,
    expectedVersion: number,
  ): Promise<ServiceCatalogItemDto> {
    const countryIds = data.supportedCountryReferenceIds;
    const languageIds = data.supportedLanguageReferenceIds;
    let row: any;
    try {
      row = await this.atomicEvent(
        'ServiceCatalogUpdated.v1',
        'ServiceCatalogItem',
        async (tx) =>
          this.catalog(tx).update({
            where: { id_version: { id, version: expectedVersion } },
            data: {
              version: { increment: 1 },
              approvedPrice: data.approvedPrice === null ? Prisma.DbNull : data.approvedPrice,
              cancellationPolicyCode: data.cancellationPolicyCode,
              reviewEvidence: data.reviewEvidence === null ? Prisma.DbNull : data.reviewEvidence,
              fulfillmentPolicy: data.fulfillmentPolicy,
              inputSchema: data.inputSchema,
              localizedContent: data.localizedContent,
              makerActorId: data.makerActorId,
              reviewerActorId: data.reviewerActorId,
              reviewedVersion: data.reviewedVersion,
              publishedSnapshot:
                data.publishedSnapshot === null ? Prisma.DbNull : data.publishedSnapshot,
              // publicId is immutable after creation; repository updates must never rewrite identity.
              slug: data.slug,
              canonicalName: data.canonicalName,
              canonicalDedupKey: data.canonicalDedupKey,
              displayName: data.displayName,
              status: data.status,
              completenessStatus: data.completenessStatus,
              serviceCategory: data.serviceCategory,
              fulfillmentType: data.fulfillmentType,
              serviceDescription: data.serviceDescription,
              serviceAvailabilityStatus: data.serviceAvailabilityStatus,
              requiredInputsOrDocuments: data.requiredInputsOrDocuments,
              deliveryMode: data.deliveryMode,
              responsibleServiceOwnerType: data.responsibleServiceOwnerType,
              providerName: data.providerName,
              providerReferenceId: data.providerReferenceId,
              estimatedDeliveryTime: data.estimatedDeliveryTime,
              slaPolicy: data.slaPolicy,
              appointmentRequired: data.appointmentRequired,
              supportedCountryLabels: data.supportedCountries,
              supportedLanguageLabels: data.supportedLanguages,
              servicePrerequisites: data.servicePrerequisites,
              deliveryArtifactTypes: data.deliveryArtifactTypes,
              pricingReferenceId: data.pricingReferenceId,
              thumbnailAssetId: data.thumbnailAssetId,
              publicDisplayMetadata: data.publicDisplayMetadata,
              optionalFields: data.optionalFields,
              supportedCountries:
                countryIds === undefined
                  ? undefined
                  : {
                      deleteMany: {},
                      create: (countryIds ?? []).map((countryReferenceId) => ({
                        countryReferenceId,
                      })),
                    },
              supportedLanguages:
                languageIds === undefined
                  ? undefined
                  : {
                      deleteMany: {},
                      create: (languageIds ?? []).map((languageReferenceId) => ({
                        languageReferenceId,
                      })),
                    },
            },
            include: this.catalogInclude(),
          }),
        (value) => ({ serviceId: value.id, publicId: value.publicId, version: value.version }),
      );
    } catch (error) {
      throw this.mapVersionConflict(error, 'SERVICE_CATALOG_VERSION_CONFLICT');
    }
    return this.mapCatalog(row);
  }

  async findById(id: string) {
    const row = await this.catalog().findUnique({ where: { id }, include: this.catalogInclude() });
    return row ? this.mapCatalog(row) : null;
  }
  async findBySlug(slug: string) {
    const row = await this.catalog().findUnique({
      where: { slug },
      include: this.catalogInclude(),
    });
    return row ? this.mapCatalog(row) : null;
  }
  async findByDedupKey(canonicalDedupKey: string) {
    const row = await this.catalog().findUnique({
      where: { canonicalDedupKey },
      include: this.catalogInclude(),
    });
    return row ? this.mapCatalog(row) : null;
  }
  async updateStatus(
    id: string,
    status: ServiceStatus,
    expectedVersion: number,
  ): Promise<ServiceCatalogItemDto> {
    try {
      const row = await this.atomicEvent(
        'ServiceCatalogStatusChanged.v1',
        'ServiceCatalogItem',
        async (tx) =>
          this.catalog(tx).update({
            where: { id_version: { id, version: expectedVersion } },
            data: {
              status,
              version: { increment: 1 },
              ...([ServiceStatus.PUBLISHED, ServiceStatus.ARCHIVED].includes(status)
                ? { publishedSnapshot: Prisma.DbNull }
                : {}),
            },
            include: this.catalogInclude(),
          }),
        (value) => ({
          serviceId: value.id,
          publicId: value.publicId,
          status,
          version: value.version,
        }),
      );
      return this.mapCatalog(row);
    } catch (error) {
      throw this.mapVersionConflict(error, 'SERVICE_CATALOG_VERSION_CONFLICT');
    }
  }

  async list(
    filters: ServiceCatalogFilters,
  ): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>> {
    return this.listCatalog(filters, false);
  }
  async listPublished(
    filters: PublicServiceCatalogFilters,
  ): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>> {
    const limit = boundedCursorLimit(filters.limit, 20, 100);
    const after = decodeStableCursor(filters.cursor);
    const clauses: Prisma.Sql[] = [
      Prisma.sql`(s."status" = 'PUBLISHED' OR jsonb_typeof(s."publishedSnapshot") = 'object')`,
    ];
    // The public query and projection use the same reviewed revision, including while a draft is edited.
    const column = (name: string) =>
      Prisma.sql`CASE WHEN jsonb_typeof(s."publishedSnapshot")='object' THEN s."publishedSnapshot" ->> ${name} ELSE ${Prisma.raw('s."' + name + '"')} END`;
    const localizedContent = Prisma.sql`CASE WHEN jsonb_typeof(s."publishedSnapshot")='object' THEN s."publishedSnapshot" -> 'localizedContent' ELSE s."localizedContent" END`;
    for (const key of [
      'serviceCategory',
      'fulfillmentType',
      'serviceAvailabilityStatus',
      'deliveryMode',
    ] as const) {
      if (filters[key]) clauses.push(Prisma.sql`${column(key)} = ${filters[key]}`);
    }
    if (filters.audience) {
      const student = Prisma.sql`(${column('serviceCategory')} = 'STUDENT_SERVICES' OR ${column('responsibleServiceOwnerType')} ILIKE '%student%')`;
      clauses.push(filters.audience === 'student' ? student : Prisma.sql`NOT ${student}`);
    }
    const search = filters.search?.trim();
    if (search) {
      const pattern = '%' + search.replace(/[\\%_]/g, (value) => '\\' + value) + '%';
      clauses.push(
        Prisma.sql`(${column('displayName')} ILIKE ${pattern} OR ${column('serviceDescription')} ILIKE ${pattern} OR s."publicId" ILIKE ${pattern} OR ${column('slug')} ILIKE ${pattern}
          OR EXISTS(SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(${localizedContent})='object' THEN ${localizedContent} ELSE '{}'::jsonb END) l
            WHERE l.key IN ('ar','en') AND (l.value ->> 'displayName' ILIKE ${pattern} OR l.value ->> 'serviceDescription' ILIKE ${pattern})))`,
      );
    }
    if (filters.supportedCountryReferenceId)
      clauses.push(
        Prisma.sql`CASE WHEN jsonb_typeof(s."publishedSnapshot")='object' THEN (s."publishedSnapshot" -> 'supportedCountryReferenceIds') ? ${filters.supportedCountryReferenceId} ELSE EXISTS(SELECT 1 FROM "ServiceCatalogCountryRecord" c WHERE c."serviceId"=s.id AND c."countryReferenceId"=${filters.supportedCountryReferenceId}) END`,
      );
    if (filters.supportedLanguageReferenceId)
      clauses.push(
        Prisma.sql`CASE WHEN jsonb_typeof(s."publishedSnapshot")='object' THEN (s."publishedSnapshot" -> 'supportedLanguageReferenceIds') ? ${filters.supportedLanguageReferenceId} ELSE EXISTS(SELECT 1 FROM "ServiceCatalogLanguageRecord" l WHERE l."serviceId"=s.id AND l."languageReferenceId"=${filters.supportedLanguageReferenceId}) END`,
      );
    const where = Prisma.join(clauses, ' AND ');
    const [ids, counts, facets] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT s.id FROM "ServiceCatalogRecord" s WHERE ${where} ${after ? Prisma.sql`AND s.id > ${after}` : Prisma.empty} ORDER BY s.id ASC LIMIT ${limit + 1}`,
      ),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT(*) AS total FROM "ServiceCatalogRecord" s WHERE ${where}`,
      ),
      this.prisma.$queryRaw<Array<{ category: string; total: bigint }>>(
        Prisma.sql`SELECT ${column('serviceCategory')} AS category,COUNT(*) AS total FROM "ServiceCatalogRecord" s WHERE ${where} GROUP BY ${column('serviceCategory')}`,
      ),
    ]);
    const total = Number(counts[0]?.total ?? 0n);
    if (!Number.isSafeInteger(total)) throw new Error('SERVICE_PUBLIC_COUNT_OVERFLOW');
    const visible = ids.slice(0, limit);
    const rows = await this.catalog().findMany({
      where: { id: { in: visible.map((row) => row.id) } },
      include: this.catalogInclude(),
    });
    const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]));
    return {
      data: visible
        .map((row) => byId.get(row.id))
        .filter((row) => row && (row.status === ServiceStatus.PUBLISHED || row.publishedSnapshot))
        .map((row) => this.mapCatalog(row)),
      total,
      page: 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasMore: ids.length > limit,
      nextCursor: ids.length > limit ? encodeStableCursor(visible[visible.length - 1].id) : null,
      facets: Object.fromEntries(facets.map((row) => [row.category, Number(row.total)])),
    };
  }

  private async listCatalog(filters: ServiceCatalogFilters, publishedOnly: boolean) {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = {
      ...(filters.search?.trim()
        ? {
            OR: ['displayName', 'publicId', 'slug', 'providerName'].map((field) => ({
              [field]: { contains: filters.search!.trim(), mode: 'insensitive' },
            })),
          }
        : {}),
      status: publishedOnly ? ServiceStatus.PUBLISHED : filters.status,
      completenessStatus: filters.completenessStatus,
      serviceCategory: filters.serviceCategory,
      fulfillmentType: filters.fulfillmentType,
      serviceAvailabilityStatus: filters.serviceAvailabilityStatus,
      deliveryMode: filters.deliveryMode,
      supportedCountries: filters.supportedCountryReferenceId
        ? { some: { countryReferenceId: filters.supportedCountryReferenceId } }
        : undefined,
      supportedLanguages: filters.supportedLanguageReferenceId
        ? { some: { languageReferenceId: filters.supportedLanguageReferenceId } }
        : undefined,
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.catalog().findMany({
        where,
        include: this.catalogInclude(),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.catalog().count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.mapCatalog(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createRequest(data: CreateServiceRequestDto): Promise<ServiceRequestDto> {
    let row: any;
    try {
      row = await this.atomicEvent(
        'ServiceRequested.v1',
        'ServiceRequest',
        async (tx) => this.requests(tx).create({ data }),
        (value) => ({
          requestId: value.id,
          publicId: value.publicId,
          serviceId: (value as any).serviceId,
          studentReferenceId: (value as any).studentReferenceId,
          status: (value as any).status,
          version: value.version,
        }),
      );
    } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const existing = await this.requests().findUnique({ where: { publicId: data.publicId } });
      if (
        !existing ||
        existing.payloadFingerprint !== data.payloadFingerprint ||
        existing.studentReferenceId !== data.studentReferenceId ||
        existing.serviceId !== data.serviceId
      )
        throw new Error('SERVICE_IDEMPOTENCY_PAYLOAD_CONFLICT');
      row = existing;
    }
    return this.mapRequest(row);
  }
  async escalateOverdueRequests(limit: number) {
    return this.prisma.$transaction(
      async (tx: any) => {
        const now = new Date();
        const rows = await this.requests(tx).findMany({
          where: {
            dueAt: { lt: now },
            slaEscalatedAt: null,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
          take: Math.min(100, Math.max(1, limit)),
        });
        let count = 0;
        for (const row of rows) {
          const changed = await this.requests(tx).updateMany({
            where: { id: row.id, version: row.version, slaEscalatedAt: null },
            data: { slaEscalatedAt: now, version: { increment: 1 } },
          });
          if (!changed.count) continue;
          await tx.transactionalOutboxRecord.create({
            data: {
              id: randomUUID(),
              eventType: 'ServiceSlaBreached.v1',
              domain: 'SERVICES',
              aggregateType: 'ServiceRequest',
              aggregateId: row.id,
              payload: {
                eventType: 'ServiceSlaBreached.v1',
                requestId: row.id,
                studentReferenceId: row.studentReferenceId,
                dueAt: row.dueAt.toISOString(),
                status: row.status,
                version: row.version + 1,
              },
              metadata: { schemaVersion: 1, actorId: 'system:services-maintenance' },
              correlationId: row.publicId,
              state: 'PENDING',
              attempts: 0,
              availableAt: now,
              createdAt: now,
            },
          });
          count++;
        }
        return count;
      },
      { isolationLevel: 'Serializable' },
    );
  }
  private async eraseBookingInputs(tx: any, requestId: string, now: Date, actorId: string) {
    const booking = await tx.serviceBookingRecord.findUnique({ where: { requestId } });
    if (!booking) return;
    if (!['COMPLETED', 'CANCELLED'].includes(booking.status))
      throw new Error('SERVICE_INPUT_ERASURE_BOOKING_ACTIVE');
    if (booking.inputsErasedAt) return;
    const changed = await tx.serviceBookingRecord.updateMany({
      where: { id: booking.id, version: booking.version, inputsErasedAt: null },
      data: { inputSnapshot: Prisma.DbNull, inputsErasedAt: now, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(), eventType: 'ServiceBookingInputsErased.v1', domain: 'SERVICES',
        aggregateType: 'ServiceBooking', aggregateId: booking.id,
        payload: { bookingId: booking.id, requestId, version: booking.version + 1, actorId },
        metadata: { schemaVersion: 1 }, correlationId: booking.publicId,
        state: 'PENDING', attempts: 0, availableAt: now, createdAt: now,
      },
    });
  }
  async purgeExpiredInputs(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error('SERVICE_MAINTENANCE_LIMIT_INVALID');
    return this.prisma.$transaction(
      async (tx: any) => {
        const now = new Date();
        const rows = await this.requests(tx).findMany({
          where: {
            retentionUntil: { lte: now },
            inputsErasedAt: null,
            status: { in: ['COMPLETED', 'CANCELLED'] },
            AND: [
              { OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] },
              { OR: [{ booking: { is: null } }, { booking: { is: { status: { in: ['COMPLETED', 'CANCELLED'] } } } }] },
            ],
          },
          orderBy: [{ retentionUntil: 'asc' }, { id: 'asc' }],
          take: limit,
        });
        let erased = 0;
        for (const row of rows) {
          const result = await this.requests(tx).updateMany({
            where: {
              id: row.id,
              version: row.version,
              inputsErasedAt: null,
              OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }],
            },
            data: {
              requestParameters: {},
              fulfillmentMetadata: Prisma.DbNull,
              inputsErasedAt: now,
              version: { increment: 1 },
            },
          });
          if (result.count !== 1) continue;
          await this.eraseBookingInputs(tx, row.id, now, 'system:services-maintenance');
          await tx.transactionalOutboxRecord.create({
            data: {
              id: randomUUID(),
              eventType: 'ServiceRequestInputsErased.v1',
              domain: 'SERVICES',
              aggregateType: 'ServiceRequest',
              aggregateId: row.id,
              payload: {
                requestId: row.id,
                version: row.version + 1,
                policy: 'SERVICE_INPUT_180_DAYS',
                actorId: 'system:services-maintenance',
              },
              metadata: { schemaVersion: 1 },
              correlationId: row.publicId,
              state: 'PENDING',
              attempts: 0,
              availableAt: now,
              createdAt: now,
            },
          });
          erased++;
        }
        return erased;
      },
      { isolationLevel: 'Serializable' },
    );
  }
  async listRecoverableInvoiceIntents(limit: number) {
    const rows = await this.requests().findMany({
      where: {
        invoiceLinkState: 'LINK_PENDING',
        invoiceNextCheckAt: { lte: new Date() },
        financeInvoiceId: null,
      },
      orderBy: [{ invoiceNextCheckAt: 'asc' }, { id: 'asc' }],
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((row: any) => this.mapRequest(row));
  }
  async deferServiceRecovery(id: string, kind: 'invoice' | 'cancellation') {
    await this.requests().updateMany({
      where: {
        id,
        ...(kind === 'invoice'
          ? { invoiceLinkState: 'LINK_PENDING' }
          : { cancellationState: 'PENDING_FINANCE' }),
      },
      data: {
        [kind === 'invoice' ? 'invoiceNextCheckAt' : 'cancellationNextCheckAt']: new Date(
          Date.now() + 5 * 60 * 1000,
        ),
      },
    });
  }
  async listPendingCancellations(limit: number) {
    const rows = await this.requests().findMany({
      where: {
        cancellationState: 'PENDING_FINANCE',
        cancellationNextCheckAt: { lte: new Date() },
        financeInvoiceId: { not: null },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: [{ cancellationNextCheckAt: 'asc' }, { id: 'asc' }],
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((row: any) => this.mapRequest(row));
  }
  async eraseRequestInputs(id: string, studentReferenceId: string, expectedVersion: number) {
    const row = await this.atomicEvent(
      'ServiceRequestInputsErased.v1',
      'ServiceRequest',
      async (tx) => {
        const now = new Date();
        const existing = await this.requests(tx).findUnique({ where: { id } });
        if (!existing || existing.studentReferenceId !== studentReferenceId)
          throw new Error('SERVICE_REQUEST_NOT_FOUND');
        if (existing.legalHoldUntil && existing.legalHoldUntil > now)
          throw new Error('SERVICE_INPUT_ERASURE_LEGAL_HOLD');
        const changed = await this.requests(tx).updateMany({
          where: {
            id,
            studentReferenceId,
            version: expectedVersion,
            status: { in: ['COMPLETED', 'CANCELLED'] },
            OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }],
          },
          data: {
            requestParameters: {},
            fulfillmentMetadata: Prisma.DbNull,
            inputsErasedAt: now,
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
        await this.eraseBookingInputs(tx, id, now, studentReferenceId);
        return this.requests(tx).findUnique({ where: { id } });
      },
      (row) => ({ requestId: row.id, version: row.version, actorId: studentReferenceId }),
    );
    return this.mapRequest(row);
  }
  async markCancellationPending(id: string, expectedVersion: number) {
    return this.mapRequest(
      await this.atomicRequestUpdate(
        'ServiceCancellationFinancePending.v1',
        id,
        expectedVersion,
        { cancellationState: 'PENDING_FINANCE' },
        (row) => ({
          requestId: row.id,
          invoiceId: row.financeInvoiceId,
          state: 'PENDING_FINANCE',
          version: row.version,
        }),
      ),
    );
  }
  async claimRequest(id: string, actorId: string, expectedVersion: number) {
    const row = await this.atomicEvent(
      'ServiceCaseClaimed.v1',
      'ServiceRequest',
      async (tx) => {
        const changed = await this.requests(tx).updateMany({
          where: {
            id,
            version: expectedVersion,
            assignedStaffId: null,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          data: { assignedStaffId: actorId, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
        return this.requests(tx).findUnique({ where: { id } });
      },
      (row) => ({ requestId: row.id, actorId, version: row.version }),
    );
    return this.mapRequest(row);
  }
  async requestTimeline(id: string) {
    const rows = await (this.prisma as any).transactionalOutboxRecord.findMany({
      where: { aggregateType: 'ServiceRequest', aggregateId: id },
      select: { id: true, eventType: true, createdAt: true, payload: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return rows;
  }
  async prepareInvoiceIntent(id: string, intent: Record<string, unknown>, expectedVersion: number) {
    return this.mapRequest(
      await this.atomicRequestUpdate(
        'ServiceInvoiceIntentPrepared.v1',
        id,
        expectedVersion,
        { invoiceIntent: intent, invoiceLinkState: 'LINK_PENDING' },
        (row) => ({
          requestId: row.id,
          version: row.version,
          state: 'LINK_PENDING',
          pricingId: intent.pricingId,
        }),
      ),
    );
  }
  async findRequestById(id: string) {
    const row = await this.requests().findUnique({ where: { id } });
    return row ? this.mapRequest(row) : null;
  }
  async findRequestByPublicId(publicId: string) {
    const row = await this.requests().findUnique({ where: { publicId } });
    return row ? this.mapRequest(row) : null;
  }
  async listSupportAwaitingPaymentStudents(page: number, limit: number) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new Error('SERVICE_SUPPORT_TRIAGE_QUERY_INVALID');
    const status = ServiceRequestStatus.AWAITING_PAYMENT;
    // P20 retains ownership: no student metadata, parameters, payment details
    // or fulfillment notes cross the boundary. Distinct student counts are exact.
    const [groups, counts] = await Promise.all([
      this.requests().groupBy({
        by: ['studentReferenceId'],
        where: { status },
        orderBy: { studentReferenceId: 'asc' },
        skip: (page - 1) * limit,
        take: limit + 1,
      }),
      this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(DISTINCT "studentReferenceId") AS "total"
        FROM "ServiceRequestRecord" WHERE "status" = ${status}
      `,
    ]);
    const total = Number(counts[0]?.total ?? 0n);
    if (!Number.isSafeInteger(total)) throw new Error('SERVICE_SUPPORT_TRIAGE_COUNT_OVERFLOW');
    const hasMore = groups.length > limit;
    return {
      items: groups
        .slice(0, limit)
        .map((row: any) => ({ studentReferenceId: row.studentReferenceId })),
      total,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    };
  }

  async listRequests(filters: ServiceRequestFilters): Promise<PaginatedServiceRequestResult> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = {
      ...(filters.search?.trim()
        ? {
            OR: ['publicId', 'studentReferenceId', 'serviceId'].map((field) => ({
              [field]: { contains: filters.search!.trim(), mode: 'insensitive' },
            })),
          }
        : {}),
      assignedStaffId: filters.unassigned ? null : filters.assignedStaffId,
      providerReferenceId: filters.providerReferenceId,
      ...(filters.overdue
        ? { dueAt: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } }
        : {}),
      studentReferenceId: filters.studentReferenceId,
      serviceId: filters.serviceId,
      ...(filters.status ? { status: filters.status } : {}),
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.requests().findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.requests().count({ where }),
    ]);
    return {
      data: rows.map((row: any) => this.mapRequest(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async updateRequestStatus(
    id: string,
    status: ServiceRequestStatus,
    expectedVersion: number,
    fulfillmentMetadata?: Record<string, unknown> | null,
  ) {
    const row = await this.atomicRequestUpdate(
      'ServiceFulfillmentStatusChanged.v1',
      id,
      expectedVersion,
      {
        status,
        ...(status === ServiceRequestStatus.CANCELLED ? { cancellationState: 'SETTLED' } : {}),
        fulfillmentMetadata,
        completedAt: status === ServiceRequestStatus.COMPLETED ? new Date() : undefined,
      },
      (value) => ({
        requestId: value.id,
        publicId: value.publicId,
        serviceId: (value as any).serviceId,
        studentReferenceId: (value as any).studentReferenceId,
        status,
        version: value.version,
      }),
    );
    return this.mapRequest(row);
  }
  async linkFinanceInvoice(
    id: string,
    financeInvoiceId: string,
    financeInvoicePublicId: string,
    expectedVersion: number,
  ) {
    const row = await this.atomicRequestUpdate(
      'ServiceFinanceInvoiceLinked.v1',
      id,
      expectedVersion,
      {
        financeInvoiceId,
        financeInvoicePublicId,
        invoiceLinkState: 'LINKED',
        status: ServiceRequestStatus.AWAITING_PAYMENT,
      },
      (value) => ({
        requestId: value.id,
        publicId: value.publicId,
        serviceId: (value as any).serviceId,
        studentReferenceId: (value as any).studentReferenceId,
        financeInvoiceId,
        financeInvoicePublicId,
        version: value.version,
      }),
    );
    return this.mapRequest(row);
  }
  async assignProvider(id: string, providerReferenceId: string, expectedVersion: number) {
    const row = await this.atomicRequestUpdate(
      'ServiceProviderAssigned.v1',
      id,
      expectedVersion,
      { providerReferenceId },
      (value) => ({
        requestId: value.id,
        publicId: value.publicId,
        serviceId: (value as any).serviceId,
        studentReferenceId: (value as any).studentReferenceId,
        providerReferenceId,
        version: value.version,
      }),
    );
    return this.mapRequest(row);
  }

  private async atomicRequestUpdate(
    eventType: string,
    id: string,
    expectedVersion: number,
    data: Record<string, unknown>,
    payload: (value: any) => Record<string, unknown>,
  ): Promise<any> {
    try {
      return await this.atomicEvent(
        eventType,
        'ServiceRequest',
        async (tx) => {
          if (typeof data.providerReferenceId === 'string') {
            const provider = await tx.serviceProviderRecord.findUnique({
              where: { id: data.providerReferenceId },
            });
            if (!provider || provider.status !== 'QUALIFIED')
              throw new Error('SERVICE_PROVIDER_NOT_QUALIFIED');
            const count = await this.requests(tx).count({
              where: {
                id: { not: id },
                providerReferenceId: data.providerReferenceId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
              },
            });
            if (count >= provider.capacity) throw new Error('SERVICE_PROVIDER_CAPACITY_EXHAUSTED');
          }
          if (data.status === ServiceRequestStatus.CANCELLED) {
            const booking = await tx.serviceBookingRecord.findUnique({ where: { requestId: id } });
            if (booking?.status === 'COMPLETED') throw new Error('SERVICE_BOOKING_TRANSITION_INVALID');
            if (booking && booking.status !== 'CANCELLED') {
              const reservedDiscountId = booking.discountState === 'RESERVED'
                ? booking.pricingSnapshot?.discountId : null;
              await tx.serviceBookingRecord.update({
                where: { id: booking.id, version: booking.version },
                data: { status: 'CANCELLED', discountState: 'RELEASED', version: { increment: 1 } },
              });
              if (reservedDiscountId)
                await tx.serviceDiscountRecord.updateMany({
                  where: { id: reservedDiscountId, redemptionCount: { gt: 0 } },
                  data: { redemptionCount: { decrement: 1 } },
                });
              await tx.transactionalOutboxRecord.create({ data: {
                id: randomUUID(), eventType: 'ServiceBookingCancelled.v1', domain: 'SERVICES',
                aggregateType: 'ServiceBooking', aggregateId: booking.id,
                payload: { bookingId: booking.id, requestId: id, version: booking.version + 1 },
                metadata: { schemaVersion: 1, ownerDomain: 'SERVICES' }, correlationId: booking.publicId,
                state: 'PENDING', attempts: 0, availableAt: new Date(), createdAt: new Date(),
              } });
            }
          }
          return this.requests(tx).update({
            where: { id_version: { id, version: expectedVersion } },
            data: { ...data, version: { increment: 1 } },
          });
        },
        payload,
      );
    } catch (error) {
      throw this.mapVersionConflict(error, 'SERVICE_REQUEST_VERSION_CONFLICT');
    }
  }

  private mapVersionConflict(error: unknown, code: string): Error {
    const prismaCode =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    if (prismaCode === 'P2025') return new Error(code);
    return error instanceof Error ? error : new Error(String(error));
  }

  private catalogInclude() {
    return { supportedCountries: true, supportedLanguages: true };
  }

  private mapCatalog(row: any): ServiceCatalogItemDto {
    return {
      approvedPrice: asRecord(row.approvedPrice) as any,
      cancellationPolicyCode: row.cancellationPolicyCode,
      reviewEvidence: asRecord(row.reviewEvidence),
      fulfillmentPolicy: row.fulfillmentPolicy,
      inputSchema: Array.isArray(row.inputSchema) ? row.inputSchema : [],
      localizedContent: asRecord(row.localizedContent) as any,
      makerActorId: row.makerActorId,
      reviewerActorId: row.reviewerActorId,
      reviewedVersion: row.reviewedVersion,
      publishedSnapshot: asRecord(row.publishedSnapshot),
      id: row.id,
      publicId: row.publicId,
      slug: row.slug,
      canonicalName: row.canonicalName,
      canonicalDedupKey: row.canonicalDedupKey,
      displayName: row.displayName,
      status: row.status,
      completenessStatus: row.completenessStatus,
      serviceCategory: row.serviceCategory,
      fulfillmentType: row.fulfillmentType,
      serviceDescription: row.serviceDescription,
      serviceAvailabilityStatus: row.serviceAvailabilityStatus,
      requiredInputsOrDocuments: asStrings(row.requiredInputsOrDocuments) ?? [],
      deliveryMode: row.deliveryMode,
      responsibleServiceOwnerType: row.responsibleServiceOwnerType,
      providerName: row.providerName,
      providerReferenceId: row.providerReferenceId,
      estimatedDeliveryTime: row.estimatedDeliveryTime,
      slaPolicy: asRecord(row.slaPolicy),
      appointmentRequired: row.appointmentRequired,
      supportedCountryReferenceIds: (row.supportedCountries ?? []).map(
        (item: any) => item.countryReferenceId,
      ),
      supportedLanguageReferenceIds: (row.supportedLanguages ?? []).map(
        (item: any) => item.languageReferenceId,
      ),
      supportedCountries: asStrings(row.supportedCountryLabels),
      supportedLanguages: asStrings(row.supportedLanguageLabels),
      servicePrerequisites: asStrings(row.servicePrerequisites),
      deliveryArtifactTypes: asStrings(row.deliveryArtifactTypes),
      pricingReferenceId: row.pricingReferenceId,
      thumbnailAssetId: row.thumbnailAssetId,
      publicDisplayMetadata: asRecord(row.publicDisplayMetadata),
      optionalFields: asRecord(row.optionalFields),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    };
  }

  private mapRequest(row: any): ServiceRequestDto {
    return {
      id: row.id,
      publicId: row.publicId,
      studentReferenceId: row.studentReferenceId,
      serviceId: row.serviceId,
      status: row.status,
      requestParameters:
        row.retentionUntil && row.retentionUntil <= new Date()
          ? {}
          : (asRecord(row.requestParameters) ?? {}),
      assignedStaffId: row.assignedStaffId,
      dueAt: row.dueAt,
      retentionUntil: row.retentionUntil,
      cancellationState: row.cancellationState,
      payloadFingerprint: row.payloadFingerprint,
      serviceSnapshot: asRecord(row.serviceSnapshot),
      invoiceIntent: asRecord(row.invoiceIntent),
      invoiceLinkState: row.invoiceLinkState,
      providerReferenceId: row.providerReferenceId,
      financeInvoiceId: row.financeInvoiceId,
      financeInvoicePublicId: row.financeInvoicePublicId,
      fulfillmentMetadata: asRecord(row.fulfillmentMetadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      version: row.version,
    };
  }
}
