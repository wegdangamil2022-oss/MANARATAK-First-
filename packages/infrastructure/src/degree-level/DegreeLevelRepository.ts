import { Prisma, PrismaClient } from '@prisma/client';
import { type AtomicPersistenceContext, CanonicalDegreeLevelCode, DegreeLevelStatus, IDegreeLevelRepository, DegreeLevelDto, UpsertDegreeLevelDto } from '@manaratak/domain';

export class DegreeLevelRepository implements IDegreeLevelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(context: AtomicPersistenceContext): IDegreeLevelRepository {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('DEGREE_LEVEL_ATOMIC_TRANSACTION_REQUIRED');
    return new DegreeLevelRepository(tx as unknown as PrismaClient);
  }

  async updateDegreeLevel(id: string, data: UpsertDegreeLevelDto, expectedUpdatedAt: string): Promise<DegreeLevelDto> {
    const revision = new Date(expectedUpdatedAt);
    if (!Number.isFinite(revision.getTime())) throw new Error('DEGREE_LEVEL_VERSION_CONFLICT');
    const won = await this.prisma.degreeLevel.updateMany({ where: { id, canonicalCode: data.canonicalCode, updatedAt: revision },
      data: { nameEn: data.nameEn, nameAr: data.nameAr, displayRank: data.displayRank, status: data.status,
        updatedAt: new Date(Math.max(Date.now(), revision.getTime() + 1)) } });
    if (won.count !== 1) throw new Error('DEGREE_LEVEL_VERSION_CONFLICT');
    const updated = await this.getDegreeLevelById(id);
    if (!updated) throw new Error('DEGREE_LEVEL_NOT_FOUND');
    return updated;
  }

  async listDegreeLevels(): Promise<DegreeLevelDto[]> {
    const results = await this.prisma.degreeLevel.findMany({
      orderBy: { displayRank: 'asc' },
    });
    return results.map(r => this.mapToDto(r));
  }

  async getDegreeLevelByCode(code: string): Promise<DegreeLevelDto | null> {
    const result = await this.prisma.degreeLevel.findUnique({
      where: { canonicalCode: code },
    });
    return result ? this.mapToDto(result) : null;
  }

  async getDegreeLevelById(id: string): Promise<DegreeLevelDto | null> {
    const result = await this.prisma.degreeLevel.findUnique({
      where: { id },
    });
    return result ? this.mapToDto(result) : null;
  }

  async upsertDegreeLevel(data: UpsertDegreeLevelDto): Promise<DegreeLevelDto> {
    const result = await this.prisma.degreeLevel.upsert({
      where: { canonicalCode: data.canonicalCode },
      update: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        displayRank: data.displayRank,
        status: data.status,
        aliases: data.aliases === undefined ? undefined : data.aliases ?? {},
        metadata: data.metadata === undefined ? undefined : data.metadata ?? {},
      },
      create: {
        canonicalCode: data.canonicalCode,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        displayRank: data.displayRank ?? 0,
        status: data.status ?? DegreeLevelStatus.ACTIVE,
        aliases: data.aliases ?? {},
        metadata: data.metadata ?? {},
      },
    });
    return this.mapToDto(result);
  }

  private mapToDto(record: any): DegreeLevelDto {
    return {
      id: record.id,
      canonicalCode: record.canonicalCode as CanonicalDegreeLevelCode,
      nameEn: record.nameEn,
      nameAr: record.nameAr,
      displayRank: record.displayRank,
      status: record.status as DegreeLevelStatus,
      aliases: record.aliases ? (record.aliases as Record<string, any>) : undefined,
      metadata: record.metadata ? (record.metadata as Record<string, any>) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
