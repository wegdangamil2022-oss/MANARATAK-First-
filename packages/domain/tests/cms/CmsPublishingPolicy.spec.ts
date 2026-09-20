import { describe, expect, it } from 'vitest';
import { CmsContentStatus, CmsPublishingPolicy } from '../../src';

describe('Phase 16 CMS publishing policy', () => {
  it('enforces maker-checker separation', () => {
    expect(() => CmsPublishingPolicy.assertMakerChecker('editor-1', 'editor-1')).toThrow(
      'CMS_MAKER_CHECKER_VIOLATION',
    );
    expect(() => CmsPublishingPolicy.assertMakerChecker('editor-1', 'publisher-2')).not.toThrow();
  });

  it('does not allow draft content to skip review', () => {
    expect(() =>
      CmsPublishingPolicy.assertTransition(CmsContentStatus.DRAFT, CmsContentStatus.PUBLISHED),
    ).toThrow('CMS_INVALID_LIFECYCLE_TRANSITION');
  });

  it('allows approved content to be scheduled or explicitly published', () => {
    expect(() =>
      CmsPublishingPolicy.assertTransition(
        CmsContentStatus.READY_TO_PUBLISH,
        CmsContentStatus.SCHEDULED,
      ),
    ).not.toThrow();
    expect(() =>
      CmsPublishingPolicy.assertTransition(
        CmsContentStatus.READY_TO_PUBLISH,
        CmsContentStatus.PUBLISHED,
      ),
    ).not.toThrow();
  });

  it('rejects a raw asset source while accepting an EAP identity', () => {
    expect(() => CmsPublishingPolicy.assertAssetHandle('data:image/png;base64,abc')).toThrow(
      'CMS_ASSET_MUST_USE_EAP_HANDLE',
    );
    expect(() => CmsPublishingPolicy.assertAssetHandle('asset_01J8Q4K3EAP')).not.toThrow();
  });

  it('rejects executable rich text while allowing ordinary localized markup', () => {
    expect(() => CmsPublishingPolicy.assertSafeRichText('<script>alert(1)</script>')).toThrow(
      'CMS_UNSAFE_RICH_TEXT',
    );
    expect(() => CmsPublishingPolicy.assertSafeRichText('<p>محتوى عربي آمن</p>')).not.toThrow();
    expect(() => CmsPublishingPolicy.assertSafeRichText('<img src=x onerror=alert(1)>')).toThrow('CMS_UNSAFE_RICH_TEXT');
    expect(() => CmsPublishingPolicy.assertSafeRichText('<a href="javascript&#58;alert(1)">x</a>')).toThrow('CMS_UNSAFE_RICH_TEXT');
    expect(() => CmsPublishingPolicy.assertSafeRichText('<a href="https://example.org/path" target="_blank" rel="noopener noreferrer">آمن</a>')).not.toThrow();
  });

  it('blocks unsafe navigation targets and redirect loops', () => {
    expect(() => CmsPublishingPolicy.assertNavigationTarget('EXTERNAL_URL', 'javascript:alert(1)')).toThrow();
    expect(() => CmsPublishingPolicy.assertNavigationTarget('EXTERNAL_URL', 'http://example.org')).toThrow();
    expect(() => CmsPublishingPolicy.assertRedirect('/ar/old', '/ar/old')).toThrow('CMS_REDIRECT_LOOP');
    expect(() => CmsPublishingPolicy.assertRedirect('/from', '//evil.example')).toThrow();
    expect(() => CmsPublishingPolicy.assertRedirect('/from', '/%2f%2fevil.example')).toThrow();
  });
});

describe('W14 CMS integrity policies', () => {

  it('derives root lifecycle without letting one locale erase another published locale', () => {
    expect(CmsPublishingPolicy.aggregateRootStatus([
      CmsContentStatus.PUBLISHED,
      CmsContentStatus.IN_REVIEW,
    ])).toBe(CmsContentStatus.PUBLISHED);
    expect(CmsPublishingPolicy.aggregateRootStatus([
      CmsContentStatus.ARCHIVED,
      CmsContentStatus.DRAFT,
    ])).toBe(CmsContentStatus.DRAFT);
    expect(CmsPublishingPolicy.aggregateRootStatus([
      CmsContentStatus.ARCHIVED,
      CmsContentStatus.ARCHIVED,
    ])).toBe(CmsContentStatus.ARCHIVED);
  });

  it('generates content-type-aware canonical paths', () => {
    expect(CmsPublishingPolicy.canonicalPath('ar', 'ARTICLE', 'guide')).toBe('/ar/articles/guide');
    expect(CmsPublishingPolicy.canonicalPath('en', 'NEWS', 'update')).toBe('/en/news/update');
    expect(CmsPublishingPolicy.canonicalPath('ar', 'STATIC_PAGE', 'about')).toBe('/ar/pages/about');
  });

  it('rejects orphan navigation parents and longer cycles', () => {
    expect(() => CmsPublishingPolicy.assertAcyclicNavigation([
      { id: 'a', parentNodeId: 'missing' },
    ])).toThrow('CMS_NAVIGATION_PARENT_NOT_FOUND');
    expect(() => CmsPublishingPolicy.assertAcyclicNavigation([
      { id: 'a', parentNodeId: 'c' },
      { id: 'b', parentNodeId: 'a' },
      { id: 'c', parentNodeId: 'b' },
    ])).toThrow('CMS_NAVIGATION_CYCLE');
  });

  it('recursively validates block payloads and rejects undeclared fields', () => {
    const schema = {
      type: 'object',
      required: ['hero'],
      properties: {
        hero: {
          type: 'object',
          required: ['title'],
          properties: { title: { type: 'string', minLength: 2 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    };
    expect(() => CmsPublishingPolicy.assertBlockPayload({ hero: { title: 'OK' } }, schema, [])).not.toThrow();
    expect(() => CmsPublishingPolicy.assertBlockPayload({ hero: { title: 'OK', rogue: true } }, schema, [])).toThrow('CMS_BLOCK_FIELD_UNDECLARED');
    expect(() => CmsPublishingPolicy.assertBlockPayload({ hero: { title: 5 } }, schema, [])).toThrow('CMS_BLOCK_FIELD_TYPE_INVALID');
  });
});
