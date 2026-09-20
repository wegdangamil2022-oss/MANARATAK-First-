import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
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

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const asStrings = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;

export class PrismaServicePlatformRepository implements IServiceCatalogRepository, IServiceRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private catalog(client: any = this.prisma) { return client.serviceCatalogRecord; }
  private requests(client: any = this.prisma) { return client.serviceRequestRecord; }

  private async atomicEvent<T extends { id: string; publicId?: string; version?: number }>(
    eventType: string,
    aggregateType: string,
    mutate: (tx: any) => Promise<T>,
    payload: (value: T) => Record<string, unknown>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const value = await mutate(tx);
      if (!tx.transactionalOutboxRecord?.create) throw new Error('SERVICE_DURABLE_OUTBOX_REQUIRED');
      const now = new Date();
      await tx.transactionalOutboxRecord.create({ data: {
        id: randomUUID(), eventType, domain: 'SERVICES', aggregateType, aggregateId: value.id,
        payload: payload(value), metadata: { schemaVersion: 1, ownerDomain: 'SERVICES' }, correlationId: randomUUID(),
        state: 'PENDING', attempts: 0, availableAt: now, createdAt: now,
      }});
      return value;
    });
  }

  async create(data: CreateServiceCatalogItemDto): Promise<ServiceCatalogItemDto> {
    const row = await this.atomicEvent('ServiceCatalogCreated.v1', 'ServiceCatalogItem', async tx => this.catalog(tx).create({
      data: {
        publicId: data.publicId,
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
        supportedCountries: data.supportedCountryReferenceIds?.length ? {
          create: data.supportedCountryReferenceIds.map((countryReferenceId) => ({ countryReferenceId })),
        } : undefined,
        supportedLanguages: data.supportedLanguageReferenceIds?.length ? {
          create: data.supportedLanguageReferenceIds.map((languageReferenceId) => ({ languageReferenceId })),
        } : undefined,
      },
      include: this.catalogInclude(),
    }), row => ({ serviceId: row.id, publicId: row.publicId, status: row.status, version: row.version }));
    return this.mapCatalog(row);
  }

  async update(id: string, data: ServiceCatalogRepositoryUpdateDto, expectedVersion: number): Promise<ServiceCatalogItemDto> {
    const countryIds = data.supportedCountryReferenceIds;
    const languageIds = data.supportedLanguageReferenceIds;
    let row: any;
    try {
      row = await this.atomicEvent('ServiceCatalogUpdated.v1', 'ServiceCatalogItem', async tx => this.catalog(tx).update({
      where: { id_version: { id, version: expectedVersion } },
      data: {
        version: { increment: 1 },
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
        supportedCountries: countryIds === undefined ? undefined : {
          deleteMany: {},
          create: (countryIds ?? []).map((countryReferenceId) => ({ countryReferenceId })),
        },
        supportedLanguages: languageIds === undefined ? undefined : {
          deleteMany: {},
          create: (languageIds ?? []).map((languageReferenceId) => ({ languageReferenceId })),
        },
      },
      include: this.catalogInclude(),
      }), value => ({ serviceId: value.id, publicId: value.publicId, version: value.version }));
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
    const row = await this.catalog().findUnique({ where: { slug }, include: this.catalogInclude() });
    return row ? this.mapCatalog(row) : null;
  }
  async findByDedupKey(canonicalDedupKey: string) {
    const row = await this.catalog().findUnique({ where: { canonicalDedupKey }, include: this.catalogInclude() });
    return row ? this.mapCatalog(row) : null;
  }
  async updateStatus(id: string, status: ServiceStatus, expectedVersion: number): Promise<ServiceCatalogItemDto> {
    try {
      const row = await this.atomicEvent('ServiceCatalogStatusChanged.v1', 'ServiceCatalogItem', async tx =>
        this.catalog(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: { status, version: { increment: 1 } }, include: this.catalogInclude() }),
        value => ({ serviceId: value.id, publicId: value.publicId, status, version: value.version }),
      );
      return this.mapCatalog(row);
    } catch (error) {
      throw this.mapVersionConflict(error, 'SERVICE_CATALOG_VERSION_CONFLICT');
    }
  }

  async list(filters: ServiceCatalogFilters): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>> {
    return this.listCatalog(filters, false);
  }
  async listPublished(filters: PublicServiceCatalogFilters): Promise<PaginatedServiceCatalogResult<ServiceCatalogItemDto>> {
    const where: any = {
      status: ServiceStatus.PUBLISHED,
      serviceCategory: filters.serviceCategory, fulfillmentType: filters.fulfillmentType,
      serviceAvailabilityStatus: filters.serviceAvailabilityStatus, deliveryMode: filters.deliveryMode,
      supportedCountries: filters.supportedCountryReferenceId ? { some: { countryReferenceId: filters.supportedCountryReferenceId } } : undefined,
      supportedLanguages: filters.supportedLanguageReferenceId ? { some: { languageReferenceId: filters.supportedLanguageReferenceId } } : undefined,
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    return queryStableCursorPage({
      delegate: this.catalog() as any, where, include: this.catalogInclude(), cursor: filters.cursor, limit: filters.limit,
      map: (row: any) => this.mapCatalog(row),
    });
  }

  private async listCatalog(filters: ServiceCatalogFilters, publishedOnly: boolean) {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = {
      status: publishedOnly ? ServiceStatus.PUBLISHED : filters.status,
      completenessStatus: filters.completenessStatus,
      serviceCategory: filters.serviceCategory,
      fulfillmentType: filters.fulfillmentType,
      serviceAvailabilityStatus: filters.serviceAvailabilityStatus,
      deliveryMode: filters.deliveryMode,
      supportedCountries: filters.supportedCountryReferenceId ? { some: { countryReferenceId: filters.supportedCountryReferenceId } } : undefined,
      supportedLanguages: filters.supportedLanguageReferenceId ? { some: { languageReferenceId: filters.supportedLanguageReferenceId } } : undefined,
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.catalog().findMany({ where, include: this.catalogInclude(), orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.catalog().count({ where }),
    ]);
    return { data: rows.map((row: any) => this.mapCatalog(row)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createRequest(data: CreateServiceRequestDto): Promise<ServiceRequestDto> {
    const row = await this.atomicEvent('ServiceRequested.v1', 'ServiceRequest', async tx => this.requests(tx).create({ data }), value => ({
      requestId: value.id, publicId: value.publicId, serviceId: (value as any).serviceId, studentReferenceId: (value as any).studentReferenceId, status: (value as any).status, version: value.version,
    }));
    return this.mapRequest(row);
  }
  async findRequestById(id: string) {
    const row = await this.requests().findUnique({ where: { id } });
    return row ? this.mapRequest(row) : null;
  }
  async findRequestByPublicId(publicId: string) {
    const row = await this.requests().findUnique({ where: { publicId } });
    return row ? this.mapRequest(row) : null;
  }
  async listRequests(filters: ServiceRequestFilters): Promise<PaginatedServiceRequestResult> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = {
      studentReferenceId: filters.studentReferenceId,
      serviceId: filters.serviceId,
      status: filters.status,
    };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.requests().findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.requests().count({ where }),
    ]);
    return { data: rows.map((row: any) => this.mapRequest(row)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
  async updateRequestStatus(id: string, status: ServiceRequestStatus, expectedVersion: number, fulfillmentMetadata?: Record<string, unknown> | null) {
    const row = await this.atomicRequestUpdate('ServiceFulfillmentStatusChanged.v1', id, expectedVersion, {
      status, fulfillmentMetadata, completedAt: status === ServiceRequestStatus.COMPLETED ? new Date() : undefined,
    }, value => ({ requestId: value.id, publicId: value.publicId, serviceId: (value as any).serviceId, studentReferenceId: (value as any).studentReferenceId, status, version: value.version }));
    return this.mapRequest(row);
  }
  async linkFinanceInvoice(id: string, financeInvoiceId: string, financeInvoicePublicId: string, expectedVersion: number) {
    const row = await this.atomicRequestUpdate('ServiceFinanceInvoiceLinked.v1', id, expectedVersion, { financeInvoiceId, financeInvoicePublicId, status: ServiceRequestStatus.AWAITING_PAYMENT }, value => ({ requestId: value.id, publicId: value.publicId, serviceId: (value as any).serviceId, studentReferenceId: (value as any).studentReferenceId, financeInvoiceId, financeInvoicePublicId, version: value.version }));
    return this.mapRequest(row);
  }
  async assignProvider(id: string, providerReferenceId: string, expectedVersion: number) {
    const row = await this.atomicRequestUpdate('ServiceProviderAssigned.v1', id, expectedVersion, { providerReferenceId }, value => ({ requestId: value.id, publicId: value.publicId, serviceId: (value as any).serviceId, studentReferenceId: (value as any).studentReferenceId, providerReferenceId, version: value.version }));
    return this.mapRequest(row);
  }

  private async atomicRequestUpdate(eventType: string, id: string, expectedVersion: number, data: Record<string, unknown>, payload: (value: any) => Record<string, unknown>): Promise<any> {
    try {
      return await this.atomicEvent(eventType, 'ServiceRequest', async tx => this.requests(tx).update({
        where: { id_version: { id, version: expectedVersion } },
        data: { ...data, version: { increment: 1 } },
      }), payload);
    } catch (error) {
      throw this.mapVersionConflict(error, 'SERVICE_REQUEST_VERSION_CONFLICT');
    }
  }

  private mapVersionConflict(error: unknown, code: string): Error {
    const prismaCode = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    if (prismaCode === 'P2025') return new Error(code);
    return error instanceof Error ? error : new Error(String(error));
  }

  private catalogInclude() {
    return { supportedCountries: true, supportedLanguages: true };
  }

  private mapCatalog(row: any): ServiceCatalogItemDto {
    return {
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
      supportedCountryReferenceIds: (row.supportedCountries ?? []).map((item: any) => item.countryReferenceId),
      supportedLanguageReferenceIds: (row.supportedLanguages ?? []).map((item: any) => item.languageReferenceId),
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
      requestParameters: asRecord(row.requestParameters) ?? {},
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
