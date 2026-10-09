import type { PrismaClient, Prisma } from '@prisma/client';
import type { ISourceRegistryGateway } from '@manaratak/application';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';

export class PrismaSourceRegistryGateway implements ISourceRegistryGateway {
  public readonly persistenceClassification = 'DURABLE' as const;
  constructor(private readonly prisma: PrismaClient) {}
  withTransaction(context: import('@manaratak/domain').AtomicPersistenceContext): ISourceRegistryGateway {
    const tx = (context as unknown as { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('IMPORT_SOURCE_TRANSACTION_REQUIRED');
    return new PrismaSourceRegistryGateway(tx as unknown as PrismaClient);
  }
  async replaceSource(source: ImportSourceDefinition, expectedUpdatedAt: Date): Promise<void> {
    if (typeof this.prisma.$transaction === 'function') throw new Error('IMPORT_SOURCE_TRANSACTION_REQUIRED');
    const updated = await this.prisma.importSourceRegistryEntry.updateMany({
      where: { sourceId: source.sourceId, updatedAt: expectedUpdatedAt }, data: this.toData(source),
    });
    if (updated.count !== 1) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
  }
  async registerSource(source: ImportSourceDefinition): Promise<void> {
    await this.prisma.importSourceRegistryEntry.create({ data: this.toData(source) });
  }
  async getSource(sourceId: string): Promise<ImportSourceDefinition | null> {
    const row = await this.prisma.importSourceRegistryEntry.findUnique({ where: { sourceId } }); return row ? this.fromRow(row) : null;
  }
  async listSources(filters?: { status?: SourceStatus; category?: SourceConnectorCategory; accessClassification?: SourceAccessClassification }): Promise<ImportSourceDefinition[]> {
    const rows = await this.prisma.importSourceRegistryEntry.findMany({ where: { ...(filters?.status ? { status: filters.status } : {}), ...(filters?.category ? { category: filters.category } : {}), ...(filters?.accessClassification ? { accessClassification: filters.accessClassification } : {}) }, orderBy: { sourceId: 'asc' } });
    return rows.map((row) => this.fromRow(row));
  }
  async updateSourceStatus(sourceId: string, status: SourceStatus, reason?: string): Promise<boolean> {
    if (!Object.values(SourceStatus).includes(status)) throw new Error('IMPORT_SOURCE_STATUS_INVALID');
    const row = await this.prisma.importSourceRegistryEntry.findUnique({ where: { sourceId } });
    if (!row) return false;
    const current = this.fromRow(row);
    if (current.accessClassification === SourceAccessClassification.BLOCKED && status === SourceStatus.ACTIVE)
      throw new Error('A BLOCKED source cannot have an ACTIVE status');
    const metadata = {
      ...(current.metadata ?? {}),
      ...(current.metadata?.ownerDomain === 'SCHOLARSHIPS'
        ? { scholarshipSourceStatus: status === SourceStatus.ACTIVE ? 'ACTIVE' : 'DISABLED' }
        : {}),
      lastRegistryStatusChange: {
        from: current.status,
        to: status,
        reason: reason?.trim() || undefined,
        changedAt: new Date().toISOString(),
      },
    };
    // An Admin decision based on a stale source snapshot must never reactivate
    // a newly blocked source or overwrite later governance metadata.
    // updatedAt is PostgreSQL-backed optimistic concurrency evidence.
    const updated = await this.prisma.importSourceRegistryEntry.updateMany({
      where: {
        sourceId,
        updatedAt: row.updatedAt,
        status: row.status,
        accessClassification: row.accessClassification,
        connectorId: row.connectorId,
        connectorVersion: row.connectorVersion,
      },
      data: { status, metadata },
    });
    if (updated.count !== 1) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
    return true;
  }
  private toData(source: ImportSourceDefinition) { return { sourceId: source.sourceId, displayName: source.displayName, baseUrl: source.baseUrl, category: source.category, accessClassification: source.accessClassification, status: source.status, rateLimitPerMinute: source.rateLimitPerMinute, robotsPolicyUrl: source.robotsPolicyUrl, connectorId: source.connectorId, connectorVersion: source.connectorVersion, metadata: source.metadata as object | undefined }; }
  private fromRow(row: { sourceId: string; displayName: string; baseUrl: string; category: string; accessClassification: string; status: string; rateLimitPerMinute: number | null; robotsPolicyUrl: string | null; connectorId: string; connectorVersion: string; metadata: unknown; updatedAt?: Date }): ImportSourceDefinition { return new ImportSourceDefinition({ sourceId: row.sourceId, updatedAt: row.updatedAt, displayName: row.displayName, baseUrl: row.baseUrl, category: row.category as SourceConnectorCategory, accessClassification: row.accessClassification as SourceAccessClassification, status: row.status as SourceStatus, rateLimitPerMinute: row.rateLimitPerMinute ?? undefined, robotsPolicyUrl: row.robotsPolicyUrl ?? undefined, connectorId: row.connectorId, connectorVersion: row.connectorVersion, metadata: row.metadata as Record<string, unknown> | undefined }); }
}
