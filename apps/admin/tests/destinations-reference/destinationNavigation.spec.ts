import { describe, it, expect } from 'vitest';
import {
  destinationGroups,
  destinationSection,
  destinationRepairTarget,
  destinationListContext,
} from '../../src/features/destinations/destinationNavigation';
describe('destination workspace navigation', () => {
  it('maps ten unique sections into four groups and keeps legacy links usable', () => {
    expect(destinationGroups).toHaveLength(4);
    expect(new Set(destinationGroups.flatMap((g) => [...g.sections])).size).toBe(10);
    expect(destinationSection('relations')).toBe('supporting');
    expect(destinationSection('unknown')).toBe('overview');
    expect(destinationSection('universities')).toBe('universities');
  });
  it('routes English deficiencies to the correct read-only language and semantic card', () => {
    expect(destinationRepairTarget('visa-requirements-en')).toEqual({
      section: 'visa',
      card: 'visa-requirements',
      locale: 'en',
    });
    expect(destinationRepairTarget('student-life-en')).toEqual({
      section: 'living',
      card: 'student-life',
      locale: 'en',
    });
    expect(destinationRepairTarget('cost-highlights-en').section).toBe('living');
    expect(destinationRepairTarget('source-verification').section).toBe('sources');
  });
  it('restores only the local country list context, never an external redirect', () => {
    expect(
      destinationListContext(
        new URLSearchParams({ returnTo: '/study-destinations?q=Yemen&page=2' }),
      ),
    ).toBe('/study-destinations?q=Yemen&page=2');
    for (const value of ['https://evil.example', '//evil.example', '/study-destinations-evil'])
      expect(destinationListContext(new URLSearchParams({ returnTo: value }))).toBe(
        '/study-destinations',
      );
  });
});
