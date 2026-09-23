import type { Request, Response, NextFunction } from 'express';
import type { IRoleAssignmentRepository } from '@manaratak/domain';

export function createStudentRoleGuard(assignments: IRoleAssignmentRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUserId) { res.status(401).json({ error: { code: 'STUDENT_AUTHENTICATION_REQUIRED' } }); return; }
    try {
      if (!(await assignments.findByIdentityId(req.authUserId)).some(item => item.roleId === 'student')) {
        res.status(403).json({ error: { code: 'STUDENT_PERSONA_REQUIRED' } }); return;
      }
      next();
    } catch { res.status(403).json({ error: { code: 'STUDENT_PERSONA_REQUIRED' } }); }
  };
}
