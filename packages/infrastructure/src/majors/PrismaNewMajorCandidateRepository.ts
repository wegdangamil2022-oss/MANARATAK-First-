import { createHash } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaUniversityMajorResolutionWriter } from '../universities/PrismaUniversityMajorResolutionWriter';
import { PrismaScholarshipMajorResolutionWriter } from '../scholarships/PrismaScholarshipMajorResolutionWriter';
import {
  AtomicPersistenceContext,
  INewMajorCandidateRepository,
  ITransactionalNewMajorCandidateRepository,
  MajorNamingService,
  NewMajorCandidateDto,
  NewMajorCandidateFilters,
  NewMajorCandidateSourceRef,
  NewMajorCandidateSourceType,
  NewMajorCandidateResolutionResult,
  PaginatedNewMajorCandidateResult,
} from '@manaratak/domain';

interface CandidateTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

interface CandidateRow extends NewMajorCandidateSourceRef {
  createdAt: Date;
  updatedAt: Date;
}

const RESOLVED_STATES = ['RESOLVED', 'NOT_APPLICABLE'];

/**
 * Cross-domain read/reconciliation projection for unresolved Major references.
 * No identity is fabricated here: it only surfaces source evidence and, after
 * an explicit admin decision, reconnects the source rows to a canonical Major.
 */
export class PrismaNewMajorCandidateRepository
  implements ITransactionalNewMajorCandidateRepository
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly universityWriter = new PrismaUniversityMajorResolutionWriter(prisma),
    private readonly scholarshipWriter = new PrismaScholarshipMajorResolutionWriter(prisma),
  ) {}

  withTransaction(context: AtomicPersistenceContext): INewMajorCandidateRepository {
    const transactionClient = (context as Partial<CandidateTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) {
      throw new Error('NEW_MAJOR_CANDIDATE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    }
    const transactionPrisma = transactionClient as unknown as PrismaClient;
    return new PrismaNewMajorCandidateRepository(
      transactionPrisma,
      new PrismaUniversityMajorResolutionWriter(transactionPrisma),
      new PrismaScholarshipMajorResolutionWriter(transactionPrisma),
    );
  }

  async list(filters: NewMajorCandidateFilters): Promise<PaginatedNewMajorCandidateResult> {
    const rows = await this.loadRows(filters.search, filters.sourceType);
    const grouped = this.group(rows);
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const start = (page - 1) * pageSize;

    return {
      data: grouped.slice(start, start + pageSize),
      total: grouped.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(grouped.length / pageSize)),
    };
  }

  async findByKey(candidateKey: string): Promise<NewMajorCandidateDto | null> {
    const rows = await this.loadRows();
    return this.group(rows).find(candidate => candidate.candidateKey === candidateKey) ?? null;
  }

  async resolve(candidateKey: string, majorId: string): Promise<NewMajorCandidateResolutionResult> {
    const candidate = await this.findByKey(candidateKey);
    if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');

    const universityProgramIds = candidate.sources
      .filter(source => source.sourceType === 'UNIVERSITY_PROGRAM')
      .map(source => source.sourceId);
    const scholarshipTargetIds = candidate.sources
      .filter(source => source.sourceType === 'SCHOLARSHIP_MAJOR_TARGET')
      .map(source => source.sourceId);
    const scholarshipEligibilityIds = candidate.sources
      .filter(source => source.sourceType === 'SCHOLARSHIP_ELIGIBILITY')
      .map(source => source.sourceId);

    const [universityPrograms, scholarshipResolution] = await Promise.all([
      this.universityWriter.resolveProgramMajor(universityProgramIds, majorId),
      this.scholarshipWriter.resolveMajorReferences({
        targetIds: scholarshipTargetIds,
        eligibilityIds: scholarshipEligibilityIds,
        majorId,
      }),
    ]);

    return {
      universityPrograms,
      scholarshipMajorTargets: scholarshipResolution.scholarshipMajorTargets,
      scholarshipEligibilityItems: scholarshipResolution.scholarshipEligibilityItems,
    };
  }

  private async loadRows(search?: string, sourceType?: NewMajorCandidateSourceType): Promise<CandidateRow[]> {
    const normalizedSearch = search?.trim();
    const includeUniversities = !sourceType || sourceType === 'UNIVERSITY_PROGRAM';
    const includeTargets = !sourceType || sourceType === 'SCHOLARSHIP_MAJOR_TARGET';
    const includeEligibility = !sourceType || sourceType === 'SCHOLARSHIP_ELIGIBILITY';

    const [programs, targets, eligibility] = await Promise.all([
      includeUniversities
        ? this.prisma.universityAcademicProgram.findMany({
            where: {
              majorId: null,
              majorMappingState: { in: ['MAJOR_REVIEW_REQUIRED', 'UNMAPPED'] },
              status: { notIn: ['INACTIVE', 'ARCHIVED'] },
              ...(normalizedSearch
                ? { sourceProgramName: { contains: normalizedSearch, mode: 'insensitive' as const } }
                : {}),
            },
            take: 10000,
            include: {
              university: {
                select: {
                  id: true,
                  publicId: true,
                  displayName: true,
                  officialSourceUrl: true,
                  sourceUrl: true,
                  status: true,
                },
              },
              degreeLevel: { select: { id: true, canonicalCode: true, nameAr: true } },
              organizationUnit: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      includeTargets
        ? this.prisma.scholarshipMajorTarget.findMany({
            where: {
              sourceLabel: normalizedSearch
                ? { not: null, contains: normalizedSearch, mode: 'insensitive' as const }
                : { not: null },
              majorId: null,
              resolutionStatus: { notIn: RESOLVED_STATES },
              scholarship: { is: { status: { not: 'ARCHIVED' } } },
            },
            take: 10000,
            include: {
              scholarship: {
                select: {
                  id: true,
                  publicId: true,
                  displayName: true,
                  officialSourceUrl: true,
                  sourceUrl: true,
                  status: true,
                  degreeTargets: {
                    where: { degreeLevelId: { not: null } },
                    select: {
                      degreeLevelId: true,
                      degreeLevel: { select: { canonicalCode: true, nameAr: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      includeEligibility
        ? this.prisma.scholarshipEligibilityItem.findMany({
            where: {
              itemTypeCode: { contains: 'MAJOR', mode: 'insensitive' },
              valueText: normalizedSearch
                ? { not: null, contains: normalizedSearch, mode: 'insensitive' as const }
                : { not: null },
              majorId: null,
              resolutionStatus: { notIn: RESOLVED_STATES },
              scholarship: { is: { status: { not: 'ARCHIVED' } } },
            },
            take: 10000,
            include: {
              scholarship: {
                select: {
                  id: true,
                  publicId: true,
                  displayName: true,
                  officialSourceUrl: true,
                  sourceUrl: true,
                  status: true,
                  degreeTargets: {
                    where: { degreeLevelId: { not: null } },
                    select: {
                      degreeLevelId: true,
                      degreeLevel: { select: { canonicalCode: true, nameAr: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const rows: CandidateRow[] = [];
    for (const program of programs as any[]) {
      if (!program.sourceProgramName?.trim()) continue;
      rows.push({
        sourceType: 'UNIVERSITY_PROGRAM',
        sourceId: program.id,
        ownerId: program.university.id,
        ownerPublicId: program.university.publicId,
        ownerDisplayName: program.university.displayName,
        rawLabel: program.sourceProgramName.trim(),
        degreeLevelId: program.degreeLevel?.id ?? program.degreeLevelId ?? null,
        degreeLevelCode: program.degreeLevel?.canonicalCode ?? null,
        degreeLevelLabel: program.degreeLevel?.nameAr ?? null,
        facultyOrUnitName: program.organizationUnit?.name ?? null,
        officialSourceUrl: program.university.officialSourceUrl ?? null,
        sourceUrl: program.university.sourceUrl ?? null,
        status: program.status,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      });
    }

    const pushScholarship = (record: any, sourceTypeValue: NewMajorCandidateSourceType, rawLabel: string) => {
      const degreeTargets = record.scholarship.degreeTargets ?? [];
      if (degreeTargets.length === 0) {
        rows.push({
          sourceType: sourceTypeValue,
          sourceId: record.id,
          ownerId: record.scholarship.id,
          ownerPublicId: record.scholarship.publicId,
          ownerDisplayName: record.scholarship.displayName,
          rawLabel,
          officialSourceUrl: record.scholarship.officialSourceUrl ?? null,
          sourceUrl: record.scholarship.sourceUrl ?? null,
          status: record.scholarship.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
        return;
      }
      for (const degree of degreeTargets) {
        rows.push({
          sourceType: sourceTypeValue,
          sourceId: record.id,
          ownerId: record.scholarship.id,
          ownerPublicId: record.scholarship.publicId,
          ownerDisplayName: record.scholarship.displayName,
          rawLabel,
          degreeLevelId: degree.degreeLevelId ?? null,
          degreeLevelCode: degree.degreeLevel?.canonicalCode ?? null,
          degreeLevelLabel: degree.degreeLevel?.nameAr ?? null,
          officialSourceUrl: record.scholarship.officialSourceUrl ?? null,
          sourceUrl: record.scholarship.sourceUrl ?? null,
          status: record.scholarship.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    };

    for (const target of targets as any[]) {
      if (target.sourceLabel?.trim()) pushScholarship(target, 'SCHOLARSHIP_MAJOR_TARGET', target.sourceLabel.trim());
    }
    for (const item of eligibility as any[]) {
      if (item.valueText?.trim()) pushScholarship(item, 'SCHOLARSHIP_ELIGIBILITY', item.valueText.trim());
    }
    return rows;
  }

  private group(rows: CandidateRow[]): NewMajorCandidateDto[] {
    const grouped = new Map<string, CandidateRow[]>();
    for (const row of rows) {
      const normalizedLabel = MajorNamingService.normalizeSearchText(row.rawLabel);
      if (normalizedLabel === 'unknown') continue;
      const key = this.key(normalizedLabel);
      const group = grouped.get(key) ?? [];
      if (!group.some(existing =>
        existing.sourceType === row.sourceType &&
        existing.sourceId === row.sourceId &&
        existing.degreeLevelId === row.degreeLevelId
      )) group.push(row);
      grouped.set(key, group);
    }

    return [...grouped.entries()]
      .map(([candidateKey, group]) => {
        const normalizedLabel = MajorNamingService.normalizeSearchText(group[0].rawLabel);
        const sourceRefs = group.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...source }) => source);
        const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map(value => value.trim()))];
        const displayLabel = [...group]
          .sort((a, b) => a.rawLabel.length - b.rawLabel.length)[0].rawLabel;
        const timestamps = group.flatMap(item => [item.createdAt, item.updatedAt]).filter(Boolean).map(value => value.getTime());
        return {
          candidateKey,
          normalizedLabel,
          displayLabel,
          sourceCount: new Set(group.map(item => `${item.sourceType}:${item.sourceId}`)).size,
          sourceTypes: [...new Set(group.map(item => item.sourceType))],
          degreeLevelIds: unique(group.map(item => item.degreeLevelId)),
          degreeLevelCodes: unique(group.map(item => item.degreeLevelCode)),
          degreeLevelLabels: unique(group.map(item => item.degreeLevelLabel)),
          facultyOrUnitNames: unique(group.map(item => item.facultyOrUnitName)),
          officialSourceUrls: unique(group.flatMap(item => [item.officialSourceUrl, item.sourceUrl])),
          sources: sourceRefs,
          firstSeenAt: timestamps.length ? new Date(Math.min(...timestamps)) : undefined,
          lastSeenAt: timestamps.length ? new Date(Math.max(...timestamps)) : undefined,
        } satisfies NewMajorCandidateDto;
      })
      .sort((a, b) => (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0));
  }

  private key(normalizedLabel: string): string {
    return `NMC-${createHash('sha256').update(normalizedLabel).digest('hex').slice(0, 20).toUpperCase()}`;
  }
}
