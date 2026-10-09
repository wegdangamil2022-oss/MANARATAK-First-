import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import type https from 'node:https';
import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import { NodePinnedSourceRequestExecutor, NodeSafeSourceHttpTransport, type IPinnedSourceRequestExecutor, type PinnedSourceRequest, type PinnedSourceResponse } from '../../src/import-foundation/network/NodeSafeSourceHttpTransport'; import { SourceNetworkSecurityPolicy } from '../../src/import-foundation/network/SourceNetworkSecurityPolicy';
const source = new ImportSourceDefinition({ sourceId: 's', displayName: 'S', baseUrl: 'https://safe.example/catalog/', category: SourceConnectorCategory.OFFICIAL_API, accessClassification: SourceAccessClassification.PUBLIC_ALLOWED, status: SourceStatus.ACTIVE, connectorId: 'official-api', connectorVersion: '2.0.0', metadata: { allowedUrlScope: { allowedOrigins: ['https://safe.example'], allowedPathPrefixes: ['/catalog/'] } } });
class FakeExecutor implements IPinnedSourceRequestExecutor { calls: PinnedSourceRequest[] = []; constructor(private readonly responses: Array<PinnedSourceResponse | Error>) {} async execute(request: PinnedSourceRequest) { this.calls.push(request); const value = this.responses.shift(); if (value instanceof Error) throw value; if (!value) throw new Error('NO_FIXTURE'); return value; } }
const policy = (address = '93.184.216.34') => new SourceNetworkSecurityPolicy({ resolve: async (hostname) => hostname === 'private.example' ? ['127.0.0.1'] : [address] }); const redirect = (location?: string): PinnedSourceResponse => ({ statusCode: 302, location, rawBytes: new Uint8Array() }); const ok: PinnedSourceResponse = { statusCode: 200, rawBytes: new Uint8Array([1]) };
describe('NodeSafeSourceHttpTransport offline behavior', () => {
  it('blocks restricted sources even if a caller invokes raw transport without connector selection', async () => {
    for (const [classification, reason] of [
      [SourceAccessClassification.MANUAL_ONLY, 'SOURCE_MANUAL_ONLY_NETWORK_FORBIDDEN'],
      [SourceAccessClassification.AUTHORIZED_ACCOUNT, 'SOURCE_AUTHORIZED_ACCOUNT_CAPABILITY_REQUIRED'],
      [SourceAccessClassification.DATA_AGREEMENT, 'SOURCE_DATA_AGREEMENT_APPROVAL_REQUIRED'],
      [SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED, 'SOURCE_ROBOTS_POLICY_DECISION_REQUIRED'],
    ] as const) {
      const executor = new FakeExecutor([ok]);
      const restricted = new ImportSourceDefinition({
        ...source, accessClassification: classification,
        metadata: { approved: true, ...source.metadata },
      });
      await expect(new NodeSafeSourceHttpTransport(policy(), executor).get(restricted, {}))
        .rejects.toThrow(reason);
      expect(executor.calls).toHaveLength(0);
    }
  });
  it('preserves Retry-After seconds, ignores invalid advice and retains long cooldowns', async () => {
    for (const [header, expected] of [['7', 7000], ['120', 120000], ['invalid', undefined], ['-1', undefined]] as const) {
      const executor = new FakeExecutor([{ ...ok, statusCode: 429, retryAfter: header }]);
      const result = await new NodeSafeSourceHttpTransport(policy(), executor).get(source, {});
      expect(result.retryAfterMs).toBe(expected);
    }
  });
  it('follows same-scope redirects and pins the validated address', async () => { const executor = new FakeExecutor([redirect('/catalog/final'), ok]); const result = await new NodeSafeSourceHttpTransport(policy(), executor).get(source, {}); expect(result.finalUrl).toBe('https://safe.example/catalog/final'); expect(executor.calls.map((call) => call.pinnedAddress)).toEqual(['93.184.216.34','93.184.216.34']); });
  it('rejects redirect outside the allowed origin', async () => { await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([redirect('https://evil.example/catalog/a')])).get(source, {})).rejects.toThrow('SOURCE_URL_OUT_OF_SCOPE'); });
  it('rejects redirect resolving to loopback', async () => { const scoped = new ImportSourceDefinition({ ...source, metadata: { allowedUrlScope: { allowedOrigins: ['https://safe.example','https://private.example'], allowedPathPrefixes: ['/catalog/'] } } }); await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([redirect('https://private.example/catalog/a')])).get(scoped, {})).rejects.toThrow('SOURCE_ADDRESS_BLOCKED'); });
  it('enforces redirect limit', async () => { await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor(Array.from({ length: 6 }, () => redirect('/catalog/a')))).get(source, {})).rejects.toThrow('SOURCE_REDIRECT_LIMIT'); });
  it('rejects redirect missing Location', async () => { await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([redirect()])).get(source, {})).rejects.toThrow('SOURCE_REDIRECT_LOCATION_MISSING'); });
  it('propagates bounded size and timeout failures', async () => { await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([new Error('SOURCE_RESPONSE_TOO_LARGE')])).get(source, { maxResponseBytes: 1 })).rejects.toThrow('SOURCE_RESPONSE_TOO_LARGE'); await expect(new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([new Error('SOURCE_REQUEST_TIMEOUT')])).get(source, { timeoutMs: 1 })).rejects.toThrow('SOURCE_REQUEST_TIMEOUT'); });
  it('rejects credentials before execution', async () => { const executor = new FakeExecutor([ok]); await expect(new NodeSafeSourceHttpTransport(policy(), executor).get(source, { targetUrl: 'https://user:secret@safe.example/catalog/a' })).rejects.toThrow('SOURCE_URL_CREDENTIALS_BLOCKED'); expect(executor.calls).toHaveLength(0); });
  it('rejects mapped private IPv6 before execution', async () => { const executor = new FakeExecutor([ok]); await expect(new NodeSafeSourceHttpTransport(policy('::ffff:127.0.0.1'), executor).get(source, {})).rejects.toThrow('SOURCE_ADDRESS_BLOCKED'); expect(executor.calls).toHaveLength(0); });
  it.each(['aborted', 'error'])('fails a truncated response on %s instead of hanging or persisting it', async event => {
    const factory = ((_url: URL, _options: unknown, callback: Function) => {
      const request = Object.assign(new EventEmitter(), {
        setTimeout: () => undefined, destroy: () => undefined,
        end: () => queueMicrotask(() => {
          const response = Object.assign(new EventEmitter(), { headers: {}, statusCode: 200 });
          callback(response); response.emit('data', Buffer.from([1]));
          response.emit(event, new Error('SOURCE_RESPONSE_BROKEN'));
        }),
      });
      return request;
    }) as unknown as typeof https.request;
    await expect(new NodePinnedSourceRequestExecutor(factory).execute({
      url: new URL('https://safe.example/catalog/'), pinnedAddress: '93.184.216.34', timeoutMs: 100, maxBytes: 10,
    })).rejects.toThrow(event === 'aborted' ? 'SOURCE_RESPONSE_ABORTED' : 'SOURCE_RESPONSE_BROKEN');
  });
  it('enforces bytes in the real request executor', async () => { const factory = ((_url: URL, _options: unknown, callback: (response: EventEmitter & { headers: object; statusCode: number }) => void) => { const request = new EventEmitter() as EventEmitter & { setTimeout: () => void; destroy: (error?: Error) => void; end: () => void }; request.setTimeout = () => undefined; request.destroy = (error) => { if (error) request.emit('error', error); }; request.end = () => queueMicrotask(() => { const response = Object.assign(new EventEmitter(), { headers: {}, statusCode: 200 }); callback(response); response.emit('data', Buffer.from([1,2])); response.emit('end'); }); return request; }) as unknown as typeof https.request; await expect(new NodePinnedSourceRequestExecutor(factory).execute({ url: new URL('https://safe.example/catalog/a'), pinnedAddress: '93.184.216.34', timeoutMs: 10, maxBytes: 1 })).rejects.toThrow('SOURCE_RESPONSE_TOO_LARGE'); });
  it('enforces timeout and pins lookup in the real request executor', async () => { let pinned: unknown; const factory = ((_url: URL, options: { lookup: Function }, _callback: Function) => { options.lookup('safe.example', {}, (_error: unknown, address: string) => { pinned = address; }); const request = new EventEmitter() as EventEmitter & { setTimeout: (_ms: number, callback: () => void) => void; destroy: (error?: Error) => void; end: () => void }; request.setTimeout = (_ms, callback) => queueMicrotask(callback); request.destroy = (error) => request.emit('error', error); request.end = () => undefined; return request; }) as unknown as typeof https.request; await expect(new NodePinnedSourceRequestExecutor(factory).execute({ url: new URL('https://safe.example/catalog/a'), pinnedAddress: '93.184.216.34', timeoutMs: 1, maxBytes: 10 })).rejects.toThrow('SOURCE_REQUEST_TIMEOUT'); expect(pinned).toBe('93.184.216.34'); });
});

describe('NodeSafeSourceHttpTransport hard resource ceilings', () => {
  it('clamps caller-provided response size and timeout to hard ceilings', async () => {
    const executor = new FakeExecutor([ok]);
    await new NodeSafeSourceHttpTransport(policy(), executor).get(source, {
      maxResponseBytes: 999 * 1024 * 1024,
      timeoutMs: 999_999,
    });
    expect(executor.calls[0].maxBytes).toBe(10 * 1024 * 1024);
    expect(executor.calls[0].timeoutMs).toBe(30_000);
  });

  it('rejects non-positive or non-integer resource bounds', async () => {
    await expect(
      new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([ok])).get(source, {
        maxResponseBytes: 0,
      }),
    ).rejects.toThrow('SOURCE_MAX_RESPONSE_BYTES_INVALID');
    await expect(
      new NodeSafeSourceHttpTransport(policy(), new FakeExecutor([ok])).get(source, {
        timeoutMs: 1.5,
      }),
    ).rejects.toThrow('SOURCE_TIMEOUT_INVALID');
  });
});
