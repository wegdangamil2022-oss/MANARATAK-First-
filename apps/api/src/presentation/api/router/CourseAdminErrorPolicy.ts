export function courseAdminErrorResponse(error: unknown): {status: number; error: string} {
  if (!(error instanceof Error)) return {status: 500, error: 'COURSE_OPERATION_FAILED'};
  if (/^Course with id .+ not found$/.test(error.message)) return {status: 404, error: 'COURSE_NOT_FOUND'};
  const code = /^(?:COURSE|NATIVE_COURSE|LEARNING_PATH|IMPORTED_COURSE|AUTHENTICATED_ADMIN)_[A-Z0-9_]+/.exec(error.message)?.[0];
  if (!code) return {status: 500, error: 'COURSE_OPERATION_FAILED'};
  if (code.includes('AUTHENTICATED_ADMIN')) return {status: 401, error: 'AUTHENTICATED_ADMIN_ACTOR_REQUIRED'};
  if (code.includes('PRECONDITION_REQUIRED')) return {status: 428, error: code};
  if (code.includes('NOT_FOUND')) return {status: 404, error: code};
  if (/ATOMIC_.*REQUIRED|NOT_CONFIGURED|WRITER_REQUIRED|LOCK_REQUIRED/.test(code)) return {status: 503, error: code};
  if (/STALE|CONFLICT|STATE_CHANGED|IMMUTABLE|INVALID_.*TRANSITION|REQUIRES_CONTROLLED_IMPORT|DRAFT_REQUIRED|NOT_READY_TO_PUBLISH|NOT_PENDING/.test(code)) return {status: 409, error: code};
  return {status: 422, error: code};
}
