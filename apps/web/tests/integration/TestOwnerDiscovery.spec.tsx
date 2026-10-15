import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TestOwnerDiscovery } from '../../src/features/public-template/components/TestOwnerDiscovery';
import { ApiClient } from '../../src/api/client';
vi.mock('../../src/api/client', () => ({ ApiClient: { getInternationalTestDiscovery: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
describe('owner discovery collections stay independent', () => {
  it('shows an unavailable tools owner separately from an available paid service', async () => {
    vi.mocked(ApiClient.getInternationalTestDiscovery).mockImplementation(async (_slug, owner) => {
      if (owner === 'STUDENT_TOOLS') throw new Error('offline');
      return {
        ownerDomain: 'SERVICES',
        state: 'AVAILABLE',
        hasMore: false,
        nextCursor: null,
        data: [
          {
            publicId: 'service',
            displayName: 'Advising',
            href: '/services/advising',
            fulfillmentPolicy: 'CHARGEABLE',
          },
        ],
      };
    });
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(<TestOwnerDiscovery slug="exam" />);
    });
    const value = JSON.stringify(view.toJSON());
    expect(value).toContain('Owner links are unavailable');
    expect(value).toContain('Advising');
    expect(value).toContain('Paid service');
    expect(view.root.findByType('a').props.href).toBe('/services/advising');
    await act(async () => view.unmount());
  });
});
