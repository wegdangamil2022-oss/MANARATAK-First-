import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReviewedGraphEditor } from './ReviewedGraphEditor';
import { SavedTestCanonicalRelationships } from './SavedTestCanonicalRelationships';

vi.mock('../api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../api/canonicalPickers', () => ({ canonicalPickerApi: {}, canonicalOptionIsSelectable: () => false }));
describe('M10-10 graph editor source rendering (no browser claim)', () => {
  it.each(['PUBLISHED', 'ARCHIVED', 'REJECTED'])('disables review controls on immutable owner %s', status => {
    const html = renderToStaticMarkup(createElement(ReviewedGraphEditor, { ownerId: 'owner', ownerStatus: status, domain: 'TEST', onSaved: vi.fn(), isRtl: false }));
    expect(html).toContain('read only'); expect(html).toContain('<fieldset disabled=""');
  });
  it('does not offer a write for a local catalog identity', () => {
    const html = renderToStaticMarkup(createElement(ReviewedGraphEditor, { ownerId: 'cat-source', ownerStatus: 'READY_TO_REVIEW', domain: 'MAJOR', onSaved: vi.fn(), isRtl: false }));
    expect(html).toContain('<fieldset disabled=""');
  });
  it('requires evidence and reason before offering a save', () => {
    const html = renderToStaticMarkup(createElement(ReviewedGraphEditor, { ownerId: 'owner', ownerStatus: 'READY_TO_REVIEW', domain: 'MAJOR', onSaved: vi.fn(), isRtl: false }));
    expect(html).toContain('Review reason'); expect(html).toContain('Evidence reference'); expect(html).toContain('<button type="submit" disabled=""');
  });
  it('displays saved canonical IDs instead of relationship record IDs and escapes source notes', () => {
    const html = renderToStaticMarkup(createElement(SavedTestCanonicalRelationships, { isRtl: false, test: {
      countryRelationships: [{ id: 'relationship-row', testId: 'owner', canonicalReferenceId: 'canonical-country', relationshipType: 'AVAILABLE', notes: '<script>bad</script>' }],
      academicTaxonomyRelationships: [{ id: 'taxonomy-row', testId: 'owner', taxonomyNodeId: 'canonical-taxonomy', relationshipType: 'RELATED' }],
    } }));
    expect(html).toContain('canonical-country'); expect(html).toContain('canonical-taxonomy'); expect(html).not.toContain('relationship-row'); expect(html).not.toContain('<script>');
  });
});
