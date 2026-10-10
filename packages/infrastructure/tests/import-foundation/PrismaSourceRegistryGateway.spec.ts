import { describe, expect, it, vi } from 'vitest';
import {
  ImportSourceDefinition, SourceAccessClassification,
  SourceConnectorCategory, SourceStatus,
} from '@manaratak/domain';
import { PrismaSourceRegistryGateway } from '../../src/import-foundation/PrismaSourceRegistryGateway';

const timestamp = new Date('2026-10-09T18:00:00.000Z');
function registryRow(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: 'source-1',
    displayName: 'University feed',
    baseUrl: 'https://safe.example/api',
    category: SourceConnectorCategory.OFFICIAL_API,
    accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
    status: SourceStatus.DISABLED,
    rateLimitPerMinute: 10,
    robotsPolicyUrl: null,
    connectorId: 'official-api',
    connectorVersion: '1.0.0',
    metadata: { ownerDomain: 'SCHOLARSHIPS', original: 'preserved' },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function client(row: ReturnType<typeof registryRow> | null, count = 1) {
  return {
    importSourceRegistryEntry: {
      findUnique: vi.fn().mockResolvedValue(row),
      updateMany: vi.fn().mockResolvedValue({ count }),
    },
  };
}

describe('PrismaSourceRegistryGateway governance status compare-and-swap', () => {
  it('guards status, access classification, connector identity and row generation in one update', async () => {
    const prisma = client(registryRow());
    const gateway = new PrismaSourceRegistryGateway(prisma as any);
    expect(await gateway.updateSourceStatus('source-1', SourceStatus.ACTIVE, 'Owner approved')).toBe(true);
    expect(prisma.importSourceRegistryEntry.updateMany).toHaveBeenCalledWith({
      where: {
        sourceId: 'source-1', updatedAt: timestamp,
        status: SourceStatus.DISABLED,
        accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
        connectorId: 'official-api', connectorVersion: '1.0.0',
      },
      data: {
        status: SourceStatus.ACTIVE,
        metadata: expect.objectContaining({
          original: 'preserved', scholarshipSourceStatus: 'ACTIVE',
          lastRegistryStatusChange: expect.objectContaining({
            from: SourceStatus.DISABLED, to: SourceStatus.ACTIVE,
            reason: 'Owner approved',
          }),
        }),
      },
    });
  });

  it('rejects a concurrent governance edit without overwriting the new status or metadata', async () => {
    const prisma = client(registryRow(), 0);
    const gateway = new PrismaSourceRegistryGateway(prisma as any);
    await expect(gateway.updateSourceStatus('source-1', SourceStatus.ACTIVE))
      .rejects.toThrow('IMPORT_SOURCE_STATUS_CONFLICT');
    expect(prisma.importSourceRegistryEntry.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a blocked source activation before issuing any write', async () => {
    const prisma = client(registryRow({ status: SourceStatus.BLOCKED,
      accessClassification: SourceAccessClassification.BLOCKED }));
    const gateway = new PrismaSourceRegistryGateway(prisma as any);
    await expect(gateway.updateSourceStatus('source-1', SourceStatus.ACTIVE))
      .rejects.toThrow('A BLOCKED source cannot have an ACTIVE status');
    expect(prisma.importSourceRegistryEntry.updateMany).not.toHaveBeenCalled();
  });

  it('rejects unknown status values before any database read', async () => {
    const prisma = client(registryRow());
    const gateway = new PrismaSourceRegistryGateway(prisma as any);
    await expect(gateway.updateSourceStatus('source-1', 'UNKNOWN' as SourceStatus))
      .rejects.toThrow('IMPORT_SOURCE_STATUS_INVALID');
    expect(prisma.importSourceRegistryEntry.findUnique).not.toHaveBeenCalled();
  });

  it('returns not-found distinctly from a concurrent status conflict', async () => {
    const prisma = client(null);
    const gateway = new PrismaSourceRegistryGateway(prisma as any);
    expect(await gateway.updateSourceStatus('missing', SourceStatus.DISABLED)).toBe(false);
    expect(prisma.importSourceRegistryEntry.updateMany).not.toHaveBeenCalled();
  });
});
