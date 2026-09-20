import { ILogger, ILoggerProvider, ILogContext, IConfigurationService, LogLevel, StructuredLogMessage } from '@manaratak/core';
import { PinoLoggerProvider } from './PinoLoggerProvider';
import { AuditSecretSanitizer } from '../audit/AuditSecretSanitizer';

export class LoggerService implements ILogger {
  private readonly provider: ILoggerProvider;
  private readonly logContext?: ILogContext;
  private readonly _config?: IConfigurationService;

  constructor(
    provider?: ILoggerProvider,
    logContext?: ILogContext,
    config?: IConfigurationService
  ) {
    this.provider = provider || new PinoLoggerProvider();
    this.logContext = logContext;
    this._config = config;
  }

  public getConfig(): IConfigurationService | undefined {
    return this._config;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.emit(LogLevel.DEBUG, message, undefined, context);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.emit(LogLevel.INFO, message, undefined, context);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.emit(LogLevel.WARN, message, undefined, context);
  }

  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.emit(LogLevel.ERROR, message, error, context);
  }

  public fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.emit(LogLevel.FATAL, message, error, context);
  }

  private emit(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    const correlationId = this.logContext?.getCorrelationId();
    const sanitizedContext = context ? AuditSecretSanitizer.sanitize(context) : undefined;

    const structuredMessage: StructuredLogMessage = {
      timestamp: new Date().toISOString(),
      level,
      correlationId,
      message,
      context: sanitizedContext,
      error: error
        ? {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
          }
        : undefined,
    };

    this.provider.log(structuredMessage);
  }
}
