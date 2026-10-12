import {
  CareerEmployerDto,
  CareerEmployerFilters,
  CareerJobFilters,
  CareerJobPostingDto,
  CreateCareerEmployerDto,
  CreateCareerJobPostingDto,
  PaginatedCareerResult,
  UpdateCareerEmployerDto,
  CareerJobRepositoryUpdateDto
} from '../entities';
import { CareerJobStatus } from '../enums';

export interface ICareerRepository {
  withActor?(context: { actorId: string; reason: string; correlationId: string }): ICareerRepository;
  expireJobs?(limit: number): Promise<number>;
  createEmployer(data: CreateCareerEmployerDto): Promise<CareerEmployerDto>;
  updateEmployer(id: string, data: UpdateCareerEmployerDto, expectedVersion: number): Promise<CareerEmployerDto>;
  findEmployerById(id: string): Promise<CareerEmployerDto | null>;
  findEmployerBySlug(slug: string): Promise<CareerEmployerDto | null>;
  findEmployerByDedupKey(dedupKey: string): Promise<CareerEmployerDto | null>;
  listEmployers(filters: CareerEmployerFilters): Promise<PaginatedCareerResult<CareerEmployerDto>>;

  createJob(data: CreateCareerJobPostingDto): Promise<CareerJobPostingDto>;
  updateJob(id: string, data: CareerJobRepositoryUpdateDto, expectedVersion: number): Promise<CareerJobPostingDto>;
  findJobById(id: string): Promise<CareerJobPostingDto | null>;
  findJobBySlug(slug: string): Promise<CareerJobPostingDto | null>;
  findJobByDedupKey(dedupKey: string): Promise<CareerJobPostingDto | null>;
  updateJobStatus(id: string, status: CareerJobStatus, expectedVersion: number, decision?: { reason: string; checklist?: Record<string, boolean> }): Promise<CareerJobPostingDto>;
  listJobs(filters: CareerJobFilters): Promise<PaginatedCareerResult<CareerJobPostingDto>>;
  listPublishedJobs(filters: Omit<CareerJobFilters, 'status'>): Promise<PaginatedCareerResult<CareerJobPostingDto>>;
}

export interface ICareerReferenceGateway {
  displayGeography?(countryId: string, cityId?: string | null, locale?: 'ar' | 'en'): Promise<{ country?: string; city?: string | null }>;
  resolveCountryReference(input: string): Promise<{ id: string; label?: string }>;
  resolveCurrencyReference?(input: string): Promise<{ code: string }>;
  resolveCityReference(input: string, expectedCountryReferenceId?: string): Promise<{ id: string; label?: string }>;
}
