import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialNavigation, publicUrlForState } from './usePublicNavigation';
import { INITIAL_SCHOLARSHIPS, MOCK_UNIVERSITIES } from './data/mockData';

afterEach(() => vi.unstubAllGlobals());

describe('public canonical navigation URLs', () => {
  it('keeps locale and exposes the exact scholarship plus matched section', () => {
    vi.stubGlobal('window', { location: { pathname: '/ar/search' } });
    const url = publicUrlForState({ ...initialNavigation, activeTab: 'search', selectedCategory: 'all', selectedScholarship: INITIAL_SCHOLARSHIPS[0], detailSearchAnchor: 'scholarship-funding', detailSearchTerm: 'التمويل الكامل' });
    expect(url).toContain('/ar/scholarships/csc-china');
    expect(url).toContain('match=');
    expect(url.endsWith('#scholarship-funding')).toBe(true);
  });

  it('creates a direct university URL instead of a category-only URL', () => {
    vi.stubGlobal('window', { location: { pathname: '/search' } });
    expect(publicUrlForState({ ...initialNavigation, activeTab: 'search', selectedUniversity: MOCK_UNIVERSITIES[0] })).toBe('/universities/oxford');
  });

  it('keeps tool information on the public catalog route without stealing the execution route', () => {
    vi.stubGlobal('window', { location: { pathname: '/tools' } });
    expect(publicUrlForState({ ...initialNavigation, activeTab: 'ai-tools', nestedDetailId: 'tool-university-comparison' })).toBe('/tools?detail=tool-university-comparison');
  });
});
