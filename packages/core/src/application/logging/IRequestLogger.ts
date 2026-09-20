export interface IRequestLogger {
  logRequest(method: string, url: string, ip?: string, headers?: Record<string, unknown>): void;
  logResponse(method: string, url: string, statusCode: number, durationMs: number): void;
}
