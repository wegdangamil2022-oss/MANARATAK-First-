/** Shared registration, reset and authenticated change policy. Passwords are never trimmed. */
export function assertPasswordPolicy(password: string): void {
  if (typeof password !== 'string' || password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters long'), { code: 'PASSWORD_TOO_SHORT' });
  }
  if (password.length > 128) {
    throw Object.assign(new Error('Password must not exceed 128 characters'), { code: 'PASSWORD_TOO_LONG' });
  }
}
