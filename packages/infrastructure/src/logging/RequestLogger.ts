import { IRequestLogger, ILogger, ILogContext } from '@manaratak/core';
import { AuditSecretSanitizer } from '../audit/AuditSecretSanitizer';

export class RequestLogger implements IRequestLogger {
  constructor(
    private readonly logger: ILogger,
    private readonly logContext?: ILogContext
  ) {}

  public logRequest(method: string, url: string, ip?: string, headers?: Record<string, unknown>): void {
    const correlationId = this.logContext?.getCorrelationId();
    const sanitizedHeaders = headers ? AuditSecretSanitizer.sanitize(headers) : undefined;

    this.logger.debug(`Incoming request ${method} ${url}`, {
      method,
      url,
      ip,
      headers: sanitizedHeaders,
      correlationId,
    });
  }

  public logResponse(method: string, url: string, statusCode: number, durationMs: number): void {
    const correlationId = this.logContext?.getCorrelationId();
    const message = `HTTP ${method} ${url} ${statusCode} - ${durationMs}ms`;
    const context = {
      method,
      url,
      statusCode,
      durationMs,
      correlationId,
    };

    if (statusCode >= 500) {
      this.logger.error(message, undefined, context);
    } else if (statusCode >= 400) {
      this.logger.warn(message, context);
    } else {
      this.logger.info(message, context);
    }
  }
}
