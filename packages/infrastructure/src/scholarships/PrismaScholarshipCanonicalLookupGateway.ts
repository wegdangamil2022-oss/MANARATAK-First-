import type { PrismaClient } from '@prisma/client';
import type {
  IScholarshipCanonicalLookupGateway,
  ScholarshipCanonicalCandidate,
  ScholarshipCanonicalLookupTarget,
  ScholarshipCanonicalResolutionRequest,
} from '@manaratak/application';

export class PrismaScholarshipCanonicalLookupGateway
  implements IScholarshipCanonicalLookupGateway
{
  constructor(private readonly prisma: PrismaClient) {}

  public async findCandidates(
    target: ScholarshipCanonicalLookupTarget,
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    switch (target) {
      case 'UNIVERSITY': return this.findUniversity(request);
      case 'ACADEMIC_PROGRAM': return this.findAcademicProgram(request);
      case 'COUNTRY': return this.findCountry(request);
      case 'LANGUAGE': return this.findLanguage(request);
      case 'CURRENCY': return this.findCurrency(request);
      case 'DEGREE_LEVEL': return this.findDegreeLevel(request);
      case 'MAJOR': return this.findMajor(request);
      case 'INTERNATIONAL_TEST': return this.findInternationalTest(request);
      default: throw new Error(`SCHOLARSHIP_CANONICAL_TARGET_UNSUPPORTED:${String(target)}`);
    }
  }

  private async findUniversity(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (!request.canonicalId) return [];
    const record = await this.prisma.university.findFirst({
      where: { OR: [{ id: request.canonicalId }, { publicId: request.canonicalId }] },
      select: { id: true, publicId: true, canonicalName: true, displayName: true, status: true },
    });
    return record ? [{
      target: 'UNIVERSITY', id: record.id, publicId: record.publicId,
      canonicalName: record.canonicalName, displayName: record.displayName, lifecycle: record.status,
      method: record.id === request.canonicalId ? 'EXACT_CANONICAL_ID' : 'EXACT_PUBLIC_ID',
    }] : [];
  }

  private async findAcademicProgram(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (!request.canonicalId) return [];
    const record = await this.prisma.universityAcademicProgram.findUnique({
      where: { id: request.canonicalId },
      select: { id: true, universityId: true, sourceProgramName: true, normalizedName: true, status: true },
    });
    return record ? [{
      target: 'ACADEMIC_PROGRAM',
      id: record.id,
      canonicalName: record.normalizedName || record.sourceProgramName,
      displayName: record.sourceProgramName, ownerId: record.universityId, lifecycle: record.status,
      method: 'EXACT_CANONICAL_ID',
    }] : [];
  }

  private async findCountry(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.referenceCountry.findUnique({ where: { id: request.canonicalId } });
      return record ? [this.referenceCandidate('COUNTRY', record.id, record.iso2Code, record.name, 'EXACT_CANONICAL_ID', record.isActive === false ? 'INACTIVE' : 'ACTIVE')] : [];
    }
    if (request.standardCode) {
      const expected = request.standardCode.toUpperCase();
      const records = await this.prisma.referenceCountry.findMany({
        where: { OR: [{ iso2Code: expected }, { iso3Code: expected }] },
      });
      return records.map((record) => this.referenceCandidate('COUNTRY', record.id, record.iso2Code, record.name, 'EXACT_STANDARD_CODE'));
    }
    if (!request.rawValue) return [];
    const records = await this.prisma.referenceCountry.findMany({
      where: { OR: [
        { name: { equals: request.rawValue, mode: 'insensitive' } },
        { nameAr: { equals: request.rawValue, mode: 'insensitive' } },
        { officialName: { equals: request.rawValue, mode: 'insensitive' } },
      ] },
    });
    return records.map((record) => this.referenceCandidate('COUNTRY', record.id, record.iso2Code, record.name, 'EXACT_CANONICAL_NAME'));
  }

  private async findLanguage(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.referenceLanguage.findUnique({ where: { id: request.canonicalId } });
      return record ? [this.referenceCandidate('LANGUAGE', record.id, record.isoCode, record.name, 'EXACT_CANONICAL_ID', record.isActive === false ? 'INACTIVE' : 'ACTIVE')] : [];
    }
    if (request.standardCode) {
      const records = await this.prisma.referenceLanguage.findMany({
        where: { isoCode: { equals: request.standardCode, mode: 'insensitive' } },
      });
      return records.map((record) => this.referenceCandidate('LANGUAGE', record.id, record.isoCode, record.name, 'EXACT_STANDARD_CODE'));
    }
    if (!request.rawValue) return [];
    const records = await this.prisma.referenceLanguage.findMany({
      where: { OR: [
        { name: { equals: request.rawValue, mode: 'insensitive' } },
        { nameAr: { equals: request.rawValue, mode: 'insensitive' } },
        { nativeName: { equals: request.rawValue, mode: 'insensitive' } },
      ] },
    });
    return records.map((record) => this.referenceCandidate('LANGUAGE', record.id, record.isoCode, record.name, 'EXACT_CANONICAL_NAME'));
  }

  private async findCurrency(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.referenceCurrency.findUnique({ where: { id: request.canonicalId } });
      return record ? [this.referenceCandidate('CURRENCY', record.id, record.isoCode, record.name, 'EXACT_CANONICAL_ID', record.isActive === false ? 'INACTIVE' : 'ACTIVE')] : [];
    }
    if (request.standardCode) {
      const records = await this.prisma.referenceCurrency.findMany({
        where: { isoCode: { equals: request.standardCode, mode: 'insensitive' } },
      });
      return records.map((record) => this.referenceCandidate('CURRENCY', record.id, record.isoCode, record.name, 'EXACT_STANDARD_CODE'));
    }
    if (!request.rawValue) return [];
    const records = await this.prisma.referenceCurrency.findMany({
      where: { OR: [
        { name: { equals: request.rawValue, mode: 'insensitive' } },
        { nameAr: { equals: request.rawValue, mode: 'insensitive' } },
      ] },
    });
    return records.map((record) => this.referenceCandidate('CURRENCY', record.id, record.isoCode, record.name, 'EXACT_CANONICAL_NAME'));
  }

  private async findDegreeLevel(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.degreeLevel.findUnique({ where: { id: request.canonicalId } });
      return record ? [{ ...this.degreeCandidate(record, 'EXACT_CANONICAL_ID'), lifecycle: record.status }] : [];
    }
    if (request.standardCode) {
      const record = await this.prisma.degreeLevel.findUnique({ where: { canonicalCode: request.standardCode } });
      return record ? [this.degreeCandidate(record, 'EXACT_STANDARD_CODE')] : [];
    }
    if (!request.rawValue) return [];
    const all = await this.prisma.degreeLevel.findMany();
    const expected = this.normalizeLiteral(request.rawValue);
    return all.flatMap((record) => {
      if ([record.nameEn, record.nameAr].some((value) => this.normalizeLiteral(value) === expected)) {
        return [this.degreeCandidate(record, 'EXACT_CANONICAL_NAME')];
      }
      if (this.jsonStringValues(record.aliases).some((value) => this.normalizeLiteral(value) === expected)) {
        return [this.degreeCandidate(record, 'EXACT_ALIAS')];
      }
      return [];
    });
  }

  private async findMajor(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.major.findFirst({
        where: { OR: [{ id: request.canonicalId }, { publicId: request.canonicalId }] },
        select: { id: true, publicId: true, canonicalName: true, displayName: true, status: true },
      });
      return record ? [{
        target: 'MAJOR', id: record.id, publicId: record.publicId,
        canonicalName: record.canonicalName, displayName: record.displayName, lifecycle: record.status,
        method: record.id === request.canonicalId ? 'EXACT_CANONICAL_ID' : 'EXACT_PUBLIC_ID',
      }] : [];
    }
    if (!request.rawValue) return [];
    const normalizedAlias = this.normalizeLiteral(request.rawValue);
    const [direct, aliases] = await Promise.all([
      this.prisma.major.findMany({
        where: { OR: [
          { canonicalName: { equals: request.rawValue, mode: 'insensitive' } },
          { displayName: { equals: request.rawValue, mode: 'insensitive' } },
        ] },
        select: { id: true, publicId: true, canonicalName: true, displayName: true },
      }),
      this.prisma.majorAlias.findMany({
        where: { normalizedAlias },
        include: { major: true },
      }),
    ]);
    return [
      ...direct.map((record) => ({
        target: 'MAJOR' as const, id: record.id, publicId: record.publicId,
        canonicalName: record.canonicalName, displayName: record.displayName,
        method: 'EXACT_CANONICAL_NAME' as const,
      })),
      ...aliases.map((alias) => ({
        target: 'MAJOR' as const, id: alias.major.id, publicId: alias.major.publicId,
        canonicalName: alias.major.canonicalName, displayName: alias.major.displayName,
        method: 'EXACT_ALIAS' as const,
      })),
    ];
  }

  private async findInternationalTest(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    if (request.canonicalId) {
      const record = await this.prisma.internationalTest.findFirst({
        where: { OR: [{ id: request.canonicalId }, { publicId: request.canonicalId }] },
        select: { id: true, publicId: true, canonicalName: true, displayName: true, abbreviation: true, status: true },
      });
      return record ? [{
        target: 'INTERNATIONAL_TEST', id: record.id, publicId: record.publicId,
        canonicalName: record.canonicalName, displayName: record.displayName, lifecycle: record.status,
        method: record.id === request.canonicalId ? 'EXACT_CANONICAL_ID' : 'EXACT_PUBLIC_ID',
      }] : [];
    }
    if (!request.rawValue) return [];
    const records = await this.prisma.internationalTest.findMany({
      where: { OR: [
        { canonicalName: { equals: request.rawValue, mode: 'insensitive' } },
        { displayName: { equals: request.rawValue, mode: 'insensitive' } },
        { abbreviation: { equals: request.rawValue, mode: 'insensitive' } },
      ] },
      select: { id: true, publicId: true, canonicalName: true, displayName: true, abbreviation: true },
    });
    const expected = this.normalizeLiteral(request.rawValue);
    return records.map((record) => ({
      target: 'INTERNATIONAL_TEST', id: record.id, publicId: record.publicId,
      canonicalName: record.canonicalName, displayName: record.displayName,
      method: record.abbreviation && this.normalizeLiteral(record.abbreviation) === expected
        ? 'EXACT_ABBREVIATION' as const
        : 'EXACT_CANONICAL_NAME' as const,
    }));
  }

  private referenceCandidate(
    target: 'COUNTRY' | 'LANGUAGE' | 'CURRENCY',
    id: string,
    standardCode: string,
    canonicalName: string,
    method: 'EXACT_CANONICAL_ID' | 'EXACT_STANDARD_CODE' | 'EXACT_CANONICAL_NAME',
    lifecycle?: string,
  ): ScholarshipCanonicalCandidate {
    return { target, id, standardCode, canonicalName, displayName: canonicalName, lifecycle, method };
  }

  private degreeCandidate(
    record: { id: string; canonicalCode: string; nameEn: string },
    method: 'EXACT_CANONICAL_ID' | 'EXACT_STANDARD_CODE' | 'EXACT_CANONICAL_NAME' | 'EXACT_ALIAS',
  ): ScholarshipCanonicalCandidate {
    return {
      target: 'DEGREE_LEVEL', id: record.id, standardCode: record.canonicalCode,
      canonicalName: record.nameEn, displayName: record.nameEn, method,
    };
  }

  private normalizeLiteral(value: string): string {
    return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private jsonStringValues(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    if (!value || typeof value !== 'object') return [];
    return Object.values(value as Record<string, unknown>).flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (Array.isArray(item)) return item.filter((entry): entry is string => typeof entry === 'string');
      return [];
    });
  }
}
