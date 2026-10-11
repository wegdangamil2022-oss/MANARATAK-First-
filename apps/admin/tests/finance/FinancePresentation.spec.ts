import { describe, it, expect } from 'vitest';
import { financeMoney, financeParseAmount } from '../../src/pages/financePresentation';
import { ar } from '../../src/i18n/ar';
import { en } from '../../src/i18n/en';
describe('finance exact presentation', () => {
  it('preserves large amounts exactly', () => {
    expect(
      financeMoney({ amountMinorUnits: '900719925474099312', currencyCode: 'USD', scale: 2 }),
    ).toBe('9007199254740993.12 USD');
    expect(financeParseAmount('9007199254740993.12', 2)).toBe('900719925474099312');
  });
  it.each(['0', '-1', '1.001', '1e3'])('rejects invalid edited amount %s', (value) =>
    expect(() => financeParseAmount(value, 2)).toThrow(),
  );
  it('provides Arabic and English for every finance dictionary key', () => {
    for (const key of Object.keys(en).filter((k) => k.startsWith('finance_')))
      expect((ar as any)[key], key).toBeTruthy();
  });
});
