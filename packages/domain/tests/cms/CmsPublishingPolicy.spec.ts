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
    expect(() => CmsPublishingPolicy.assertRedirect('/ar/old', '/%2e%2e//evil.example')).toThrow();
    expect(() => CmsPublishingPolicy.assertRedirect('/ar/old', '/ar/../evil')).toThrow();
    expect(() => CmsPublishingPolicy.assertRedirect('/ar/old', '/ar/new?next=https://evil.invalid')).toThrow();
  });
});

describe('CMS schema review boundaries', () => {
  const schema = { type: 'object', properties: { hero: { type: 'string', maxLength: 120 } }, required: ['hero'], additionalProperties: false };
  it('accepts bounded declarative schemas and rejects executable/unbounded input', () => {
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(schema, [], ['hero'])).not.toThrow();
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition({
      ...schema, '$ref': 'https://evil.invalid/payload',
    }, [], [])).toThrow('CMS_BLOCK_SCHEMA_KEY_UNSUPPORTED');
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition({
      type: 'object', properties: {}, additionalProperties: true,
    }, [], [])).toThrow('CMS_BLOCK_SCHEMA_OBJECT_UNBOUNDED');
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition({
      type: 'array', items: schema,
    }, [], [])).toThrow('CMS_BLOCK_SCHEMA_ARRAY_UNBOUNDED');
  });
});

describe('CMS-ADM-016 schema field authority', () => {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: {
      cards: {
        type: 'array', maxItems: 10,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            image: { type: 'string', maxLength: 80 },
            title: { type: 'string', maxLength: 200 },
            priority: { type: 'integer' },
          },
        },
      },
    },
  };

  it('resolves asset and translated text paths inside bounded nested arrays', () => {
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      schema, ['cards.image'], ['cards.title'],
    )).not.toThrow();
  });

  it('rejects asset paths that are absent, numeric or unrelated to schema fields', () => {
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      schema, ['cards.missing'], [],
    )).toThrow('CMS_BLOCK_SCHEMA_FIELD_PATH_INVALID');
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      schema, ['cards.priority'], [],
    )).toThrow('CMS_BLOCK_SCHEMA_FIELD_PATH_INVALID');
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      schema, ['cards.image', 'cards.image'], [],
    )).toThrow('CMS_BLOCK_SCHEMA_FIELD_LIST_DUPLICATE');
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      schema, ['cards.title'], ['cards.title'],
    )).toThrow('CMS_BLOCK_SCHEMA_FIELD_LIST_DUPLICATE');
  });

  it('requires an object at the root and bounds oversized payloads', () => {
    expect(() => CmsPublishingPolicy.assertBlockSchemaDefinition(
      { type: 'string', maxLength: 100 }, [], [],
    )).toThrow('CMS_BLOCK_SCHEMA_ROOT_OBJECT_REQUIRED');
    expect(() => CmsPublishingPolicy.assertBlockPayload(
      { cards: [{ title: 'x'.repeat(256_001) }] }, schema, [],
    )).toThrow('CMS_BLOCK_PAYLOAD_TOO_LARGE');
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

  it('rejects unsafe nested asset handles including arrays', () => {
    const payload = { hero: [{image:'https://attacker.invalid/icon.png'}] };
    const fields = ['hero.image'];
    expect(() => CmsPublishingPolicy.extractBlockAssetHandles(payload, fields))
      .not.toThrow();
    expect(() => CmsPublishingPolicy.assertBlockPayload(payload, {
      type:'object', properties:{hero:{type:'array',items:{
        type:'object',properties:{image:{type:'string'}},additionalProperties:false
      }}},additionalProperties:false
    }, fields)).toThrow('CMS_ASSET_MUST_USE_EAP_HANDLE');
    expect(CmsPublishingPolicy.extractBlockAssetHandles({hero:[{image:'eap-123'}]},fields))
      .toEqual(['eap-123']);
    expect(() => CmsPublishingPolicy.extractBlockAssetHandles({},['__proto__.image']))
      .toThrow('CMS_BLOCK_ASSET_FIELD_INVALID');
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
