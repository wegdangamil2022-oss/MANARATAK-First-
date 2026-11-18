import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FinanceProviderWebhookVerifier } from '../../src/finance-platform/ProviderNeutralFinanceGateways';

const secret = 'synthetic-finance-webhook-secret-not-for-production';
const now = Date.parse('2026-01-01T12:00:00.000Z');
const body = Buffer.from('{"event":"synthetic-payment"}');
const timestamp = new Date(now).toISOString();
const nonce = 'synthetic-nonce-00000001';
const bodyHash = createHash('sha256').update(body).digest('hex');

function signature(providerKey: string) {
  return createHmac('sha256', secret)
    .update([providerKey, timestamp, nonce, bodyHash].join('\n'))
    .digest('hex');
}

describe('finance webhook provider binding', () => {
  it('rejects provider substitution without consuming the authentic event nonce', async () => {
    const claimed = new Set<string>();
    const store = {
      claim: vi.fn(async (providerKey: string, nonceHash: string) => {
        const key = `${providerKey}:${nonceHash}`;
        if (claimed.has(key)) return false;
        claimed.add(key);
        return true;
      }),
    };
    const verifier = new FinanceProviderWebhookVerifier(secret, store, 300_000, () => now);
    const event = {
      providerKey: 'provider-a',
      rawBody: body,
      timestamp,
      nonce,
      signature: signature('provider-a'),
    };

    await expect(verifier.verify({ ...event, providerKey: 'provider-b' })).rejects.toThrow(
      'FINANCE_WEBHOOK_SIGNATURE_INVALID',
    );
    expect(store.claim).not.toHaveBeenCalled();
    await expect(verifier.verify(event)).resolves.toBeUndefined();
    await expect(verifier.verify(event)).rejects.toThrow('FINANCE_WEBHOOK_REPLAY_DETECTED');
  });

  it('rejects legacy signatures that do not authenticate the provider identity', async () => {
    const store = { claim: vi.fn(async () => true) };
    const verifier = new FinanceProviderWebhookVerifier(secret, store, 300_000, () => now);
    const legacySignature = createHmac('sha256', secret)
      .update([timestamp, nonce, bodyHash].join('\n'))
      .digest('hex');

    await expect(
      verifier.verify({
        providerKey: 'provider-b',
        rawBody: body,
        timestamp,
        nonce,
        signature: legacySignature,
      }),
    ).rejects.toThrow('FINANCE_WEBHOOK_SIGNATURE_INVALID');
    expect(store.claim).not.toHaveBeenCalled();
  });

  it('allows separately signed events from different providers to use the same nonce', async () => {
    const claimed = new Set<string>();
    const store = {
      claim: vi.fn(async (providerKey: string, nonceHash: string) => {
        const key = `${providerKey}:${nonceHash}`;
        if (claimed.has(key)) return false;
        claimed.add(key);
        return true;
      }),
    };
    const verifier = new FinanceProviderWebhookVerifier(secret, store, 300_000, () => now);
    const event = {
      providerKey: 'provider-a',
      rawBody: body,
      timestamp,
      nonce,
      signature: signature('provider-a'),
    };

    await expect(
      verifier.verify({ ...event, rawBody: Buffer.from('{"event":"tampered"}') }),
    ).rejects.toThrow('FINANCE_WEBHOOK_SIGNATURE_INVALID');
    expect(store.claim).not.toHaveBeenCalled();
    await expect(verifier.verify(event)).resolves.toBeUndefined();
    await expect(
      verifier.verify({ ...event, providerKey: 'provider-b', signature: signature('provider-b') }),
    ).resolves.toBeUndefined();
  });
});
