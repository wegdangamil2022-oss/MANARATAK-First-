import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { ALLOWED_APPLICATION_TRANSITIONS, careerJobOpen, publishedCareerJob } from '@absheer/application';
import {
  AlumniProfileVisibility,
  CareerAlumniProfileDto,
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerProfileDto,
  ICareerEngagementRepository,
} from '@absheer/domain';

const obj = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const paging = (page = 1, pageSize = 20) => {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('CAREER_QUERY_INVALID');
  return { page, pageSize };
};
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
// Match ECMAScript String.trim(), including tabs, NBSP and BOM, for legacy consent proof.
const consentSourceTrimCharacters = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

export class PrismaCareerEngagementRepository implements ICareerEngagementRepository {
  constructor(private readonly prisma: PrismaClient, private readonly context?: { actorId: string; reason: string; correlationId: string }) {}
  withActor(context: { actorId: string; reason: string; correlationId: string }) { return new PrismaCareerEngagementRepository(this.prisma, context); }
  private async event(tx: any, type: string, row: any) {
    if (!this.context?.actorId || !this.context.reason.trim()) throw new Error('CAREER_AUDIT_REQUIRED');
    await tx.transactionalOutboxRecord.create({ data: {
      id: randomUUID(), eventType: type, domain: 'CAREER', aggregateType: type.split('.')[0], aggregateId: row.id,
      payload: { id: row.id, publicId: row.publicId, jobId: row.jobId, studentReferenceId: row.studentReferenceId, status: row.status, visibility: row.visibility, version: row.version },
      metadata: { schemaVersion: 1, ...this.context }, correlationId: this.context.correlationId,
      state: 'PENDING', attempts: 0, availableAt: new Date(), createdAt: new Date(),
    } });
  }
  private p(client: any = this.prisma as any) { return client; }

  async upsertProfile(data: Parameters<ICareerEngagementRepository['upsertProfile']>[0]): Promise<CareerProfileDto> {
    if (this.context?.actorId !== data.studentReferenceId) throw new Error('CAREER_ACCESS_DENIED');
    return (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.careerProfileRecord.findUnique({ where: { studentReferenceId: data.studentReferenceId } });
      if (!existing) {
        const row = await tx.careerProfileRecord.create({ data: {
          studentReferenceId: data.studentReferenceId, headline: data.headline ?? null, summary: data.summary ?? null, skills: data.skills,
          resumeAssetId: data.resumeAssetId ?? null, visibility: data.visibility, version: 1, metadata: data.metadata ?? Prisma.DbNull,
        } });
        await this.event(tx, 'CareerProfileChanged.v1', row); return this.mapProfile(row);
      }
      if (data.expectedVersion !== existing.version) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
      const updated = await tx.careerProfileRecord.updateMany({
        where: { id: existing.id, version: existing.version },
        data: {
          headline: data.headline ?? null, summary: data.summary ?? null, skills: data.skills, resumeAssetId: data.resumeAssetId ?? null,
          visibility: data.visibility, metadata: data.metadata ?? Prisma.DbNull, version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
      const row = await tx.careerProfileRecord.findUniqueOrThrow({ where: { id: existing.id } });
      await this.event(tx, 'CareerProfileChanged.v1', row); return this.mapProfile(row);
    }, { isolationLevel: 'Serializable' });
  }

  async findProfile(studentReferenceId: string): Promise<CareerProfileDto | null> {
    const row = await this.p().careerProfileRecord.findUnique({ where: { studentReferenceId } });
    return row ? this.mapProfile(row) : null;
  }

  async createApplication(data: Parameters<ICareerEngagementRepository['createApplication']>[0]): Promise<CareerApplicationDto> {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        const raw = await tx.careerJobPostingRecord.findUnique({ where: { id: data.jobId }, include: { employer: true } });
        if (!careerJobOpen(raw) || publishedCareerJob(raw).metadata?.applicationChannel !== 'INTERNAL') throw new Error('CAREER_APPLICATION_JOB_NOT_OPEN');
        const row = await tx.careerApplicationRecord.create({ data: { ...data, version: 1, submittedAt: new Date() } });
        await this.event(tx, 'CareerApplicationSubmitted.v1', row); return this.mapApplication(row);
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const replay = await this.findApplicationByJobAndStudent(data.jobId, data.studentReferenceId);
      if (!replay || replay.cvAssetId !== data.cvAssetId || replay.coverLetter !== data.coverLetter) throw new Error('CAREER_APPLICATION_PAYLOAD_CONFLICT');
      return replay;
    }
  }
  async findApplication(id: string): Promise<CareerApplicationDto | null> {
    const row = await this.p().careerApplicationRecord.findUnique({ where: { id } });
    return row ? this.mapApplication(row) : null;
  }
  async findApplicationByJobAndStudent(jobId: string, studentReferenceId: string): Promise<CareerApplicationDto | null> {
    const row = await this.p().careerApplicationRecord.findUnique({ where: { jobId_studentReferenceId: { jobId, studentReferenceId } } });
    return row ? this.mapApplication(row) : null;
  }
  async updateApplicationStatus(id: string, status: CareerApplicationStatus, input: { expectedVersion: number; withdrawnAt?: Date | null; decisionMetadata?: Record<string, unknown> | null }): Promise<CareerApplicationDto> {
    return this.prisma.$transaction(async (tx: any) => {
      const old = await tx.careerApplicationRecord.findUnique({ where: { id } });
      if (!old || old.version !== input.expectedVersion) throw new Error('CAREER_APPLICATION_VERSION_CONFLICT');
      if (!ALLOWED_APPLICATION_TRANSITIONS[old.status as CareerApplicationStatus]?.includes(status)) throw new Error('CAREER_APPLICATION_TRANSITION_NOT_ALLOWED');
      const changed = await tx.careerApplicationRecord.updateMany({ where: { id, version: input.expectedVersion, status: old.status },
        data: { status, withdrawnAt: input.withdrawnAt, decisionMetadata: input.decisionMetadata === null ? Prisma.DbNull : input.decisionMetadata, version: { increment: 1 } } });
      if (changed.count !== 1) throw new Error('CAREER_APPLICATION_VERSION_CONFLICT');
      const row = await tx.careerApplicationRecord.findUniqueOrThrow({ where: { id } });
      await this.event(tx, status === 'WITHDRAWN' ? 'CareerApplicationWithdrawn.v1' : 'CareerApplicationReviewed.v1', row);
      return this.mapApplication(row);
    }, { isolationLevel: 'Serializable' });
  }
  async listApplications(filters: Parameters<ICareerEngagementRepository['listApplications']>[0]) {
    const { page, pageSize } = paging(filters.page, filters.pageSize);
    const where: any = { jobId: filters.jobId, studentReferenceId: filters.studentReferenceId, status: filters.status };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.p().careerApplicationRecord.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.p().careerApplicationRecord.count({ where }),
    ]);
    return { data: rows.map((row: any) => this.mapApplication(row)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async upsertAlumniProfile(data: Parameters<ICareerEngagementRepository['upsertAlumniProfile']>[0]): Promise<CareerAlumniProfileDto> {
    if (this.context?.actorId !== data.studentReferenceId) throw new Error('CAREER_ACCESS_DENIED');
    return (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.careerAlumniProfileRecord.findUnique({ where: { studentReferenceId: data.studentReferenceId } });
      if (!existing) {
        const row = await tx.careerAlumniProfileRecord.create({ data: {
        studentReferenceId: data.studentReferenceId, displayName: data.displayName, graduationYear: data.graduationYear ?? null,
        programReferenceId: data.programReferenceId ?? null, employerName: data.employerName ?? null, visibility: data.visibility,
        consentGrantedAt: data.consentGrantedAt ?? null, consentGrantedBy: data.consentGrantedBy ?? null, consentSource: data.consentSource ?? null,
        consentRevokedAt: data.consentRevokedAt ?? null, consentRevokedBy: data.consentRevokedBy ?? null,
        version: 1, metadata: data.metadata ?? Prisma.DbNull,
        } });
        await this.event(tx, 'CareerAlumniConsentChanged.v1', row); return this.mapAlumni(row);
      }
      if (data.expectedVersion !== existing.version) throw new Error('CAREER_ALUMNI_VERSION_CONFLICT');
      const updated = await tx.careerAlumniProfileRecord.updateMany({
        where: { id: existing.id, version: existing.version },
        data: {
          displayName: data.displayName, graduationYear: data.graduationYear ?? null, programReferenceId: data.programReferenceId ?? null,
          employerName: data.employerName ?? null, visibility: data.visibility, consentGrantedAt: data.consentGrantedAt ?? null,
          consentGrantedBy: data.consentGrantedBy ?? null, consentSource: data.consentSource ?? null, consentRevokedAt: data.consentRevokedAt ?? null,
          consentRevokedBy: data.consentRevokedBy ?? null, metadata: data.metadata ?? Prisma.DbNull, version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error('CAREER_ALUMNI_VERSION_CONFLICT');
      const row = await tx.careerAlumniProfileRecord.findUniqueOrThrow({ where: { id: existing.id } });
      await this.event(tx, 'CareerAlumniConsentChanged.v1', row); return this.mapAlumni(row);
    }, { isolationLevel: 'Serializable' });
  }
  async findAlumniProfile(studentReferenceId: string): Promise<CareerAlumniProfileDto | null> {
    const row = await this.p().careerAlumniProfileRecord.findUnique({ where: { studentReferenceId } });
    return row ? this.mapAlumni(row) : null;
  }

  async listPublicAlumni(page: number, pageSize: number) {
    return this.alumniDirectory(page, pageSize, false);
  }
  async listAlumniNetwork(page: number, pageSize: number) { return this.alumniDirectory(page, pageSize, true); }
  private async alumniDirectory(page: number, pageSize: number, network: boolean) {
    const bounds=paging(page,pageSize);
    const audience=network?Prisma.sql`"visibility" IN ('PUBLIC','ALUMNI_ONLY')`:Prisma.sql`"visibility"='PUBLIC'`;
    const where=Prisma.sql`${audience} AND "consentGrantedAt" IS NOT NULL AND "consentGrantedAt"<=${new Date()}
      AND "consentGrantedBy"="studentReferenceId" AND "consentSource" IS NOT NULL
      AND btrim("consentSource", ${consentSourceTrimCharacters})<>'' AND "consentRevokedAt" IS NULL`;
    return this.prisma.$transaction(async tx=>{
      const [data,counts]=await Promise.all([
        tx.$queryRaw<Array<Pick<CareerAlumniProfileDto,'id'|'displayName'|'graduationYear'|'employerName'>>>(Prisma.sql`SELECT id,"displayName","graduationYear","employerName" FROM "CareerAlumniProfileRecord" WHERE ${where} ORDER BY id ASC LIMIT ${bounds.pageSize} OFFSET ${(bounds.page-1)*bounds.pageSize}`),
        tx.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT count(*) AS total FROM "CareerAlumniProfileRecord" WHERE ${where}`),
      ]);
      const total=Number(counts[0]?.total??0);
      return {data,total,page:bounds.page,totalPages:Math.ceil(total/bounds.pageSize)};
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  }

  async listAdminAlumni(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      this.p().careerAlumniProfileRecord.findMany({ select: { id: true, visibility: true, version: true }, orderBy: { id: 'asc' }, skip: (page-1)*pageSize, take: pageSize }),
      this.p().careerAlumniProfileRecord.count(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total/pageSize) };
  }

  private mapProfile(row: any): CareerProfileDto { return { ...row, skills: strings(row.skills), metadata: obj(row.metadata) }; }
  private mapApplication(row: any): CareerApplicationDto { return { ...row, jobSnapshot: obj(row.jobSnapshot) ?? {}, decisionMetadata: obj(row.decisionMetadata) }; }
  private mapAlumni(row: any): CareerAlumniProfileDto { return { ...row, visibility: row.visibility as AlumniProfileVisibility, metadata: obj(row.metadata) }; }
}
