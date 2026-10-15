import { afterEach, it, expect, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PublicRelationshipPager } from '../../src/features/public-template/components/PublicRelationshipPager';
import { ApiClient } from '../../src/api/client';
import {
  parsePublicRelationshipGraphPage,
  graphRowHref,
} from '../../src/features/public-template/PublicGraphPageContract';
vi.mock('../../src/api/client', () => ({ ApiClient: { getPublicGraphPage: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('pages one owner collection while preserving independent cursors and locale-prefixed public routes', async () => {
  vi.stubGlobal('window', {
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.mocked(ApiClient.getPublicGraphPage).mockImplementation(
    async (_kind, _key, _locale, cursors) => ({
      subject: { ownerId: 'major', displayName: 'Major' },
      relationships: {
        universities: {
          data: [
            {
              ownerId: cursors?.universityCursor ? 'second' : 'first',
              slug: cursors?.universityCursor ? 'next-university' : 'first-university',
              displayName: 'University',
            },
          ],
        },
        scholarships: { data: [{ ownerId: 'grant', slug: 'grant', displayName: 'Grant' }] },
      },
      readScope: {
        collections: {
          universities: {
            state: 'AVAILABLE',
            total: 60,
            hasMore: !cursors?.universityCursor,
            nextCursor: cursors?.universityCursor ? null : 'university-page-2',
          },
          scholarships: {
            state: 'AVAILABLE',
            total: 30,
            hasMore: true,
            nextCursor: 'scholarship-page-2',
          },
        },
      },
    }),
  );
  let view!: ReactTestRenderer;
  await act(async () => {
    view = create(<PublicRelationshipPager kind="majors" identity="major" />);
  });
  await act(async () => {
    view.root.findAllByType('button')[0].props.onClick();
  });
  await act(async () => {
    view.root
      .findAllByType('button')
      .filter((button) => button.children.includes('Next page'))[0]
      .props.onClick();
  });
  expect(ApiClient.getPublicGraphPage).toHaveBeenLastCalledWith(
    'majors',
    'major',
    'en',
    { universityCursor: 'university-page-2' },
    expect.any(AbortSignal),
  );
  expect(view.root.findAllByType('a')[0].props.href).toBe('/en/universities/next-university');
  await act(async () => {
    view.root
      .findAllByType('button')
      .filter((button) => button.children.includes('Next page'))[1]
      .props.onClick();
  });
  expect(ApiClient.getPublicGraphPage).toHaveBeenLastCalledWith(
    'majors',
    'major',
    'en',
    { universityCursor: 'university-page-2', scholarshipCursor: 'scholarship-page-2' },
    expect.any(AbortSignal),
  );
  await act(async () => view.unmount());
});
it('rejects false continuation and never invents a program or internal-ID public URL', () => {
  expect(() =>
    parsePublicRelationshipGraphPage({
      subject: { ownerId: 'major', displayName: 'Major' },
      relationships: { universities: { data: [] } },
      readScope: {
        collections: { universities: { state: 'AVAILABLE', hasMore: true, nextCursor: null } },
      },
    }),
  ).toThrow();
  expect(graphRowHref('universities', { ownerId: 'internal' }, 'en')).toBeNull();
  expect(
    graphRowHref('academicPrograms', { ownerId: 'program', sourceProgramName: 'Program' }, 'en'),
  ).toBeNull();
  expect(graphRowHref('universities', { slug: '../private' }, 'en')).toBeNull();
});
