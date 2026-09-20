import type { PrismaClient } from '@prisma/client';
import type { ISourceRegistryGateway } from '@manaratak/application';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';

export class PrismaSourceRegistryGateway implements ISourceRegistryGateway {
  public readonly persistenceClassification = 'DURABLE' as const;
  constructor(private readonly prisma: PrismaClient) {}
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
    const current = await this.getSource(sourceId); if (!current) return false;
    if (current.accessClassification === SourceAccessClassification.BLOCKED && status === SourceStatus.ACTIVE) throw new Error('A BLOCKED source cannot have an ACTIVE status');
    const metadata = {
      ...(current.metadata ?? {}),
      ...(current.metadata?.ownerDomain === 'SCHOLARSHIPS' ? { scholarshipSourceStatus: status === SourceStatus.ACTIVE ? 'ACTIVE' : 'DISABLED' } : {}),
      lastRegistryStatusChange: {
        from: current.status,
        to: status,
        reason: reason?.trim() || undefined,
        changedAt: new Date().toISOString(),
      },
    };
    await this.prisma.importSourceRegistryEntry.update({ where: { sourceId }, data: { status, metadata } }); return true;
  }
  private toData(source: ImportSourceDefinition) { return { sourceId: source.sourceId, displayName: source.displayName, baseUrl: source.baseUrl, category: source.category, accessClassification: source.accessClassification, status: source.status, rateLimitPerMinute: source.rateLimitPerMinute, robotsPolicyUrl: source.robotsPolicyUrl, connectorId: source.connectorId, connectorVersion: source.connectorVersion, metadata: source.metadata as object | undefined }; }
  private fromRow(row: { sourceId: string; displayName: string; baseUrl: string; category: string; accessClassification: string; status: string; rateLimitPerMinute: number | null; robotsPolicyUrl: string | null; connectorId: string; connectorVersion: string; metadata: unknown }): ImportSourceDefinition { return new ImportSourceDefinition({ sourceId: row.sourceId, displayName: row.displayName, baseUrl: row.baseUrl, category: row.category as SourceConnectorCategory, accessClassification: row.accessClassification as SourceAccessClassification, status: row.status as SourceStatus, rateLimitPerMinute: row.rateLimitPerMinute ?? undefined, robotsPolicyUrl: row.robotsPolicyUrl ?? undefined, connectorId: row.connectorId, connectorVersion: row.connectorVersion, metadata: row.metadata as Record<string, unknown> | undefined }); }
}
