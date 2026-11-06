import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { MajorDto, MajorLevelProfileDto, MajorVersionDto, MajorSourceDto, MajorAliasDto, MajorClassificationMappingDto, MajorContentSectionDto } from '@manaratak/domain';
import { PrismaMajorRepository } from './PrismaMajorRepository';
import { VerifiedMajorSourceWriter } from './VerifiedMajorSourceWriter';

type New<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/** Transaction-local write buffer for the existing domain promotion algorithm.
 * Reads are loaded under the owner's lock; no published structures are edited.
 */
export class BufferedMajorImportRepository extends PrismaMajorRepository {
  readonly majors: MajorDto[] = [];
  readonly profiles: MajorLevelProfileDto[] = [];
  readonly versions: MajorVersionDto[] = [];
  readonly sources: MajorSourceDto[] = [];
  readonly aliases: Array<Omit<MajorAliasDto, 'id'>> = [];
  readonly mappings: Array<Omit<MajorClassificationMappingDto, 'id'>> = [];
  readonly sections: Array<Omit<MajorContentSectionDto, 'id'>> = [];
  constructor(private readonly client: PrismaClient, private readonly existing: {
    majors: MajorDto[]; profiles: MajorLevelProfileDto[]; versions: MajorVersionDto[];
  }, private readonly sourceWriter?: VerifiedMajorSourceWriter) { super(client, false, true); }
  override async findByDedupKey(key: string) { return [...this.majors, ...this.existing.majors].find(row => row.canonicalDedupKey === key) ?? null; }
  override async create(data: Parameters<PrismaMajorRepository['create']>[0]) {
    const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() }; this.majors.push(row); return row;
  }
  override async findLevelProfile(majorId: string, level: MajorLevelProfileDto['level'], code?: string) {
    return [...this.profiles, ...this.existing.profiles].find(row => row.majorId === majorId && row.level === level && row.code === code) ?? null;
  }
  override async createLevelProfile(data: New<MajorLevelProfileDto>) {
    const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() }; this.profiles.push(row); return row;
  }
  override async acquireVersionAllocationLock() { /* All existing targets are locked before buffering. */ }
  override async listVersions(id: string) { return [...this.existing.versions, ...this.versions].filter(row => row.majorId === id); }
  override async createVersion(data: New<MajorVersionDto>) {
    const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() }; this.versions.push(row); return row;
  }
  override async createSource(data: New<MajorSourceDto>) {
    const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() }; this.sources.push(row); return row;
  }
  override async createAliases(data: Array<Omit<MajorAliasDto, 'id'>>) { this.aliases.push(...data); return { count: data.length }; }
  override async createClassificationMappings(data: Array<Omit<MajorClassificationMappingDto, 'id'>>) { this.mappings.push(...data); return { count: data.length }; }
  override async createContentSections(data: Array<Omit<MajorContentSectionDto, 'id'>>) { this.sections.push(...data); return { count: data.length }; }

  async flush() {
    if (this.majors.length) { const data = this.majors.map(row => ({
      id: row.id, publicId: row.publicId, slug: row.slug, canonicalName: row.canonicalName, canonicalDedupKey: row.canonicalDedupKey,
      displayName: row.displayName, localizedNameAr: row.localizedNameAr, localizedNameEn: row.localizedNameEn,
      status: row.status, completenessStatus: row.completenessStatus, facultyName: row.facultyName,
      academicFieldId: row.academicFieldId, disciplineId: row.disciplineId, optionalFields: json(row.optionalFields ?? {}),
    }));
      if (this.sourceWriter) await this.sourceWriter.insert('Major', data.map(row => {
        const sourceId = this.versions.find(v => v.majorId === row.id)?.sourceImportRecordId;
        if (!sourceId) throw Error('MAJOR_SOURCE_RECORD_REQUIRED');
        const fields = row.optionalFields as Record<string, unknown>;
        return { data: row, sourceId, patch: { sourceImportMode: fields.sourceImportMode, taxonomyResolutionOutcome: fields.taxonomyResolutionOutcome, taxonomyConfidence: fields.taxonomyConfidence, taxonomyReason: fields.taxonomyReason } };
      }));
      else await this.client.major.createMany({ data });
    }
    if (this.profiles.length) await this.client.majorLevelProfile.createMany({ data: this.profiles.map(row => ({
      id: row.id, majorId: row.majorId!, level: row.level, degreeLevelId: row.degreeLevelId, code: row.code, profileType: row.profileType,
      displayName: row.displayName, localizedNameAr: row.localizedNameAr, localizedNameEn: row.localizedNameEn, collegeContext: row.collegeContext,
      academicFieldId: row.academicFieldId, disciplineId: row.disciplineId, status: row.status, completenessStatus: row.completenessStatus, metadata: json(row.metadata ?? {}),
    })) });
    if (this.sources.length) await this.client.majorSource.createMany({ data: this.sources.map(row => ({
      id: row.id, majorId: row.majorId, profileId: row.profileId, sourceType: row.sourceType, sourceName: row.sourceName,
      sourceLocale: row.sourceLocale, sourceUri: row.sourceUri, sourceHash: row.sourceHash, importedAt: row.importedAt, metadata: json(row.metadata ?? {}),
    })) });
    if (this.versions.length) { const data = this.versions.map(row => ({
      id: row.id, majorId: row.majorId!, profileId: row.profileId, versionNumber: row.versionNumber, status: 'NEEDS_REVIEW',
      sourceImportRecordId: row.sourceImportRecordId, sourceFileName: row.sourceFileName, sourceUri: row.sourceUri,
      sourceHash: row.sourceHash, importedAt: row.importedAt, rawContentBlocks: json(row.rawContentBlocks ?? {}),
      changeSummary: json(row.changeSummary ?? {}), metadata: json(row.metadata ?? {}),
    }));
      if (this.sourceWriter) await this.sourceWriter.insert('MajorVersion', data.map(row => {
        if (!row.sourceImportRecordId) throw Error('MAJOR_SOURCE_RECORD_REQUIRED');
        return { data: row, sourceId: row.sourceImportRecordId };
      }));
      else await this.client.majorVersion.createMany({ data });
    }
    if (this.aliases.length) await this.client.majorAlias.createMany({ data: this.aliases.map(row => ({ ...row, majorId: row.majorId!, normalizedAlias: row.normalizedAlias ?? row.alias.trim().toLowerCase() })), skipDuplicates: true });
    if (this.mappings.length) await this.client.majorClassificationMapping.createMany({ data: this.mappings.map(row => ({ ...row, metadata: json(row.metadata ?? {}) })), skipDuplicates: true });
    if (this.sections.length) await this.client.majorContentSection.createMany({ data: this.sections.map(row => ({ ...row, metadata: json(row.metadata ?? {}) })) });
    const touched = [...new Set(this.versions.map(row => row.majorId).filter((id): id is string => Boolean(id && this.existing.majors.some(m => m.id === id))))];
    if (touched.length) await this.client.$executeRaw(Prisma.sql`UPDATE "Major" SET "updatedAt"=GREATEST(clock_timestamp(),"updatedAt" + interval '1 millisecond') WHERE id IN (${Prisma.join(touched)})`);
  }
}
