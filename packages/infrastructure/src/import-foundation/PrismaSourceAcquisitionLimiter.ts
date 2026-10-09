import type { PrismaClient } from '@prisma/client';
import type { ImportSourceDefinition } from '@manaratak/domain';
import type { ISourceAcquisitionLimiter } from '@manaratak/application';
/** All API processes reserve origin and deployment slots in one PostgreSQL transaction. */
export class PrismaSourceAcquisitionLimiter implements ISourceAcquisitionLimiter {
  constructor(private readonly prisma: PrismaClient, private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
    private readonly fleetPerMinute = 120) {
    if (!Number.isSafeInteger(fleetPerMinute) || fleetPerMinute < 1 || fleetPerMinute > 60_000) throw new Error('SOURCE_FLEET_BUDGET_INVALID');
  }
  async wait(source: ImportSourceDefinition) {
    const rate = source.rateLimitPerMinute ?? 60;
    if (!Number.isSafeInteger(rate) || rate < 1 || rate > 60_000) throw new Error('SOURCE_RATE_LIMIT_INVALID');
    const budgets = [{ key: 'FLEET', interval: Math.ceil(60_000 / this.fleetPerMinute) },
      { key: `ORIGIN:${new URL(source.baseUrl).origin}`, interval: Math.max(1000, Math.ceil(60_000 / rate)) },
      { key: `SOURCE:${source.sourceId}`, interval: Math.ceil(60_000 / rate) }].sort((a,b) => a.key.localeCompare(b.key));
    const delay = await this.prisma.$transaction(async tx => {
      for (const budget of budgets) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`source-budget:${budget.key}`}, 0))`;
      const now = Date.now(); let scheduled = now;
      for (const budget of budgets) {
        const row = await tx.importRateBudget.findUnique({ where: { budgetKey: budget.key } });
        scheduled = Math.max(scheduled, row?.nextAvailableAt.getTime() ?? now);
      }
      if (scheduled - now > 30_000) throw new Error('SOURCE_DISTRIBUTED_BUDGET_BUSY');
      for (const budget of budgets) {
        const nextAvailableAt = new Date(scheduled + budget.interval);
        await tx.importRateBudget.upsert({ where: { budgetKey: budget.key },
          create: { budgetKey: budget.key, nextAvailableAt }, update: { nextAvailableAt } });
      }
      return scheduled - now;
    });
    if (delay > 0) await this.sleep(delay);
  }
}
