import { describe, it, expect } from 'vitest';
import {
  translationWorkspaceState,
  changeTranslationWorkspaceState,
} from '../../src/features/translations/workspaceState';
describe('Translation URL contract', () => {
  it('bounds pages, page sizes, dates, owners and private search length', () => {
    const state = translationWorkspaceState(
      new URLSearchParams({
        domain: 'SERVICE',
        page: '-3',
        pageSize: '1000',
        updatedFrom: '2026-02-31',
        q: 'x'.repeat(121),
        sort: 'sql',
      }),
    );
    expect(state).toMatchObject({
      domain: 'SCHOLARSHIP',
      page: 1,
      pageSize: 20,
      updatedFrom: '',
      sort: 'UPDATED_DESC',
    });
    expect(state.search).toHaveLength(120);
  });
  it('resets paging when a filter changes and preserves other filters and route tab', () => {
    const params = new URLSearchParams('domain=MAJOR&page=9&coverage=MISSING_EN&tab=records');
    expect(changeTranslationWorkspaceState(params, { sort: 'NAME_ASC' }).toString()).toBe(
      'domain=MAJOR&coverage=MISSING_EN&tab=records&sort=NAME_ASC',
    );
    expect(changeTranslationWorkspaceState(params, { tab: 'routes' }).get('page')).toBe('9');
    expect(params.get('page')).toBe('9');
  });
});
