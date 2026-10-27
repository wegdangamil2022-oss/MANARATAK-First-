/** These 403 responses reject a command, not the actor's CMS read permission. */
export function preservesCmsDraftOnForbidden(endpoint: string, payload: unknown): boolean {
  if (!/^\/admin\/cms(?:\/|\?|$)/.test(endpoint) || !payload || typeof payload !== 'object')
    return false;
  const value = payload as { code?: unknown; error?: unknown };
  const error =
    value.error && typeof value.error === 'object' ? (value.error as { code?: unknown }) : null;
  const code = typeof value.error === 'string' ? value.error : (error?.code ?? value.code);
  return (
    typeof code === 'string' &&
    ['CMS_MAKER_CHECKER_VIOLATION', 'MFA_STEP_UP_REQUIRED', 'MFA_ENROLLMENT_REQUIRED'].includes(
      code,
    )
  );
}
