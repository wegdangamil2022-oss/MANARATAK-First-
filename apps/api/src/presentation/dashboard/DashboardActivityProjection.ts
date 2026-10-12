// Read-only Audit owner projection. Never returns actor IDs, target IDs or raw metadata.
export const dashboardAuditOwners = [
  { type: 'ROLE', owner: 'authorization', permission: 'admin:authorization:manage' },
  { type: 'ROLE_ASSIGNMENT', owner: 'authorization', permission: 'admin:authorization:manage' },
  { type: 'POLICY', owner: 'authorization', permission: 'admin:authorization:manage' },
  { type: 'IDENTITY', owner: 'identities', permission: 'admin:identities:manage' },
  { type: 'SCHOLARSHIP', owner: 'scholarships', permission: 'admin:scholarships:manage' },
  { type: 'UNIVERSITY', owner: 'universities', permission: 'admin:universities:manage' },
  { type: 'MAJOR', owner: 'majors', permission: 'admin:majors:manage' },
  { type: 'COURSE', owner: 'courses', permission: 'admin:courses:manage' },
  { type: 'INTERNATIONAL_TEST', owner: 'tests', permission: 'admin:international-tests:manage' },
  { type: 'CmsContent', owner: 'cms', permission: 'admin:cms:view' },
  { type: 'FINANCE', owner: 'finance', permission: 'admin:finance:manage' },
] as const;
export type ActivityAuditRecord = {
  getId(): { getValue(): string };
  getAction(): { getValue(): string };
  getTimestamp(): { getValue(): Date };
  getActor(): { getActorType(): string };
  getTarget(): { getTargetId(): string; getTargetType(): string };
  getContextMetadata(): { getData(): Record<string, unknown> };
};
export type ActivityAuditPort = {
  queryAuditPage(query: {
    targetType: string;
    limit: number;
  }): Promise<{ items: ActivityAuditRecord[]; hasMore: boolean }>;
};
export type ActivityAuthorize = (
  permission: string,
  targetId?: string,
  targetType?: string,
) => Promise<boolean>;
export async function dashboardActivityProjection(
  port: ActivityAuditPort,
  authorize: ActivityAuthorize,
) {
  const capturedAt = new Date().toISOString();
  const empty = {
    protocolVersion: 1,
    scope: 'PERMISSIONED_OWNER_AUDIT_EVENTS',
    checkedAt: capturedAt,
    items: [],
    partial: true,
  };
  if (!(await authorize('admin:platform:manage')) || !(await authorize('admin:audit:manage')))
    return { ...empty, availability: 'FORBIDDEN' };
  const decisions = await Promise.all(
    dashboardAuditOwners.map(async (owner) => ({
      owner,
      allowed: await authorize(owner.permission),
    })),
  );
  const owners = decisions.filter((decision) => decision.allowed).map((decision) => decision.owner);
  if (!owners.length) return { ...empty, availability: 'FORBIDDEN' };
  const rows: Array<{
    id: string;
    action: string;
    targetClass: string;
    owner: string;
    actorAlias: 'IDENTITY' | 'SYSTEM' | 'UNKNOWN';
    timestamp: string;
    result: 'SUCCESS' | 'FAILURE' | 'INTENT' | 'UNKNOWN';
  }> = [];
  let index = 0,
    failures = 0,
    partial = false;
  await Promise.all(
    Array.from({ length: Math.min(3, owners.length) }, async () => {
      while (index < owners.length) {
        const owner = owners[index++];
        try {
          const page = await port.queryAuditPage({ targetType: owner.type, limit: 10 });
          if (
            !Array.isArray(page.items) ||
            page.items.length > 10 ||
            typeof page.hasMore !== 'boolean'
          )
            throw new Error('AUDIT_PAGE_INVALID');
          partial ||= page.hasMore;
          for (const record of page.items) {
            const target = record.getTarget();
            if (target.getTargetType() !== owner.type) throw new Error('AUDIT_TARGET_INVALID');
            if (!(await authorize(owner.permission, target.getTargetId(), owner.type))) {
              partial = true;
              continue;
            }
            const action = record.getAction().getValue(),
              timestamp = record.getTimestamp().getValue();
            if (
              !/^[A-Z][A-Z0-9_:. -]{0,199}$/.test(action) ||
              !Number.isFinite(timestamp.getTime())
            ) {
              partial = true;
              continue;
            }
            const metadata = record.getContextMetadata().getData();
            const result =
              action === 'MUTATION_INTENT_RECORDED' || metadata.auditEvent === 'MUTATION_INTENT'
                ? 'INTENT'
                : metadata.result === 'SUCCESS' || metadata.result === 'FAILURE'
                  ? metadata.result
                  : 'UNKNOWN';
            const actorType = record.getActor().getActorType();
            rows.push({
              id: record.getId().getValue(),
              action,
              targetClass: owner.type,
              owner: owner.owner,
              actorAlias:
                actorType === 'SYSTEM'
                  ? 'SYSTEM'
                  : ['IDENTITY', 'USER', 'HUMAN'].includes(actorType)
                    ? 'IDENTITY'
                    : 'UNKNOWN',
              timestamp: timestamp.toISOString(),
              result,
            });
          }
        } catch {
          ++failures;
          partial = true;
        }
      }
    }),
  );
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()].sort(
    (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id),
  );
  return {
    ...empty,
    availability:
      failures === owners.length
        ? 'UNAVAILABLE'
        : partial || unique.length > 10
          ? 'PARTIAL'
          : 'AVAILABLE',
    partial: partial || unique.length > 10,
    items: unique.slice(0, 10),
  };
}
