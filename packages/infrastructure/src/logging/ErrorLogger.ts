import { IErrorLogger, ILogger, ILogContext } from '@manaratak/core';
import { AuditSecretSanitizer } from '../audit/AuditSecretSanitizer';

export class ErrorLogger implements IErrorLogger {
  constructor(
    private readonly logger: ILogger,
    private readonly logContext?: ILogContext
  ) {}

  public logError(error: Error, context?: Record<string, unknown>): void {
    if ((error as any).__logged) {
      return;
    }
    (error as any).__logged = true;

    const correlationId = this.logContext?.getCorrelationId();
    const sanitizedContext = context ? AuditSecretSanitizer.sanitize(context) : {};

    this.logger.error(error.message, error, {
      ...sanitizedContext,
      correlationId,
    });
  }
}
