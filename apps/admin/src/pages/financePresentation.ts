export type FinanceMoney = { amountMinorUnits: string; currencyCode: string; scale: number };
/** Display exact minor units without lossy IEEE-754 conversions. */
export function financeMoney(amount: FinanceMoney): string {
  const units = BigInt(amount.amountMinorUnits),
    sign = units < 0n ? '-' : '';
  const padded = (units < 0n ? -units : units).toString().padStart(amount.scale + 1, '0');
  return `${sign}${amount.scale ? `${padded.slice(0, -amount.scale)}.${padded.slice(-amount.scale)}` : padded} ${amount.currencyCode}`;
}
export function financeParseAmount(value: string, scale: number): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6 || !/^\d{1,30}(?:\.\d{1,6})?$/.test(value))
    throw new Error('FINANCE_AMOUNT_INVALID');
  const [major, fraction = ''] = value.split('.');
  if (fraction.length > scale) throw new Error('FINANCE_AMOUNT_INVALID');
  const units = BigInt(major + fraction.padEnd(scale, '0')).toString();
  if (!/^[1-9]\d{0,29}$/.test(units)) throw new Error('FINANCE_AMOUNT_INVALID');
  return units;
}
