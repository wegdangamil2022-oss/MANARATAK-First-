import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { AuditRecord } from '@absheer/domain';
import type { ISpecification } from '@absheer/core';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';

describe('legacy audit read safety boundary', () => {
  it('rejects an oversized compatibility result before mapping or client-side filtering', async () => {
    const findMany = vi.fn().mockResolvedValue(Array.from({ length: 101 }, (_, index) => ({ id: String(index) })));
    const repository = new PrismaAuditRecordRepository({ auditRecord: { findMany } } as unknown as PrismaClient);
    const predicate = vi.fn(() => true);
    const specification = { isSatisfiedBy: predicate } as ISpecification<AuditRecord>;
    await expect(repository.findBy(specification)).rejects.toThrow('AUDIT_LEGACY_QUERY_LIMIT_EXCEEDED');
    expect(predicate).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 101 }));
  });
});
