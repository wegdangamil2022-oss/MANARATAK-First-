import pino, { Logger as PinoLogger } from 'pino';
import { ILoggerProvider, StructuredLogMessage, LogLevel } from '@manaratak/core';
import { AuditSecretSanitizer } from '../audit/AuditSecretSanitizer';

export class PinoLoggerProvider implements ILoggerProvider {
  private readonly pinoInstance: PinoLogger;

  constructor(pinoInstanceOrOpts?: PinoLogger | { level?: string; destination?: any }) {
    if (pinoInstanceOrOpts && typeof (pinoInstanceOrOpts as any).info === 'function') {
      this.pinoInstance = pinoInstanceOrOpts as PinoLogger;
    } else {
      const opts = (pinoInstanceOrOpts as { level?: string; destination?: any }) || {};
      const level = opts.level || 'info';
      this.pinoInstance = pino({
        level,
        timestamp: pino.stdTimeFunctions.isoTime,
        base: undefined,
      }, opts.destination);
    }
  }

  public log(message: StructuredLogMessage): void {
    const sanitizedContext = message.context ? AuditSecretSanitizer.sanitize(message.context) : undefined;
    const sanitizedError = message.error
      ? {
          name: message.error.name,
          message: message.error.message,
          stack: message.error.stack,
        }
      : undefined;

    const payload = {
      timestamp: message.timestamp || new Date().toISOString(),
      ...(message.correlationId ? { correlationId: message.correlationId } : {}),
      ...(sanitizedContext ? { context: sanitizedContext } : {}),
      ...(sanitizedError ? { error: sanitizedError } : {}),
    };

    switch (message.level) {
      case LogLevel.DEBUG:
        this.pinoInstance.debug(payload, message.message);
        break;
      case LogLevel.INFO:
        this.pinoInstance.info(payload, message.message);
        break;
      case LogLevel.WARN:
        this.pinoInstance.warn(payload, message.message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.pinoInstance.error(payload, message.message);
        break;
      default:
        this.pinoInstance.info(payload, message.message);
        break;
    }
  }

  public getPinoInstance(): PinoLogger {
    return this.pinoInstance;
  }
}
