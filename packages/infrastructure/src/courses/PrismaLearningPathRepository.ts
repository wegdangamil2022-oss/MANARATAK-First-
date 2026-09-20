import { Prisma, PrismaClient } from '@prisma/client';
import {
  AtomicPersistenceContext,
  CreateLearningPathDto,
  ILearningPathRepository,
  ITransactionalLearningPathRepository,
  LearningPathDto,
  LearningPathEnrollmentDto,
  LearningPathEnrollmentStatus,
  LearningPathStatus,
} from '@manaratak/domain';

interface LearningPathTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}
type Db = PrismaClient | Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export class PrismaLearningPathRepository implements ITransactionalLearningPathRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public withTransaction(context: AtomicPersistenceContext): ILearningPathRepository {
    const tx = (context as Partial<LearningPathTransactionContext>).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('LEARNING_PATH_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaLearningPathRepository(tx as unknown as PrismaClient);
  }

  public async create(data: CreateLearningPathDto): Promise<LearningPathDto> {
    return this.serializable(async db => {
      const path = await db.learningPath.create({
        data: {
          publicId: data.publicId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          status: LearningPathStatus.DRAFT,
          isStrictlyOrdered: data.isStrictlyOrdered ?? false,
          completionLogic: data.completionLogic ?? 'ALL_REQUIRED',
        },
      });
      const courses = data.courses ?? [];
      const version = await db.learningPathVersion.create({
        data: {
          learningPathId: path.id,
          versionNumber: 1,
          status: LearningPathStatus.DRAFT,
          snapshot: json({ title: path.title, description: path.description, courses }),
          courses: { create: courses.map(item => ({
            courseId: item.courseId,
            position: item.position,
            required: item.required,
            prerequisiteCourseIds: json(item.prerequisiteCourseIds),
          })) },
        },
        include: { courses: true },
      });
      return this.map(path, version.courses);
    });
  }

  public async findById(id: string): Promise<LearningPathDto | null> {
    const path = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!path) return null;
    const version = await this.prisma.learningPathVersion.findUnique({
      where: { learningPathId_versionNumber: { learningPathId: id, versionNumber: path.version } },
      include: { courses: true },
    });
    return this.map(path, version?.courses ?? []);
  }

  public async findBySlug(slug: string): Promise<LearningPathDto | null> {
    const path = await this.prisma.learningPath.findUnique({ where: { slug } });
    return path ? this.findById(path.id) : null;
  }

  public async list(): Promise<LearningPathDto[]> {
    const paths = await this.prisma.learningPath.findMany({ orderBy: { updatedAt: 'desc' } });
    return Promise.all(paths.map(async path => {
      const version = await this.prisma.learningPathVersion.findUnique({
        where: { learningPathId_versionNumber: { learningPathId: path.id, versionNumber: path.version } },
        include: { courses: true },
      });
      return this.map(path, version?.courses ?? []);
    }));
  }

  public async updateStatus(id: string, status: LearningPathStatus): Promise<LearningPathDto> {
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "LearningPath" WHERE id = ${id} FOR UPDATE`;
      const current = await db.learningPath.findUnique({ where: { id } });
      if (!current) throw new Error('LEARNING_PATH_NOT_FOUND');
      const currentVersion = await db.learningPathVersion.findUnique({
        where: { learningPathId_versionNumber: { learningPathId: id, versionNumber: current.version } },
        include: { courses: true },
      });
      if (!currentVersion) throw new Error('LEARNING_PATH_VERSION_NOT_FOUND');
      const nextVersion = current.version + 1;
      const path = await db.learningPath.update({ where: { id }, data: { status, version: nextVersion } });
      const version = await db.learningPathVersion.create({
        data: {
          learningPathId: id,
          versionNumber: nextVersion,
          status,
          snapshot: json({ title: path.title, description: path.description, previousVersion: current.version }),
          courses: { create: currentVersion.courses.map(item => ({
            courseId: item.courseId,
            position: item.position,
            required: item.required,
            prerequisiteCourseIds: item.prerequisiteCourseIds as Prisma.InputJsonValue,
          })) },
        }, include: { courses: true },
      });
      return this.map(path, version.courses);
    });
  }

  public async enroll(pathId: string, version: number, studentReferenceId: string): Promise<LearningPathEnrollmentDto> {
    const row = await this.prisma.learningPathEnrollment.upsert({
      where: { learningPathId_studentReferenceId: { learningPathId: pathId, studentReferenceId } },
      create: { learningPathId: pathId, learningPathVersion: version, studentReferenceId, status: LearningPathEnrollmentStatus.ACTIVE },
      update: {},
    });
    return this.enrollment(row);
  }

  public async findEnrollment(pathId: string, studentReferenceId: string): Promise<LearningPathEnrollmentDto | null> {
    const row = await this.prisma.learningPathEnrollment.findUnique({ where: { learningPathId_studentReferenceId: { learningPathId: pathId, studentReferenceId } } });
    return row ? this.enrollment(row) : null;
  }

  public async updateEnrollmentProgress(pathId: string, studentReferenceId: string, progressPercentage: number, status: LearningPathEnrollmentStatus): Promise<LearningPathEnrollmentDto> {
    const row = await this.prisma.learningPathEnrollment.update({
      where: { learningPathId_studentReferenceId: { learningPathId: pathId, studentReferenceId } },
      data: { progressPercentage, status, completedAt: status === LearningPathEnrollmentStatus.COMPLETED ? new Date() : null },
    });
    return this.enrollment(row);
  }

  private async serializable<T>(work: (db: Db) => Promise<T>): Promise<T> {
    const candidate = this.prisma as PrismaClient & { $transaction?: PrismaClient['$transaction'] };
    if (typeof candidate.$transaction !== 'function') return work(this.prisma as unknown as Prisma.TransactionClient);
    return candidate.$transaction(tx => work(tx), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private map(path: any, courses: any[]): LearningPathDto {
    return {
      id: path.id, publicId: path.publicId, slug: path.slug, title: path.title, description: path.description,
      status: path.status as LearningPathStatus, version: path.version,
      isStrictlyOrdered: path.isStrictlyOrdered, completionLogic: path.completionLogic as 'ALL_REQUIRED' | 'ALL',
      courses: [...courses].sort((a,b) => a.position - b.position).map(item => ({
        courseId: item.courseId, position: item.position, required: item.required,
        prerequisiteCourseIds: Array.isArray(item.prerequisiteCourseIds) ? item.prerequisiteCourseIds.filter((x: unknown): x is string => typeof x === 'string') : [],
      })),
      createdAt: path.createdAt, updatedAt: path.updatedAt,
    };
  }
  private enrollment(row: any): LearningPathEnrollmentDto { return { ...row, status: row.status as LearningPathEnrollmentStatus }; }
}
