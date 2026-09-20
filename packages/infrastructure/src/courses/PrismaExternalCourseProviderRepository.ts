import { PrismaClient } from '@prisma/client';
import {
  ExternalCourseProviderDto,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderOperatingScope,
  ExternalCourseProviderStatus,
  IExternalCourseProviderRepository,
  normalizeExternalCourseProviderDomain,
  normalizeExternalCourseProviderName,
  UpsertExternalCourseProviderSeedInput,
} from '@manaratak/domain';

export class PrismaExternalCourseProviderRepository implements IExternalCourseProviderRepository {
  public constructor(private readonly prisma: PrismaClient) {}

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
