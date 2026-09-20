import { NextFunction, Request, Response } from 'express';
import { IAuditRecordRepository } from '@manaratak/domain';
import { AuditHelper } from './AuditHelper.js';

export type MutationAuditClassification =
  | 'CRITICAL_AUDIT_REQUIRED'
  | 'STANDARD_AUDIT_REQUIRED'
  | 'BEST_EFFORT_ALLOWED'
  | 'NO_AUDIT_REQUIRED';

export type MutationAuditScope = 'AUTH' | 'ADMIN' | 'IDENTITY' | 'CONTROL_PLANE';

export class MutationAuditPolicy {
  private static readonly MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  // These are explicitly non-mutating validation/preview commands even though
  // their transport method is POST. Any new exemption must be reviewed here.
  private static readonly ADMIN_EXEMPTIONS = [
    /\/preview$/,
    /\/bulk\/preview$/,
    /\/nodes\/validate$/,
  ];

  private static readonly CRITICAL_ADMIN_AREAS = [
    '/admin/identities', '/admin/authorization', '/admin/settings', '/admin/imports',
    '/admin/assets', '/admin/reference-data', '/admin/academic-taxonomy',
    '/admin/international-tests', '/admin/universities', '/admin/majors',
    '/admin/scholarships', '/admin/courses', '/admin/certificates', '/admin/cms',
    '/admin/services', '/admin/finance', '/admin/careers', '/admin/ai',
    '/admin/student-tools', '/admin/notifications', '/admin/platform',
  ];

  private static readonly HIGH_RISK_ACTIONS = [
    '/publish', '/archive', '/purge', '/delete', '/cancel', '/refund', '/issue',
    '/approve', '/reject', '/promote', '/activate', '/deactivate', '/suspend',
    '/restore', '/fulfill', '/reconcile', '/rotate',
  ];

  public static classify(req: Request, scope: MutationAuditScope): MutationAuditClassification {
    if (!this.MUTATION_METHODS.has(req.method.toUpperCase())) return 'NO_AUDIT_REQUIRED';
    const path = req.originalUrl.split('?')[0].toLowerCase();

    if (scope === 'AUTH') return path.includes('/auth/') ? 'CRITICAL_AUDIT_REQUIRED' : 'NO_AUDIT_REQUIRED';
    if (scope === 'IDENTITY') return path.includes('/identities') ? 'CRITICAL_AUDIT_REQUIRED' : 'NO_AUDIT_REQUIRED';
    if (scope === 'CONTROL_PLANE') return 'CRITICAL_AUDIT_REQUIRED';
    if (!path.includes('/admin/')) return 'NO_AUDIT_REQUIRED';

    if (this.ADMIN_EXEMPTIONS.some(pattern => pattern.test(path))) return 'NO_AUDIT_REQUIRED';
    if (this.CRITICAL_ADMIN_AREAS.some(prefix => path.includes(prefix))) return 'CRITICAL_AUDIT_REQUIRED';
    if (this.HIGH_RISK_ACTIONS.some(fragment => path.includes(fragment))) return 'CRITICAL_AUDIT_REQUIRED';

    // Fail-safe default: every authenticated Admin mutation is auditable unless
    // it has an explicit reviewed exemption above.
    return 'STANDARD_AUDIT_REQUIRED';
  }
}

export class MutationAuditMiddleware {
  constructor(
    private readonly repository: IAuditRecordRepository,
    private readonly scope: MutationAuditScope
  ) {}

  public generate() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const classification = MutationAuditPolicy.classify(req, this.scope);
      if (classification === 'NO_AUDIT_REQUIRED') {
        next();
        return;
      }

      const targetId = req.params?.id || req.params?.nodeId || req.params?.batchId || req.originalUrl.split('?')[0];
      const metadata = {
        auditEvent: 'MUTATION_INTENT',
        requestedMethod: req.method,
        requestedPath: req.originalUrl.split('?')[0],
        classification,
        atomicity: 'REQUEST_OUTCOME_ONLY',
        atomicBusinessAuditRequired: classification === 'CRITICAL_AUDIT_REQUIRED'
      };
      const principalRequirement = this.scope === 'AUTH' ? 'OPTIONAL' : 'REQUIRED';

      try {
        await AuditHelper.recordMutation(this.repository, req, {
          action: 'MUTATION_INTENT_RECORDED',
          category: classification === 'CRITICAL_AUDIT_REQUIRED' ? 'CRITICAL_MUTATION' : 'STANDARD_MUTATION',
          targetType: 'API_ROUTE',
          targetId,
          result: 'SUCCESS',
          severity: classification === 'CRITICAL_AUDIT_REQUIRED' ? 'WARNING' : 'INFO',
          metadata
        }, {
          reliability: classification === 'CRITICAL_AUDIT_REQUIRED' ? 'REQUIRED' : 'BEST_EFFORT',
          principal: principalRequirement,
        });
      } catch (error) {
        next(error);
        return;
      }

      res.once('finish', () => {
        void AuditHelper.recordMutation(this.repository, req, {
          action: 'MUTATION_OUTCOME_RECORDED',
          category: classification === 'CRITICAL_AUDIT_REQUIRED' ? 'CRITICAL_MUTATION' : 'STANDARD_MUTATION',
          targetType: 'API_ROUTE',
          targetId,
          result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          severity: res.statusCode < 400 ? 'INFO' : 'ERROR',
          metadata: { ...metadata, auditEvent: 'MUTATION_OUTCOME', httpStatus: res.statusCode }
        }, { reliability: 'BEST_EFFORT', principal: principalRequirement });
      });
      next();
    };
  }
}
