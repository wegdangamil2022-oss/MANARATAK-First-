import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseImportCompletenessState } from '../enums/CourseImportCompletenessState';
import { CourseOriginType } from '../enums/CourseOriginType';
import { CourseStatus } from '../enums/CourseStatus';
import { CreateCourseDto, CourseDto } from '../entities/Course';
import { PublicCourseFilters } from './PublicCourseFilters';

export interface CourseFilters {
  status?: CourseStatus;
  completenessStatus?: CourseImportCompletenessState;
  accessType?: CourseAccessType;
  originType?: CourseOriginType;
  platformName?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCourseResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface UpdateCourseDto {
  displayName?: string;
  accessType?: CourseAccessType;
  originType?: CourseOriginType;
  directCourseUrl?: string;
  completenessStatus?: CourseImportCompletenessState;

  externalProviderId?: string | null;
  originalSourceTitle?: string | null;
  isStudyFree?: boolean | null;
  isFreeCertificate?: boolean | null;
  certificateType?: string | null;
  learningLanguageRaw?: string | null;
  studyLevelRaw?: string | null;
  studyDurationRaw?: string | null;
  shortCourseTopicsRaw?: string | null;

  platformName?: string | null;
  providerName?: string | null;
  learningLanguage?: string | null;
  studyDuration?: string | null;
  certificateAvailable?: boolean | null;
  category?: string | null;
  difficultyLevel?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  thumbnailAssetId?: string | null;

  optionalFields?: Record<string, unknown>;
}

export interface ICourseRepository {
  create(data: CreateCourseDto): Promise<CourseDto>;
  update(id: string, data: UpdateCourseDto): Promise<CourseDto>;
  findByDedupKey(dedupKey: string): Promise<CourseDto | null>;
  findById(id: string): Promise<CourseDto | null>;
  findByPublicId(publicId: string): Promise<CourseDto | null>;
  findBySlug(slug: string): Promise<CourseDto | null>;
  updateStatus(id: string, status: CourseStatus): Promise<void>;
  updateImportLink(id: string, sourceImportRecordId: string): Promise<void>;
  listByStatus(status: CourseStatus): Promise<CourseDto[]>;
  list(filters: CourseFilters): Promise<PaginatedCourseResult<CourseDto>>;
  listPublished(filters: PublicCourseFilters): Promise<PaginatedCourseResult<CourseDto>>;
}

export interface ITransactionalCourseRepository extends ICourseRepository {
  withTransaction(context: AtomicPersistenceContext): ICourseRepository;
}
