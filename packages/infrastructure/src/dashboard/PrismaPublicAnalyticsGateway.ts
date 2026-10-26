import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { PublicAnalyticsGateway } from '@manaratak/application';
import {
  ANALYTICS_POLICY_VERSION,
  ANALYTICS_RETENTION_DAYS,
  type PublicAnalyticsEvent,
} from '@manaratak/shared';
import { safeApplicationHost, type PublishedApplicationResolver } from './ApplicationDestination';
export class PrismaPublicAnalyticsGateway implements PublicAnalyticsGateway {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly resolve: PublishedApplicationResolver,
  ) {}
  async grant(tokenHash: string, expiresAt: Date, policyVersion: string) {
    await this.prisma.publicAnalyticsConsent.create({
      data: { tokenHash, expiresAt, policyVersion },
    });
  }
  async record(tokenHash: string, event: PublicAnalyticsEvent): Promise<'recorded' | 'duplicate'> {
    let opportunityId: string | null = null,
      host: string | null = null;
    if (event.kind === 'application_outbound_click') {
      const opportunity = event.opportunityId ? await this.resolve(event.opportunityId) : null;
      if (!opportunity?.applicationUrl)
        throw new Error('APPLICATION_PUBLISHED_DESTINATION_REQUIRED');
      opportunityId = opportunity.id;
      host = safeApplicationHost(opportunity.applicationUrl);
    }
    return this.prisma.$transaction(
      async (tx) => {
        // Withdrawal and recording lock the same consent row; a late event cannot survive withdrawal.
        const rows = await tx.$queryRaw<Array<{ tokenHash: string }>>`
        SELECT "tokenHash" FROM "PublicAnalyticsConsent" WHERE "tokenHash"=${tokenHash}
        AND "policyVersion"=${ANALYTICS_POLICY_VERSION} AND "revokedAt" IS NULL AND "expiresAt">now() FOR UPDATE`;
        if (!rows.length) throw new Error('ANALYTICS_CONSENT_REQUIRED');
        const id = createHash('sha256')
          .update(tokenHash + ':' + event.eventId)
          .digest('hex');
        const previous = await tx.publicAnalyticsEvent.findUnique({ where: { id } });
        if (previous) {
          if (
            previous.kind !== event.kind ||
            previous.pageKey !== event.pageKey ||
            previous.opportunityId !== opportunityId
          )
            throw new Error('ANALYTICS_IDEMPOTENCY_CONFLICT');
          return 'duplicate';
        }
        // Reject fast duplicate navigations/clicks even if a client sends a fresh event UUID.
        const recent = await tx.publicAnalyticsEvent.findFirst({
          where: {
            consentHash: tokenHash,
            kind: event.kind,
            pageKey: event.pageKey,
            opportunityId,
            receivedAt: { gte: new Date(Date.now() - 1500) },
          },
          select: { id: true },
        });
        if (recent) return 'duplicate';
        const now = new Date();
        await tx.$executeRaw`INSERT INTO "DashboardMeasurementEpoch"(key,"startedAt") VALUES(${ANALYTICS_POLICY_VERSION},${now}) ON CONFLICT(key) DO NOTHING`;
        await tx.publicAnalyticsEvent.create({
          data: {
            id,
            consentHash: tokenHash,
            eventId: event.eventId,
            kind: event.kind,
            pageKey: event.pageKey,
            opportunityId,
            destinationHost: host,
            receivedAt: now,
            expiresAt: new Date(+now + ANALYTICS_RETENTION_DAYS * 86400000),
          },
        });
        return 'recorded';
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }
  async withdraw(tokenHash: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "tokenHash" FROM "PublicAnalyticsConsent" WHERE "tokenHash"=${tokenHash} FOR UPDATE`;
      await tx.publicAnalyticsConsent.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      });
      await tx.publicAnalyticsEvent.deleteMany({ where: { consentHash: tokenHash } });
    });
  }
  async purgeExpired() {
    // Small locked batches support concurrent workers without unbounded deletes.
    const removed = await this.prisma.$executeRaw`
      DELETE FROM "PublicAnalyticsEvent" WHERE id IN (SELECT id FROM "PublicAnalyticsEvent" WHERE "expiresAt"<=now() ORDER BY "expiresAt" LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
    await this.prisma.$executeRaw`
      DELETE FROM "PublicAnalyticsConsent" WHERE "tokenHash" IN (SELECT c."tokenHash" FROM "PublicAnalyticsConsent" c
      WHERE (c."revokedAt" IS NOT NULL OR c."expiresAt"<now()-interval '90 days')
      AND NOT EXISTS (SELECT 1 FROM "PublicAnalyticsEvent" e WHERE e."consentHash"=c."tokenHash") LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
    return removed;
  }
}
