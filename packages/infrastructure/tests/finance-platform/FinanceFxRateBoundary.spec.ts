import { describe, expect, it, vi } from 'vitest';
import { EnvironmentFxRateProviderAdapter } from '../../src/finance-platform/ProviderNeutralFinanceGateways';

function providerWithRate(numerator: unknown, denominator: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
    numerator, denominator, sourceCurrency: 'USD', targetCurrency: 'EUR',
    providerReference: 'synthetic-ref', effectiveAt: '2026-01-01T00:00:00.000Z',
  }), { status: 200 }));
  return new EnvironmentFxRateProviderAdapter('synthetic-provider', {
    baseUrl: 'https://example.invalid', apiKey: 'synthetic-key',
    signingSecret: 'x'.repeat(32), fetchImpl: fetchImpl as typeof fetch,
  });
}

describe('external FX rate validation', () => {
  it('accepts canonical positive rates up to 30 digits', async () => {
    const numerator = '9'.repeat(30);
    const rate = await providerWithRate(numerator, '100').fetchRate('USD', 'EUR');
    expect(rate.numerator).toBe(numerator);
    expect(rate.denominator).toBe('100');
  });

  it.each([
    ['9'.repeat(31), '1'],
    ['1', '9'.repeat(31)],
    ['9'.repeat(3_000_000), '1'],
    ['0', '1'],
    ['01', '1'],
    ['1', '-1'],
    [100, '1'],
    ['1', null],
  ])('rejects noncanonical, oversized or non-string rates', async (numerator, denominator) => {
    await expect(providerWithRate(numerator, denominator).fetchRate('USD', 'EUR'))
      .rejects.toThrow('FX_PROVIDER_RATE_INVALID');
  });
});
