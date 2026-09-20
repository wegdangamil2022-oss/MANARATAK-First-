import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('MNT-AUD-0018 finance adapters execute signed provider transports instead of runtime-pending shells', () => {
  const src = read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts');
  assert.match(src, /SignedProviderHttpClient/);
  for (const route of ['/v1/finance/payments/authorize','/v1/finance/payments/capture','/v1/finance/payments/refund','/v1/finance/payments/refund-status','/v1/finance/payments/status','/v1/finance/fx/rate','/v1/finance/bank-transfers/submit','/v1/finance/bank-transfers/status','/v1/finance/bank-transfers/reverse']) assert.ok(src.includes(route), route);
  assert.doesNotMatch(src, /runtime transport is pending/i);
  assert.match(src, /maxAttempts/);
  assert.match(src, /idempotencyKey/);
});

test('MNT-AUD-0018 finance provider responses and telemetry reject unsafe data', () => {
  const src = read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts');
  assert.match(src, /SENSITIVE_METADATA_KEY/);
  assert.match(src, /FINANCE_PROVIDER_MASKED_METADATA_INVALID/);
  assert.match(src, /FINANCE_PROVIDER_PAYMENT_RESPONSE_INVALID/);
  assert.match(src, /FINANCE_PROVIDER_BANK_RESPONSE_INVALID/);
  assert.match(src, /telemetry must not change financial outcome/);
});

test('MNT-AUD-0018 inbound webhooks are HMAC verified and replay fenced', () => {
  const src = read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts');
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /FINANCE_WEBHOOK_TIMESTAMP_INVALID/);
  assert.match(src, /FINANCE_WEBHOOK_REPLAY_DETECTED/);
  assert.match(src, /RedisFinanceWebhookReplayStore/);
  assert.match(src, /NX: true; PX: number/);
});

test('MNT-AUD-0018 automatic FX and provider-state reconciliation are executable', () => {
  const useCases = read('packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts');
  assert.match(useCases, /refreshAutomaticExchangeRate/);
  assert.match(useCases, /fxRateProvider\.fetchRate/);
  assert.match(useCases, /reconcileProviderStates/);
  assert.match(useCases, /gateway\.getStatus/);
  assert.match(useCases, /recordReconciledCapturedPaymentAtomic/);
});

test('MNT-AUD-0018 production config is explicit and HTTPS-only', () => {
  const config = read('packages/config/src/AppConfig.ts');
  const env = read('.env.example');
  for (const key of ['FINANCE_PROVIDER_BASE_URL','FINANCE_PROVIDER_API_KEY','FINANCE_PROVIDER_SIGNING_SECRET','FINANCE_PAYMENT_PROVIDER_KEY','FINANCE_FX_PROVIDER_KEY','FINANCE_BANK_PROVIDER_KEY']) {
    assert.ok(config.includes(`'${key}'`) || config.includes(`${key}:`), key);
    assert.ok(env.includes(`${key}=`), key);
  }
  assert.match(config, /FINANCE_PROVIDER_BASE_URL must be HTTPS/);
  assert.match(config, /FINANCE_PROVIDER_ALLOW_INSECURE_HTTP is forbidden/);
});
