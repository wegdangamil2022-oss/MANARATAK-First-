import { IRequestLogger, ILogger, ILogContext } from '@manaratak/core';
import { sanitizeLogContext } from './LogSanitizer';

export class RequestLogger implements IRequestLogger {
  constructor(
    private readonly logger: ILogger,
    private readonly logContext?: ILogContext
  ) {}

  public logRequest(method: string, url: string, ip?: string, headers?: Record<string, unknown>): void {
    const correlationId = this.logContext?.getCorrelationId();
    const sanitizedHeaders = headers ? sanitizeLogContext(headers) : undefined;
    const path = url.split(/[?#]/, 1)[0] || '/';

    this.logger.debug(`Incoming request ${method} ${path}`, {
      method,
      url: path,
      ip,
      headers: sanitizedHeaders,
      correlationId,
    });
  }

  public logResponse(method: string, url: string, statusCode: number, durationMs: number): void {
    const correlationId = this.logContext?.getCorrelationId();
    const path = url.split(/[?#]/, 1)[0] || '/';
    const message = `HTTP ${method} ${path} ${statusCode} - ${durationMs}ms`;
    const context = {
      method,
      url: path,
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
