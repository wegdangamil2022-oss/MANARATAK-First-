import { describe, expect, it } from 'vitest';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { SourceAcquisitionLimiter } from '../../src/import-foundation/SourceAcquisitionLimiter';
function source(id: string, minimumDelayMs = 0) { return new ImportSourceDefinition({ sourceId: id, displayName: id, baseUrl: `https://${id}.example.com`, category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, rateLimitPerMinute: 60, connectorId: 'official-api', connectorVersion: '2.0.0', metadata: { rateLimitPolicy: { requestsPerMinute: 60, burstLimit: 2, minimumDelayMs } } }); }
describe('SourceAcquisitionLimiter', () => {
  it('allows a burst of two and deterministically delays the third until a token recovers', async () => { let now = 0; const waits: number[] = []; const limiter = new SourceAcquisitionLimiter(() => now, async (ms) => { waits.push(ms); now += ms; }); const value = source('a'); await limiter.wait(value); await limiter.wait(value); await limiter.wait(value); expect(waits).toEqual([1000]); now += 1000; await limiter.wait(value); expect(waits).toEqual([1000]); });
  it('enforces minimum delay and isolates sources', async () => { let now = 0; const waits: number[] = []; const limiter = new SourceAcquisitionLimiter(() => now, async (ms) => { waits.push(ms); now += ms; }); await limiter.wait(source('a', 500)); await limiter.wait(source('b', 500)); await limiter.wait(source('a', 500)); expect(waits).toEqual([500]); });
  it('serializes simultaneous requests to the same upstream across different source IDs', async () => {
    let now = 0;
    const waits: number[] = [];
    const limiter = new SourceAcquisitionLimiter(() => now, async ms => { waits.push(ms); now += ms; });
    const first = source('shared');
    const alias = new ImportSourceDefinition({ ...first, sourceId: 'alias' });
    await Promise.all(Array.from({ length: 6 }, (_, index) => limiter.wait(index % 2 ? first : alias)));
    expect(waits).toEqual([1000, 1000, 1000, 1000]);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid request budgets %s before sleeping', async rpm => {
    const configured = new ImportSourceDefinition({ ...source('invalid'), metadata: { rateLimitPolicy: { requestsPerMinute: rpm } } });
    await expect(new SourceAcquisitionLimiter().wait(configured)).rejects.toThrow('SOURCE_RATE_LIMIT_POLICY_INVALID');
  });
  it('defers long throttles rather than issuing a request before its cooldown', async () => {
    let now = 0;
    const limiter = new SourceAcquisitionLimiter(() => now, async ms => { now += ms; });
    const configured = new ImportSourceDefinition({ ...source('slow'), metadata: { rateLimitPolicy: { requestsPerMinute: 1 } } });
    await limiter.wait(configured);
    await expect(limiter.wait(configured)).rejects.toThrow('SOURCE_RATE_LIMIT_DEFERRED');
    expect(now).toBe(0);
  });

});
