import { PrismaUniversityProgramReadPort } from '../universities/PrismaUniversityProgramReadPort';
import type { IUniversityProgramReadPort, UniversityProgramReferenceV1 } from '@manaratak/domain';
import {ScholarshipReferenceLifecycle} from './ScholarshipReferenceLifecycle';
import {encodeStableCursor} from '../api-foundation/StableCursor';
import type {PublishedProgramScholarshipPage} from '@manaratak/domain';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  CreateScholarshipDto,
  IScholarshipRepository,
  ITransactionalScholarshipRepository,
  PublicScholarshipFilters,
  ScholarshipDto,
  ScholarshipCompletenessState,
  ScholarshipFilters,
  ScholarshipPage,
  ScholarshipStatus,
  ScholarshipPublicationStatus,
  ScholarshipRepositoryUpdateDto,
  ScholarshipVerificationStatus,
  MajorStatus,
  UniversityStatus,
  assertUniversityProgramParent,
} from '@manaratak/domain';

interface ScholarshipTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

type AdminScholarshipFilters = ScholarshipFilters & {
  fundingCoverage?: string; sponsorName?: string; verificationStatus?: ScholarshipVerificationStatus;
  translationState?: 'NEEDS_TRANSLATION' | 'TRANSLATED'; deadlineFrom?: Date; deadlineTo?: Date;
  sourceType?: string; query?: string; translationLocale?:'ar'|'en';sort?:'CREATED_DESC'|'UPDATED_DESC'|'DEADLINE_ASC'|'COMPLETENESS_ASC';
};

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const LEGACY_COMPATIBILITY_KEYS = [
  'description',
  'notes',
  'fundingCoverage',
  'coverageDetails',
  'eligibleMajorsOrFields',
  'degreeLevel',
  'studyCountry',
  'applicationLink',
  'sponsorName',
  'requiredDocuments',
  'eligibilityCriteria',
  'studyLanguage',
  'targetUniversities',
  'targetAcademicPrograms',
  'fundingAmount',
  'currency',
  'duration',
  'localizedNames',
  'metadata',
] as const;

type LegacyCompatibilityKey = (typeof LEGACY_COMPATIBILITY_KEYS)[number];

const RESERVED_OPTIONAL_KEYS = new Set([
  'id', 'publicId', 'slug', 'canonicalName', 'canonicalDedupKey', 'status', 'completenessStatus',
  'verificationStatus', 'publicationStatus', 'sourceImportRecordId', 'countryReferenceId',
  'studyLanguageReferenceId', 'createdAt', 'updatedAt', 'versions', 'sponsorContext', 'applicationCycles',
]);

export class PrismaScholarshipRepository implements ITransactionalScholarshipRepository {
  constructor(private readonly prisma: PrismaClient, private readonly transactionBound = false, private readonly programReads: IUniversityProgramReadPort = new PrismaUniversityProgramReadPort(prisma)) {}

  listReferenceTransitions(id:string){return new ScholarshipReferenceLifecycle(this.prisma).list(id);}
  readReferenceState(id:string){return new ScholarshipReferenceLifecycle(this.prisma).state(id);}
  readReferenceStateBySlug(slug:string){return new ScholarshipReferenceLifecycle(this.prisma).stateBySlug(slug);}
  proposeReferenceTransition(input:Parameters<ScholarshipReferenceLifecycle['propose']>[0]){return new ScholarshipReferenceLifecycle(this.prisma,this.transactionBound).propose(input);}
  approveReferenceTransition(sourceId:string,transitionId:string,revision:number,actor:string,reason:string){return new ScholarshipReferenceLifecycle(this.prisma,this.transactionBound).approve(sourceId,transitionId,revision,actor,reason);}

  /** Runs on the same transaction-bound repository as import/manual writes. */
  private async normalizeProgramParents<
    T extends {
      academicProgramId?: string | null;
      universityId?: string | null;
      resolutionStatus?: string;
    },
  >(links: T[], draftDegreeIds?: string[]): Promise<T[]> {
    const ids = [
      ...new Set(
        links.map((link) => link.academicProgramId).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (!ids.length) return links;
    const rows = await this.programReads.findByIds(ids);
    return links.map((link) => {
      if (!link.academicProgramId) return link;
      const program = rows.find((row) => row.id === link.academicProgramId);
      if (!program) throw new Error('SCHOLARSHIP_ACADEMIC_PROGRAM_NOT_FOUND');
      const draftAllowed = this.transactionBound && draftDegreeIds?.includes(program.degreeLevelId ?? '') &&
        ['DRAFT', 'ACTIVE'].includes(program.status) &&
        ['IMPORTED', 'READY_TO_REVIEW', 'NEEDS_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED'].includes(program.universityStatus ?? '');
      if (program.contractVersion !== 1 || (!program.publiclyEligible && !draftAllowed)) throw new Error('SCHOLARSHIP_ACADEMIC_PROGRAM_NOT_PUBLISHED');
      const universityId = assertUniversityProgramParent(link.universityId, {
        id: program.id,
        ownerId: program.universityId,
      });
      return { ...link, universityId, resolutionStatus: 'RESOLVED' };
    });
  }

  private readonly normalizedInclude = {
    primaryCountry:{select:{id:true,name:true,nameAr:true,isActive:true,lifecycleState:true}},
    benefits: { include: { currency: { select: { isoCode: true, nameAr: true, name: true } } } },
    degreeTargets: { include: { degreeLevel: { select: { canonicalCode: true, nameEn: true, nameAr: true } } } },
    majorTargets: { include: { major: { select: { status: true } } } },
    eligibilityItems: { include: { country:{select:{id:true,name:true,nameAr:true,isActive:true,lifecycleState:true}}, major: { select: { status: true } },
        internationalTest: { select: { id: true, status: true, isPubliclyVisible: true, currentPublishedVersionId: true, currentPublishedVersion: { select: { id: true, testId: true, status: true } } } },
      } },
    requiredDocuments: { include: { internationalTest: { select: { id: true, status: true, isPubliclyVisible: true, currentPublishedVersionId: true, currentPublishedVersion: { select: { id: true, testId: true, status: true } } } } } },
    sourceEvidence: true,
    universityLinks: { include: { university: { select: { id: true, status: true, displayName: true } } } },
    versions: { orderBy: { versionNumber: 'asc' as const } },
    sponsorContext: true,
    applicationCycles: { orderBy: { createdAt: 'asc' as const } },
  } as const;

  withTransaction(context: AtomicPersistenceContext): IScholarshipRepository {
    const transactionClient = (context as Partial<ScholarshipTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    return new PrismaScholarshipRepository(transactionClient as unknown as PrismaClient, true, this.programReads.withTransaction(context));
  }

  async findById(id: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { id },
      include: this.normalizedInclude,
    });
    return record ? (await this.hydrateProgramOwners([this.mapToDto(record)]))[0] : null;
  }

  async findBySlug(slug: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { slug },
      include: this.normalizedInclude,
    });
    return record ? (await this.hydrateProgramOwners([this.mapToDto(record)]))[0] : null;
  }

  async findPublishedBySlug(slug: string): Promise<ScholarshipDto | null> {
    if (!this.transactionBound) return this.readSnapshot(repository=>repository.findPublishedBySlug(slug));
    const record = await this.prisma.scholarship.findFirst({
      where: { slug, status: ScholarshipStatus.PUBLISHED, publicationStatus: ScholarshipPublicationStatus.PUBLISHED, verificationStatus: ScholarshipVerificationStatus.VERIFIED, completenessStatus:ScholarshipCompletenessState.COMPLETE, versions: { some: { status: 'PUBLISHED' } } },
      include: this.normalizedInclude,
    });
    return record ? (await this.hydrateProgramOwners([this.mapToDto(record)]))[0] : null;
  }

  async findByDedupKey(key: string): Promise<ScholarshipDto | null> {
    const record = await this.prisma.scholarship.findUnique({
      where: { canonicalDedupKey: key },
      include: this.normalizedInclude,
    });
    return record ? (await this.hydrateProgramOwners([this.mapToDto(record)]))[0] : null;
  }

  async create(data: CreateScholarshipDto): Promise<ScholarshipDto> {
    if (data.universityLinks)
      data = { ...data, universityLinks: await this.normalizeProgramParents(data.universityLinks,
        (data.publicationStatus ?? ScholarshipPublicationStatus.DRAFT) === ScholarshipPublicationStatus.DRAFT &&
        ![ScholarshipStatus.ARCHIVED, ScholarshipStatus.REJECTED, ScholarshipStatus.PUBLISHED].includes(data.status)
          ? (data.degreeTargets ?? []).filter(target => target.resolutionStatus === 'RESOLVED').map(target => target.degreeLevelId ?? '') : undefined) };
    const legacyCompatibility = this.buildLegacyCompatibility(data.optionalFields, data);
    const createData = {
      publicId: data.publicId,
      slug: data.slug,
      canonicalName: data.canonicalName,
      canonicalDedupKey: data.canonicalDedupKey,
      displayName: data.displayName,
      providerName: data.providerName,
      status: data.status,
      completenessStatus: data.completenessStatus,
      verificationStatus: data.verificationStatus ?? ScholarshipVerificationStatus.PENDING,
      publicationStatus: data.publicationStatus ?? ScholarshipPublicationStatus.DRAFT,
      amountMinorUnits: data.amountMinorUnits,
      amountCurrencyCode: data.amountCurrencyCode,
      isFullyFunded: data.isFullyFunded,
      applicationDeadline: data.applicationDeadline,
      officialWebsite: data.officialWebsite,
      sourceUrl: data.sourceUrl,
      academicYear: data.academicYear,
      cycleName: data.cycleName,
      countryReferenceId: data.countryReferenceId,
      countrySourceLabel: data.countrySourceLabel,
      countryScope: data.countryScope,
      fundingTypeCode: data.fundingTypeCode,
      deadlineType: data.deadlineType,
      applicationMethod: data.applicationMethod,
      applicationUrl: data.applicationUrl ?? data.applicationLink,
      officialSourceUrl: data.officialSourceUrl,
      sourceImportRecordId: data.sourceImportRecordId,
      sourceLocale: data.sourceLocale,
      lastVerifiedAt: data.lastVerifiedAt,
      studyLanguageReferenceId: data.studyLanguageReferenceId,
      studyLanguageSourceLabel: data.studyLanguageSourceLabel,
      studyLanguageResolutionStatus: data.studyLanguageResolutionStatus,
      optionalFields: legacyCompatibility,
      benefits: this.toNestedCreate(data.benefits),
      degreeTargets: this.toNestedCreate(data.degreeTargets),
      majorTargets: this.toNestedCreate(data.majorTargets),
      eligibilityItems: this.toNestedCreate(data.eligibilityItems),
      requiredDocuments: this.toNestedCreate(data.requiredDocumentItems),
      sourceEvidence: this.toNestedCreate(data.sourceEvidence),
      universityLinks: this.toNestedCreate(data.universityLinks),
      sponsorContext: { create: { sponsorType: 'CONTEXTUAL', displayName: data.providerName ?? data.sponsorName ?? 'UNKNOWN_SPONSOR', source: 'SCHOLARSHIP_ROOT', universityId: data.sponsorUniversityId ?? null } },
      applicationCycles: { create: [this.applicationCycleData(data)] },
      versions: { create: [this.initialVersionData(data)] },
    } as unknown as Prisma.ScholarshipCreateInput;

    const record = await this.prisma.scholarship.create({
      data: createData,
      include: this.normalizedInclude,
    });

    return (await this.hydrateProgramOwners([this.mapToDto(record)]))[0];
  }

  async assertCurrentRevision(id: string, expectedRevision: number): Promise<void> {
    if (!this.transactionBound) throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Scholarship" WHERE "id" = ${id} FOR UPDATE`);
    const record = await this.prisma.scholarship.findUnique({ where: { id }, select: { revision: true } });
    if (!record) throw new Error('SCHOLARSHIP_NOT_FOUND');
    if (record.revision !== expectedRevision) throw new Error('SCHOLARSHIP_STALE_REVISION');
  }

  async update(id: string, updates: ScholarshipRepositoryUpdateDto): Promise<ScholarshipDto> {
    const structural = this.hasStructuralChanges(updates);
    if (!this.transactionBound) throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Scholarship" WHERE "id" = ${id} FOR UPDATE`);
    const existing = await this.prisma.scholarship.findUnique({ where: { id }, include: { degreeTargets: true } });
    if (!existing) {
      throw new Error(`SCHOLARSHIP_NOT_FOUND:${id}`);
    }
    if (existing.publicationStatus !== ScholarshipPublicationStatus.DRAFT || [ScholarshipStatus.ARCHIVED, ScholarshipStatus.REJECTED].includes(existing.status as ScholarshipStatus)) throw new Error('SCHOLARSHIP_NON_EDITABLE_STATUS');
    if (updates.universityLinks) updates = { ...updates,
      universityLinks: await this.normalizeProgramParents(updates.universityLinks,
        (updates.publicationStatus ?? existing.publicationStatus) === ScholarshipPublicationStatus.DRAFT
          ? (updates.degreeTargets ?? existing.degreeTargets ?? []).filter(target => target.resolutionStatus === 'RESOLVED').map(target => target.degreeLevelId ?? '') : undefined),
    };

    const legacyCompatibility = this.buildLegacyCompatibility(
      this.asOptionalRecord(existing.optionalFields),
      updates,
    );
    if(updates.optionalFields?.ownerLocalizedDescriptions!==undefined) legacyCompatibility.ownerLocalizedDescriptions=updates.optionalFields.ownerLocalizedDescriptions;
    const updateData = {
      revision: { increment: 1 },
      canonicalDedupKey: updates.canonicalDedupKey,
      displayName: updates.displayName,
      providerName: updates.providerName,
      status: structural && existing.status === ScholarshipStatus.READY_TO_PUBLISH
        ? ScholarshipStatus.READY_TO_REVIEW : updates.status,
      completenessStatus: updates.completenessStatus,
      verificationStatus: updates.verificationStatus,
      publicationStatus: updates.publicationStatus,
      amountMinorUnits: updates.amountMinorUnits,
      amountCurrencyCode: updates.amountCurrencyCode,
      isFullyFunded: updates.isFullyFunded,
      applicationDeadline: updates.applicationDeadline,
      officialWebsite: updates.officialWebsite,
      sourceUrl: updates.sourceUrl,
      academicYear: updates.academicYear,
      cycleName: updates.cycleName,
      countryReferenceId: updates.countryReferenceId,
      countrySourceLabel: updates.countrySourceLabel,
      countryScope: updates.countryScope,
      fundingTypeCode: updates.fundingTypeCode,
      deadlineType: updates.deadlineType,
      applicationMethod: updates.applicationMethod,
      applicationUrl: updates.applicationUrl ?? updates.applicationLink,
      officialSourceUrl: updates.officialSourceUrl,
      sourceImportRecordId: updates.sourceImportRecordId,
      sourceLocale: updates.sourceLocale,
      lastVerifiedAt: updates.lastVerifiedAt,
      studyLanguageReferenceId: updates.studyLanguageReferenceId,
      studyLanguageSourceLabel: updates.studyLanguageSourceLabel,
      studyLanguageResolutionStatus: updates.studyLanguageResolutionStatus,
      optionalFields: legacyCompatibility,
      benefits: this.toNestedUpsert(id, updates.benefits, 'benefitKey'),
      degreeTargets: this.toNestedUpsert(id, updates.degreeTargets, 'targetKey'),
      majorTargets: this.toNestedUpsert(id, updates.majorTargets, 'targetKey'),
      eligibilityItems: this.toNestedUpsert(id, updates.eligibilityItems, 'itemKey'),
      requiredDocuments: this.toNestedUpsert(id, updates.requiredDocumentItems, 'documentKey'),
      sourceEvidence: this.toNestedUpsert(id, updates.sourceEvidence, 'evidenceKey'),
      universityLinks: this.toNestedUpsert(id, updates.universityLinks, 'linkKey'),
    } as unknown as Prisma.ScholarshipUpdateInput;

    let record = await this.prisma.scholarship.update({
      where: { id },
      data: updateData,
      include: this.normalizedInclude,
    });
    if (structural) {
      const version = await this.appendStructuralVersion(id, record);
      await this.prisma.scholarshipSponsorContext.upsert({
        where: { scholarshipId: id },
        create: { scholarshipId: id, sponsorType: 'CONTEXTUAL', displayName: record.providerName ?? 'UNKNOWN_SPONSOR', source: 'SCHOLARSHIP_ROOT', universityId: updates.sponsorUniversityId ?? null },
        update: { displayName: record.providerName ?? 'UNKNOWN_SPONSOR', universityId: updates.sponsorUniversityId },
      });
      const cycle = this.applicationCycleData(record);
      await this.prisma.scholarshipApplicationCycle.upsert({
        where: { scholarshipId_cycleKey: { scholarshipId: id, cycleKey: cycle.cycleKey } },
        create: { scholarshipId: id, versionId: version.id, ...cycle },
        update: { versionId: version.id, academicYear: cycle.academicYear, closesAt: cycle.closesAt, status: cycle.status },
      });
      record = await this.prisma.scholarship.findUniqueOrThrow({ where: { id }, include: this.normalizedInclude });
    }
    return (await this.hydrateProgramOwners([this.mapToDto(record)]))[0];
  }

  async updateStatus(id: string, status: ScholarshipStatus): Promise<void> {
    if (!this.transactionBound) throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.scholarship.update({
      where: { id },
      data: { status, revision: { increment: 1 } },
    });
  }

  async updateLifecycle(id: string, lifecycle: {
    workflowStatus?: ScholarshipStatus;
    verificationStatus?: ScholarshipVerificationStatus;
    publicationStatus?: ScholarshipPublicationStatus;
  }): Promise<void> {
    if (!this.transactionBound) throw new Error('SCHOLARSHIP_ATOMIC_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Scholarship" WHERE "id" = ${id} FOR UPDATE`);
    await this.prisma.scholarship.update({
      where: { id },
      data: {
        revision: { increment: 1 },
        status: lifecycle.workflowStatus,
        verificationStatus: lifecycle.verificationStatus,
        publicationStatus: lifecycle.publicationStatus,
      },
    });

    if (lifecycle.publicationStatus === ScholarshipPublicationStatus.PUBLISHED) {
      const latest = await this.prisma.scholarshipVersion.findFirst({
        where: { scholarshipId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latest) throw new Error('SCHOLARSHIP_VERSION_REQUIRED');
      const publishedAt = new Date();
      await this.prisma.scholarshipVersion.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED', id: { not: latest.id } },
        data: { status: 'SUPERSEDED' },
      });
      await this.prisma.scholarshipVersion.update({
        where: { id: latest.id },
        data: { status: 'PUBLISHED', publishedAt },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED', versionId: { not: latest.id } },
        data: { status: 'SUPERSEDED' },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, OR: [{ versionId: latest.id }, { versionId: null }] },
        data: { versionId: latest.id, status: 'PUBLISHED' },
      });
    } else if (lifecycle.publicationStatus === ScholarshipPublicationStatus.DRAFT) {
      await this.prisma.scholarshipVersion.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED' },
        data: { status: 'UNPUBLISHED' },
      });
      await this.prisma.scholarshipApplicationCycle.updateMany({
        where: { scholarshipId: id, status: 'PUBLISHED' },
        data: { status: 'UNPUBLISHED' },
      });
    } else if (lifecycle.publicationStatus === ScholarshipPublicationStatus.ARCHIVED) {
      const latest = await this.prisma.scholarshipVersion.findFirst({
        where: { scholarshipId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (latest) {
        await this.prisma.scholarshipVersion.update({ where: { id: latest.id }, data: { status: 'ARCHIVED' } });
        await this.prisma.scholarshipApplicationCycle.updateMany({
          where: { scholarshipId: id, OR: [{ versionId: latest.id }, { versionId: null }] },
          data: { versionId: latest.id, status: 'ARCHIVED' },
        });
      }
    }
  }

  async list(filters: AdminScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const where: Prisma.ScholarshipWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
    const constraints: Prisma.ScholarshipWhereInput[] = [];
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;
    if (filters.studyLanguageReferenceId) where.studyLanguageReferenceId = filters.studyLanguageReferenceId;
    if (filters.currencyReferenceId) constraints.push({ benefits: { some: { currencyReferenceId: filters.currencyReferenceId } } });
    if (filters.degreeLevelId) constraints.push({ degreeTargets: { some: { degreeLevelId: filters.degreeLevelId } } });
    if (filters.majorId) constraints.push({ OR: [
      { majorTargets: { some: { majorId: filters.majorId } } },
      { eligibilityItems: { some: { majorId: filters.majorId } } },
    ] });
    if (filters.internationalTestId) constraints.push({ OR: [
      { eligibilityItems: { some: { internationalTestId: filters.internationalTestId,
                internationalTest: { is: { status: 'PUBLISHED' } },
              } } },
      { requiredDocuments: { some: { internationalTestId: filters.internationalTestId,
                internationalTest: { is: { status: 'PUBLISHED' } },
              } } },
    ] });
    if (filters.academicProgramId) {
      const refs = await this.programReads.findByIds([filters.academicProgramId]);
      const program = refs.find(row => row.id === filters.academicProgramId && (!filters.universityId || row.universityId === filters.universityId) && (!filters.degreeLevelId || row.degreeLevelId === filters.degreeLevelId));
      constraints.push({universityLinks:{some: program ? {academicProgramId:program.id, OR:[{universityId:program.universityId},{universityId:null}]} : {id:{in:[]}}}});
    }
    else if(filters.universityId) constraints.push({universityLinks:{some:{universityId:filters.universityId}}});
    if (filters.fundingCoverage) constraints.push({ OR: [
      { fundingTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } },
      { benefits: { some: { coverageTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } } } },
    ] });
    if (filters.sponsorName) constraints.push({ providerName: { contains: filters.sponsorName, mode: 'insensitive' } });
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    const locale=filters.translationLocale??'en';
    const translated:Prisma.ScholarshipWhereInput={AND:[{optionalFields:{path:['localizedNames',locale],string_contains:''}},
      {NOT:{optionalFields:{path:['localizedNames',locale],equals:''}}}]};
    if(filters.translationState==='TRANSLATED')constraints.push(translated);
    if(filters.translationState==='NEEDS_TRANSLATION')constraints.push({OR:[{optionalFields:{equals:Prisma.DbNull}},
      {optionalFields:{path:['localizedNames',locale],equals:Prisma.AnyNull}},
      {optionalFields:{path:['localizedNames',locale],equals:''}}]});
    if (filters.deadlineFrom || filters.deadlineTo) where.applicationDeadline = { gte: filters.deadlineFrom, lte: filters.deadlineTo };
    if (filters.sourceType) constraints.push({ sourceEvidence: { some: { sourceTypeCode: { equals: filters.sourceType, mode: 'insensitive' } } } });
    if (filters.countryLabel && !filters.countryReferenceId) {
      constraints.push({ OR: [
      ...(filters.countryReferenceId ? [{ countryReferenceId: filters.countryReferenceId }] : []),
      { countrySourceLabel: { contains: filters.countryLabel, mode: 'insensitive' } },
      { optionalFields: { path: ['studyCountry'], string_contains: filters.countryLabel } },
    ] });
    }
    if (filters.languageLabel) {
      const aliases: Record<string, string[]> = {
        الإنجليزية: ['الإنجليزية', 'English'],
        العربية: ['العربية', 'Arabic'],
        التركية: ['التركية', 'Turkish'],
        الألمانية: ['الألمانية', 'German'],
        الفرنسية: ['الفرنسية', 'French'],
      };
      const matches: Prisma.ScholarshipWhereInput[] = [];
      for (const label of aliases[filters.languageLabel] || [filters.languageLabel]) matches.push(
        { studyLanguageSourceLabel: { contains: label, mode: 'insensitive' } },
        { studyLanguage: { is: { OR: [{ name: { contains: label, mode: 'insensitive' } }, { nameAr: { contains: label, mode: 'insensitive' } }] } } },
        { optionalFields: { path: ['studyLanguage'], string_contains: label } },
      );
      constraints.push({ OR: matches });
    }
    if (filters.majorLabel) constraints.push({ OR: [
      { majorTargets: { some: { sourceLabel: { contains: filters.majorLabel, mode: 'insensitive' } } } },
      { majorTargets: { some: { major: { is: { OR: [
        { displayName: { contains: filters.majorLabel, mode: 'insensitive' } },
        { localizedNameAr: { contains: filters.majorLabel, mode: 'insensitive' } },
      ] } } } } },
    ] });
    if (filters.degreeLabel) {
      const aliases: Record<string, string[]> = {
        بكالوريوس: ['بكالوريوس', 'bachelor', 'undergraduate'],
        ماجستير: ['ماجستير', 'master'],
        دكتوراه: ['دكتوراه', 'doctorate', 'phd'],
        زمالة: ['زمالة', 'fellowship'],
      };
      const matches: Prisma.ScholarshipWhereInput[] = [];
      for (const label of aliases[filters.degreeLabel] || [filters.degreeLabel]) matches.push(
        { degreeTargets: { some: { sourceLabel: { contains: label, mode: 'insensitive' } } } },
        { degreeTargets: { some: { degreeLevel: { is: { OR: [{ nameEn: { contains: label, mode: 'insensitive' } }, { nameAr: { contains: label, mode: 'insensitive' } }] } } } } },
        { optionalFields: { path: ['degreeLevel'], string_contains: label } },
      );
      constraints.push({ OR: matches });
    }
    if (filters.fundingType === 'FULL') constraints.push({ OR: [{ isFullyFunded: true }, { fundingTypeCode: { in: ['FULL', 'FULLY_FUNDED'] } }] });
    if (filters.fundingType === 'PARTIAL') constraints.push({ fundingTypeCode: { in: ['PARTIAL', 'PARTIALLY_FUNDED'] } });
    if (filters.deadlineStatus) {
      const now = new Date();
      if (filters.deadlineStatus === 'OPEN') constraints.push({ OR: [{ applicationDeadline: { gte: now } }, { deadlineType: 'OPEN_ALL_YEAR' }] });
      if (filters.deadlineStatus === 'CLOSED') constraints.push({ applicationDeadline: { lt: now } });
      if (filters.deadlineStatus === 'CLOSING_SOON') constraints.push({ applicationDeadline: { gte: now, lte: new Date(now.getTime() + 45 * 86400000) } });
      if (filters.deadlineStatus === 'OPEN_ALL_YEAR') constraints.push({ deadlineType: 'OPEN_ALL_YEAR' });
    }
    if (filters.query) constraints.push({ OR: [
      { displayName: { contains: filters.query, mode: 'insensitive' } },
      { canonicalName: { contains: filters.query, mode: 'insensitive' } },
      { providerName: { contains: filters.query, mode: 'insensitive' } },
      { publicId: { contains: filters.query, mode: 'insensitive' } },
      { countrySourceLabel: { contains: filters.query, mode: 'insensitive' } },
      { optionalFields: { path: ['localizedNames', 'ar'], string_contains: filters.query } },
      { optionalFields: { path: ['localizedNames', 'en'], string_contains: filters.query } },
    ] });
    if (constraints.length) where.AND = constraints;

    if (filters.countOnly) {
      const total = await this.prisma.scholarship.count({where});
      return {data:[],total,page,pageSize,totalPages:Math.ceil(total/pageSize)};
    }
    let data:any[];let total:number;
    if(filters.sort==='DEADLINE_ASC'){
      const snapshot=await this.prisma.$transaction(async db=>{
      // Dated opportunities precede unknown and year-round deadlines, even if a legacy year-round row has a date.
      const dated:Prisma.ScholarshipWhereInput={AND:[where,{applicationDeadline:{not:null}}, {OR:[{deadlineType:null},{deadlineType:{not:'OPEN_ALL_YEAR'}}]}]};
      const other:Prisma.ScholarshipWhereInput={AND:[where,{OR:[{applicationDeadline:null},{deadlineType:'OPEN_ALL_YEAR'}]}]};
      const [datedCount,allCount]=await Promise.all([db.scholarship.count({where:dated}),db.scholarship.count({where})]);
      const skip=(page-1)*pageSize;
      const first=skip<datedCount?await db.scholarship.findMany({where:dated,skip,take:Math.min(pageSize,datedCount-skip),orderBy:[{applicationDeadline:'asc'},{id:'asc'}],include:this.normalizedInclude}):[];
      const second=first.length<pageSize?await db.scholarship.findMany({where:other,skip:Math.max(0,skip-datedCount),take:pageSize-first.length,orderBy:{id:'asc'},include:this.normalizedInclude}):[];
      return {data:[...first,...second],total:allCount};
      },{isolationLevel:'RepeatableRead'});data=snapshot.data;total=snapshot.total;
    }else{
      const orderBy:Prisma.ScholarshipOrderByWithRelationInput[]=filters.sort==='UPDATED_DESC'?[{updatedAt:'desc'},{id:'asc'}]:filters.sort==='COMPLETENESS_ASC'?[{completenessStatus:'asc'},{id:'asc'}]:[{createdAt:'desc'},{id:'asc'}];
      [data,total]=await Promise.all([this.prisma.scholarship.findMany({where,skip:(page-1)*pageSize,take:pageSize,orderBy,include:this.normalizedInclude}),this.prisma.scholarship.count({where})]);
    }

    return {
      data: await this.hydrateProgramOwners(data.map((record) => this.mapToDto(record))),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAdminSummary() {
    const [all, imported, missingFields, needsVerification, needsTranslation, readyToPublish, published, archived, inReview, incomplete] = await Promise.all([
      this.prisma.scholarship.count(),
      this.prisma.scholarship.count({ where: { status: { in: [ScholarshipStatus.IMPORTED, ScholarshipStatus.READY_TO_REVIEW] } } }),
      this.prisma.scholarship.count({ where: { OR: [{ completenessStatus: { not: ScholarshipCompletenessState.COMPLETE } }, { applicationDeadline: null }] } }),
      this.prisma.scholarship.count({ where: { OR: [{ verificationStatus: { not: ScholarshipVerificationStatus.VERIFIED } }, { officialSourceUrl: null }] } }),
      this.prisma.scholarship.count({where:{OR:[{optionalFields:{equals:Prisma.DbNull}},{optionalFields:{path:['localizedNames','en'],equals:Prisma.AnyNull}},{optionalFields:{path:['localizedNames','en'],equals:''}}]}}),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.READY_TO_PUBLISH } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.PUBLISHED } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.ARCHIVED } }),
      this.prisma.scholarship.count({ where: { status: ScholarshipStatus.READY_TO_REVIEW } }),
      this.prisma.scholarship.count({ where: { completenessStatus: ScholarshipCompletenessState.INCOMPLETE } }),
    ]);
    return { all, imported, missingFields, needsVerification, needsTranslation, readyToPublish, published, archived, inReview, incomplete };
  }

  async listPublishedProgramRelationshipsPage(programIds:string[],limit:number):Promise<Record<string,PublishedProgramScholarshipPage>>{
    const ids=[...new Set(programIds)];
    if(ids.length>50||!Number.isSafeInteger(limit)||limit<1||limit>12)throw new Error('SCHOLARSHIP_PROGRAM_PAGE_INVALID');
    const result:Record<string,PublishedProgramScholarshipPage>=Object.fromEntries(ids.map(id=>[id,{data:[],total:0,hasMore:false,nextCursor:null}]));
    if(!ids.length)return result;
    if (!this.transactionBound) {
      return this.prisma.$transaction(async tx => {
        const context = {boundaryId:'scholarship-program-owner-read-v1',transactionClient:tx};
        return new PrismaScholarshipRepository(tx as PrismaClient, true, this.programReads.withTransaction(context)).listPublishedProgramRelationshipsPage(ids, limit);
      }, {isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead});
    }
    const programs = (await this.programReads.findByIds(ids)).filter(row => row.contractVersion === 1 && row.publiclyEligible && ids.includes(row.id));
    if (!programs.length) return result;
    const rows=await this.prisma.$queryRaw<Array<{programId:string;id:string;publicId:string;slug:string;displayName:string;localizedNames:Record<string,string>|null;total:bigint}>>(Prisma.sql`
      WITH owner_programs AS (
        SELECT * FROM (VALUES ${Prisma.join(programs.map(program => Prisma.sql`(${program.id}::text,${program.universityId}::text)`))}) AS owner_programs(id,"universityId")
      ), eligible AS (
        SELECT DISTINCT sl."academicProgramId" AS "programId",sh.id,sh."publicId",sh.slug,sh."displayName",sh."optionalFields"->'localizedNames' AS "localizedNames"
        FROM "ScholarshipUniversityLink" sl JOIN "Scholarship" sh ON sh.id=sl."scholarshipId"
        JOIN owner_programs p ON p.id=sl."academicProgramId"
        WHERE sl."academicProgramId" IN (${Prisma.join(ids)}) AND sl."resolutionStatus"='RESOLVED' AND (sl."universityId" IS NULL OR sl."universityId"=p."universityId")
          AND sh.status='PUBLISHED' AND sh."publicationStatus"='PUBLISHED' AND sh."verificationStatus"='VERIFIED' AND sh."completenessStatus"='COMPLETE'
          AND EXISTS(SELECT 1 FROM "ScholarshipVersion" sv WHERE sv."scholarshipId"=sh.id AND sv.status='PUBLISHED')
      ), ranked AS (SELECT *,row_number() OVER(PARTITION BY "programId" ORDER BY id) AS rn,count(*) OVER(PARTITION BY "programId") AS total FROM eligible)
      SELECT "programId",id,"publicId",slug,"displayName","localizedNames",total FROM ranked WHERE rn<=${limit+1} ORDER BY "programId",id`);
    for(const id of ids){const selected=rows.filter(row=>row.programId===id),page=result[id];page.total=Number(selected[0]?.total??0);if(!Number.isSafeInteger(page.total)||page.total<0)throw new Error('SCHOLARSHIP_PUBLIC_COUNT_INVALID');page.data=selected.slice(0,limit).map(({programId:_programId,total:_total,...row})=>({...row,localizedNames:row.localizedNames??undefined}));page.hasMore=selected.length>limit;page.nextCursor=page.hasMore?encodeStableCursor(page.data.at(-1)!.id):null;}
    return result;
  }

  async listPublished(filters: PublicScholarshipFilters): Promise<ScholarshipPage<ScholarshipDto>> {
    if (!this.transactionBound) return this.readSnapshot(repository=>repository.listPublished(filters));
    const where: Prisma.ScholarshipWhereInput = {
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
      status: ScholarshipStatus.PUBLISHED,
      verificationStatus: ScholarshipVerificationStatus.VERIFIED,
      versions: { some: { status: 'PUBLISHED' } },
      completenessStatus: ScholarshipCompletenessState.COMPLETE,
    };
    const constraints: Prisma.ScholarshipWhereInput[] = [];
    if (filters.nationalityCountryReferenceId) {
      constraints.push({eligibilityItems:{some:{itemTypeCode:'NATIONALITY',operatorCode:'IN',countryReferenceId:filters.nationalityCountryReferenceId,resolutionStatus:'RESOLVED',country:{is:{isActive:true,lifecycleState:'ACTIVE'}}}}});
      constraints.push({eligibilityItems:{none:{itemTypeCode:'NATIONALITY',operatorCode:'NOT_IN',countryReferenceId:filters.nationalityCountryReferenceId,resolutionStatus:'RESOLVED'}}});
      constraints.push({eligibilityItems:{none:{itemTypeCode:'NATIONALITY',OR:[{resolutionStatus:{not:'RESOLVED'}},{countryReferenceId:null},{operatorCode:null},{operatorCode:{notIn:['IN','NOT_IN']}}]}}});
    }
    if(filters.ownerId)where.id=filters.ownerId;
    if(filters.search)constraints.push({OR:[{displayName:{contains:filters.search,mode:'insensitive'}},{publicId:{contains:filters.search,mode:'insensitive'}}]});
    if (filters.countryReferenceId) where.countryReferenceId = filters.countryReferenceId;

    if (filters.currencyReferenceId) constraints.push({ benefits: { some: { currencyReferenceId: filters.currencyReferenceId } } });
    // Independent target lists cannot prove a funded degree-major pair.
    const pairedProgramFilter = Boolean(filters.degreeLevelId && filters.majorId);
    if (filters.degreeLevelId && !pairedProgramFilter) constraints.push({ degreeTargets: { some: { degreeLevelId: filters.degreeLevelId } } });
    if (filters.majorId && !pairedProgramFilter) constraints.push({ OR: [
      { majorTargets: { some: { majorId: filters.majorId, major: { is: { status: MajorStatus.PUBLISHED } } } } },
      { eligibilityItems: { some: { majorId: filters.majorId, major: { is: { status: MajorStatus.PUBLISHED } } } } },
    ] });
    if (filters.internationalTestId) constraints.push({ OR: [
      { eligibilityItems: { some: { internationalTestId: filters.internationalTestId,
                resolutionStatus: 'RESOLVED', internationalTest: { is: { status: 'PUBLISHED', isPubliclyVisible: true, currentPublishedVersion: { is: { status: 'PUBLISHED', testId: filters.internationalTestId } } } },
              } } },
      { requiredDocuments: { some: { internationalTestId: filters.internationalTestId,
                resolutionStatus: 'RESOLVED', internationalTest: { is: { status: 'PUBLISHED', isPubliclyVisible: true, currentPublishedVersion: { is: { status: 'PUBLISHED', testId: filters.internationalTestId } } } },
              } } },
    ] });
    if (filters.universityId || filters.academicProgramId || pairedProgramFilter || filters.studyLanguageReferenceId) {
      // Filter exact owner/profile proof before both page and count. Oversized owner scope fails explicitly.
      const eligible = await this.programReads.findPublished({
        universityId: filters.universityId, academicProgramId: filters.academicProgramId,
        degreeLevelId: filters.degreeLevelId, majorId: filters.majorId, languageReferenceId:filters.studyLanguageReferenceId,
      });
      const edges: Prisma.ScholarshipUniversityLinkWhereInput[] = eligible.map(program => ({ academicProgramId: program.id, resolutionStatus: 'RESOLVED', OR: [{ universityId: null }, { universityId: program.universityId }] }));
      if (filters.universityId && !filters.academicProgramId && !filters.degreeLevelId && !filters.majorId && !filters.studyLanguageReferenceId) edges.push({ universityId: filters.universityId, academicProgramId: null, resolutionStatus: 'RESOLVED', university: { is: { status: UniversityStatus.PUBLISHED } } });
      constraints.push({ universityLinks: { some: edges.length ? { OR: edges } : { id: { in: [] } } } });
    }
    if (filters.fundingType === 'FULL')
      constraints.push({
        OR: [{ isFullyFunded: true }, { fundingTypeCode: { in: ['FULL', 'FULLY_FUNDED'] } }],
      });
    if (filters.fundingType === 'PARTIAL')
      constraints.push({ fundingTypeCode: { in: ['PARTIAL', 'PARTIALLY_FUNDED'] } });
    if (filters.fundingCoverage)
      constraints.push({
        OR: [
          { fundingTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } },
          {
            benefits: {
              some: { coverageTypeCode: { equals: filters.fundingCoverage, mode: 'insensitive' } },
            },
          },
        ],
      });
    if (filters.sponsorName)
      where.providerName = { equals: filters.sponsorName, mode: 'insensitive' };
    if (filters.applicationDeadlineFrom || filters.applicationDeadlineTo)
      where.applicationDeadline = {
        gte: filters.applicationDeadlineFrom,
        lte: filters.applicationDeadlineTo,
      };
    if (constraints.length) where.AND = constraints;
    const page = await queryStableCursorPage({
      delegate: this.prisma.scholarship as any, where, include: this.normalizedInclude,
      cursor: filters.cursor, limit: filters.limit, map: (record: any) => this.mapToDto(record),
    });
    return {...page, data: await this.hydrateProgramOwners(page.data)};
  }

  private async readSnapshot<T>(work:(repository:PrismaScholarshipRepository)=>Promise<T>):Promise<T> {
    return this.prisma.$transaction(async transactionClient=> {
      const context={boundaryId:'scholarship-public-read-snapshot-v1',transactionClient};
      return work(new PrismaScholarshipRepository(transactionClient as PrismaClient,true,this.programReads.withTransaction(context)));
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  }

  private async hydrateProgramOwners(records: ScholarshipDto[]): Promise<ScholarshipDto[]> {
    const ids = [...new Set(records.flatMap(record => (record.universityLinks ?? []).map(link => link.academicProgramId).filter((id): id is string => Boolean(id))))];
    if (!ids.length) return records.map(record => ({...record, fundedProgramPairs: []}));
    const refs: UniversityProgramReferenceV1[] = [];
    for (let offset = 0; offset < ids.length; offset += 500) {
      refs.push(...await this.programReads.findByIds(ids.slice(offset, offset + 500)));
    }
    return records.map(record => ({...record, fundedProgramPairs: (record.universityLinks ?? []).flatMap(link => {
      const ref = refs.find(row => row.id === link.academicProgramId);
      if (link.resolutionStatus !== 'RESOLVED' || !ref?.publiclyEligible || !ref.degreeLevelId || !ref.majorId || (link.universityId && link.universityId !== ref.universityId)) return [];
      return [{linkKey:link.linkKey,universityId:ref.universityId,academicProgramId:ref.id,degreeLevelId:ref.degreeLevelId,majorId:ref.majorId,programName:ref.displayName,degreeLabel:ref.degreeLabel,majorLabel:ref.majorLabel,studyLanguages:ref.studyLanguages}];
    }), universityLinks: (record.universityLinks ?? []).map(link => {
      if (!link.academicProgramId) return link;
      const ref = refs.find(row => row.id === link.academicProgramId);
      return {...link, academicProgram: ref ? {universityId:ref.universityId, ownerProof:ref} : null};
    })}));
  }

  private mapToDto(record: unknown): ScholarshipDto {
    const raw = record as Record<string, unknown>;
    const legacy = this.asOptionalRecord(raw.optionalFields);
    const compatibility = this.pickLegacyCompatibility(legacy);
    const requiredDocuments = Array.isArray(raw.requiredDocuments) ? raw.requiredDocuments : [];

    return {
      ...compatibility,
      ...raw,
      studyCountryLabel: (()=>{const country=raw.primaryCountry as {name:string;nameAr?:string;isActive:boolean;lifecycleState:string}|undefined;return country?.isActive && country.lifecycleState==='ACTIVE' ? country.nameAr || country.name : undefined;})(),
      optionalFields: this.sanitizeOptionalFields(legacy),
      verificationStatus: raw.verificationStatus ?? ScholarshipVerificationStatus.PENDING,
      publicationStatus: raw.publicationStatus ?? this.legacyPublicationStatus(raw.status),
      benefits: Array.isArray(raw.benefits) ? raw.benefits : [],
      degreeTargets: Array.isArray(raw.degreeTargets) ? raw.degreeTargets : [],
      majorTargets: Array.isArray(raw.majorTargets) ? raw.majorTargets : [],
      eligibilityItems: Array.isArray(raw.eligibilityItems) ? raw.eligibilityItems : [],
      requiredDocumentItems: requiredDocuments,
      sourceEvidence: Array.isArray(raw.sourceEvidence) ? raw.sourceEvidence : [],
      universityLinks: Array.isArray(raw.universityLinks) ? raw.universityLinks : [],
    } as unknown as ScholarshipDto;
  }

  private legacyPublicationStatus(status: unknown): ScholarshipPublicationStatus {
    if (status === ScholarshipStatus.PUBLISHED) return ScholarshipPublicationStatus.PUBLISHED;
    if (status === ScholarshipStatus.ARCHIVED) return ScholarshipPublicationStatus.ARCHIVED;
    return ScholarshipPublicationStatus.DRAFT;
  }

  private buildLegacyCompatibility(
    currentOptionalFields: Record<string, unknown> | undefined,
    source: Partial<CreateScholarshipDto>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = this.sanitizeOptionalFields(currentOptionalFields ?? {});
    for (const key of LEGACY_COMPATIBILITY_KEYS) {
      const value = source[key];
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  private pickLegacyCompatibility(
    value: Record<string, unknown>,
  ): Partial<Pick<CreateScholarshipDto, LegacyCompatibilityKey>> {
    const result: Partial<Record<LegacyCompatibilityKey, unknown>> = {};
    for (const key of LEGACY_COMPATIBILITY_KEYS) {
      if (value[key] !== undefined) result[key] = value[key];
    }
    return result as Partial<Pick<CreateScholarshipDto, LegacyCompatibilityKey>>;
  }

  private sanitizeOptionalFields(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !RESERVED_OPTIONAL_KEYS.has(key)));
  }

  private hasStructuralChanges(updates: ScholarshipRepositoryUpdateDto): boolean {
    if(updates.optionalFields?.ownerLocalizedDescriptions!==undefined) return true;
    const structuralKeys = new Set([
      'sponsorUniversityId', 'displayName', 'sourceEvidence', 'providerName', 'amountMinorUnits', 'amountCurrencyCode', 'isFullyFunded', 'applicationDeadline',
      'academicYear', 'cycleName', 'countryReferenceId', 'countrySourceLabel', 'countryScope',
      'fundingTypeCode', 'deadlineType', 'applicationMethod', 'applicationUrl', 'officialSourceUrl',
      'studyLanguageReferenceId', 'studyLanguageSourceLabel', 'benefits', 'degreeTargets', 'majorTargets',
      'eligibilityItems', 'requiredDocumentItems', 'universityLinks',
    ]);
    return Object.keys(updates).some((key) => structuralKeys.has(key));
  }

  private jsonSafe(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) return null as unknown as Prisma.InputJsonValue;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.jsonSafe(item)) as Prisma.InputJsonArray;
    if (typeof value === 'object') {
      const serializable = value as { toJSON?: () => unknown };
      if (typeof serializable.toJSON === 'function') return this.jsonSafe(serializable.toJSON());
      const result: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (item !== undefined && typeof item !== 'function' && typeof item !== 'symbol') result[key] = this.jsonSafe(item);
      }
      return result as Prisma.InputJsonObject;
    }
    return String(value);
  }

  private versionSnapshot(source: any): Prisma.InputJsonObject {
    const copy = { ...(source as Record<string, unknown>) };
    const descriptions=this.asOptionalRecord(source.optionalFields).ownerLocalizedDescriptions;
    if(descriptions!==undefined) copy.ownerLocalizedDescriptions=descriptions;
    delete copy.versions; delete copy.sponsorContext; delete copy.applicationCycles; delete copy.optionalFields; delete copy.fundedProgramPairs;
    return this.jsonSafe(copy) as Prisma.InputJsonObject;
  }

  private initialVersionData(data: CreateScholarshipDto): Record<string, unknown> {
    return {
      versionNumber: 1, status: 'DRAFT', sourceImportRecordId: data.sourceImportRecordId, snapshot: this.versionSnapshot(data),
      eligibilityRuleVersions: data.eligibilityItems?.length ? { create: data.eligibilityItems.map((item) => ({ ruleKey: item.itemKey, ruleVersionNumber: 1, definition: this.jsonSafe(item) })) } : undefined,
      awardPackageVersions: data.benefits?.length ? { create: data.benefits.map((item) => ({ packageKey: item.benefitKey, packageVersionNumber: 1, definition: this.jsonSafe(item) })) } : undefined,
    };
  }

  private applicationCycleData(source: any): { cycleKey: string; academicYear: string | null; closesAt: Date | null; status: string } {
    const academicYear = typeof source.academicYear === 'string' && source.academicYear.trim() ? source.academicYear.trim() : null;
    const closesAt = source.applicationDeadline instanceof Date ? source.applicationDeadline : source.applicationDeadline ? new Date(source.applicationDeadline) : null;
    const cycleName = typeof source.cycleName === 'string' && source.cycleName.trim() ? source.cycleName.trim() : 'DEFAULT';
    return {
      cycleKey: `${academicYear ?? 'NO_YEAR'}|${cycleName}|${closesAt?.toISOString() ?? 'ROLLING'}`,
      academicYear,
      closesAt,
      status: 'DRAFT',
    };
  }

  private async appendStructuralVersion(scholarshipId: string, record: any): Promise<{ id: string; versionNumber: number }> {
    const latest = await this.prisma.scholarshipVersion.findFirst({ where: { scholarshipId }, orderBy: { versionNumber: 'desc' } });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    return this.prisma.scholarshipVersion.create({ data: {
      scholarshipId, versionNumber, status: 'DRAFT', sourceImportRecordId: record.sourceImportRecordId,
      snapshot: this.versionSnapshot(record),
      changeSummary: { kind: 'STRUCTURAL_UPDATE' },
      eligibilityRuleVersions: Array.isArray(record.eligibilityItems) && record.eligibilityItems.length ? { create: record.eligibilityItems.map((item: any) => ({ ruleKey: item.itemKey, ruleVersionNumber: 1, definition: this.versionSnapshot(item) })) } : undefined,
      awardPackageVersions: Array.isArray(record.benefits) && record.benefits.length ? { create: record.benefits.map((item: any) => ({ packageKey: item.benefitKey, packageVersionNumber: 1, definition: this.versionSnapshot(item) })) } : undefined,
    } } as any);
  }

  private asOptionalRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private toNestedCreate<T extends object>(
    items: readonly T[] | undefined,
  ): { create: Record<string, unknown>[] } | undefined {
    if (!items?.length) return undefined;
    return { create: items.map((item) => this.stripPersistenceFields(item)) };
  }

  /** Preserve child primary keys and source provenance by immutable owner/key upsert. */
  private toNestedUpsert<T extends object>(
    scholarshipId: string,
    items: readonly T[] | undefined,
    keyName: keyof T,
  ): { deleteMany: object; upsert: Record<string, unknown>[] } | undefined {
    if (items === undefined) return undefined;
    const keys = items.map((item) => String(item[keyName] ?? '').trim());
    if (keys.some((key) => !key) || keys.length !== new Set(keys).size)
      throw new Error('SCHOLARSHIP_DUPLICATE_OR_EMPTY_CHILD_IDENTITY');
    const name = String(keyName);
    return {
      deleteMany: { [name]: { notIn: keys } },
      upsert: items.map((item, index) => {
        const data = this.stripPersistenceFields(item);
        const identity = { scholarshipId, [name]: keys[index] };
        return {
          where: { [`scholarshipId_${name}`]: identity },
          create: data,
          update: data,
        };
      }),
    };
  }

  private stripPersistenceFields<T extends object>(item: T): Record<string, unknown> {
    const copy = { ...(item as Record<string, unknown>) };
    delete copy.id;
    delete copy.scholarshipId;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.currency;
    delete copy.degreeLevel;
    delete copy.major;
    delete copy.university;
    delete copy.academicProgram;
    delete copy.countryLabel;
    delete copy.country;
    delete copy.primaryCountry;
    delete copy.studyCountryLabel;
    return copy;
  }
}
