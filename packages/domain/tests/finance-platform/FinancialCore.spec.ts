import { describe, expect, it } from 'vitest';
import {
  addMoneyAmounts,
  assertCheckerEligible,
  assertInvoiceTransition,
  assertPaymentTransition,
  assertTransferTransition,
  compareMoneyAmounts,
  convertMoneyExact,
  validateBalancedPostings,
  validateInstallmentPlan,
} from '../../src';

const usd = (amountMinorUnits: string) => ({ amountMinorUnits, currencyCode: 'USD', scale: 2 });

describe('Phase 19 financial core invariants', () => {
  it('uses exact minor units beyond JavaScript safe integer range', () => {
    expect(addMoneyAmounts([usd('900719925474099300'), usd('7')]).amountMinorUnits).toBe(
      '900719925474099307',
    );
  });

  it('accepts balanced double-entry postings', () => {
    expect(() =>
      validateBalancedPostings([
        { accountId: 'cash', direction: 'DEBIT', amount: usd('10000') },
        { accountId: 'revenue', direction: 'CREDIT', amount: usd('10000') },
      ]),
    ).not.toThrow();
  });

  it('rejects unbalanced ledger postings', () => {
    expect(() =>
      validateBalancedPostings([
        { accountId: 'cash', direction: 'DEBIT', amount: usd('10000') },
        { accountId: 'revenue', direction: 'CREDIT', amount: usd('9999') },
      ]),
    ).toThrow('Unbalanced');
  });

  it('rejects implicit cross-currency arithmetic', () => {
    expect(() =>
      compareMoneyAmounts(usd('100'), { amountMinorUnits: '100', currencyCode: 'SAR', scale: 2 }),
    ).toThrow('currencyCode');
  });

  it('performs exchange using exact rational arithmetic', () => {
    expect(convertMoneyExact(usd('10000'), 'SAR', 2, '375', '100').amountMinorUnits).toBe('37500');
  });

  it('enforces transfer sequence and maker-checker', () => {
    expect(() => assertTransferTransition('REQUESTED', 'COMPLETED')).toThrow(
      'Invalid transfer transition',
    );
    expect(() => assertCheckerEligible('user-1', 'user-1', [])).toThrow('Maker');
  });

  it('enforces invoice and payment state machines', () => {
    expect(() => assertInvoiceTransition('DRAFT', 'PAID')).toThrow('Invalid invoice transition');
    expect(() => assertPaymentTransition('PENDING', 'CAPTURED')).toThrow(
      'Invalid payment transition',
    );
    expect(() => assertPaymentTransition('PENDING', 'AUTHORIZED')).not.toThrow();
  });

  it('requires installment sums and due-date order to match the invoice', () => {
    expect(() =>
      validateInstallmentPlan(usd('10000'), [
        { amount: usd('5000'), dueDate: '2026-09-01' },
        { amount: usd('5000'), dueDate: '2026-10-01' },
      ]),
    ).not.toThrow();
    expect(() =>
      validateInstallmentPlan(usd('10000'), [{ amount: usd('9000'), dueDate: '2026-09-01' }]),
    ).toThrow('totals');
  });
});
