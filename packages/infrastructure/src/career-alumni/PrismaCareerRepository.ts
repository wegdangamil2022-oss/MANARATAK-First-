import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
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

import { queryStableCursorPage } from '../api-foundation/StableCursor';

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const strings = (value: unknown): string[] | null => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : null;

export class PrismaCareerRepository implements ICareerRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private employers(client: any = this.prisma) { return client.careerEmployerRecord; }
  private jobs(client: any = this.prisma) { return client.careerJobPostingRecord; }

  private async atomicEvent<T extends { id: string; publicId?: string; version?: number }>(eventType: string, aggregateType: string, mutate: (tx: any) => Promise<T>, payload: (value: T) => Record<string, unknown>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      const value = await mutate(tx);
      if (!tx.transactionalOutboxRecord?.create) throw new Error('CAREER_DURABLE_OUTBOX_REQUIRED');
      const now = new Date();
      await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType, domain: 'CAREER', aggregateType, aggregateId: value.id, payload: payload(value), metadata: { schemaVersion: 1, ownerDomain: 'CAREER' }, correlationId: randomUUID(), state: 'PENDING', attempts: 0, availableAt: now, createdAt: now } });
      return value;
    });
  }

  async createEmployer(data: CreateCareerEmployerDto) {
    const row = await this.atomicEvent('CareerEmployerCreated.v1', 'CareerEmployer', async tx => this.employers(tx).create({ data }), value => ({ employerId: value.id, publicId: value.publicId, verificationStatus: (value as any).verificationStatus, version: value.version }));
    return this.mapEmployer(row);
  }
  async updateEmployer(id: string, data: UpdateCareerEmployerDto, expectedVersion: number) {
    try {
      const row = await this.atomicEvent('CareerEmployerLifecycleChanged.v1', 'CareerEmployer', async tx => this.employers(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: { ...data, version: { increment: 1 } } }), value => ({ employerId: value.id, publicId: value.publicId, verificationStatus: (value as any).verificationStatus, version: value.version }));
      return this.mapEmployer(row);
    } catch (error) { throw this.mapVersionConflict(error, 'CAREER_EMPLOYER_VERSION_CONFLICT'); }
  }
  async findEmployerById(id: string) { const row = await this.employers().findUnique({ where: { id } }); return row ? this.mapEmployer(row) : null; }
  async findEmployerBySlug(slug: string) { const row = await this.employers().findUnique({ where: { slug } }); return row ? this.mapEmployer(row) : null; }
  async findEmployerByDedupKey(canonicalDedupKey: string) { const row = await this.employers().findUnique({ where: { canonicalDedupKey } }); return row ? this.mapEmployer(row) : null; }
  async listEmployers(filters: CareerEmployerFilters): Promise<PaginatedCareerResult<CareerEmployerDto>> {
    const page = Math.max(filters.page ?? 1, 1); const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: any = { verificationStatus: filters.verificationStatus, employerType: filters.employerType, countryReferenceId: filters.countryReferenceId };
    Object.keys(where).forEach(k => where[k] === undefined && delete where[k]);
    const [rows,total] = await Promise.all([this.employers().findMany({ where, orderBy: { updatedAt: 'desc' }, skip:(page-1)*pageSize, take:pageSize }), this.employers().count({where})]);
    return { data: rows.map((r:any)=>this.mapEmployer(r)), total, page, pageSize, totalPages: Math.ceil(total/pageSize) };
  }

  async createJob(data: CreateCareerJobPostingDto) {
    const row = await this.atomicEvent('CareerJobCreated.v1', 'CareerJobPosting', async tx => this.jobs(tx).create({ data, include: { employer: true } }), value => ({ jobId: value.id, publicId: value.publicId, employerId: (value as any).employerId, status: (value as any).status, version: value.version }));
    return this.mapJob(row);
  }
  async updateJob(id: string, data: CareerJobRepositoryUpdateDto, expectedVersion: number) {
    try {
      const row = await this.atomicEvent('CareerJobUpdated.v1', 'CareerJobPosting', async tx => this.jobs(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: { ...data, version: { increment: 1 } }, include: { employer: true } }), value => ({ jobId: value.id, publicId: value.publicId, employerId: (value as any).employerId, status: (value as any).status, version: value.version }));
      return this.mapJob(row);
    }
    catch (error) { throw this.mapVersionConflict(error, 'CAREER_JOB_VERSION_CONFLICT'); }
  }
  async findJobById(id: string) { const row=await this.jobs().findUnique({where:{id},include:{employer:true}}); return row?this.mapJob(row):null; }
  async findJobBySlug(slug: string) { const row=await this.jobs().findUnique({where:{slug},include:{employer:true}}); return row?this.mapJob(row):null; }
  async findJobByDedupKey(canonicalDedupKey: string) { const row=await this.jobs().findUnique({where:{canonicalDedupKey},include:{employer:true}}); return row?this.mapJob(row):null; }
  async updateJobStatus(id: string, status: CareerJobStatus, expectedVersion: number): Promise<CareerJobPostingDto> {
    try {
      const eventType = status === CareerJobStatus.PUBLISHED ? 'JobPosted.v1' : status === CareerJobStatus.ARCHIVED ? 'JobClosed.v1' : 'CareerJobStatusChanged.v1';
      const row = await this.atomicEvent(eventType, 'CareerJobPosting', async tx => this.jobs(tx).update({ where: { id_version: { id, version: expectedVersion } }, data: { status, version: { increment: 1 } }, include: { employer: true } }), value => ({ jobId: value.id, publicId: value.publicId, employerId: (value as any).employerId, status, version: value.version }));
      return this.mapJob(row);
    } catch (error) { throw this.mapVersionConflict(error, 'CAREER_JOB_VERSION_CONFLICT'); }
  }
  async listJobs(filters: CareerJobFilters) { return this.listJobsInternal(filters, false); }
  async listPublishedJobs(filters: Omit<CareerJobFilters,'status'>) {
    const where:any={status:CareerJobStatus.PUBLISHED,opportunityType:filters.opportunityType,employmentType:filters.employmentType,jobCategory:filters.jobCategory,countryReferenceId:filters.countryReferenceId,cityReferenceId:filters.cityReferenceId,employerId:filters.employerId};
    Object.keys(where).forEach(k=>where[k]===undefined&&delete where[k]);
    where.employer = { verificationStatus: CareerEmployerStatus.VERIFIED };
    where.OR = [{ applicationDeadline: null }, { applicationDeadline: { gt: new Date() } }];
    return queryStableCursorPage({ delegate: this.jobs() as any, where, include: { employer: true }, cursor: filters.cursor, limit: filters.limit, map: (row:any)=>this.mapJob(row) });
  }
  private async listJobsInternal(filters: CareerJobFilters, publishedOnly: boolean): Promise<PaginatedCareerResult<CareerJobPostingDto>> {
    const page=Math.max(filters.page??1,1); const pageSize=Math.min(Math.max(filters.pageSize??20,1),100);
    const where:any={status:filters.status,opportunityType:filters.opportunityType,employmentType:filters.employmentType,jobCategory:filters.jobCategory,countryReferenceId:filters.countryReferenceId,cityReferenceId:filters.cityReferenceId,employerId:filters.employerId};
    Object.keys(where).forEach(k=>where[k]===undefined&&delete where[k]);
    if (publishedOnly) {
      where.employer = { verificationStatus: CareerEmployerStatus.VERIFIED };
      where.OR = [{ applicationDeadline: null }, { applicationDeadline: { gt: new Date() } }];
    }
    const [rows,total]=await Promise.all([this.jobs().findMany({where,include:{employer:true},orderBy:{updatedAt:'desc'},skip:(page-1)*pageSize,take:pageSize}),this.jobs().count({where})]);
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
