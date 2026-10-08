import { Request } from 'express';
import { randomUUID } from 'crypto';
import { IAuditRecordRepository } from '@manaratak/domain';
import { createAuditRecordFromDto } from '@manaratak/application';
import { getAuthenticatedPrincipal } from '../security/AuthenticatedPrincipal.js';

export interface AuditRecordParams {
  action: string;
  category: string;
  targetType: string;
  targetId?: string;
  result: 'SUCCESS' | 'FAILURE';
  severity?: string;
  metadata?: Record<string, any>;
  error?: any;
}

export interface AuditRecordOptions {
  reliability: 'REQUIRED' | 'BEST_EFFORT';
  principal: 'REQUIRED' | 'OPTIONAL';
}

export class AuditHelper {
  public static async recordMutation(
    repo: IAuditRecordRepository | undefined,
    req: Request,
    params: AuditRecordParams,
    options: AuditRecordOptions = { reliability: 'BEST_EFFORT', principal: 'OPTIONAL' }
  ): Promise<void> {
    if (!repo) {
      if (options.reliability === 'REQUIRED') throw new Error('REQUIRED_AUDIT_REPOSITORY_UNAVAILABLE');
      return;
    }

    try {
      const principal = getAuthenticatedPrincipal(req);
      if (!principal && options.principal === 'REQUIRED') throw new Error('AUDIT_AUTHENTICATED_PRINCIPAL_REQUIRED');
      const actorId = principal?.principalId || 'ANONYMOUS';
      const actorType = principal?.actorType || 'IDENTITY';

      const targetId =
        params.targetId ||
        req.params.id ||
        req.params.assetId ||
        req.body?.id ||
        req.body?.assetId ||
        req.body?.key ||
        req.body?.assignmentId ||
        req.body?.identityId ||
        'N/A';

      // Source is the logical origin, not the caller's network address.
      const source = (req.originalUrl || req.path).split('?')[0].includes('/auth/')
        ? 'auth-api' : 'admin-api';
      const correlationId =
        (req.headers['x-correlation-id'] as string) ||
        (req.headers['x-request-id'] as string);
      const severity = params.severity || (params.result === 'SUCCESS' ? 'INFO' : 'ERROR');

      const safeMetadata: Record<string, any> = {
        ...(params.metadata || {}),
        result: params.result,
        path: (req.originalUrl || req.path).split('?')[0].slice(0, 2048),
        method: req.method,
        requestIp: String(req.ip || req.socket?.remoteAddress || '').slice(0, 80),
      };

      if (params.error) {
        const rawCode = typeof params.error === 'object' && typeof params.error.code === 'string'
          ? params.error.code
          : 'MUTATION_ERROR';
        safeMetadata.error = {
          message: 'Mutation failed',
          code: /^[A-Z0-9_:-]{1,80}$/.test(rawCode) ? rawCode : 'MUTATION_ERROR'
        };
      }

      const record = createAuditRecordFromDto({
        id: randomUUID(), reference: `AUD-${Date.now()}-${randomUUID()}`,
        action: params.action, category: params.category, severity,
        actorId, actorType, targetId, targetType: params.targetType,
        source, timestamp: new Date(), contextMetadata: safeMetadata,
        correlationReference: correlationId,
      });

      await repo.save(record);
    } catch (err) {
      console.error('Audit recording failed.');
      if (options.reliability === 'REQUIRED') throw err;
    }
  }
}
