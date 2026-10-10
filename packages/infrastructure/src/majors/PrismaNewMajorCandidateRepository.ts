import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaUniversityMajorResolutionWriter } from '../universities/PrismaUniversityMajorResolutionWriter';
import { PrismaScholarshipMajorResolutionWriter } from '../scholarships/PrismaScholarshipMajorResolutionWriter';
import {
  AtomicPersistenceContext,
  INewMajorCandidateRepository,
  ITransactionalNewMajorCandidateRepository,
  NewMajorCandidateDto,
  NewMajorCandidateFilters,
  NewMajorCandidateSourceRef,
  NewMajorCandidateResolutionResult,
  PaginatedNewMajorCandidateResult,
} from '@manaratak/domain';

interface CandidateTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

interface CandidateProjection {
  candidateKey:string; normalizedLabel:string; displayLabel:string; sourceDigest:string; sourceCount:number;
  sources:NewMajorCandidateSourceRef[]; firstSeenAt:Date; lastSeenAt:Date; total:number;
}

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
    private readonly transactionBound = false,
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
      true,
    );
  }

  async list(filters: NewMajorCandidateFilters): Promise<PaginatedNewMajorCandidateResult> {
    const page = Math.min(1000, Math.max(1, filters.page || 1));
    const pageSize = Math.min(50, Math.max(1, filters.pageSize || 25));
    const rows = await this.queryCandidates(filters, undefined, page, pageSize);
    return {data: rows.filter(row => row.candidateKey).map(row => this.toCandidate(row)), total: Number(rows[0]?.total ?? 0), page, pageSize,
      totalPages: Math.max(1, Math.ceil(Number(rows[0]?.total ?? 0) / pageSize))};
  }

  async findByKey(candidateKey: string): Promise<NewMajorCandidateDto | null> {
    const rows = await this.queryCandidates({}, candidateKey, 1, 1);
    return rows[0]?.candidateKey ? this.toCandidate(rows[0]) : null;
  }

  async acquireReviewLock(candidateKey: string): Promise<void> {
    if (!this.transactionBound) throw new Error('NEW_MAJOR_CANDIDATE_TRANSACTION_REQUIRED');
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${candidateKey}, 10))::text`;
  }

  async recordDecision(input: {candidateKey:string; sourceDigest:string; decision:'APPROVED'|'LINKED'|'REJECTED'; actorId:string; reason:string; majorId?:string; evidence:NewMajorCandidateDto}): Promise<void> {
    if (!this.transactionBound) throw new Error('NEW_MAJOR_CANDIDATE_TRANSACTION_REQUIRED');
    const id = randomUUID();
    await this.prisma.$executeRaw`INSERT INTO "NewMajorCandidateDecision" ("id","candidateKey","sourceDigest","decision","actorId","reason","majorId","evidence")
      VALUES (${id},${input.candidateKey},${input.sourceDigest},${input.decision},${input.actorId},${input.reason},${input.majorId ?? null},${JSON.stringify(input.evidence)}::jsonb)`;
  }

  async resolve(candidateKey: string, majorId: string, expectedDigest: string): Promise<NewMajorCandidateResolutionResult> {
    if (!this.transactionBound) throw new Error('NEW_MAJOR_CANDIDATE_TRANSACTION_REQUIRED');
    await this.acquireReviewLock(candidateKey);
    const candidate = await this.findByKey(candidateKey);
    if (!candidate) throw new Error('NEW_MAJOR_CANDIDATE_NOT_FOUND_OR_ALREADY_RESOLVED');
    if (candidate.sourceDigest !== expectedDigest) throw new Error('NEW_MAJOR_CANDIDATE_STALE_SOURCE');
    if (candidate.sourcesTruncated) throw new Error('NEW_MAJOR_CANDIDATE_SOURCE_LIMIT_REVIEW_REQUIRED');
    const programs = candidate.sources.filter(source => source.sourceType === 'UNIVERSITY_PROGRAM');
    const targets = candidate.sources.filter(source => source.sourceType === 'SCHOLARSHIP_MAJOR_TARGET');
    const eligibility = candidate.sources.filter(source => source.sourceType === 'SCHOLARSHIP_ELIGIBILITY');
    const universityPrograms = await this.universityWriter.resolveProgramMajor(programs, majorId);
    const scholarshipResolution = await this.scholarshipWriter.resolveMajorReferences({targets, eligibility, majorId});
    if (universityPrograms + scholarshipResolution.scholarshipMajorTargets + scholarshipResolution.scholarshipEligibilityItems !== candidate.sourceCount)
      throw new Error('NEW_MAJOR_CANDIDATE_STALE_SOURCE');
    return {universityPrograms, ...scholarshipResolution};
  }

  /** One SQL statement groups the complete owner projections before filtering/paging.
   * Raw program names remain owner evidence; grouping is never automatic identity matching.
   * Source sets over 500 references remain visible but cannot be partially resolved.
   */
  private queryCandidates(filters: NewMajorCandidateFilters, key: string|undefined, page:number, size:number): Promise<CandidateProjection[]> {
    const search = filters.search?.trim() ?? '';
    return this.prisma.$queryRaw<CandidateProjection[]>`
      WITH source_rows AS (
        SELECT 'UNIVERSITY_PROGRAM'::text AS "sourceType", p.id AS "sourceId", u.id AS "ownerId", u."publicId" AS "ownerPublicId",
          u."displayName" AS "ownerDisplayName", p."sourceProgramName" AS "rawLabel", p."degreeLevelId", d."canonicalCode" AS "degreeLevelCode",
          d."nameAr" AS "degreeLevelLabel", o.name AS "facultyOrUnitName", u."officialSourceUrl", u."sourceUrl", p.status,
          p."createdAt", p."updatedAt" AS "sourceUpdatedAt", NULL::jsonb AS "degreeReferences"
        FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId"
          LEFT JOIN "DegreeLevel" d ON d.id=p."degreeLevelId" LEFT JOIN "UniversityOrganizationUnit" o ON o.id=p."organizationUnitId"
        WHERE p."majorId" IS NULL AND p."majorMappingState" IN ('MAJOR_REVIEW_REQUIRED','UNMAPPED','AMBIGUOUS')
          AND p.status NOT IN ('INACTIVE','ARCHIVED','REJECTED') AND u.status NOT IN ('ARCHIVED','REJECTED')
        UNION ALL
        SELECT 'SCHOLARSHIP_MAJOR_TARGET', t.id, s.id, s."publicId", s."displayName", t."sourceLabel", NULL::text, NULL::text, NULL::text, NULL::text,
          s."officialSourceUrl", s."sourceUrl", s.status, t."createdAt", t."updatedAt",
          (SELECT jsonb_agg(jsonb_build_object('id',d.id,'code',d."canonicalCode",'label',d."nameAr") ORDER BY d.id) FROM "ScholarshipDegreeTarget" dt JOIN "DegreeLevel" d ON d.id=dt."degreeLevelId" WHERE dt."scholarshipId"=s.id)
        FROM "ScholarshipMajorTarget" t JOIN "Scholarship" s ON s.id=t."scholarshipId"
        WHERE t."majorId" IS NULL AND t."resolutionStatus" NOT IN ('RESOLVED','NOT_APPLICABLE') AND s.status NOT IN ('ARCHIVED','REJECTED')
        UNION ALL
        SELECT 'SCHOLARSHIP_ELIGIBILITY', e.id, s.id, s."publicId", s."displayName", e."valueText", e."degreeLevelId", d."canonicalCode", d."nameAr", NULL::text,
          s."officialSourceUrl", s."sourceUrl", s.status, e."createdAt", e."updatedAt",
          (SELECT jsonb_agg(jsonb_build_object('id',d.id,'code',d."canonicalCode",'label',d."nameAr") ORDER BY d.id) FROM "ScholarshipDegreeTarget" dt JOIN "DegreeLevel" d ON d.id=dt."degreeLevelId" WHERE dt."scholarshipId"=s.id)
        FROM "ScholarshipEligibilityItem" e JOIN "Scholarship" s ON s.id=e."scholarshipId" LEFT JOIN "DegreeLevel" d ON d.id=e."degreeLevelId"
        WHERE e."majorId" IS NULL AND e."resolutionStatus" NOT IN ('RESOLVED','NOT_APPLICABLE') AND e."itemTypeCode" ILIKE '%MAJOR%'
          AND s.status NOT IN ('ARCHIVED','REJECTED')
      ), normalized AS (
        SELECT *, btrim(regexp_replace(regexp_replace(
          CASE WHEN "rawLabel" ~ '[؀-ۿ]' THEN translate(regexp_replace(normalize("rawLabel",NFKD),'[ً-ٰٟـ]','','g'),'إأآىؤئة','ااايويه')
          ELSE lower(normalize("rawLabel",NFKD)) END, '[^[:alnum:][:space:]]',' ','g'),'[[:space:]]+',' ','g')) AS "normalizedLabel"
        FROM source_rows WHERE btrim(coalesce("rawLabel",'')) <> ''
      ), keyed AS (
        SELECT *, 'NMC-' || upper(substr(encode(sha256(convert_to("normalizedLabel",'UTF8')),'hex'),1,20)) AS "candidateKey",
          row_number() OVER (PARTITION BY "normalizedLabel" ORDER BY "sourceType","sourceId") AS rn
        FROM normalized WHERE "normalizedLabel" NOT IN ('','unknown')
      ), grouped AS (
        SELECT "candidateKey", min("normalizedLabel") AS "normalizedLabel", min("rawLabel") AS "displayLabel", count(*)::integer AS "sourceCount",
          jsonb_agg(to_jsonb(k) ORDER BY "sourceType","sourceId") FILTER (WHERE rn <= 500) AS sources,
          encode(sha256(convert_to(jsonb_agg(to_jsonb(k) - 'rn' ORDER BY "sourceType","sourceId")::text,'UTF8')),'hex') AS "sourceDigest",
          min("createdAt") AS "firstSeenAt", max("sourceUpdatedAt") AS "lastSeenAt",
          bool_or(${filters.sourceType ?? null}::text IS NULL OR "sourceType"=${filters.sourceType ?? null}) AS "matchesType",
          bool_or(${search}='' OR strpos(lower("rawLabel"),lower(${search}))>0 OR strpos("normalizedLabel",lower(${search}))>0) AS "matchesSearch"
        FROM keyed k GROUP BY "candidateKey"
      ), visible AS (
        SELECT * FROM grouped g WHERE "matchesType" AND "matchesSearch" AND (${key ?? null}::text IS NULL OR "candidateKey"=${key ?? null})
          AND NOT EXISTS (SELECT 1 FROM "NewMajorCandidateDecision" x WHERE x."candidateKey"=g."candidateKey" AND x."sourceDigest"=g."sourceDigest" AND x.decision='REJECTED')
      ), page AS (SELECT * FROM visible ORDER BY "lastSeenAt" DESC,"candidateKey" LIMIT ${size} OFFSET ${(page-1)*size})
      SELECT page.*, totals.total FROM (SELECT count(*)::integer AS total FROM visible) totals LEFT JOIN page ON true`;
  }

  private toCandidate(row:CandidateProjection): NewMajorCandidateDto {
    const sources = row.sources ?? [];
    const unique = (values:(string|null|undefined)[]) => [...new Set(values.filter((value):value is string => Boolean(value)))];
    return {candidateKey:row.candidateKey,sourceDigest:row.sourceDigest,normalizedLabel:row.normalizedLabel,displayLabel:row.displayLabel,
      sourceCount:Number(row.sourceCount),sourcesTruncated:Number(row.sourceCount)>sources.length,
      sourceTypes:[...new Set(sources.map(source=>source.sourceType))],degreeLevelIds:unique(sources.flatMap(source=>[source.degreeLevelId,...(source.degreeReferences ?? []).map(degree=>degree.id)])),
      degreeLevelCodes:unique(sources.flatMap(source=>[source.degreeLevelCode,...(source.degreeReferences ?? []).map(degree=>degree.code)])),degreeLevelLabels:unique(sources.flatMap(source=>[source.degreeLevelLabel,...(source.degreeReferences ?? []).map(degree=>degree.label)])),
      facultyOrUnitNames:unique(sources.map(source=>source.facultyOrUnitName)),officialSourceUrls:unique(sources.flatMap(source=>[source.officialSourceUrl,source.sourceUrl])),
      sources,firstSeenAt:row.firstSeenAt,lastSeenAt:row.lastSeenAt};
  }
}
