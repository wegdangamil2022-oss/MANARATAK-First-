import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { ReviewAccess, ReviewWorkspaceGateway } from '@manaratak/application';
import { ScholarshipImportCenterUseCases } from '@manaratak/application';
import { PrismaImportRepository } from '../import-foundation/PrismaImportRepository';
import { PrismaScholarshipRepository } from '../scholarships/PrismaScholarshipRepository';
import {
  reviewDomains,
  type ReviewOwner,
  type ReviewPage,
  type ReviewQuery,
  type ReviewRecord,
  type ReviewCommand,
  type ReviewHistory,
  type ReviewAnalytics,
  type ReviewSavedView,
  type ReviewSlaPolicy,
  type ReviewSourceStatus,
} from '@manaratak/shared';

type Tx = Prisma.TransactionClient;
type OwnerRow = {
  key: string;
  domain: ReviewOwner;
  ownerId: string;
  ownerRevision: string;
  profileId: string | null;
  reasons: string[];
};
const count = (value: unknown) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('REVIEW_COUNT_INVALID');
  return result;
};
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json = (value: unknown) => JSON.stringify(value);
const scope = (access: ReviewAccess) =>
  Prisma.sql`domain IN (${Prisma.join(access.domains.length ? access.domains : ['!'])})`;
export function normalizeReviewSearch(value: string) {
  return value
    .normalize('NFC')
    .replace(/[ـًٌٍَُِّْٰ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}
export function reviewPriority(reasons: string[]): 'high' | 'medium' {
  return reasons.some((reason) =>
    ['incomplete', 'source_verification', 'broken_link'].includes(reason),
  )
    ? 'high'
    : 'medium';
}

// Domain content is read through the owner projection on every request. The
// persistent records below contain work coordination and observation history only.
export class PrismaReviewWorkspaceGateway implements ReviewWorkspaceGateway {
  constructor(private readonly db: PrismaClient) {}
  private async transaction<T>(read: (tx: Tx) => Promise<T>) {
    return this.db
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL statement_timeout='12000'`;
          return read(tx);
        },
        { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 18000 },
      )
      .catch((error: unknown) => {
        const value = error as { code?: string; meta?: { code?: string } };
        if (value.code === 'P2034' || value.meta?.code === '40001')
          throw new Error('REVIEW_VERSION_CONFLICT');
        throw error;
      });
  }
  private async sourceStatus(tx: Tx, access: ReviewAccess): Promise<ReviewSourceStatus[]> {
    const checkpoints = await tx.$queryRaw<
      Array<{
        domain: ReviewOwner;
        synchronizedAt: Date | null;
        observed: number | null;
        errorCode: string | null;
      }>
    >`SELECT * FROM "ReviewSourceCheckpoint" WHERE ${scope(access)}`;
    return reviewDomains.map((domain) => {
      if (!access.domains.includes(domain))
        return {
          domain,
          state: 'forbidden',
          synchronizedAt: null,
          observed: null,
          errorCode: null,
        };
      const row = checkpoints.find((value) => value.domain === domain);
      return {
        domain,
        state:
          !row?.synchronizedAt || row.errorCode
            ? 'unavailable'
            : Date.now() - +row.synchronizedAt > 300000
              ? 'stale'
              : 'ready',
        synchronizedAt: row?.synchronizedAt?.toISOString() ?? null,
        observed: row?.observed ?? null,
        errorCode: row?.errorCode ?? (row?.synchronizedAt ? null : 'REVIEW_SYNC_REQUIRED'),
      };
    });
  }
  async synchronize(access: ReviewAccess, domain?: ReviewOwner) {
    if (!access.coordinate || (domain && !access.domains.includes(domain)))
      throw new Error('REVIEW_FORBIDDEN');
    // One owner failure rolls back only that owner, and cannot close its cases.
    for (const owner of domain ? [domain] : access.domains) {
      try {
        await this.transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('review-workspace'),hashtext(${owner}))`;
          if (owner === 'scholarships' && access.imports) await this.synchronizeImports(tx);
          const changed = await tx.$queryRaw<
            Array<{
              key: string;
              cycle: number;
              action: string;
              elapsedHours: number | null;
              withinSla: boolean | null;
            }>
          >`
          WITH live AS (SELECT * FROM "ReviewOwnerProjection" WHERE domain=${owner}), before AS (SELECT c.* FROM "ReviewWorkCase" c WHERE c.domain=${owner}),
          upserted AS (
            INSERT INTO "ReviewWorkCase" ("key",domain,"ownerId","profileId","ownerRevision",reasons,"dueAt","policyId")
            SELECT p."key",p.domain,p."ownerId",p."profileId",p."ownerRevision",to_jsonb(p.reasons),
              CASE WHEN s.domain IS NOT NULL THEN CURRENT_TIMESTAMP + make_interval(hours=>s.hours) END,
              CASE WHEN s.domain IS NOT NULL THEN s.domain||':'||s.version END
            FROM live p LEFT JOIN "ReviewSlaPolicy" s ON s.domain=p.domain
            ON CONFLICT ("key") DO UPDATE SET
              "ownerRevision"=EXCLUDED."ownerRevision",reasons=EXCLUDED.reasons,
              "cycle"=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN "ReviewWorkCase".cycle+1 ELSE "ReviewWorkCase".cycle END,
              "state"=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN 'OPEN' ELSE "ReviewWorkCase".state END,
              "enteredAt"=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN CURRENT_TIMESTAMP ELSE "ReviewWorkCase"."enteredAt" END,
              "dueAt"=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN EXCLUDED."dueAt" ELSE "ReviewWorkCase"."dueAt" END,
              "policyId"=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN EXCLUDED."policyId" ELSE "ReviewWorkCase"."policyId" END,
              "closedAt"=NULL,"version"="ReviewWorkCase".version+1,"updatedAt"=CURRENT_TIMESTAMP,"synchronizedAt"=CURRENT_TIMESTAMP
            WHERE "ReviewWorkCase"."ownerRevision"<>EXCLUDED."ownerRevision" OR "ReviewWorkCase".reasons<>EXCLUDED.reasons OR "ReviewWorkCase".state='COMPLETED'
            RETURNING "key",cycle
          ), closed AS (
            UPDATE "ReviewWorkCase" c SET state='COMPLETED',"closedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP,version=c.version+1,"synchronizedAt"=CURRENT_TIMESTAMP
            WHERE c.domain=${owner} AND c.state<>'COMPLETED' AND NOT EXISTS(SELECT 1 FROM live p WHERE p."key"=c."key") RETURNING c."key",c.cycle
          )
          SELECT u."key",u.cycle,CASE WHEN b."key" IS NULL THEN 'OBSERVED_ENTERED' WHEN b.state='COMPLETED' THEN 'OBSERVED_REOPENED' ELSE 'OWNER_CHANGED' END action,NULL::float "elapsedHours",NULL::boolean "withinSla" FROM upserted u LEFT JOIN before b ON b."key"=u."key"
          UNION ALL SELECT c."key",c.cycle,'OBSERVED_COMPLETED',extract(epoch FROM CURRENT_TIMESTAMP-b."enteredAt")::float/3600,CASE WHEN b."dueAt" IS NOT NULL AND b."policyId" IS NOT NULL THEN CURRENT_TIMESTAMP<=b."dueAt" END FROM closed c JOIN before b ON b."key"=c."key"`;
          if (changed.length)
            await tx.$executeRaw`INSERT INTO "ReviewWorkEvent" (id,"caseKey",cycle,action,payload) SELECT x.id,x."key",x.cycle,x.action,jsonb_build_object('elapsedHours',x."elapsedHours",'withinSla',x."withinSla") FROM jsonb_to_recordset(${json(changed.map((event) => ({ ...event, id: randomUUID() })))}::jsonb) AS x(id text,"key" text,cycle int,action text,"elapsedHours" float,"withinSla" boolean)`;
          await tx.$executeRaw`INSERT INTO "ReviewSourceCheckpoint" (domain,"synchronizedAt",observed,"errorCode","lastAttemptAt") SELECT ${owner},CURRENT_TIMESTAMP,count(*)::int,NULL,CURRENT_TIMESTAMP FROM "ReviewOwnerProjection" WHERE domain=${owner} ON CONFLICT(domain) DO UPDATE SET "synchronizedAt"=CURRENT_TIMESTAMP,observed=EXCLUDED.observed,"errorCode"=NULL,"lastAttemptAt"=CURRENT_TIMESTAMP`;
        });
      } catch {
        await this.db
          .$executeRaw`INSERT INTO "ReviewSourceCheckpoint" (domain,"errorCode") VALUES (${owner},'REVIEW_SOURCE_UNAVAILABLE') ON CONFLICT(domain) DO UPDATE SET "errorCode"='REVIEW_SOURCE_UNAVAILABLE',"lastAttemptAt"=CURRENT_TIMESTAMP`;
      }
    }
    return this.transaction((tx) => this.sourceStatus(tx, access));
  }
  private base(access: ReviewAccess) {
    return Prisma.sql`WITH owners AS (SELECT p.*,c."key" "caseId",coalesce(c.version,0) version,coalesce(c.cycle,0) cycle,c."assigneeId",c."teamId",
      CASE WHEN c."assigneeId" IS NOT NULL THEN coalesce(u."displayName",'Reviewer') WHEN c."teamId" IS NOT NULL THEN t.name END "assigneeLabel",
      coalesce(c.state,'OPEN') "workState",c."enteredAt",c."dueAt",c."policyId",s."synchronizedAt",
      coalesce(c.priority,CASE WHEN p.reasons && ARRAY['incomplete','source_verification','broken_link']::text[] THEN 'high' ELSE 'medium' END) priority,
      CASE WHEN c.priority IS NOT NULL THEN 'reviewer' ELSE 'suggested' END "priorityBasis",
      CASE WHEN c."dueAt" IS NULL OR c."policyId" IS NULL THEN 'unknown' WHEN c."dueAt"<CURRENT_TIMESTAMP THEN 'overdue'
        WHEN c."dueAt" <= CURRENT_TIMESTAMP + make_interval(hours=>coalesce(policy."warningHours",0)) AND policy."warningHours">0 AND c."policyId"=policy.domain||':'||policy.version THEN 'near_due' ELSE 'on_track' END sla
      FROM "ReviewOwnerProjection" p LEFT JOIN "ReviewWorkCase" c ON c."key"=p."key" AND c.state<>'COMPLETED'
      LEFT JOIN "UserRecord" u ON u."identityId"=c."assigneeId" LEFT JOIN "RoleRecord" t ON t.id=c."teamId"
      LEFT JOIN "ReviewSourceCheckpoint" s ON s.domain=p.domain LEFT JOIN "ReviewSlaPolicy" policy ON policy.domain=p.domain
      WHERE p.${scope(access)} AND (p."profileId" IS DISTINCT FROM 'import' OR ${access.imports === true}))`;
  }
  private filters(query: ReviewQuery) {
    const clauses = [Prisma.sql`true`];
    if (query.search) {
      const needle = normalizeReviewSearch(query.search).replace(/[\\%_]/g, '\\$&');
      clauses.push(Prisma.sql`search LIKE ${'%' + needle + '%'} ESCAPE '\'`);
    }
    for (const [column, value] of [
      ['domain', query.domain],
      ['priority', query.priority],
      ['sourceKind', query.source],
      ['locale', query.locale],
    ] as const)
      if (value && value !== 'all')
        clauses.push(Prisma.sql`${Prisma.raw('"' + column + '"')}=${value}`);
    if (query.reason && query.reason !== 'all')
      clauses.push(Prisma.sql`${query.reason}=ANY(reasons)`);
    if (query.state && query.state !== 'all') clauses.push(Prisma.sql`"workState"=${query.state}`);
    if (query.age && query.age !== 'all')
      clauses.push(
        query.age === 'unknown'
          ? Prisma.sql`"enteredAt" IS NULL`
          : query.age === 'today'
            ? Prisma.sql`"enteredAt">=CURRENT_TIMESTAMP-interval '1 day'`
            : query.age === 'week'
              ? Prisma.sql`"enteredAt">=CURRENT_TIMESTAMP-interval '7 days'`
              : Prisma.sql`"enteredAt"<CURRENT_TIMESTAMP-interval '7 days'`,
      );
    return Prisma.join(clauses, ' AND ');
  }
  async list(access: ReviewAccess, query: ReviewQuery): Promise<ReviewPage> {
    return this.transaction(async (tx) => {
      const sources = await this.sourceStatus(tx, access);
      const complete =
        access.domains.length > 0 &&
        sources.filter((s) => s.state !== 'forbidden').every((s) => s.state === 'ready');
      const base = this.base(access),
        filters = this.filters(query);
      const summaries = await tx.$queryRaw<
        Array<{
          total: bigint;
          mine: bigint;
          unassigned: bigint;
          urgent: bigint;
          overdue: bigint;
          withoutSla: bigint;
          fingerprint: string;
        }>
      >`${base} SELECT count(*) total,count(*) FILTER(WHERE "assigneeId"=${access.actorId} OR "teamId" IN (SELECT "roleId" FROM "RoleAssignmentRecord" WHERE "identityId"=${access.actorId})) mine,count(*) FILTER(WHERE "assigneeId" IS NULL AND "teamId" IS NULL) unassigned,count(*) FILTER(WHERE priority IN ('critical','high')) urgent,count(*) FILTER(WHERE sla='overdue') overdue,count(*) FILTER(WHERE sla='unknown') "withoutSla",md5(coalesce(string_agg("key"||"ownerRevision"||version::text,',' ORDER BY "key"),'')) fingerprint FROM owners WHERE ${filters}`;
      const summary = summaries[0];
      // A changed dataset invalidates traversal explicitly: no silent duplicates,
      // missing updated rows or cross-permission cursor reuse.
      const fingerprint = hash([
        summary.fingerprint,
        access.actorId,
        [...access.domains].sort(),
        access.imports === true,
        { ...query, cursor: undefined, snapshot: undefined },
      ]);
      if (query.snapshot && query.snapshot !== fingerprint)
        throw new Error('REVIEW_SNAPSHOT_CHANGED');
      let cursor: { value: string; key: string; fingerprint: string } | null = null;
      if (query.cursor) {
        try {
          cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
        } catch {
          throw new Error('REVIEW_CURSOR_INVALID');
        }
        if (
          !cursor ||
          cursor.fingerprint !== fingerprint ||
          typeof cursor.value !== 'string' ||
          typeof cursor.key !== 'string'
        )
          throw new Error('REVIEW_SNAPSHOT_CHANGED');
      }
      const clauses = [Prisma.sql`true`];
      if (query.assignee === 'mine' || query.view === 'mine')
        clauses.push(
          Prisma.sql`("assigneeId"=${access.actorId} OR "teamId" IN (SELECT "roleId" FROM "RoleAssignmentRecord" WHERE "identityId"=${access.actorId}))`,
        );
      else if (query.assignee === 'unassigned' || query.view === 'unassigned')
        clauses.push(Prisma.sql`"assigneeId" IS NULL AND "teamId" IS NULL`);
      else if (query.assignee && query.assignee !== 'all')
        clauses.push(Prisma.sql`("assigneeId"=${query.assignee} OR "teamId"=${query.assignee})`);
      if (query.view === 'urgent') clauses.push(Prisma.sql`priority IN ('critical','high')`);
      if (query.view === 'overdue' || query.view === 'near_due')
        clauses.push(Prisma.sql`sla=${query.view}`);
      if (query.view === 'ready') clauses.push(Prisma.sql`'ready_to_publish'=ANY(reasons)`);
      if (query.view === 'translation') clauses.push(Prisma.sql`'needs_translation'=ANY(reasons)`);
      if (query.view === 'source') clauses.push(Prisma.sql`'source_verification'=ANY(reasons)`);
      const order =
        query.sort === 'deadline'
          ? Prisma.sql`coalesce(to_char("dueAt",'YYYY-MM-DD HH24:MI:SS.MS'),'9999')`
          : query.sort === 'oldest'
            ? Prisma.sql`coalesce(to_char("enteredAt",'YYYY-MM-DD HH24:MI:SS.MS'),'9999')`
            : query.sort === 'newest'
              ? Prisma.sql`lpad((9999999999999-extract(epoch FROM "modifiedAt")*1000)::bigint::text,13,'0')`
              : query.sort === 'domain'
                ? Prisma.sql`domain`
                : query.sort === 'assignee'
                  ? Prisma.sql`coalesce("assigneeLabel",'~')`
                  : Prisma.sql`CASE priority WHEN 'critical' THEN '0' WHEN 'high' THEN '1' WHEN 'medium' THEN '2' ELSE '3' END`;
      const take = [10, 25, 50].includes(query.pageSize ?? 25) ? (query.pageSize ?? 25) : 25;
      const selected = Prisma.sql`selected AS (SELECT *,${order} "sortValue" FROM owners WHERE ${filters} AND ${Prisma.join(clauses, ' AND ')})`;
      const totals = await tx.$queryRaw<
        Array<{ n: bigint }>
      >`${base},${selected} SELECT count(*) n FROM selected`;
      const rows = await tx.$queryRaw<
        Array<ReviewRecord & { sortValue: string }>
      >`${base},${selected} SELECT * FROM selected WHERE ${cursor ? Prisma.sql`("sortValue" COLLATE "C","key" COLLATE "C")>(${cursor.value} COLLATE "C",${cursor.key} COLLATE "C")` : Prisma.sql`true`} ORDER BY "sortValue" COLLATE "C","key" COLLATE "C" LIMIT ${take + 1}`;
      const records = rows.slice(0, take).map((raw) => {
        const row = JSON.parse(JSON.stringify(raw)) as ReviewRecord & {
          search?: string;
          sortValue?: string;
        };
        delete row.search;
        delete row.sortValue;
        if (!row.detail && row.profileId !== 'import')
          row.href =
            '/' +
            (row.domain === 'cms' ? 'cms' : row.domain) +
            '?' +
            new URLSearchParams({ reviewSearch: row.title.slice(0, 120) });
        try {
          const url = new URL(row.sourceUrl ?? '');
          if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
            row.sourceUrl = null;
        } catch {
          row.sourceUrl = null;
        }
        return row;
      });
      const last = rows[take - 1];
      return {
        records,
        total: complete ? count(totals[0].n) : null,
        counters: {
          open: complete ? count(summary.total) : null,
          mine: complete ? count(summary.mine) : null,
          unassigned: complete ? count(summary.unassigned) : null,
          urgent: complete ? count(summary.urgent) : null,
          overdue:
            complete && count(summary.withoutSla) < count(summary.total)
              ? count(summary.overdue)
              : null,
          withoutSla: complete ? count(summary.withoutSla) : null,
        },
        sources,
        snapshot: fingerprint,
        nextCursor:
          rows.length > take && last
            ? Buffer.from(json({ value: last.sortValue, key: last.key, fingerprint })).toString(
                'base64url',
              )
            : null,
        coverage: complete ? 'complete' : 'partial',
        canCoordinate: access.coordinate,
        readAt: new Date().toISOString(),
      };
    });
  }
  private async event(
    tx: Tx,
    key: string,
    cycle: number,
    action: string,
    actorId: string | null,
    note: string | null,
    payload: unknown,
    commandKey?: string,
    commandHash?: string,
  ) {
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "ReviewWorkEvent" (id,"caseKey",cycle,action,"actorId",note,payload,"commandKey","commandHash") VALUES (${id},${key},${cycle},${action},${actorId},${note},${json(payload)}::jsonb,${commandKey ?? null},${commandHash ?? null})`;
    if (actorId)
      await tx.$executeRaw`INSERT INTO "AuditRecord" (id,reference,action,category,severity,"actorId","actorType","targetId","targetType",source,timestamp,"contextMetadata","updatedAt") VALUES (${randomUUID()},${'review:' + id},${'REVIEW_' + action},'ADMIN','INFO',${actorId},'HUMAN',${key},'REVIEW_WORK_CASE','review-workspace',CURRENT_TIMESTAMP,${json({ eventId: id, cycle })}::jsonb,CURRENT_TIMESTAMP)`;
    return id;
  }
  private async synchronizeImports(tx: Tx) {
    // Reuse the import owner's REAL/TEST classification, completeness, source
    // verification and decision codecs; never reimplement them as JSON heuristics.
    const reader = new ScholarshipImportCenterUseCases(
      new PrismaImportRepository(tx as PrismaClient),
      new PrismaScholarshipRepository(tx as PrismaClient),
    );
    let after = '';
    for (;;) {
      const candidates = await tx.$queryRaw<
        Array<{ id: string; revision: string }>
      >`SELECT r.id,md5(to_jsonb(r)::text) revision FROM "ImportRecord" r JOIN "ImportBatch" b ON b.id=r."batchId" WHERE b."dataType"='SCHOLARSHIPS' AND r.id>${after} ORDER BY r.id LIMIT 100`;
      if (!candidates.length) break;
      for (const candidate of candidates) {
        const record = await reader.getRecord(candidate.id),
          key = 'scholarships:' + candidate.id + ':import';
        const eligible =
          record.operationalClass === 'REAL' &&
          !record.transferred &&
          record.reviewReasons.length > 0;
        const [prior] = await tx.$queryRaw<
          Array<{
            state: string;
            cycle: number;
            ownerRevision: string;
            enteredAt: Date;
            dueAt: Date | null;
          }>
        >`SELECT state,cycle,"ownerRevision","enteredAt","dueAt" FROM "ReviewWorkCase" WHERE "key"=${key}`;
        if (!eligible) {
          if (prior && prior.state !== 'COMPLETED') {
            await tx.$executeRaw`UPDATE "ReviewWorkCase" SET state='COMPLETED',"closedAt"=CURRENT_TIMESTAMP,version=version+1,"updatedAt"=CURRENT_TIMESTAMP WHERE "key"=${key}`;
            await this.event(tx, key, prior.cycle, 'OBSERVED_COMPLETED', null, null, {
              elapsedHours: (Date.now() - +prior.enteredAt) / 3600000,
              withinSla: prior.dueAt ? Date.now() <= +prior.dueAt : null,
            });
          }
          continue;
        }
        if (prior?.ownerRevision === candidate.revision && prior.state !== 'COMPLETED') continue;
        const cycle = prior ? prior.cycle + (prior.state === 'COMPLETED' ? 1 : 0) : 1;
        await tx.$executeRaw`INSERT INTO "ReviewWorkCase" ("key",domain,"ownerId","profileId","ownerRevision",reasons) VALUES (${key},'scholarships',${candidate.id},'import',${candidate.revision},${json(['import_review', ...record.reviewReasons])}::jsonb) ON CONFLICT("key") DO UPDATE SET "ownerRevision"=EXCLUDED."ownerRevision",reasons=EXCLUDED.reasons,state=CASE WHEN "ReviewWorkCase".state='COMPLETED' THEN 'OPEN' ELSE "ReviewWorkCase".state END,cycle=${cycle},version="ReviewWorkCase".version+1,"closedAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP,"synchronizedAt"=CURRENT_TIMESTAMP`;
        await this.event(
          tx,
          key,
          cycle,
          !prior
            ? 'OBSERVED_ENTERED'
            : prior.state === 'COMPLETED'
              ? 'OBSERVED_REOPENED'
              : 'OWNER_CHANGED',
          null,
          null,
          {},
        );
      }
      after = candidates.at(-1)!.id;
    }
  }
  async command(
    access: ReviewAccess,
    input: ReviewCommand,
    authorize: (id: string, domain: ReviewOwner, ownerId: string) => Promise<boolean>,
  ) {
    const domain = input.key.split(':')[0] as ReviewOwner;
    if (!access.coordinate || !access.domains.includes(domain)) throw new Error('REVIEW_FORBIDDEN');
    if (input.key.endsWith(':import')) throw new Error('REVIEW_IMPORT_OWNER_REQUIRED');
    // Authorize before replay. Resource-specific grants are checked for both actors.
    const ownerId = input.key.split(':')[1];
    if (!(await authorize(access.actorId, domain, ownerId))) throw new Error('REVIEW_FORBIDDEN');
    if (input.assigneeId && !(await authorize(input.assigneeId, domain, ownerId)))
      throw new Error('REVIEW_ASSIGNEE_FORBIDDEN');
    return this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('review-workspace'),hashtext(${domain}))`;
      const prior = await tx.$queryRaw<
        Array<{ commandHash: string; payload: Record<string, unknown>; actorId: string }>
      >`SELECT "commandHash",payload,"actorId" FROM "ReviewWorkEvent" WHERE "commandKey"=${input.idempotencyKey}`;
      const commandHash = hash(input);
      if (prior.length) {
        if (prior[0].actorId !== access.actorId || prior[0].commandHash !== commandHash)
          throw new Error('REVIEW_IDEMPOTENCY_CONFLICT');
        return prior[0].payload;
      }
      const tables: Record<ReviewOwner, string> = {
        scholarships: 'Scholarship',
        universities: 'University',
        majors: input.key.split(':')[2] ? 'MajorLevelProfile' : 'Major',
        courses: 'Course',
        tests: 'InternationalTest',
        services: 'ServiceCatalogRecord',
        cms: 'CmsContentNode',
        careers: 'CareerJobPostingRecord',
        'study-destinations': 'ReferenceCountry',
      };
      const lockId =
        domain === 'majors' && input.key.split(':')[2] ? input.key.split(':')[2] : ownerId;
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM ${Prisma.raw('"' + tables[domain] + '"')} WHERE id=${lockId} FOR SHARE`,
      );
      const owner = await tx.$queryRaw<
        OwnerRow[]
      >`SELECT "key",domain,"ownerId","profileId","ownerRevision",reasons FROM "ReviewOwnerProjection" WHERE "key"=${input.key}`;
      if (!owner.length || owner[0].ownerRevision !== input.ownerRevision)
        throw new Error('REVIEW_OWNER_CHANGED');
      const cases = await tx.$queryRaw<
        Array<{
          version: number;
          cycle: number;
          state: string;
          assigneeId: string | null;
          teamId: string | null;
        }>
      >`SELECT * FROM "ReviewWorkCase" WHERE "key"=${input.key} FOR UPDATE`;
      const current = cases[0];
      if (!current || current.version !== input.version || current.state === 'COMPLETED')
        throw new Error('REVIEW_VERSION_CONFLICT');
      if (input.action === 'claim' && (current.assigneeId || current.teamId))
        throw new Error('REVIEW_ALREADY_ASSIGNED');
      if (input.teamId) {
        const approved = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM "RoleRecord" WHERE id=${input.teamId} AND id IN (SELECT jsonb_array_elements_text(value) FROM "Settings" WHERE key='review-workspace.approved-team-roles' AND jsonb_typeof(value)='array')`;
        if (!approved.length) throw new Error('REVIEW_TEAM_FORBIDDEN');
        const members = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT i.id FROM "RoleAssignmentRecord" r JOIN "IdentityRecord" i ON i.id=r."identityId" WHERE r."roleId"=${input.teamId} AND i.status='ACTIVE' AND i."deletedAt" IS NULL ORDER BY i.id LIMIT 101`;
        if (!members.length || members.length > 100) throw new Error('REVIEW_TEAM_FORBIDDEN');
        for (const member of members)
          if (!(await authorize(member.id, domain, ownerId)))
            throw new Error('REVIEW_TEAM_FORBIDDEN');
      }
      if (input.assigneeId) {
        const active = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT i.id FROM "IdentityRecord" i JOIN "AccountRecord" a ON a."identityId"=i.id WHERE i.id=${input.assigneeId} AND i.status='ACTIVE' AND i."deletedAt" IS NULL AND a."accessState"='Active'`;
        if (!active.length) throw new Error('REVIEW_ASSIGNEE_FORBIDDEN');
      }
      const assignee = input.action === 'claim' ? access.actorId : (input.assigneeId ?? null);
      const updates =
        input.action === 'claim' || input.action === 'assign'
          ? Prisma.sql`"assigneeId"=${assignee},"teamId"=${input.action === 'claim' ? null : (input.teamId ?? null)},`
          : input.action === 'priority'
            ? Prisma.sql`priority=${input.priority},`
            : input.action === 'state'
              ? Prisma.sql`state=${input.state},`
              : Prisma.empty;
      await tx.$executeRaw`UPDATE "ReviewWorkCase" SET ${updates} version=version+1,"updatedAt"=CURRENT_TIMESTAMP WHERE "key"=${input.key}`;
      const result = {
        key: input.key,
        version: current.version + 1,
        cycle: current.cycle,
        action: input.action,
      };
      const eventId = await this.event(
        tx,
        input.key,
        current.cycle,
        input.action.toUpperCase(),
        access.actorId,
        input.action === 'note' ? (input.note ?? null) : input.reason,
        {
          ...result,
          assigneeId: assignee,
          teamId: input.teamId ?? null,
          priority: input.priority ?? null,
        },
        input.idempotencyKey,
        commandHash,
      );
      if (['claim', 'assign'].includes(input.action)) {
        const recipients = assignee
          ? [{ id: assignee }]
          : input.teamId
            ? await tx.$queryRaw<
                Array<{ id: string }>
              >`SELECT "identityId" id FROM "RoleAssignmentRecord" WHERE "roleId"=${input.teamId}`
            : [];
        for (const recipient of recipients)
          if (recipient.id !== access.actorId)
            await tx.$executeRaw`INSERT INTO "TransactionalOutboxRecord" (id,"eventType",domain,"aggregateType","aggregateId",payload,metadata,"updatedAt") VALUES (${eventId + ':' + recipient.id},'ReviewWorkAssigned.v1','REVIEW_QUEUE','REVIEW_WORK_CASE',${input.key},${json({ recipientReference: recipient.id, caseKey: input.key, ownerDomain: domain })}::jsonb,'{}'::jsonb,CURRENT_TIMESTAMP)`;
      }
      return result;
    });
  }
  async history(access: ReviewAccess, key: string): Promise<ReviewHistory[]> {
    if (!access.domains.includes(key.split(':')[0] as ReviewOwner))
      throw new Error('REVIEW_FORBIDDEN');
    if (key.endsWith(':import') && !access.imports) throw new Error('REVIEW_FORBIDDEN');
    return this.transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          action: string;
          at: Date;
          note: string | null;
          actorLabel: string | null;
          cycle: number;
        }>
      >`SELECT e.id,e.action,e."createdAt" at,e.note,u."displayName" "actorLabel",e.cycle FROM "ReviewWorkEvent" e LEFT JOIN "UserRecord" u ON u."identityId"=e."actorId" WHERE e."caseKey"=${key} ORDER BY e."createdAt" DESC,e.id DESC LIMIT 100`;
      return rows.map((row) => ({ ...row, at: row.at.toISOString() }));
    });
  }
  async analytics(access: ReviewAccess, days: number): Promise<ReviewAnalytics> {
    return this.transaction(async (tx) => {
      const sources = await this.sourceStatus(tx, access),
        complete =
          access.domains.length > 0 &&
          sources.filter((s) => s.state !== 'forbidden').every((s) => s.state === 'ready');
      const [stats] = await tx.$queryRaw<
        Array<{
          measured: Date | null;
          entered: bigint;
          completed: bigint;
          median: number | null;
          within: bigint;
          withSla: bigint;
        }>
      >`SELECT min(e."createdAt") measured,count(*) FILTER(WHERE e.action IN ('OBSERVED_ENTERED','OBSERVED_REOPENED') AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days})) entered,count(*) FILTER(WHERE e.action='OBSERVED_COMPLETED' AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days})) completed,percentile_cont(0.5) WITHIN GROUP(ORDER BY (e.payload->>'elapsedHours')::float) FILTER(WHERE e.action='OBSERVED_COMPLETED' AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days})) median,count(*) FILTER(WHERE e.action='OBSERVED_COMPLETED' AND e.payload->>'withinSla'='true' AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days})) within,count(*) FILTER(WHERE e.action='OBSERVED_COMPLETED' AND e.payload->>'withinSla' IS NOT NULL AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days})) "withSla" FROM "ReviewWorkEvent" e JOIN "ReviewWorkCase" c ON c."key"=e."caseKey" WHERE c.${scope(access)}`;
      const series = await tx.$queryRaw<
        Array<{ day: string; entered: bigint; completed: bigint }>
      >`SELECT to_char(e."createdAt",'YYYY-MM-DD') day,count(*) FILTER(WHERE e.action IN ('OBSERVED_ENTERED','OBSERVED_REOPENED')) entered,count(*) FILTER(WHERE e.action='OBSERVED_COMPLETED') completed FROM "ReviewWorkEvent" e JOIN "ReviewWorkCase" c ON c."key"=e."caseKey" WHERE c.${scope(access)} AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days}) GROUP BY 1 ORDER BY 1`;
      const base = this.base(access);
      const aggregate = async (field: Prisma.Sql) => {
        const rows = await tx.$queryRaw<
          Array<{ key: string; count: bigint }>
        >`${base} SELECT ${field} "key",count(*) count FROM owners GROUP BY 1 ORDER BY count DESC,"key" LIMIT 100`;
        return rows.map((r) => ({ key: r.key, count: count(r.count) }));
      };
      const domains = await aggregate(Prisma.sql`domain`),
        assignees = await aggregate(Prisma.sql`coalesce("assigneeLabel",'unassigned')`);
      const reasonRows = await tx.$queryRaw<
        Array<{ key: string; count: bigint }>
      >`${base} SELECT unnest(reasons) "key",count(*) count FROM owners GROUP BY 1 ORDER BY count DESC`;
      const [totals] = await tx.$queryRaw<
        Array<{ open: bigint; overdue: bigint; unknown: bigint }>
      >`${base} SELECT count(*) open,count(*) FILTER(WHERE sla='overdue') overdue,count(*) FILTER(WHERE sla='unknown') unknown FROM owners`;
      return {
        days,
        measuredFrom: stats.measured?.toISOString() ?? null,
        coverage: complete ? 'complete' : 'partial',
        newCases: stats.measured ? count(stats.entered) : null,
        completed: stats.measured ? count(stats.completed) : null,
        medianHours: stats.median,
        open: complete ? count(totals.open) : null,
        overdue:
          complete && count(totals.unknown) < count(totals.open) ? count(totals.overdue) : null,
        withoutSla: complete ? count(totals.unknown) : null,
        completedWithinSla: count(stats.withSla) ? count(stats.within) : null,
        completedWithSla: count(stats.withSla) || null,
        series: series.map((row) => ({
          day: row.day,
          entered: count(row.entered),
          completed: count(row.completed),
        })),
        domains,
        reasons: reasonRows.map((row) => ({ key: row.key, count: count(row.count) })),
        assignees,
        sources,
      };
    });
  }
  async reviewers(access: ReviewAccess, _domain: ReviewOwner) {
    if (!access.coordinate) throw new Error('REVIEW_FORBIDDEN');
    const rows = await this.db.$queryRaw<
      Array<{ id: string; label: string; kind: 'person' | 'team' }>
    >`SELECT i.id,coalesce(u."displayName",'Reviewer') label,'person'::text kind FROM "IdentityRecord" i JOIN "AccountRecord" a ON a."identityId"=i.id LEFT JOIN "UserRecord" u ON u."identityId"=i.id WHERE i.status='ACTIVE' AND i."deletedAt" IS NULL AND a."accessState"='Active' AND EXISTS(SELECT 1 FROM "RoleAssignmentRecord" r WHERE r."identityId"=i.id) ORDER BY i.id LIMIT 200`;
    // A role is not automatically an operational team. Explicitly approved role IDs
    // are listed in Settings; effective member authorization is checked at assignment.
    const teams = await this.db.$queryRaw<
      Array<{ id: string; label: string; kind: 'team' }>
    >`SELECT r.id,r.name label,'team'::text kind FROM "RoleRecord" r WHERE r.id IN (SELECT jsonb_array_elements_text(value) FROM "Settings" WHERE key='review-workspace.approved-team-roles' AND jsonb_typeof(value)='array') ORDER BY r.id LIMIT 100`;
    return [...rows, ...teams];
  }
  async views(access: ReviewAccess): Promise<ReviewSavedView[]> {
    return this.db
      .$queryRaw`SELECT id,name,shared,filters FROM "ReviewWorkView" WHERE "actorId"=${access.actorId} OR shared=true ORDER BY "createdAt" DESC LIMIT 50`;
  }
  async saveView(
    access: ReviewAccess,
    input: { name: string; shared: boolean; filters: ReviewQuery },
  ): Promise<ReviewSavedView> {
    if (input.filters.search) throw new Error('REVIEW_SEARCH_STORAGE_FORBIDDEN');
    const id = randomUUID(),
      filters = { ...input.filters, cursor: undefined, snapshot: undefined };
    await this.db
      .$executeRaw`INSERT INTO "ReviewWorkView" (id,"actorId",name,shared,filters) VALUES (${id},${access.actorId},${input.name},${input.shared},${json(filters)}::jsonb)`;
    return { id, name: input.name, shared: input.shared, filters };
  }
  async policies(access: ReviewAccess): Promise<ReviewSlaPolicy[]> {
    return JSON.parse(
      JSON.stringify(
        await this.db
          .$queryRaw`SELECT domain,version,hours,"warningHours",timezone,"approvedBy","approvedAt" FROM "ReviewSlaPolicy" WHERE ${scope(access)}`,
      ),
    );
  }
  async approvePolicy(
    access: ReviewAccess,
    input: {
      domain: ReviewOwner;
      version: number;
      hours: number;
      warningHours: number;
      reason: string;
    },
  ): Promise<ReviewSlaPolicy> {
    return this.transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        ReviewSlaPolicy[]
      >`INSERT INTO "ReviewSlaPolicy" (domain,version,hours,"warningHours","approvedBy",reason) VALUES (${input.domain},1,${input.hours},${input.warningHours},${access.actorId},${input.reason}) ON CONFLICT(domain) DO UPDATE SET version="ReviewSlaPolicy".version+1,hours=EXCLUDED.hours,"warningHours"=EXCLUDED."warningHours","approvedBy"=EXCLUDED."approvedBy",reason=EXCLUDED.reason,"approvedAt"=CURRENT_TIMESTAMP WHERE "ReviewSlaPolicy".version=${input.version} RETURNING *`;
      if (!rows.length || (input.version !== 0 && rows[0].version !== input.version + 1))
        throw new Error('REVIEW_VERSION_CONFLICT');
      return JSON.parse(JSON.stringify(rows[0]));
    });
  }
}
