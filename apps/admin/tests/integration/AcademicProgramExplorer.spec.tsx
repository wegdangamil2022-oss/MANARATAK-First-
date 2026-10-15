import { it, expect, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import {
  AcademicProgramExplorerPanel,
  parseProgramExplorerPage,
} from '../../src/features/integration/AcademicProgramExplorerPanel';
import { adminApiClient } from '../../src/api/client';
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (p: string) => p === 'admin:universities:manage',
  }),
}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const scope = {
  countryReferenceId: 'country',
  locale: 'en' as const,
  visibility: 'PUBLIC' as const,
};
it('rejects explorer data from another filter scope or administrative visibility', () => {
  const data = {
    scope,
    visibility: 'PUBLIC',
    items: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
  };
  expect(parseProgramExplorerPage({ data }, scope).total).toBe(0);
  expect(() =>
    parseProgramExplorerPage(
      { data: { ...data, scope: { ...scope, countryReferenceId: 'other' } } },
      scope,
    ),
  ).toThrow();
  expect(() =>
    parseProgramExplorerPage({ data: { ...data, visibility: 'ADMIN_ALL' } }, scope),
  ).toThrow();
  expect(() => parseProgramExplorerPage({ data: { ...data, hasMore: true } }, scope)).toThrow();
});
it('does not load private program or facet owners with university permission alone', async () => {
  let view!: ReturnType<typeof create>;
  await act(async () => {
    view = create(<AcademicProgramExplorerPanel countryReferenceId="country" />);
  });
  expect(JSON.stringify(view.toJSON())).toContain(
    'requires University, Major and Test owner permissions',
  );
  expect(adminApiClient.request).not.toHaveBeenCalled();
  await act(async () => view.unmount());
});
