function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getResponseErrorCode(payload: unknown): string {
  if (!isRecord(payload) || !isRecord(payload.error) || typeof payload.error.code !== 'string') {
    throw new Error('Expected a response payload containing error.code');
  }
  return payload.error.code;
}
