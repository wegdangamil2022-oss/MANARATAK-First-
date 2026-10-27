export const serviceSections = ['REQUESTS', 'CATALOG', 'OPERATIONS'] as const;
export type ServiceSection = (typeof serviceSections)[number];
export function serviceSection(
  params: URLSearchParams,
  can: (permission: string) => boolean,
  detail = false,
): ServiceSection | null {
  const allowed: Record<ServiceSection, boolean> = {
    REQUESTS: can('admin:services:requests:view'),
    CATALOG: can('admin:services:manage'),
    OPERATIONS: can('admin:services:operations:manage'),
  };
  const selected =
    detail || params.has('request') || params.get('tab') === 'requests'
      ? 'REQUESTS'
      : params.get('tab') === 'operations' || params.has('operation') || params.has('kind')
        ? 'OPERATIONS'
        : params.get('tab') === 'catalog' ||
            (!params.has('tab') &&
              (params.has('supportedCountryReferenceId') ||
                params.has('supportedLanguageReferenceId')))
          ? 'CATALOG'
          : null;
  if (selected) return allowed[selected] ? selected : null;
  return serviceSections.find((section) => allowed[section]) ?? null;
}
export const operationGroups = [
  { id: 'providers', ar: 'المزودون', en: 'Providers', kinds: ['providers'] },
  {
    id: 'commercial',
    ar: 'الباقات والتسعير',
    en: 'Packages & pricing',
    kinds: ['packages', 'pricing', 'discounts', 'promotions'],
  },
  { id: 'scheduling', ar: 'المواعيد والحجوزات', en: 'Scheduling', kinds: ['slots', 'bookings'] },
  {
    id: 'fulfillment',
    ar: 'التنفيذ والتسليم',
    en: 'Fulfillment',
    kinds: ['workflows', 'executions', 'deliveries'],
  },
] as const;
export const financeGroups = [
  { id: 'overview', ar: 'الملخص المالي', en: 'Overview', tabs: ['overview'] },
  { id: 'daily', ar: 'الحركات اليومية', en: 'Daily transactions', tabs: ['transactions'] },
  {
    id: 'sales',
    ar: 'المبيعات والتحصيل',
    en: 'Sales & collection',
    tabs: ['invoices', 'payments', 'refunds', 'commissions'],
  },
  { id: 'purchases', ar: 'المشتريات والمصروفات', en: 'Purchases & expenses', tabs: ['expenses'] },
  { id: 'cash', ar: 'النقد والبنوك', en: 'Cash & banks', tabs: ['cash', 'transfers', 'wallets'] },
  {
    id: 'accounting',
    ar: 'الحسابات والدفاتر',
    en: 'Accounts & ledger',
    tabs: ['accounts', 'ledger', 'rates'],
  },
  {
    id: 'control',
    ar: 'التقارير والرقابة',
    en: 'Reports & control',
    tabs: ['reports', 'approvals', 'reconciliation', 'runtime'],
  },
] as const;
export type FinanceTab = (typeof financeGroups)[number]['tabs'][number];
export function resolveFinanceView(params: URLSearchParams, manage: boolean) {
  const requested = params.get('tab');
  const group =
    financeGroups.find((group) => (group.tabs as readonly string[]).includes(requested ?? '')) ??
    financeGroups.find((group) => group.id === params.get('group')) ??
    financeGroups[manage ? 0 : 2];
  const tab = (group.tabs as readonly string[]).includes(requested ?? '')
    ? (requested as FinanceTab)
    : group.tabs[0];
  return { group, tab, allowed: manage || tab === 'invoices' };
}
