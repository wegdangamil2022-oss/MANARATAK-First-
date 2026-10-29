import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertCareerReady, careerGovernance, careerPublicMetadata, publishedCareerJob } from '@manaratak/application';
import {
  CareerEmployerDto,
  CareerEmployerFilters,
  CareerEmployerStatus,
  CareerJobFilters,
  CareerJobPostingDto,
  CareerJobStatus,
  CreateCareerEmployerDto,
  CreateCareerJobPostingDto,
  ICareerRepository,
  PaginatedCareerResult,
  UpdateCareerEmployerDto,
  CareerJobRepositoryUpdateDto,
} from '@manaratak/domain';

import { boundedCursorLimit, decodeStableCursor, encodeStableCursor } from '../api-foundation/StableCursor';

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const paging = (page = 1, pageSize = 20) => {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('CAREER_QUERY_INVALID');
  return { page, pageSize };
};
const strings = (value: unknown): string[] | null => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : null;

export class PrismaCareerRepository implements ICareerRepository {
  constructor(private readonly prisma: PrismaClient, private readonly context?: { actorId: string; reason: string; correlationId: string }) {}
  withActor(context: { actorId: string; reason: string; correlationId: string }) { return new PrismaCareerRepository(this.prisma, context); }
  private employers(client: any = this.prisma) { return client.careerEmployerRecord; }
  private jobs(client: any = this.prisma) { return client.careerJobPostingRecord; }

  private async atomicEvent<T extends { id: string; publicId?: string; version?: number }>(eventType: string, aggregateType: string, mutate: (tx: any) => Promise<T>, payload: (value: T) => Record<string, unknown>): Promise<T> {
    if (!this.context?.actorId || !this.context.reason.trim()) throw new Error('CAREER_AUDIT_REQUIRED');
    return this.prisma.$transaction(async (tx: any) => {
      const value = await mutate(tx);
      if (!tx.transactionalOutboxRecord?.create) throw new Error('CAREER_DURABLE_OUTBOX_REQUIRED');
      const now = new Date();
      await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType, domain: 'CAREER', aggregateType, aggregateId: value.id, payload: payload(value), metadata: { schemaVersion: 1, ownerDomain: 'CAREER', ...this.context }, correlationId: this.context!.correlationId, state: 'PENDING', attempts: 0, availableAt: now, createdAt: now } });
      return value;
    }, { isolationLevel: 'Serializable' });
  }

  async createEmployer(data: CreateCareerEmployerDto) {
    const row = await this.atomicEvent('CareerEmployerCreated.v1', 'CareerEmployer', async tx => this.employers(tx).create({ data: { ...data, metadata: { _career: { makerActorId: this.context!.actorId } } } }), value => ({ employerId: value.id, publicId: value.publicId, verificationStatus: (value as any).verificationStatus, version: value.version }));
    return this.mapEmployer(row);
  }
  async updateEmployer(id: string, data: UpdateCareerEmployerDto, expectedVersion: number) {
    try {
      const row = await this.atomicEvent('CareerEmployerLifecycleChanged.v1', 'CareerEmployer', async tx => {
        const existing = await this.employers(tx).findUnique({ where: { id } });
        if (!existing || existing.version !== expectedVersion) throw new Error('CAREER_EMPLOYER_VERSION_CONFLICT');
        const governance = careerGovernance(existing);
        const material = ['displayName', 'employerType', 'websiteUrl', 'countryReferenceId', 'cityReferenceId', 'industry', 'description', 'logoAssetId'].some(key => key in data && (data as any)[key] !== existing[key]);
        let metadata = existing.metadata;
        if (data.verificationStatus === 'VERIFIED') {
          const proof = careerGovernance({ metadata: data.metadata }).verification;
          if (!governance.makerActorId || governance.makerActorId === this.context!.actorId || !proof?.sourceUrl || !proof.reason || !Number.isFinite(Date.parse(proof.expiresAt)) || Date.parse(proof.expiresAt) <= Date.now()) throw new Error('CAREER_INDEPENDENT_REVIEW_REQUIRED');
          metadata = { ...existing.metadata, _career: { ...governance, verification: { ...proof, expiresAt: new Date(proof.expiresAt).toISOString(), reviewerActorId: this.context!.actorId, reviewedVersion: expectedVersion, subjectEmployerId: id } } };
        } else if (material || !governance.makerActorId) metadata = { ...existing.metadata, _career: { makerActorId: this.context!.actorId, verification: null } };
        return this.employers(tx).update({ where: { id_version: { id, version: expectedVersion } },
          data: { ...data, metadata, ...(material || !governance.makerActorId ? { verificationStatus: 'UNVERIFIED' } : {}), version: { increment: 1 } } });
      }, value => ({ employerId: value.id, verificationStatus: (value as any).verificationStatus, verification: careerGovernance(value as any).verification ?? null, version: value.version }));
      return this.mapEmployer(row);
    } catch (error) { throw this.mapVersionConflict(error, 'CAREER_EMPLOYER_VERSION_CONFLICT'); }
  }
  async findEmployerById(id: string) { const row = await this.employers().findUnique({ where: { id } }); return row ? this.mapEmployer(row) : null; }
  async findEmployerBySlug(slug: string) { const row = await this.employers().findUnique({ where: { slug } }); return row ? this.mapEmployer(row) : null; }
  async findEmployerByDedupKey(canonicalDedupKey: string) { const row = await this.employers().findUnique({ where: { canonicalDedupKey } }); return row ? this.mapEmployer(row) : null; }
  async listEmployers(filters: CareerEmployerFilters): Promise<PaginatedCareerResult<CareerEmployerDto>> {
    const { page, pageSize } = paging(filters.page, filters.pageSize);
    const where: any = { verificationStatus: filters.verificationStatus, employerType: filters.employerType, countryReferenceId: filters.countryReferenceId, ...(filters.search ? { OR: [{ displayName: { contains: filters.search, mode: 'insensitive' } }, { publicId: { contains: filters.search, mode: 'insensitive' } }] } : {}) };
    Object.keys(where).forEach(k => where[k] === undefined && delete where[k]);
    const [rows,total] = await this.prisma.$transaction(async tx => Promise.all([this.employers(tx).findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip:(page-1)*pageSize, take:pageSize }), this.employers(tx).count({where})]), { isolationLevel: 'RepeatableRead' });
    return { data: rows.map((r:any)=>this.mapEmployer(r)), total, page, pageSize, totalPages: Math.ceil(total/pageSize) };
  }

  async createJob(data: CreateCareerJobPostingDto) {
    const row = await this.atomicEvent('CareerJobCreated.v1', 'CareerJobPosting', async tx => this.jobs(tx).create({ data: { ...data, salaryRange: data.salaryRange ?? Prisma.DbNull, requiredSkills: data.requiredSkills ?? Prisma.DbNull, languageRequirements: data.languageRequirements ?? Prisma.DbNull, metadata: { ...careerPublicMetadata(data.metadata), _career: { makerActorId: this.context!.actorId } } }, include: { employer: true } }), value => ({ jobId: value.id, publicId: value.publicId, employerId: (value as any).employerId, status: (value as any).status, version: value.version }));
    return this.mapJob(row);
  }
  async updateJob(id: string, data: CareerJobRepositoryUpdateDto, expectedVersion: number) {
    try {
      const row = await this.atomicEvent('CareerJobUpdated.v1', 'CareerJobPosting', async tx => {
        if ('employerId' in data || 'status' in data) throw new Error('CAREER_PROTECTED_FIELD');
        const existing = await this.jobs(tx).findUnique({ where: { id }, include: { employer: true } });
        if (!existing || existing.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
        if (existing.status === 'ARCHIVED') throw new Error('CAREER_TRANSITION_INVALID');
        const governance = careerGovernance(existing);
        const publishedSnapshot = governance.publishedSnapshot ?? (existing.status === 'PUBLISHED' ?
          JSON.parse(JSON.stringify({ ...existing, employer: undefined, metadata: { ...careerPublicMetadata(existing.metadata), _career: { ...governance, publishedSnapshot: undefined } } })) : null);
        return this.jobs(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: {
          ...data, salaryRange: data.salaryRange === null ? Prisma.DbNull : data.salaryRange, requiredSkills: data.requiredSkills === null ? Prisma.DbNull : data.requiredSkills, languageRequirements: data.languageRequirements === null ? Prisma.DbNull : data.languageRequirements, status: 'READY_TO_REVIEW', metadata: { ...careerPublicMetadata(data.metadata ?? existing.metadata),
            _career: { makerActorId: this.context!.actorId, review: null, publishedSnapshot } }, version: { increment: 1 },
        }, include: { employer: true } });
      }, value => ({ jobId: value.id, version: value.version, status: (value as any).status }));
      return this.mapJob(row);
    } catch (error) { throw this.mapVersionConflict(error, 'CAREER_JOB_VERSION_CONFLICT'); }
  }
  async findJobById(id: string) { const row=await this.jobs().findUnique({where:{id},include:{employer:true}}); return row?this.mapJob(row):null; }
  async findJobBySlug(slug: string) { const row=await this.jobs().findUnique({where:{slug},include:{employer:true}}); return row?this.mapJob(row):null; }
  async findJobByDedupKey(canonicalDedupKey: string) { const row=await this.jobs().findUnique({where:{canonicalDedupKey},include:{employer:true}}); return row?this.mapJob(row):null; }
  async updateJobStatus(id: string, status: CareerJobStatus, expectedVersion: number, decision?: { reason: string; checklist?: Record<string, boolean> }): Promise<CareerJobPostingDto> {
    try {
      const row = await this.atomicEvent(status === 'PUBLISHED' ? 'JobPosted.v1' : 'CareerJobStatusChanged.v1', 'CareerJobPosting', async tx => {
        const existing = await this.jobs(tx).findUnique({ where: { id }, include: { employer: true } });
        if (!existing || existing.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
        const governance = careerGovernance(existing);
        if (existing.status === 'ARCHIVED') throw new Error('CAREER_TRANSITION_INVALID');
        if (status === 'READY_TO_PUBLISH') {
          if (existing.status !== 'READY_TO_REVIEW' || !decision?.reason || !['source','applicationLink','privacy','terms'].every(key => decision.checklist?.[key] === true)) throw new Error('CAREER_REVIEW_REQUIRED');
          if (!governance.makerActorId || governance.makerActorId === this.context!.actorId) throw new Error('CAREER_INDEPENDENT_REVIEW_REQUIRED');
          assertCareerReady(this.mapJob(existing));
          governance.review = { reviewerActorId: this.context!.actorId, reviewedVersion: expectedVersion + 1, reviewedAt: new Date().toISOString(), ...decision };
        } else if (status === 'PUBLISHED') {
          if (existing.status !== 'READY_TO_PUBLISH' || governance.review?.reviewedVersion !== expectedVersion) throw new Error('CAREER_REVIEW_REQUIRED');
          assertCareerReady(this.mapJob(existing)); governance.publishedSnapshot = null;
        } else if (status === 'READY_TO_REVIEW') {
          if (!['PUBLISHED','REJECTED','EXPIRED','DRAFT'].includes(existing.status) && !governance.publishedSnapshot) throw new Error('CAREER_TRANSITION_INVALID');
          governance.publishedSnapshot = null; governance.review = null; governance.makerActorId = this.context!.actorId;
        } else if (status === 'REJECTED') {
          if (!['READY_TO_REVIEW','READY_TO_PUBLISH'].includes(existing.status)) throw new Error('CAREER_TRANSITION_INVALID');
          governance.review = null; governance.rejectionReason = this.context!.reason;
        } else if (status === 'ARCHIVED') governance.publishedSnapshot = null;
        else throw new Error('CAREER_TRANSITION_INVALID');
        return this.jobs(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: {
          status, metadata: { ...existing.metadata, _career: governance }, version: { increment: 1 },
        }, include: { employer: true } });
      }, value => ({ jobId: value.id, status, review: careerGovernance(value as any).review ?? null, version: value.version }));
      return this.mapJob(row);
    } catch (error) { throw this.mapVersionConflict(error, 'CAREER_JOB_VERSION_CONFLICT'); }
  }
  async listJobs(filters: CareerJobFilters) { return this.listJobsInternal(filters, false); }
  async listPublishedJobs(filters: Omit<CareerJobFilters, 'status'>): Promise<PaginatedCareerResult<CareerJobPostingDto>> {
    const limit = boundedCursorLimit(filters.limit, 20, 50), after = decodeStableCursor(filters.cursor);
    const snapshot = Prisma.sql`j.metadata -> '_career' -> 'publishedSnapshot'`;
    const column = (name: string) => Prisma.sql`CASE WHEN jsonb_typeof(${snapshot})='object' THEN ${snapshot} ->> ${name} ELSE ${Prisma.raw('j."'+name+'"')}::text END`;
    const metadata = Prisma.sql`CASE WHEN jsonb_typeof(${snapshot})='object' THEN ${snapshot} -> 'metadata' ELSE j.metadata END`;
    const clauses = [Prisma.sql`(j.status='PUBLISHED' OR jsonb_typeof(${snapshot})='object')`,
      Prisma.sql`e."verificationStatus"='VERIFIED' AND e.metadata -> '_career' -> 'verification' ->> 'reviewerActorId' IS NOT NULL AND e.metadata -> '_career' ->> 'makerActorId' IS NOT NULL AND e.metadata -> '_career' -> 'verification' ->> 'subjectEmployerId'=e.id AND e.metadata -> '_career' -> 'verification' ->> 'reviewerActorId' <> e.metadata -> '_career' ->> 'makerActorId'`,
      Prisma.sql`(e.metadata -> '_career' -> 'verification' ->> 'expiresAt') > ${new Date().toISOString()}`,
      Prisma.sql`(${column('applicationDeadline')})::timestamptz > ${new Date()}`,
      Prisma.sql`${metadata} -> '_career' -> 'review' ->> 'reviewerActorId' IS NOT NULL AND ${metadata} -> '_career' -> 'review' ->> 'reviewerActorId' <> ${metadata} -> '_career' ->> 'makerActorId'`];
    for (const key of ['opportunityType','employmentType','jobCategory','countryReferenceId','cityReferenceId','employerId'] as const)
      if (filters[key]) clauses.push(Prisma.sql`${column(key)}=${filters[key]}`);
    if (filters.remoteOption !== undefined) clauses.push(Prisma.sql`${column('remoteOption')}=${String(filters.remoteOption)}`);
    if (filters.search) {
      const pattern = '%' + filters.search.replace(/[\\%_]/g, value => '\\' + value) + '%';
      clauses.push(Prisma.sql`(${column('title')} ILIKE ${pattern} OR ${column('description')} ILIKE ${pattern} OR j."publicId" ILIKE ${pattern}
        OR ${metadata} -> 'localizedContent' -> 'en' ->> 'title' ILIKE ${pattern} OR ${metadata} -> 'localizedContent' -> 'ar' ->> 'title' ILIKE ${pattern})`);
    }
    const where = Prisma.join(clauses, ' AND ');
    const [ids, counts] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT j.id FROM "CareerJobPostingRecord" j JOIN "CareerEmployerRecord" e ON e.id=j."employerId" WHERE ${where} ${after ? Prisma.sql`AND j.id>${after}` : Prisma.empty} ORDER BY j.id LIMIT ${limit+1}`),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*) AS total FROM "CareerJobPostingRecord" j JOIN "CareerEmployerRecord" e ON e.id=j."employerId" WHERE ${where}`),
    ]);
    const visible = ids.slice(0, limit), total = Number(counts[0]?.total ?? 0n);
    const rows = await this.jobs().findMany({ where: { id: { in: visible.map(row => row.id) } }, include: { employer: true } });
    const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]));
    return { data: visible.map(row => this.mapJob(byId.get(row.id))), total, page: 1, pageSize: limit,
      totalPages: Math.ceil(total/limit), hasMore: ids.length > limit, nextCursor: ids.length > limit ? encodeStableCursor(visible[visible.length-1].id) : null };
  }
  async expireJobs(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('CAREER_QUERY_INVALID');
    if (!this.context?.actorId) throw new Error('CAREER_AUDIT_REQUIRED');
    const ids = await this.prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`
      SELECT j.id FROM "CareerJobPostingRecord" j
      WHERE (j.status='PUBLISHED' AND j."applicationDeadline"<=${new Date()})
        OR (jsonb_typeof(j.metadata -> '_career' -> 'publishedSnapshot')='object'
          AND (j.metadata -> '_career' -> 'publishedSnapshot' ->> 'applicationDeadline')::timestamptz<=${new Date()})
      ORDER BY j.id LIMIT ${limit}`);
    let count = 0;
    for (const { id } of ids) {
      await this.atomicEvent('JobClosed.v1', 'CareerJobPosting', async tx => {
        const existing = await this.jobs(tx).findUnique({ where: { id }, include: { employer: true } });
        const published = existing && publishedCareerJob(this.mapJob(existing));
        if (!existing || !published?.applicationDeadline || new Date(published.applicationDeadline).getTime() > Date.now()) throw new Error('CAREER_JOB_VERSION_CONFLICT');
        return this.jobs(tx).update({ where: { id_version: { id, version: existing.version } }, data: {
          status: existing.status === 'PUBLISHED' ? 'EXPIRED' : existing.status,
          metadata: { ...existing.metadata, _career: { ...careerGovernance(existing), publishedSnapshot: null } }, version: { increment: 1 },
        } });
      }, row => ({ jobId: row.id, version: row.version, reason: 'DEADLINE_EXPIRED' }));
      count++;
    }
    return count;
  }
  private async listJobsInternal(filters: CareerJobFilters, publishedOnly: boolean): Promise<PaginatedCareerResult<CareerJobPostingDto>> {
    const { page, pageSize } = paging(filters.page, filters.pageSize);
    const where:any={status:filters.status,opportunityType:filters.opportunityType,employmentType:filters.employmentType,jobCategory:filters.jobCategory,countryReferenceId:filters.countryReferenceId,cityReferenceId:filters.cityReferenceId,employerId:filters.employerId};
    Object.keys(where).forEach(k=>where[k]===undefined&&delete where[k]);
    if (filters.search) where.OR = ['title','publicId'].map(field => ({ [field]: { contains: filters.search, mode: 'insensitive' } }));
    if (filters.remoteOption !== undefined) where.remoteOption = filters.remoteOption;
    if (publishedOnly) {
      where.employer = { verificationStatus: CareerEmployerStatus.VERIFIED };
      where.OR = [{ applicationDeadline: null }, { applicationDeadline: { gt: new Date() } }];
    }
    if (filters.countOnly) {
      const total = await this.jobs().count({where});
      return {data:[],total,page,pageSize,totalPages:Math.ceil(total/pageSize)};
    }
    const [rows,total]=await this.prisma.$transaction(async tx => Promise.all([this.jobs(tx).findMany({where,include:{employer:true},orderBy:[{updatedAt:'desc'},{id:'asc'}],skip:(page-1)*pageSize,take:pageSize}),this.jobs(tx).count({where})]), { isolationLevel: 'RepeatableRead' });
    return {data:rows.map((r:any)=>this.mapJob(r)),total,page,pageSize,totalPages:Math.ceil(total/pageSize)};
  }

  private mapVersionConflict(error: unknown, code: string): Error {
    const prismaCode = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    if (prismaCode === 'P2025') return new Error(code);
    return error instanceof Error ? error : new Error(String(error));
  }

  private mapEmployer(row:any): CareerEmployerDto { return {...row, metadata:record(row.metadata)}; }
  private mapJob(row:any): CareerJobPostingDto { return {...row, salaryRange:record(row.salaryRange), requiredSkills:strings(row.requiredSkills), languageRequirements:strings(row.languageRequirements), metadata:record(row.metadata), employer: row.employer ? this.mapEmployer(row.employer) : undefined}; }
}
