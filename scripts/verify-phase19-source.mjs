import { readFileSync } from 'node:fs';

const files = {
  money: 'packages/domain/src/finance-platform/value-objects/MoneyAmount.ts',
  domain: 'packages/domain/src/finance-platform/entities/FinancePlatform.ts',
  repository: 'packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts',
  gateways: 'packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts',
  useCases: 'packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts',
  router: 'apps/api/src/presentation/api/router/FinanceAdminRouter.ts',
  admin: 'apps/admin/src/pages/FinanceAdminPage.tsx',
  schema: 'packages/infrastructure/prisma/schema.prisma',
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, 'utf8')]),
);
const checks = {
  exact_minor_units: source.money.includes('BigInt(') && source.money.includes('amountMinorUnits'),
  balanced_ledger_guard: source.domain.includes('Unbalanced ledger transaction rejected'),
  cross_currency_guard: source.money.includes('assertSameCurrency'),
  immutable_reversal:
    source.repository.includes('reverseLedgerTransaction') &&
    source.repository.includes("businessReferenceType: 'REVERSAL'"),
  atomic_financial_writes:
    source.repository.includes('this.db.$transaction(work') &&
    source.repository.includes("isolationLevel: 'Serializable'"),
  optimistic_concurrency: source.repository.includes('version: current.version'),
  idempotency_hashing:
    source.repository.includes("createHash('sha256')") &&
    source.schema.includes('idempotencyKeyHash'),
  invoice_state_machine:
    source.domain.includes('assertInvoiceTransition') &&
    source.useCases.includes('Only DRAFT invoices can be issued'),
  payment_lifecycle_history:
    source.schema.includes('model FinancePaymentAttemptRecord') &&
    source.repository.includes('PaymentStatus.AUTHORIZED'),
  wallet_ledger_derived:
    source.repository.includes('financialLedgerEntryRecord.findMany') &&
    !source.schema.includes('currentBalance'),
  transfer_state_machine:
    source.domain.includes('Invalid transfer transition') &&
    source.repository.includes("status === 'SETTLED'"),
  maker_checker: source.domain.includes('Maker cannot approve their own financial action'),
  fx_historical_snapshot:
    source.schema.includes('FinanceExchangeRateRecord') && source.domain.includes('rateNumerator'),
  reconciliation:
    source.repository.includes('LEDGER_IMBALANCE') &&
    source.repository.includes('CAPTURE_WITHOUT_POSTING') &&
    source.repository.includes('WALLET_BALANCE_MISMATCH'),
  provider_neutral:
    source.gateways.includes('SignedProviderHttpClient') &&
    source.gateways.includes("capabilityStatus: 'PRODUCTION_CAPABLE' | 'NOT_CONFIGURED'") &&
    source.useCases.includes('PAYMENT_PROVIDER_NOT_CONFIGURED') &&
    source.useCases.includes('FX_PROVIDER_NOT_CONFIGURED'),
  no_raw_pan_fields: !/\b(cardPan|cardNumber|cvv|rawCardData)\b/i.test(source.schema),
  no_production_fake_gateway: !/class\s+(Fake|Mock).*Gateway/.test(source.gateways),
  real_admin_api:
    source.router.includes("'/ledger/transactions'") &&
    source.router.includes("'/reconciliation/run'"),
  arabic_admin_center:
    source.admin.includes('مركز المالية والمدفوعات') && source.admin.includes('#142B5F'),
};
let passed = true;
for (const [name, result] of Object.entries(checks)) {
  console.log(`${name}=${result ? 'PASS' : 'FAIL'}`);
  if (!result) passed = false;
}
console.log(`PHASE19_SOURCE_VERIFIER=${passed ? 'PASS' : 'FAIL'}`);
process.exitCode = passed ? 0 : 1;
