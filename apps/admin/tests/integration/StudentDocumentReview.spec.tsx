import { it, expect, vi } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { StudentDocumentReviewPanel } from '../../src/features/integration/StudentDocumentReviewPanel';
import { adminApiClient } from '../../src/api/client';
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) => permission === 'admin:students:support',
  }),
}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('support access does not load private academic documents without the dedicated grant', async () => {
  let view!: ReturnType<typeof create>;
  await act(async () => {
    view = create(<StudentDocumentReviewPanel />);
  });
  expect(JSON.stringify(view.toJSON())).toContain('Document review permission is required');
  expect(adminApiClient.request).not.toHaveBeenCalled();
  await act(async () => view.unmount());
});
