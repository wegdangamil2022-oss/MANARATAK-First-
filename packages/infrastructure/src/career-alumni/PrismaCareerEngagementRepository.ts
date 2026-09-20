import { PrismaClient } from '@prisma/client';
import {
  AlumniProfileVisibility,
  CareerAlumniProfileDto,
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerProfileDto,
  ICareerEngagementRepository,
} from '@manaratak/domain';

const obj = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export class PrismaCareerEngagementRepository implements ICareerEngagementRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private p(client: any = this.prisma as any) { return client; }

  async upsertProfile(data: Parameters<ICareerEngagementRepository['upsertProfile']>[0]): Promise<CareerProfileDto> {
    return (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.careerProfileRecord.findUnique({ where: { studentReferenceId: data.studentReferenceId } });
      if (!existing) {
        return this.mapProfile(await tx.careerProfileRecord.create({ data: {
          studentReferenceId: data.studentReferenceId, headline: data.headline ?? null, summary: data.summary ?? null, skills: data.skills,
          resumeAssetId: data.resumeAssetId ?? null, visibility: data.visibility, version: 1, metadata: data.metadata ?? null,
        } }));
      }
      if (data.expectedVersion !== existing.version) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
      const updated = await tx.careerProfileRecord.updateMany({
        where: { id: existing.id, version: existing.version },
        data: {
          headline: data.headline ?? null, summary: data.summary ?? null, skills: data.skills, resumeAssetId: data.resumeAssetId ?? null,
          visibility: data.visibility, metadata: data.metadata ?? null, version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
      return this.mapProfile(await tx.careerProfileRecord.findUniqueOrThrow({ where: { id: existing.id } }));
    }, { isolationLevel: 'Serializable' });
  }

  async findProfile(studentReferenceId: string): Promise<CareerProfileDto | null> {
    const row = await this.p().careerProfileRecord.findUnique({ where: { studentReferenceId } });
    return row ? this.mapProfile(row) : null;
  }

  async createApplication(data: Parameters<ICareerEngagementRepository['createApplication']>[0]): Promise<CareerApplicationDto> {
    return this.mapApplication(await this.p().careerApplicationRecord.create({ data: { ...data, version: 1, submittedAt: new Date() } }));
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
    const result = await this.p().careerApplicationRecord.updateMany({
      where: { id, version: input.expectedVersion },
      data: { status, withdrawnAt: input.withdrawnAt, decisionMetadata: input.decisionMetadata, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new Error('CAREER_APPLICATION_VERSION_CONFLICT');
    return this.mapApplication(await this.p().careerApplicationRecord.findUniqueOrThrow({ where: { id } }));
  }
  async listApplications(filters: Parameters<ICareerEngagementRepository['listApplications']>[0]) {
    const page = Math.max(filters.page ?? 1, 1); const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = { jobId: filters.jobId, studentReferenceId: filters.studentReferenceId, status: filters.status };
    Object.keys(where).forEach((key) => where[key] === undefined && delete where[key]);
    const [rows, total] = await Promise.all([
      this.p().careerApplicationRecord.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.p().careerApplicationRecord.count({ where }),
    ]);
    return { data: rows.map((row: any) => this.mapApplication(row)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async upsertAlumniProfile(data: Parameters<ICareerEngagementRepository['upsertAlumniProfile']>[0]): Promise<CareerAlumniProfileDto> {
    return (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.careerAlumniProfileRecord.findUnique({ where: { studentReferenceId: data.studentReferenceId } });
      if (!existing) return this.mapAlumni(await tx.careerAlumniProfileRecord.create({ data: {
        studentReferenceId: data.studentReferenceId, displayName: data.displayName, graduationYear: data.graduationYear ?? null,
        programReferenceId: data.programReferenceId ?? null, employerName: data.employerName ?? null, visibility: data.visibility,
        consentGrantedAt: data.consentGrantedAt ?? null, consentGrantedBy: data.consentGrantedBy ?? null, consentSource: data.consentSource ?? null,
        consentRevokedAt: data.consentRevokedAt ?? null, consentRevokedBy: data.consentRevokedBy ?? null,
        version: 1, metadata: data.metadata ?? null,
      } }));
      if (data.expectedVersion !== existing.version) throw new Error('CAREER_ALUMNI_VERSION_CONFLICT');
      const updated = await tx.careerAlumniProfileRecord.updateMany({
        where: { id: existing.id, version: existing.version },
        data: {
          displayName: data.displayName, graduationYear: data.graduationYear ?? null, programReferenceId: data.programReferenceId ?? null,
          employerName: data.employerName ?? null, visibility: data.visibility, consentGrantedAt: data.consentGrantedAt ?? null,
          consentGrantedBy: data.consentGrantedBy ?? null, consentSource: data.consentSource ?? null, consentRevokedAt: data.consentRevokedAt ?? null,
          consentRevokedBy: data.consentRevokedBy ?? null, metadata: data.metadata ?? null, version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new Error('CAREER_ALUMNI_VERSION_CONFLICT');
      return this.mapAlumni(await tx.careerAlumniProfileRecord.findUniqueOrThrow({ where: { id: existing.id } }));
    }, { isolationLevel: 'Serializable' });
  }
  async findAlumniProfile(studentReferenceId: string): Promise<CareerAlumniProfileDto | null> {
    const row = await this.p().careerAlumniProfileRecord.findUnique({ where: { studentReferenceId } });
    return row ? this.mapAlumni(row) : null;
  }

  private mapProfile(row: any): CareerProfileDto { return { ...row, skills: strings(row.skills), metadata: obj(row.metadata) }; }
  private mapApplication(row: any): CareerApplicationDto { return { ...row, jobSnapshot: obj(row.jobSnapshot) ?? {}, decisionMetadata: obj(row.decisionMetadata) }; }
  private mapAlumni(row: any): CareerAlumniProfileDto { return { ...row, visibility: row.visibility as AlumniProfileVisibility, metadata: obj(row.metadata) }; }
}
