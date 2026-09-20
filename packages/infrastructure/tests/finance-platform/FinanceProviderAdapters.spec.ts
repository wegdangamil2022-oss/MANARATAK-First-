import { describe, expect, it } from 'vitest';
import {
  EnvironmentBankTransferGatewayAdapter,
  EnvironmentFxRateProviderAdapter,
  EnvironmentPaymentGatewayAdapter,
} from '../../src/finance-platform/ProviderNeutralFinanceGateways';

describe('provider-neutral finance adapters', () => {
  it('reports absent payment, bank and FX secrets as NOT_CONFIGURED without live calls', async () => {
    delete process.env.TEST_FINANCE_SECRET;
    const payment = new EnvironmentPaymentGatewayAdapter('TEST', 'TEST_FINANCE_SECRET');
    const fx = new EnvironmentFxRateProviderAdapter('TEST_FX', 'TEST_FINANCE_SECRET');
    const bank = new EnvironmentBankTransferGatewayAdapter('TEST_BANK', 'TEST_FINANCE_SECRET');
    expect(payment.isConfigured()).toBe(false);
    expect(fx.isConfigured()).toBe(false);
    expect(bank.isConfigured()).toBe(false);
    await expect(
      payment.authorize({
        paymentReference: 'p',
        amount: { amountMinorUnits: '100', currencyCode: 'USD', scale: 2 },
        paymentMethodToken: 'tok',
        idempotencyKey: 'i',
      }),
    ).rejects.toThrow('NOT_CONFIGURED');
    await expect(fx.fetchRate('USD', 'SAR')).rejects.toThrow('NOT_CONFIGURED');
    await expect(bank.submit('t', 'i')).rejects.toThrow('NOT_CONFIGURED');
  });
});
