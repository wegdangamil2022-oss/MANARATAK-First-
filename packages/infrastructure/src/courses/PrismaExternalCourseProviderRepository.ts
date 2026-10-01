import { Prisma, PrismaClient } from '@prisma/client';
import {
  ExternalCourseProviderDto,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderOperatingScope,
  ExternalCourseProviderStatus,
  IExternalCourseProviderRepository,
  normalizeExternalCourseProviderDomain,
  normalizeExternalCourseProviderName,
  UpsertExternalCourseProviderSeedInput,
  AtomicPersistenceContext, CourseProviderRegistryError, CourseProviderRegistryFilters,
  ICourseProviderRegistryRepository, UpdateCourseProviderMappings,
} from '@manaratak/domain';

export class PrismaExternalCourseProviderRepository implements IExternalCourseProviderRepository, ICourseProviderRegistryRepository {
  public constructor(private readonly prisma: PrismaClient, private readonly inTransaction = false) {}

  public async listRegistry(filters: CourseProviderRegistryFilters) {
    const where: Prisma.ExternalCourseProviderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { OR: [{ canonicalName: { contains: filters.q, mode: 'insensitive' as const } }, { displayName: { contains: filters.q, mode: 'insensitive' as const } }, { aliases: { some: { alias: { contains: filters.q, mode: 'insensitive' as const } } } }] } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.externalCourseProvider.findMany({ where, include: { aliases: true, allowedDomains: true }, orderBy: [{ canonicalName: 'asc' }, { id: 'asc' }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
      this.prisma.externalCourseProvider.count({ where }),
    ]);
    return { data: records.map(record => this.mapToDto(record)), total };
  }

  public async updateMappingsInTransaction(id: string, input: UpdateCourseProviderMappings, context: AtomicPersistenceContext): Promise<ExternalCourseProviderDto> {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new CourseProviderRegistryError('PROVIDER_AUDITED_TRANSACTION_REQUIRED');
    // Serialize registry alias ownership checks across concurrent administration edits.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(725109)::text`;
    await tx.$queryRaw`SELECT "id" FROM "ExternalCourseProvider" WHERE "id" = ${id} FOR UPDATE`;
    const previous = await tx.externalCourseProvider.findUnique({ where: { id }, include: { aliases: true, allowedDomains: true } });
    if (!previous) throw new CourseProviderRegistryError('PROVIDER_NOT_FOUND');
    if (previous.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new CourseProviderRegistryError('PROVIDER_STALE');
    if (['DISABLED', 'ARCHIVED'].includes(previous.status)) throw new CourseProviderRegistryError('PROVIDER_READ_ONLY');
    const aliases = input.aliases.map(item => ({ ...item, normalizedAlias: normalizeExternalCourseProviderName(item.alias) }));
    for (const alias of aliases) {
      const [canonicalOwner, aliasOwner] = await Promise.all([
        tx.externalCourseProvider.findUnique({ where: { normalizedCanonicalName: alias.normalizedAlias } }),
        tx.externalCourseProviderAlias.findUnique({ where: { normalizedAlias: alias.normalizedAlias } }),
      ]);
      if (canonicalOwner || (aliasOwner && aliasOwner.providerId !== id)) throw new CourseProviderRegistryError('PROVIDER_MAPPING_CONFLICT');
    }
    try {
      await tx.externalCourseProvider.update({ where: { id }, data: {
        displayName: input.displayName.trim(), officialWebsite: input.officialWebsite,
        // Approval, trust, connector configuration and verification timestamps remain owned by their existing workflows.
        updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
      } });
      await tx.externalCourseProviderAlias.deleteMany({ where: { providerId: id, normalizedAlias: { notIn: aliases.map(item => item.normalizedAlias) } } });
      for (const alias of aliases) {
        const old = previous.aliases.find(item => item.normalizedAlias === alias.normalizedAlias);
        const source = old && old.alias === alias.alias && (old.locale ?? undefined) === alias.locale ? old.source : 'ADMIN_REVIEW:' + input.evidenceReference.trim();
        await tx.externalCourseProviderAlias.upsert({ where: { normalizedAlias: alias.normalizedAlias },
          update: { alias: alias.alias, locale: alias.locale ?? null, source },
          create: { providerId: id, alias: alias.alias, normalizedAlias: alias.normalizedAlias, locale: alias.locale ?? null, source },
        });
      }
      await tx.externalCourseProviderDomain.deleteMany({ where: { providerId: id, normalizedDomain: { notIn: input.allowedDomains } } });
      for (const domain of input.allowedDomains) {
        await tx.externalCourseProviderDomain.upsert({ where: { providerId_normalizedDomain: { providerId: id, normalizedDomain: domain } }, update: { domain }, create: { providerId: id, domain, normalizedDomain: domain } });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new CourseProviderRegistryError('PROVIDER_MAPPING_CONFLICT');
      throw error;
    }
    const saved = await tx.externalCourseProvider.findUnique({ where: { id }, include: { aliases: true, allowedDomains: true } });
    if (!saved) throw new CourseProviderRegistryError('PROVIDER_NOT_FOUND');
    return this.mapToDto(saved);
  }

  public async list(): Promise<ExternalCourseProviderDto[]> {
    const records = await this.prisma.externalCourseProvider.findMany({
      include: { aliases: true, allowedDomains: true },
      orderBy: { canonicalName: 'asc' },
    });
    return records.map((record) => this.mapToDto(record));
  }

  public async findById(id: string): Promise<ExternalCourseProviderDto | null> {
    const record = await this.prisma.externalCourseProvider.findUnique({
      where: { id },
      include: { aliases: true, allowedDomains: true },
    });
    return record ? this.mapToDto(record) : null;
  }

  public async findByPublicId(publicId: string): Promise<ExternalCourseProviderDto | null> {
    const record = await this.prisma.externalCourseProvider.findUnique({
      where: { publicId },
      include: { aliases: true, allowedDomains: true },
    });
    return record ? this.mapToDto(record) : null;
  }

  public async resolveByName(name: string): Promise<ExternalCourseProviderDto | null> {
    const normalized = normalizeExternalCourseProviderName(name);
    if (!normalized) return null;

    const canonical = await this.prisma.externalCourseProvider.findUnique({
      where: { normalizedCanonicalName: normalized },
      include: { aliases: true, allowedDomains: true },
    });
    if (canonical) return this.mapToDto(canonical);

    const alias = await this.prisma.externalCourseProviderAlias.findUnique({
      where: { normalizedAlias: normalized },
      include: {
        provider: { include: { aliases: true, allowedDomains: true } },
      },
    });
    return alias ? this.mapToDto(alias.provider) : null;
  }

  public async isDomainApproved(providerId: string, urlOrDomain: string): Promise<boolean> {
    const candidate = normalizeExternalCourseProviderDomain(urlOrDomain);
    if (!candidate) return false;
    const domains = await this.prisma.externalCourseProviderDomain.findMany({
      where: { providerId },
      select: { normalizedDomain: true },
    });
    return domains.some(({ normalizedDomain }) =>
      candidate === normalizedDomain || candidate.endsWith(`.${normalizedDomain}`),
    );
  }

  public async upsertSeedProvider(
    input: UpsertExternalCourseProviderSeedInput,
  ): Promise<ExternalCourseProviderDto> {
    if (input.expectedUpdatedAt && !this.inTransaction) {
      return this.prisma.$transaction(tx => new PrismaExternalCourseProviderRepository(tx as unknown as PrismaClient, true).upsertSeedProvider(input));
    }
    if (input.expectedUpdatedAt) {
      await this.prisma.$queryRaw`SELECT "id" FROM "ExternalCourseProvider" WHERE "publicId" = ${input.publicId} FOR UPDATE`;
      const current = await this.prisma.externalCourseProvider.findUnique({ where: { publicId: input.publicId } });
      if (!current) throw new CourseProviderRegistryError('PROVIDER_NOT_FOUND');
      if (current.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new CourseProviderRegistryError('PROVIDER_STALE');
    }
    const normalizedCanonicalName = normalizeExternalCourseProviderName(input.canonicalName);
    if (!normalizedCanonicalName) {
      throw new Error('EXTERNAL_COURSE_PROVIDER_CANONICAL_NAME_REQUIRED');
    }

    const [byPublicId, byCanonicalName] = await Promise.all([
      this.prisma.externalCourseProvider.findUnique({ where: { publicId: input.publicId } }),
      this.prisma.externalCourseProvider.findUnique({ where: { normalizedCanonicalName } }),
    ]);

    if (byPublicId && byCanonicalName && byPublicId.id !== byCanonicalName.id) {
      throw new Error(`EXTERNAL_COURSE_PROVIDER_IDENTITY_COLLISION:${input.canonicalName}`);
    }
    if (!byPublicId && byCanonicalName && byCanonicalName.publicId !== input.publicId) {
      throw new Error(`EXTERNAL_COURSE_PROVIDER_CANONICAL_COLLISION:${input.canonicalName}`);
    }

    const provider = await this.prisma.externalCourseProvider.upsert({
      where: { publicId: input.publicId },
      update: {
        ...(input.expectedUpdatedAt ? { updatedAt: new Date(Math.max(Date.now(), Date.parse(input.expectedUpdatedAt) + 1)) } : {}),
        slug: input.slug,
        canonicalName: input.canonicalName,
        normalizedCanonicalName,
        displayName: input.displayName,
        providerType: input.providerType ?? null,
        status: input.status,
        officialWebsite: input.officialWebsite ?? null,
        operatingScope: input.operatingScope ?? null,
        headquartersCountryReferenceId: input.headquartersCountryReferenceId ?? null,
        sourceTrustLevel: input.sourceTrustLevel,
        importStrategy: input.importStrategy,
        directCoursePathPatterns: input.directCoursePathPatterns ?? [],
        connectorKey: input.connectorKey ?? null,
        connectorVersion: input.connectorVersion ?? null,
        lastVerifiedAt: input.lastVerifiedAt ?? null,
      },
      create: {
        publicId: input.publicId,
        slug: input.slug,
        canonicalName: input.canonicalName,
        normalizedCanonicalName,
        displayName: input.displayName,
        providerType: input.providerType ?? null,
        status: input.status,
        officialWebsite: input.officialWebsite ?? null,
        operatingScope: input.operatingScope ?? null,
        headquartersCountryReferenceId: input.headquartersCountryReferenceId ?? null,
        sourceTrustLevel: input.sourceTrustLevel,
        importStrategy: input.importStrategy,
        directCoursePathPatterns: input.directCoursePathPatterns ?? [],
        connectorKey: input.connectorKey ?? null,
        connectorVersion: input.connectorVersion ?? null,
        lastVerifiedAt: input.lastVerifiedAt ?? null,
      },
    });

    for (const item of input.aliases ?? []) {
      const normalizedAlias = normalizeExternalCourseProviderName(item.alias);
      if (!normalizedAlias || normalizedAlias === normalizedCanonicalName) continue;

      const canonicalOwner = await this.prisma.externalCourseProvider.findUnique({
        where: { normalizedCanonicalName: normalizedAlias },
      });
      if (canonicalOwner && canonicalOwner.id !== provider.id) {
        throw new Error(`EXTERNAL_COURSE_PROVIDER_ALIAS_COLLISION:${item.alias}`);
      }

      const aliasOwner = await this.prisma.externalCourseProviderAlias.findUnique({
        where: { normalizedAlias },
      });
      if (aliasOwner && aliasOwner.providerId !== provider.id) {
        throw new Error(`EXTERNAL_COURSE_PROVIDER_ALIAS_COLLISION:${item.alias}`);
      }

      if (aliasOwner) {
        await this.prisma.externalCourseProviderAlias.update({
          where: { normalizedAlias },
          data: { alias: item.alias, locale: item.locale ?? null, source: item.source ?? null },
        });
      } else {
        await this.prisma.externalCourseProviderAlias.create({
          data: {
            providerId: provider.id,
            alias: item.alias,
            normalizedAlias,
            locale: item.locale ?? null,
            source: item.source ?? null,
          },
        });
      }
    }

    for (const domain of input.allowedDomains ?? []) {
      const normalizedDomain = normalizeExternalCourseProviderDomain(domain);
      if (!normalizedDomain) continue;
      await this.prisma.externalCourseProviderDomain.upsert({
        where: {
          providerId_normalizedDomain: { providerId: provider.id, normalizedDomain },
        },
        update: { domain },
        create: { providerId: provider.id, domain, normalizedDomain },
      });
    }

    const hydrated = await this.findById(provider.id);
    if (!hydrated) throw new Error(`EXTERNAL_COURSE_PROVIDER_NOT_FOUND_AFTER_UPSERT:${input.publicId}`);
    return hydrated;
  }

  private mapToDto(record: any): ExternalCourseProviderDto {
    return {
      id: record.id,
      publicId: record.publicId,
      slug: record.slug,
      canonicalName: record.canonicalName,
      normalizedCanonicalName: record.normalizedCanonicalName,
      displayName: record.displayName,
      providerType: record.providerType ?? undefined,
      status: record.status as ExternalCourseProviderStatus,
      officialWebsite: record.officialWebsite ?? undefined,
      operatingScope: record.operatingScope
        ? (record.operatingScope as ExternalCourseProviderOperatingScope)
        : undefined,
      headquartersCountryReferenceId: record.headquartersCountryReferenceId ?? undefined,
      sourceTrustLevel: record.sourceTrustLevel,
      importStrategy: record.importStrategy as ExternalCourseProviderImportStrategy,
      directCoursePathPatterns: Array.isArray(record.directCoursePathPatterns) ? record.directCoursePathPatterns.filter((item: unknown): item is string => typeof item === 'string') : [],
      connectorKey: record.connectorKey ?? undefined,
      connectorVersion: record.connectorVersion ?? undefined,
      lastVerifiedAt: record.lastVerifiedAt ?? undefined,
      allowedDomains: (record.allowedDomains ?? []).map((item: any) => item.normalizedDomain),
      aliases: (record.aliases ?? []).map((item: any) => ({
        id: item.id,
        providerId: item.providerId,
        alias: item.alias,
        normalizedAlias: item.normalizedAlias,
        locale: item.locale ?? undefined,
        source: item.source ?? undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
