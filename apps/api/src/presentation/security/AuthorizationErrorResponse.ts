import type { Request, Response } from 'express';
import { problemDetails } from '../http/ProblemDetails.js';

const forbidden = new Set(['POLICY_PERMISSION_EXCEEDS_ACTOR',
  'NON_DELEGABLE_PERMISSION',
  'ROLE_PERMISSION_EXCEEDS_ACTOR',
  'SECOND_APPROVER_AUTHORIZATION_REQUIRED',
  'SYSTEM_ROLE_PROTECTED',
]);
const conflict = new Set(['POLICY_SCOPE_REVIEW_REQUIRED',
  'EMERGENCY_ACCESS_NOT_ACTIVE',
  'EMERGENCY_ACCESS_OVERLAPPING_GRANT',
  'POLICY_ID_ALREADY_EXISTS',
  'POLICY_REVISION_CONFLICT',
  'ROLE_ID_ALREADY_EXISTS',
  'ROLE_NAME_ALREADY_EXISTS',
  'ROLE_REVISION_CONFLICT',
  'ROLE_ASSIGNMENT_IMMUTABLE',
  'ROLE_RETIRED',
  'ROLE_HAS_ASSIGNMENTS',
  'ROLE_HAS_EMERGENCY_HISTORY',
  'ROLE_POLICY_ASSIGNMENT_NOT_SUPPORTED',
  'AUTHORIZATION_DUTY_CONFLICT',
]);
const invalid = new Set([
  'EMERGENCY_ACCESS_TARGET_REQUIRED',
  'EMERGENCY_ACCESS_MAKER_CHECKER_REQUIRED',
  'EMERGENCY_ACCESS_REASON_REQUIRED',
  'EMERGENCY_ACCESS_CHANGE_TICKET_REQUIRED',
  'EMERGENCY_ACCESS_DURATION_INVALID',
  'EMERGENCY_ACCESS_REVOCATION_REASON_REQUIRED',
  'POLICY_DEFINITION_INVALID',
  'POLICY_REFERENCE_INVALID',
  'POLICY_REVISION_INVALID',
  'ROLE_PERMISSIONS_REQUIRED',
  'ROLE_PERMISSIONS_INVALID',
  'ROLE_DUPLICATE_PERMISSION',
  'ROLE_REVISION_INVALID',
  'VERIFIED_ACTIVE_IDENTITY_REQUIRED',
  'SECOND_APPROVER_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE',
  'CHANGE_TICKET_REQUIRED_FOR_HIGH_RISK_AUTHORIZATION_CHANGE',
]);

export function sendAuthorizationError(req: Request, res: Response, error: unknown): void {
  const failure = error as { name?: string; code?: string; message?: string };
  const message = failure?.message ?? '';
  let status = 500;
  let code = 'AUTHORIZATION_OPERATION_FAILED';
  if (failure?.name === 'ZodError' || invalid.has(message)) {
    status = 400;
    code = invalid.has(message) ? message : 'VALIDATION_ERROR';
  } else if (
    message === 'AUTHENTICATED_PRINCIPAL_REQUIRED' ||
    message === 'AUTHENTICATED_ADMIN_ACTOR_REQUIRED'
  ) {
    status = 401;
    code = 'AUTHENTICATION_REQUIRED';
  } else if (forbidden.has(message)) {
    status = 403;
    code = message;
  } else if (conflict.has(message) || ['P2002', 'P2003', 'P2034'].includes(failure?.code ?? '')) {
    status = 409;
    code = conflict.has(message) ? message : 'AUTHORIZATION_WRITE_CONFLICT';
  } else if (
    [
      'EMERGENCY_ACCESS_ROLE_NOT_FOUND',
      'EMERGENCY_ACCESS_NOT_FOUND',
      'POLICY_NOT_FOUND',
      'ROLE_NOT_FOUND',
      'ROLE_ASSIGNMENT_NOT_FOUND',
      'IDENTITY_NOT_FOUND',
    ].includes(message) ||
    failure?.code === 'P2025'
  ) {
    status = 404;
    code = 'RESOURCE_NOT_FOUND';
  } else if (
    /^[A-Z_]+(?:UNAVAILABLE|NOT_CONFIGURED|PERSISTENCE_REQUIRED|UPDATE_REQUIRED|DELETE_REQUIRED)$/.test(
      message,
    ) ||
    failure?.code === 'P1001'
  ) {
    status = 503;
    code = 'AUTHORIZATION_CAPABILITY_UNAVAILABLE';
  }
  res.status(status).json(
    problemDetails({
      status,
      code,
      instance: req.originalUrl || req.url,
      traceId: String(
        (req as Request & { traceId?: string }).traceId ||
          req.headers['x-correlation-id'] ||
          'unknown',
      ),
    }),
  );
}
