import { describe, expect, it } from 'vitest';
import { LogLevel } from '@manaratak/core';
import { LoggerService } from '../../src/logging/LoggerService';
import { PinoLoggerProvider } from '../../src/logging/PinoLoggerProvider';
import { RequestLogger } from '../../src/logging/RequestLogger';

function capture() {
  const entries: string[] = [];
  const provider = new PinoLoggerProvider({ level: 'debug', destination: { write: (line: string) => entries.push(line) } });
  return { provider, logger: new LoggerService(provider), entries };
}

describe('real pino output privacy', () => {
  it('keeps request paths and status while removing all query values from requests, responses and headers', () => {
    const { logger, entries } = capture();
    const requests = new RequestLogger(logger);
    requests.logRequest('GET', '/api/search?q=private-search&category=private-category', '127.0.0.1', {
      referer: 'https://example.invalid/search?q=referrer-search',
      authorization: 'Bearer synthetic-auth-secret',
    });
    requests.logResponse('GET', '/api/search?q=private-search&category=private-category', 200, 7);
    const output = entries.join('');
    for (const value of ['private-search', 'private-category', 'referrer-search', 'synthetic-auth-secret']) expect(output).not.toContain(value);
    const [incoming, response] = entries.map(line => JSON.parse(line));
    expect(incoming.msg).toBe('Incoming request GET /api/search');
    expect(incoming.context.url).toBe('/api/search');
    expect(response.msg).toBe('HTTP GET /api/search 200 - 7ms');
    expect(response.context.url).toBe('/api/search');
    expect(response.context.statusCode).toBe(200);
  });

  it('cleans messages, error details and nested context before emitting real pino output', () => {
    const { logger, entries } = capture();
    const error = new Error('Failed at https://user:synthetic-pass@example.invalid/import?q=private-search token=synthetic-token');
    error.stack = 'Error: Failed token=synthetic-token\n    at /api/search?q=private-search';
    logger.error('Import failed password=synthetic-password', error, {
      nested: ['https://example.invalid/search?q=private-context'],
      detail: 'authorization: Bearer synthetic-auth',
      safe: 'retry scheduled',
    });
    const output = entries.join('');
    for (const value of ['synthetic-pass', 'private-search', 'synthetic-token', 'synthetic-password', 'private-context', 'synthetic-auth']) expect(output).not.toContain(value);
    const entry = JSON.parse(entries[0]);
    expect(entry.msg).toContain('Import failed');
    expect(entry.error.message).toContain('https://example.invalid/import');
    expect(entry.error.stack).toContain('/api/search');
    expect(entry.context.safe).toBe('retry scheduled');
  });

  it('also sanitizes messages sent directly to the pino provider', () => {
    const { provider, entries } = capture();
    provider.log({ level: LogLevel.ERROR, timestamp: new Date().toISOString(),
      message: 'Request /search?q=private-direct failed',
      error: { name: 'Error', message: 'token=direct-secret', stack: 'at /search?q=private-stack' },
    });
    const output = entries.join('');
    expect(output).not.toContain('private-direct');
    expect(output).not.toContain('direct-secret');
    expect(output).not.toContain('private-stack');
    expect(output).toContain('Request /search failed');
  });
});
