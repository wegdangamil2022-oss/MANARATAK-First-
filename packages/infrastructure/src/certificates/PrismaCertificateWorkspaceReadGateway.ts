import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CertificateWorkspaceReadGateway,
  CertificateWorkspaceQuery,
  CertificateWorkspacePage,
} from '@manaratak/application';

export class PrismaCertificateWorkspaceReadGateway implements CertificateWorkspaceReadGateway {
  constructor(private readonly db: PrismaClient) {}
  async templateVersions(query: {
    templateId: string;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    if (
      !Number.isSafeInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isSafeInteger(query.pageSize) ||
      query.pageSize < 1 ||
      query.pageSize > 50
    )
      throw Error('CERTIFICATE_QUERY_INVALID');
    return this.db.$transaction(
      async (tx) => {
        const where: Prisma.CertificateTemplateVersionWhereInput = {
          templateId: query.templateId,
          ...(query.search
            ? { versionNumber: { contains: query.search, mode: 'insensitive' } }
            : {}),
        };
        const total = await tx.certificateTemplateVersion.count({ where });
        const data = await tx.certificateTemplateVersion.findMany({
          where,
          select: { id: true, versionNumber: true, status: true, createdAt: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return { data, total, page: query.page, pageSize: query.pageSize };
      },
      { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 15000 },
    );
  }
  async read(query: CertificateWorkspaceQuery): Promise<CertificateWorkspacePage> {
    if (
      !Number.isSafeInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isSafeInteger(query.pageSize) ||
      query.pageSize < 1 ||
      query.pageSize > 50
    )
      throw Error('CERTIFICATE_QUERY_INVALID');
    const projection = (() => {
      switch (query.kind) {
        case 'templates':
          return Prisma.sql`SELECT id, name AS title, status, "updatedAt", '/certificates/templates/' || id AS path FROM "CertificateTemplate" WHERE status='PENDING_APPROVAL'`;
        case 'issuers':
          return Prisma.sql`SELECT id, name AS title, status, "updatedAt", '/certificates/issuers/' || id AS path FROM "CertificateIssuer" WHERE status='PENDING_APPROVAL'`;
        case 'delegations':
          return Prisma.sql`SELECT d.id, i.name AS title, d.status, d."updatedAt", '/certificates/issuers/' || d."issuerId" || '?panel=delegations' AS path FROM "CertificateAuthorityDelegation" d JOIN "CertificateIssuer" i ON i.id=d."issuerId" WHERE d.status='PENDING_APPROVAL'`;
        case 'corrections':
          return Prisma.sql`SELECT id, "serialNumber" AS title, 'PENDING_APPROVAL' AS status, "updatedAt", '/certificates/' || id || '?panel=lifecycle' AS path FROM "Certificate" WHERE metadata->'recipientCorrection'->>'state'='PENDING_APPROVAL'`;
        case 'revalidation':
          return Prisma.sql`SELECT id, "serialNumber" AS title, 'REVALIDATION_REQUIRED' AS status, "updatedAt", '/certificates/' || id || '?panel=lifecycle' AS path FROM "Certificate" WHERE status='ACTIVE' AND ("expiresAt" IS NULL OR "expiresAt">now()) AND "requiresRevalidation"=true AND (metadata->'revalidation'->>'approvedBy' IS NULL OR COALESCE((metadata->'revalidation'->>'validUntil')::timestamptz,'-infinity'::timestamptz)<=now())`;
        case 'recovery':
          return Prisma.sql`SELECT id, "serialNumber" AS title, 'RECOVERY_REQUIRED' AS status, "updatedAt", '/certificates/' || id || '?panel=files' AS path FROM "Certificate" WHERE metadata->'renderJob'->>'state'='RECOVERY_REQUIRED'`;
        default:
          throw Error('CERTIFICATE_QUERY_INVALID');
      }
    })();
    // Count and rows share a repeatable-read snapshot; no derived queue is persisted.
    return this.db.$transaction(
      async (tx) => {
        const [count] = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT count(*) AS total FROM (${projection}) owner_rows`,
        );
        const data = await tx.$queryRaw<CertificateWorkspacePage['data']>(
          Prisma.sql`SELECT * FROM (${projection}) owner_rows ORDER BY "updatedAt" DESC, id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
        );
        return { data, total: Number(count.total), page: query.page, pageSize: query.pageSize };
      },
      { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 15000 },
    );
  }
}
