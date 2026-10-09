/** HTTP failures carry machine-readable retry advice without response bodies or credentials. */
export class SourceHttpError extends Error {
  readonly code: string;
  constructor(readonly statusCode: number, readonly retryAfterMs?: number) {
    super(`SOURCE_HTTP_${statusCode}`);
    this.name = 'SourceHttpError';
    this.code = this.message;
  }
}
