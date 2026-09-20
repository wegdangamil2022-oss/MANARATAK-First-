import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const files = {
  domain: read('packages/domain/src/finance-platform/entities/FinancePlatform.ts'),
  repoContract: read('packages/domain/src/finance-platform/contracts/IFinanceRepository.ts'),
  gateways: read('packages/domain/src/finance-platform/contracts/FinanceGateways.ts'),
  useCases: read('packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts'),
  repository: read('packages/infrastructure/src/finance-platform/PrismaFinanceRepository.ts'),
  safetyGateways: read('packages/infrastructure/src/finance-platform/FinanceSafetyGateways.ts'),
  providerAdapters: read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts'),
  router: read('apps/api/src/presentation/api/router/FinanceAdminRouter.ts'),
  composition: read('apps/api/src/infrastructure/di/container.ts'),
  schema: read('packages/infrastructure/prisma/schema.prisma'),
  migration: read('packages/infrastructure/prisma/migrations/20260825210000_w4_finance_safety_core/migration.sql'),
};

const checks = [
  ['P19-AUTH-001',
    files.router.includes("admin:finance:ledger:post") &&
    files.router.includes("admin:finance:ledger:reverse") &&
    files.useCases.includes("'MANUAL_LEDGER_POST'") &&
    files.repository.includes('consumeApproval(tx, data.approval)')],
  ['P19-SYSTEM-019',
    files.schema.includes('systemManaged Boolean @default(false)') &&
    files.useCases.includes('isReservedAccountIdentity') &&
    files.repository.includes('Reserved system account invariant violation')],
  ['P19-REFDATA-020',
    files.safetyGateways.includes('referenceCurrency.findUnique') &&
    files.safetyGateways.includes('row.minorUnit') &&
    files.useCases.includes('assertCanonicalCurrency') &&
    files.composition.includes('financeCurrencyReferenceGateway')],
  ['P19-FX-021',
    files.useCases.includes('effectiveTo.getTime() <= input.effectiveFrom.getTime()') &&
    files.repository.includes('Invalid exchange-rate effective window') &&
    files.migration.includes('FinanceExchangeRateRecord_effective_window_check')],
  ['P19-FX-012',
    files.useCases.includes("if (input.source === 'AUTOMATIC_PROVIDER')") &&
    files.useCases.includes("throw new Error('FX_AUTOMATIC_PROVIDER_RUNTIME_PENDING')") &&
    files.useCases.includes('approved: false') &&
    files.useCases.includes('activateManualExchangeRate') &&
    files.repository.includes('Manual FX override cannot be approved at creation time') &&
    files.repository.includes('consumeApproval(tx, approval)') &&
    files.domain.includes('BigInt(numerator) <= BigInt(0)')],
  ['P19-FX-011',
    files.repository.includes("source: 'MANUAL_OVERRIDE'") &&
    files.repository.indexOf("source: 'MANUAL_OVERRIDE'") < files.repository.indexOf("source: 'AUTOMATIC_PROVIDER'") &&
    !files.repository.includes("orderBy: [{ source: 'asc' }")],
  ['P19-WALLET-013',
    files.schema.includes('account FinancialAccountRecord @relation') &&
    files.repository.includes("account.type !== 'LIABILITY'") &&
    files.repository.includes('Wallet owner or denomination does not match ledger account')],
  ['P19-XCUR-014',
    files.repository.includes('Transfer wallet/account denomination invariant failed') &&
    files.repository.includes('Wallet projection contains mixed-currency financial records') &&
    files.repository.includes('Ledger account currency mismatch') &&
    files.useCases.includes('Transfer source denomination does not match wallet denomination')],
  ['P19-CREDIT-010',
    files.repository.includes("type: 'CREDIT_NOTE'") &&
    files.repository.includes('credited + units > BigInt(invoice.totalMinorUnits)') &&
    files.repository.includes('dueMinorUnits: remaining.toString()') &&
    files.repository.includes('InvoiceStatus.CREDITED')],
  ['P19-APPROVAL-006',
    files.schema.includes('payloadHash String?') &&
    files.schema.includes('policyReference String?') &&
    files.schema.includes('consumedAt DateTime?') &&
    files.repository.includes('Financial approval binding mismatch') &&
    files.repository.includes('consumedAt: null') &&
    files.repository.includes("isolationLevel: 'Serializable'") &&
    files.repository.includes('Approval decision lost a concurrent state race')],
  ['P19-REVERSAL-015',
    files.schema.includes('reversalOfId String? @unique') &&
    files.schema.includes('@relation("FinancialTransactionReversal"') &&
    files.repository.includes('Financial transaction has already been reversed')],
  ['P19-IDEMP-016',
    files.schema.includes('idempotencyKeyHash String? @unique') &&
    files.schema.includes('requestFingerprint String?') &&
    files.repository.includes('Invoice idempotency key was reused with a different request')],
  ['P19-PAY-008',
    files.schema.includes('@@unique([gatewayProvider, gatewayReference])') &&
    files.repository.includes('Duplicate external payment capture rejected') &&
    files.repository.includes('gatewayDuplicate')],
  ['P19-PAY-007',
    files.useCases.includes('gateway.authorize') &&
    files.useCases.includes('gateway.capture') &&
    files.useCases.includes('PAYMENT_CAPTURE_NOT_PROVEN') &&
    !files.router.includes('gatewayReference: z.string()')],
  ['P19-TRANSFER-002',
    files.repoContract.includes('lockTransferRate') &&
    files.repoContract.includes('calculateTransferFee') &&
    files.repository.includes('FINANCE_TRANSFER_RATE_LOCKED') &&
    files.repository.includes('FINANCE_TRANSFER_FEES_CALCULATED')],
  ['P19-TRANSFER-003',
    files.gateways.includes('getStatus(providerReference') &&
    files.useCases.includes('gateway.submit') &&
    files.useCases.includes('BANK_SETTLEMENT_NOT_PROVEN') &&
    files.repository.includes('Transfer PROCESSING requires bank submission evidence') &&
    files.repository.includes('Transfer SETTLED requires matching provider settlement evidence')],
  ['P19-TRANSFER-004',
    files.schema.includes('settlementTransactionId String? @unique') &&
    files.schema.includes('reversalTransactionId String? @unique') &&
    files.repository.includes("businessReferenceType: 'TRANSFER_REVERSAL'") &&
    files.repository.includes('reversalOfId: original.id') &&
    files.gateways.includes('reverse(providerReference') &&
    files.useCases.includes('BANK_REVERSAL_NOT_PROVEN') &&
    files.repository.includes('Transfer REVERSED requires matching provider reversal evidence')],
  ['P19-TRANSFER-005',
    files.repository.includes("status === 'FAILED' || status === 'CANCELLED' || status === 'REJECTED'") &&
    files.repository.includes("data: { status: 'RELEASED', resolvedAt: new Date() }")],
  ['P19-REFUND-009',
    files.useCases.includes('processRefund') &&
    files.useCases.includes('gateway.refund') &&
    files.repoContract.includes('beginRefundProcessing') &&
    files.repoContract.includes('completeRefundAtomic') &&
    files.repository.includes('FINANCE_REFUND_PROCESSING') &&
    files.repository.includes('FINANCE_REFUND_COMPLETED') &&
    files.repository.includes("businessReferenceType: 'REFUND'")],
  ['P19-INSTALL-017',
    files.useCases.includes('Installment plan requires an issued invoice with outstanding value') &&
    files.useCases.includes('validateInstallmentPlan(invoice.amountDue') &&
    files.useCases.includes('First installment due date must be in the future')],
  ['P19-COMM-018',
    files.useCases.includes('basisPoints') &&
    files.repository.includes('calculationBasisPoints') &&
    files.repository.includes('units !== expected') &&
    files.repository.includes('Commission amount violates payment denomination or policy calculation')],
  ['P19-EST-022',
    files.repoContract.includes('context: FinanceMutationContext') &&
    files.useCases.includes('generateEstimate(') &&
    files.useCases.includes('context(identity)') &&
    files.repository.includes("FINANCE_ESTIMATE_PERSISTED") &&
    files.repository.includes('await this.govern(tx, ctx')],
];

let passed = 0;
for (const [finding, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${finding}`);
  if (ok) passed += 1;
}
console.log(`W4_SOURCE_VERIFIER=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
process.exitCode = passed === checks.length ? 0 : 1;
