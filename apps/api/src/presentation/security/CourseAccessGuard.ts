import type { Request, Response, NextFunction } from 'express';
import type { CourseAccessService, CourseAction } from '@manaratak/application';
export function courseRequestAction(method: string, path: string): CourseAction | 'manage' {
  const suffix = path.replace(/^\/[0-9a-f-]{36}(?:\/|$)/i, '');
  if (method === 'GET') {
    if (/^(learners|learning-report)(?:\/|$)/.test(suffix)) return 'learners';
    if (/^assessment-reviews(?:\/|$)/.test(suffix)) return 'grade';
    return 'read';
  }
  if (/^assessment-reviews\/[^/]+\/grade$/.test(suffix)) return 'grade';
  if (/^(publish|unpublish)$/.test(suffix)) return 'publish';
  if (/^(mark-publishable|reject)$/.test(suffix)) return 'review';
  if (
    /^(modules|lessons|quizzes|questions|question-banks|media|relationships)(?:\/|$)/.test(
      suffix,
    ) ||
    suffix === 'mark-ready' ||
    suffix === 'delivery-policy'
  )
    return 'edit';
  return 'manage';
}
export const createCourseAccessGuard =
  (access: CourseAccessService) => (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      if (!req.authUserId) {
        res.status(401).json({ error: 'ADMIN_AUTH_REQUIRED' });
        return;
      }
      const context = { ip: req.ip, requestTime: new Date(), userAgent: req.get('User-Agent') };
      if (await access.globalManager(req.authUserId, context)) {
        next();
        return;
      }
      if (req.method === 'GET' && req.path === '/assigned') {
        if (await access.workspace(req.authUserId, context)) next();
        else res.status(403).json({ error: 'COURSE_PERMISSION_DENIED' });
        return;
      }
      const id = /^\/([0-9a-f]{8}-[0-9a-f-]{27})(?:\/|$)/i.exec(req.path)?.[1];
      if (!id) {
        res.status(403).json({ error: 'COURSE_PERMISSION_DENIED' });
        return;
      }
      await access.assert(req.authUserId, id, courseRequestAction(req.method, req.path), context);
      next();
    })().catch(() => res.status(403).json({ error: 'COURSE_PERMISSION_DENIED' }));
  };
