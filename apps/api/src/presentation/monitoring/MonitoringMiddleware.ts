import { randomBytes } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { IMonitoringService } from '@manaratak/core';

function normalizedRoute(req: Request): string {
  const raw = `${req.baseUrl || ''}${req.path || '/'}` || '/';
  return raw
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/INS-[A-Za-z0-9-]+/g, '/:publicId')
    .slice(0, 180);
}

export class MonitoringMiddleware {
  private inFlight = 0;
  constructor(private readonly monitoringService: IMonitoringService) {}

  public generate() {
    return (req: Request, res: Response, next: NextFunction) => {
      const started = performance.now();
      const metrics = this.monitoringService.getMetrics();
      const route = normalizedRoute(req);
      const method = req.method.toUpperCase();
      const correlationId = String(req.headers['x-correlation-id'] || randomBytes(12).toString('hex')).slice(0, 128);
      res.setHeader('x-correlation-id', correlationId);
      const span = this.monitoringService.startSpan?.('http.server.request', { 'http.request.method': method, 'http.route': route, 'request.correlation_id': correlationId });
      this.inFlight += 1;
      metrics.setGauge('http.server.inflight', this.inFlight, { route, method });
      metrics.incrementCounter('http.server.requests', 1, { route, method });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
        const status = String(res.statusCode || 0);
        const tags = { route, method, status_class: `${status[0] || '0'}xx` };
        metrics.setGauge('http.server.inflight', this.inFlight, { route, method });
        metrics.recordHistogram('http.server.duration_ms', performance.now() - started, tags);
        if (res.statusCode >= 500) metrics.incrementCounter('http.server.errors', 1, tags);
        span?.setAttribute('http.response.status_code', res.statusCode);
        span?.end(res.statusCode >= 500 ? 'ERROR' : 'OK');
      };
      res.once('finish', finish);
      res.once('close', finish);
      next();
    };
  }
}
