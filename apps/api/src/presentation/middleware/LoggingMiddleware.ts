import { Request, Response, NextFunction } from 'express';
import { ILogContext, IRequestLogger } from '@manaratak/core';
import crypto from 'crypto';

export class LoggingMiddleware {
  constructor(
    private readonly logContext: ILogContext,
    private readonly requestLogger: IRequestLogger
  ) {}

  public generate = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Correlation identifiers are security/audit identifiers and must not be client-controlled.
      const correlationId = crypto.randomUUID();
      req.headers['x-correlation-id'] = correlationId;

      res.setHeader('X-Correlation-ID', correlationId);
      
      this.logContext.runWithContext(correlationId, () => {
        const startTime = Date.now();
        
        // Log incoming request
        this.requestLogger.logRequest(
          req.method, 
          req.originalUrl, 
          req.ip, 
          req.headers as Record<string, unknown>
        );

        // Hook into response finish to log response
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.requestLogger.logResponse(req.method, req.originalUrl, res.statusCode, duration);
        });

        next();
      });
    };
  }
}
