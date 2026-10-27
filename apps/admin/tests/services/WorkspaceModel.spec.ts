import { describe, it, expect } from 'vitest';
import {
  financeGroups,
  operationGroups,
  resolveFinanceView,
  serviceSection,
} from '../../src/features/services-finance/workspaceModel';
import { firstAllowedAdminPath, canAccessAdminPath } from '@manaratak/shared';

describe('Services and Finance workspace navigation policy', () => {
  it('opens requests first only when the role can view them', () => {
    expect(serviceSection(new URLSearchParams(), (p) => p === 'admin:services:requests:view')).toBe(
      'REQUESTS',
    );
    expect(serviceSection(new URLSearchParams(), (p) => p === 'admin:services:manage')).toBe(
      'CATALOG',
    );
    expect(
      serviceSection(new URLSearchParams(), (p) => p === 'admin:services:operations:manage'),
    ).toBe('OPERATIONS');
  });
  it('does not silently substitute an unauthorized explicit deep link', () => {
    expect(
      serviceSection(new URLSearchParams('request=private'), (p) => p === 'admin:services:manage'),
    ).toBeNull();
    expect(
      serviceSection(
        new URLSearchParams('tab=operations'),
        (p) => p === 'admin:services:requests:view',
      ),
    ).toBeNull();
    expect(serviceSection(new URLSearchParams('tab=catalog'), () => true, true)).toBe('REQUESTS');
  });
  it('preserves legacy country and language links to the catalog', () => {
    for (const filter of ['supportedCountryReferenceId', 'supportedLanguageReferenceId']) {
      expect(serviceSection(new URLSearchParams({ [filter]: 'ref-1' }), () => true)).toBe(
        'CATALOG',
      );
      expect(
        serviceSection(
          new URLSearchParams({ [filter]: 'ref-1' }),
          (p) => p === 'admin:services:requests:view',
        ),
      ).toBeNull();
    }
  });
  it('supports the old operation kind alias and covers all ten existing units exactly once', () => {
    expect(serviceSection(new URLSearchParams('kind=pricing'), () => true)).toBe('OPERATIONS');
    const kinds = operationGroups.flatMap((group) => [...group.kinds]);
    expect(operationGroups).toHaveLength(4);
    expect(new Set(kinds).size).toBe(10);
    expect(kinds).toHaveLength(10);
  });
  it.each([
    'overview',
    'accounts',
    'wallets',
    'ledger',
    'invoices',
    'payments',
    'refunds',
    'transfers',
    'rates',
    'approvals',
    'commissions',
    'reconciliation',
    'reports',
    'runtime',
  ])('keeps legacy finance tab %s in exactly one group', (tab) => {
    expect(financeGroups).toHaveLength(7);
    expect(resolveFinanceView(new URLSearchParams({ tab }), true).tab).toBe(tab);
    expect(
      financeGroups.filter((group) => (group.tabs as readonly string[]).includes(tab)),
    ).toHaveLength(1);
  });
  it('keeps section access consistent with login destinations without granting finance or catalog access', () => {
    const permissions = ['admin:services:requests:view'];
    expect(firstAllowedAdminPath(permissions)).toBe('/services');
    expect(canAccessAdminPath('/admin/services/requests/SVC-1', permissions)).toBe(true);
    expect(canAccessAdminPath('/admin/finance', permissions)).toBe(false);
    expect(firstAllowedAdminPath(['admin:services:operations:manage'])).toBe('/services');
  });
});
