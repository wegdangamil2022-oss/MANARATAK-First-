import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuditRecord } from '@manaratak/domain';
import { ManageAuditRecordsUseCase } from '@manaratak/application';
import { problemDetails } from '../../http/ProblemDetails.js';

const querySchema = z
  .object({
    actorId: z.string().trim().min(1).max(240).optional(),
    targetId: z.string().trim().min(1).max(240).optional(),
    action: z.string().trim().min(1).max(240).optional(),
    category: z.string().trim().min(1).max(240).optional(),
    severity: z.string().trim().min(1).max(80).optional(),
    correlationId: z.string().trim().min(1).max(240).optional(),
    reference: z.string().trim().min(1).max(240).optional(),
    traceId: z.string().trim().min(1).max(240).optional(),
    actorType: z.string().trim().min(1).max(80).optional(),
    targetType: z.string().trim().min(1).max(80).optional(),
    source: z.string().trim().min(1).max(240).optional(),
    lifecycleState: z.enum(['RECORDED', 'ARCHIVED']).optional(),
    result: z.enum(['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN']).optional(),
    complianceTag: z.string().trim().min(1).max(80).optional(),
    method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']).optional(),
    path: z.string().trim().min(1).max(2048).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    until: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

function encodeCursor(timestamp: string, id: string): string {
  return Buffer.from(`${timestamp}|${id}`, 'utf8').toString('base64url');
}
function decodeCursor(cursor?: string): [string, string] | null {
  if (!cursor) return null;
  z.string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .parse(cursor);
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const split = decoded.lastIndexOf('|');
  const value = z
    .object({ timestamp: z.string().datetime({ offset: true }), id: z.string().min(1).max(240) })
    .parse({ timestamp: decoded.slice(0, split), id: decoded.slice(split + 1) });
  return [value.timestamp, value.id];
}
function dto(record: AuditRecord) {
  const metadata = record.getContextMetadata().getData();
  const isIntent = record.getAction().getValue() === 'MUTATION_INTENT_RECORDED' || metadata.auditEvent === 'MUTATION_INTENT';
  const result = isIntent ? 'INTENT'
    : metadata.result === 'SUCCESS' || metadata.result === 'FAILURE' ? metadata.result : 'UNKNOWN';
  const evidenceLevel = isIntent ? 'INTENT_OBSERVED'
    : metadata.atomicity === 'BUSINESS_AUDIT_OUTBOX' ? 'ATOMIC_BUSINESS_AUDIT_RECORDED'
    : metadata.auditEvent === 'MUTATION_OUTCOME' ? 'HTTP_OUTCOME_OBSERVED' : 'EVENT_OBSERVED';
  return {
    id: record.getId().getValue(),
    reference: record.getReference().getValue(),
    action: record.getAction().getValue(),
    category: record.getCategory().getValue(),
    severity: record.getSeverity().getValue(),
    result,
    evidenceLevel,
    actor: { actorId: record.getActor().getActorId(), actorType: record.getActor().getActorType() },
    target: {
      targetId: record.getTarget().getTargetId(),
      targetType: record.getTarget().getTargetType(),
    },
    source: record.getSource().getValue(),
    timestamp: record.getTimestamp().getValue().toISOString(),
    contextMetadata: record.getContextMetadata().getData(),
    lifecycleState: record.getLifecycleState(),
    complianceMetadata: record.getComplianceMetadata()?.getRegulatoryTags(),
    correlationReference: record.getCorrelationReference()?.getValue(),
    traceReference: record.getTraceReference()?.getValue(),
    chainReference: record.getChainReference()?.getPreviousReference().getValue(),
    retentionMetadata: record.getRetentionMetadata()
      ? {
          retentionPeriodInDays: record.getRetentionMetadata()?.getRetentionPeriodInDays(),
          expiresAt: record.getRetentionMetadata()?.getExpiresAt().toISOString(),
        }
      : undefined,
  };
}

/** Immutable, query-only cross-domain audit read model. No destructive route exists. */
export class AuditRouter {
  public static create({
    manageAuditRecordsUseCase,
  }: {
    manageAuditRecordsUseCase: ManageAuditRecordsUseCase;
  }): Router {
    const router = Router();
    router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    });
    const dateRange = (query: { from?: string; until?: string }) => {
      const range = {
        from: query.from ? new Date(query.from) : undefined,
        until: query.until ? new Date(query.until) : undefined,
      };
      z.boolean()
        .refine((valid) => valid, 'AUDIT_DATE_RANGE_INVALID')
        .parse(!range.from || !range.until || range.from <= range.until);
      return range;
    };

    router.get('/records', async (req, res, next) => {
      try {
        const query = querySchema.parse(req.query);
        const cursor = decodeCursor(query.cursor);
        const page = await manageAuditRecordsUseCase.queryAuditPage({
          ...query,
          actorId: query.actorId,
          targetId: query.targetId,
          action: query.action,
          category: query.category,
          severity: query.severity,
          correlationId: query.correlationId,
          ...dateRange(query),
          limit: query.limit,
          cursor: cursor ? { timestamp: new Date(cursor[0]), id: cursor[1] } : null,
        });
        const items = page.items.map(dto);
        res
          .status(200)
          .json({
            items,
            hasMore: page.hasMore,
            nextCursor: page.nextCursor
              ? encodeCursor(page.nextCursor.timestamp.toISOString(), page.nextCursor.id)
              : null,
          });
      } catch (error) {
        next(error);
      }
    });

    router.get('/integrity', async (req, res, next) => {
      try {
        const query = querySchema.pick({ from: true, until: true, limit: true, cursor: true }).parse(req.query);
        const cursor = decodeCursor(query.cursor);
        const report = await manageAuditRecordsUseCase.verifyIntegrity({
          ...dateRange(query), limit: query.limit,
          cursor: cursor ? { timestamp: new Date(cursor[0]), id: cursor[1] } : null,
        });
        // A failed integrity check is a valid report, separate from transport failure.
        res.status(200).json({ ...report, nextCursor: report.nextCursor
          ? encodeCursor(report.nextCursor.timestamp.toISOString(), report.nextCursor.id) : null });
      } catch (error) {
        next(error);
      }
    });

    router.get('/export', async (req, res, next) => {
      try {
        const query = querySchema
          .extend({ format: z.enum(['json', 'csv']).default('json') })
          .parse(req.query);
        const cursor = decodeCursor(query.cursor);
        const page = await manageAuditRecordsUseCase.queryAuditPage({
          ...query,
          ...dateRange(query),
          limit: query.limit,
          cursor: cursor ? { timestamp: new Date(cursor[0]), id: cursor[1] } : null,
        });
        const items = page.items.map(dto);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="manaratak-audit-export.${query.format}"`,
        );
        if (query.format === 'csv') {
          res.setHeader('X-Audit-Export-Scope', 'BOUNDED_PAGE');
          res.setHeader('X-Audit-Export-Count', String(items.length));
          res.setHeader('X-Audit-Has-More', String(page.hasMore));
          if (page.nextCursor) res.setHeader('X-Audit-Next-Cursor', encodeCursor(page.nextCursor.timestamp.toISOString(), page.nextCursor.id));
          const esc = (value: unknown) => {
            const raw = String(value ?? '');
            const safe = /^[\s]*[=+\-@]/.test(raw) || /^[\t\r]/.test(raw) ? `'${raw}` : raw;
            return `"${safe.replaceAll('"', '""')}"`;
          };
          const rows = [
            [
              'timestamp',
              'actorId',
              'action',
              'category',
              'targetType',
              'targetId',
              'correlationReference',
              'reference',
              'result',
              'evidenceLevel',
            ],
            ...items.map((item) => [
              item.timestamp,
              item.actor.actorId,
              item.action,
              item.category,
              item.target.targetType,
              item.target.targetId,
              item.correlationReference ?? '',
              item.reference,
              item.result,
              item.evidenceLevel,
            ]),
          ];
          return void res
            .status(200)
            .type('text/csv; charset=utf-8')
            .send('\ufeff' + rows.map((row) => row.map(esc).join(',')).join('\r\n'));
        }
        res
          .status(200)
          .type('application/json')
          .send(
            JSON.stringify({
              exportedAt: new Date().toISOString(),
              bounded: true,
              items,
              hasMore: page.hasMore,
              nextCursor: page.nextCursor
                ? encodeCursor(page.nextCursor.timestamp.toISOString(), page.nextCursor.id)
                : null,
            }),
          );
      } catch (error) {
        next(error);
      }
    });

    router.get('/records/:id', async (req, res, next) => {
      try {
        const id = z.string().trim().min(1).max(240).parse(req.params.id);
        const record = await manageAuditRecordsUseCase.getAuditRecord(id);
        if (!record) return void res.status(404).json({ error: 'AUDIT_RECORD_NOT_FOUND' });
        res.status(200).json(dto(record));
      } catch (error) {
        next(error);
      }
    });

    router.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
      if (!(error instanceof z.ZodError)) return next(error);
      return res.status(400).type('application/problem+json').json(problemDetails({
        status: 400, code: 'VALIDATION_ERROR', detail: 'The audit query is invalid.',
        traceId: req.header('x-correlation-id') || 'unknown', instance: req.originalUrl,
      }));
    });
    return router;
  }
}
