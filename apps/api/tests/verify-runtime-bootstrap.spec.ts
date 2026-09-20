import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import { createApiApp } from '../src/app';

describe('WP1-C.1 Runtime Bootstrap Verification', () => {
  it('successfully boots runtime, binds port, handles correlated request, redacts secrets, and handles errors', async () => {
    // 1. Capture stdout logs to verify Pino structured logs
    const capturedLogs: any[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    
    process.stdout.write = (chunk: any, encoding?: any, cb?: any) => {
      const str = chunk.toString();
      try {
        if (str.trim().startsWith('{') && str.trim().endsWith('}')) {
          capturedLogs.push(JSON.parse(str.trim()));
        }
      } catch (e) {
        // non-JSON log line
      }
      return originalStdoutWrite(chunk, encoding, cb);
    };

    let server: http.Server | null = null;
    let boundPort = 0;

    try {
      // 2. Boot real API runtime
      const app = await createApiApp({
        resetCache: true,
        connectExternalServices: false,
        databaseClient: { $queryRaw: vi.fn().mockRejectedValue(new Error('database intentionally unavailable in source-only test')) },
      });

      // 3. Confirm binding to port
      await new Promise<void>((resolve, reject) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr = server?.address();
          if (addr && typeof addr === 'object') {
            boundPort = addr.port;
            resolve();
          } else {
            reject(new Error('Failed to retrieve server port'));
          }
        });
      });

      expect(boundPort).toBeGreaterThan(0);

      // 4. Send local HTTP request to an existing safe liveness endpoint.
      const testCorrelationId = 'runtime-verify-corr-8888';
      const secretHeaderValue = 'Bearer super_secret_admin_token_xyz';

      const response1 = await fetch(`http://127.0.0.1:${boundPort}/api/v1/monitoring/health/liveness`, {
        method: 'GET',
        headers: {
          'X-Correlation-ID': testCorrelationId,
          'Authorization': secretHeaderValue,
        },
      });

      expect(response1.status).toBe(200);
      
      // Verify returned X-Correlation-ID
      const returnedCorrelationId = response1.headers.get('x-correlation-id');
      expect(returnedCorrelationId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(returnedCorrelationId).not.toBe(testCorrelationId);

      const body1 = await response1.json();
      expect(body1).toBeDefined();

      // 5. Verify log output for successful request
      const logForReq = capturedLogs.find((l) => l.correlationId === returnedCorrelationId && l.context?.url === '/api/v1/monitoring/health/liveness');
      expect(logForReq).toBeDefined();
      expect(logForReq.correlationId).toBe(returnedCorrelationId);

      // Verify secret redaction in log context
      if (logForReq.context?.headers?.authorization) {
        expect(logForReq.context.headers.authorization).toBe('[REDACTED]');
      }

      // Verify no secret leak in log JSON string representation
      const logString = JSON.stringify(capturedLogs);
      expect(logString).not.toContain('super_secret_admin_token_xyz');

      // 6. Send controlled failing request (malformed JSON to trigger middleware error handled by GlobalExceptionHandler)
      const errorCorrelationId = 'runtime-verify-err-9999';
      const response2 = await fetch(`http://127.0.0.1:${boundPort}/api/v1/monitoring/health/liveness`, {
        method: 'POST',
        headers: {
          'X-Correlation-ID': errorCorrelationId,
          'Content-Type': 'application/json',
        },
        body: '{ malformed json: ',
      });

      expect(response2.status).toBeGreaterThanOrEqual(400);
      const body2 = await response2.json();
      expect(body2.traceId || body2.code).toBeDefined();

      // Verify error log entry uses the server-issued correlation ID.
      const returnedErrorCorrelationId = response2.headers.get('x-correlation-id');
      expect(returnedErrorCorrelationId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(returnedErrorCorrelationId).not.toBe(errorCorrelationId);
      const errorLogs = capturedLogs.filter((l) => l.correlationId === returnedErrorCorrelationId && (l.level >= 40 || l.context?.statusCode >= 400));
      
      expect(errorLogs.length).toBeGreaterThanOrEqual(1);
      expect(errorLogs[0].correlationId).toBe(returnedErrorCorrelationId);

    } finally {
      process.stdout.write = originalStdoutWrite;
      if (server) {
        await new Promise<void>((resolve) => (server as http.Server).close(() => resolve()));
      }
    }
  });
});
