import { describe, expect, it, vi } from 'vitest';
import { EnvironmentPaymentGatewayAdapter } from '../../src/finance-platform/ProviderNeutralFinanceGateways';

const request = {
  paymentReference: 'synthetic-payment',
  amount: { currencyCode: 'USD', scale: 2, amountMinorUnits: '100' },
  paymentMethodToken: 'synthetic-token',
  idempotencyKey: 'synthetic-key',
};

function gatewayWithMetadata(metadata: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
    status: 'AUTHORIZED',
    gatewayReference: 'synthetic-reference',
    safeMaskedMetadata: metadata,
  }), { status: 200 }));
  return new EnvironmentPaymentGatewayAdapter('synthetic-provider', {
    baseUrl: 'https://example.invalid',
    apiKey: 'synthetic-key',
    signingSecret: 'x'.repeat(32),
    fetchImpl: fetchImpl as typeof fetch,
  });
}

describe('provider payment metadata boundary', () => {
  it('allows standard constrained, masked metadata through an authorization response', async () => {
    const metadata = { brand: 'Visa', network: 'VISA', last4: '1111', expiryMonth: '12', expiryYear: '2030', funding: 'debit' };
    const result = await gatewayWithMetadata(metadata).authorize(request);
    expect(result.safeMaskedMetadata).toEqual(metadata);
  });

  it.each([
    { label: '4111111111111111' }, // Synthetic payment test value, under an innocent key.
    { note: 'synthetic-provider-secret' },
    { brand: '4111111111111111' },
    { last4: '4111111111111111' },
    { funding: 'synthetic-provider-secret' },
    { expiryMonth: '13' },
    { expiryYear: '2030-extra-secret' },
    { cardNumber: '4111111111111111' },
    { last4: 1111 },
    JSON.parse('{"__proto__":"synthetic"}'),
  ])('rejects unconstrained or sensitive metadata: %#', async (metadata) => {
    await expect(gatewayWithMetadata(metadata).authorize(request))
      .rejects.toThrow('FINANCE_PROVIDER_PROTOCOL_ERROR:payment.authorize');
  });

  it('continues to accept responses without metadata', async () => {
    const result = await gatewayWithMetadata(undefined).authorize(request);
    expect(result.safeMaskedMetadata).toBeUndefined();
  });
});
