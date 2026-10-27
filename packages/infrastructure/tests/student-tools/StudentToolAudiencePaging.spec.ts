import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaStudentToolRegistryRepository } from '../../src/student-tools/PrismaStudentToolRegistryRepository';
import { INTERNAL_STUDENT_TOOL_KEYS } from '@manaratak/domain';

describe('Canonical student tool audience paging', () => {
  it.each(['STUDENT', 'ADMIN_INTERNAL'] as const)(
    'applies %s audience before paging and total calculation',
    async (audience) => {
      const findMany = vi.fn().mockResolvedValue([]),
        count = vi.fn().mockResolvedValue(0);
      const db = {
        studentToolDefinitionRecord: { findMany, count },
        $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
      };
      await new PrismaStudentToolRegistryRepository(db as unknown as PrismaClient).listPage({
        audience,
        search: 'research',
        page: 2,
        pageSize: 25,
      });
      const query = findMany.mock.calls[0][0];
      const condition = audience === 'STUDENT' ? query.where.AND[0].NOT : query.where.AND[0];
      expect(condition.OR).toContainEqual({
        toolKey: { in: Array.from(INTERNAL_STUDENT_TOOL_KEYS) },
      });
      expect(condition.OR).toContainEqual({ availability: { path: ['adminOnly'], equals: true } });
      expect(query.where.OR).toHaveLength(3);
      expect(query.skip).toBe(25);
      expect(count).toHaveBeenCalledWith({ where: query.where });
    },
  );
});
