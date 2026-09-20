import { CmsContentStatus } from '../enums/CmsContentStatus';
import { CmsContentType } from '../enums/CmsContentType';
import {
  CmsContentDto,
  CmsLocalizedContentDto,
  CmsPublishingReadinessDto,
  CmsSeoMetadata,
} from '../entities/CmsContent';

const RAW_ASSET_PATTERN = /^(?:https?:\/\/|data:|file:|[a-zA-Z]:\\|\/)/i;
const CMS_BODY_MAX_LENGTH = 250_000;
const HTML_TOKEN_PATTERN = /<[^>]*>/g;
const ALLOWED_SIMPLE_TAG_PATTERN = /^<\/?(?:p|br|strong|em|b|i|u|ul|ol|li|blockquote|h2|h3|h4)\s*\/?>$/i;
const ALLOWED_ANCHOR_PATTERN = /^<a\s+href=(['"])https:\/\/[^'"<>&\s]+\1(?:\s+target=(['"])_blank\2)?(?:\s+rel=(['"])(?:noopener(?:\s+noreferrer)?|noreferrer(?:\s+noopener)?)\3)?\s*>$|^<\/a\s*>$/i;

export class CmsPublishingPolicy {
  public static assertAssetHandle(assetId?: string | null): void {
    if (assetId && RAW_ASSET_PATTERN.test(assetId)) {
      throw new Error('CMS_ASSET_MUST_USE_EAP_HANDLE');
    }
  }

  public static assertSlug(slug: string): void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('CMS_SLUG_INVALID');
    }
  }

  public static assertSafeRichText(body: string): void {
    if (body.length > CMS_BODY_MAX_LENGTH || body.includes('\u0000')) throw new Error('CMS_UNSAFE_RICH_TEXT');
    const tokens = body.match(HTML_TOKEN_PATTERN) || [];
    const withoutTokens = body.replace(HTML_TOKEN_PATTERN, '');
    if (withoutTokens.includes('<') || withoutTokens.includes('>')) throw new Error('CMS_UNSAFE_RICH_TEXT');
    for (const token of tokens) {
      if (!ALLOWED_SIMPLE_TAG_PATTERN.test(token) && !ALLOWED_ANCHOR_PATTERN.test(token)) {
        throw new Error('CMS_UNSAFE_RICH_TEXT');
      }
    }
  }

  public static assertSafeNavigationTarget(targetType: string, targetValue: string): void {
    if (targetType === 'EXTERNAL_URL') {
      let url: URL;
      try { url = new URL(targetValue); } catch { throw new Error('CMS_NAVIGATION_URL_INVALID'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('CMS_NAVIGATION_URL_UNSAFE');
      return;
    }
    if (targetValue.startsWith('//') || /^(?:javascript|data|file):/i.test(targetValue)) {
      throw new Error('CMS_NAVIGATION_TARGET_UNSAFE');
    }
  }

  public static assertAcyclicNavigation(nodes: Array<{ id?: string; parentNodeId?: string | null }>): void {
    const ids = new Set<string>();
    for (const node of nodes) {
      if (!node.id) {
        if (node.parentNodeId) throw new Error('CMS_NAVIGATION_NODE_ID_REQUIRED_FOR_HIERARCHY');
        continue;
      }
      if (ids.has(node.id)) throw new Error('CMS_NAVIGATION_DUPLICATE_NODE_ID');
      ids.add(node.id);
    }
    for (const node of nodes) {
      if (node.parentNodeId && !ids.has(node.parentNodeId)) {
        throw new Error('CMS_NAVIGATION_PARENT_NOT_FOUND');
      }
      if (node.id && node.parentNodeId === node.id) throw new Error('CMS_NAVIGATION_CYCLE');
    }
    const parents = new Map(nodes.filter((node) => node.id).map((node) => [node.id!, node.parentNodeId ?? null]));
    for (const id of parents.keys()) {
      const visited = new Set<string>();
      let cursor: string | null | undefined = id;
      while (cursor) {
        if (visited.has(cursor)) throw new Error('CMS_NAVIGATION_CYCLE');
        visited.add(cursor);
        cursor = parents.get(cursor);
      }
    }
  }

  public static assertRedirect(sourcePath: string, destinationPath: string): void {
    const paths = [sourcePath, destinationPath];
    if (paths.some((value) => !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value) || /%(?:2f|5c)/i.test(value))) {
      throw new Error('CMS_REDIRECT_PATH_INVALID');
    }
    if (sourcePath === destinationPath) throw new Error('CMS_REDIRECT_LOOP');
  }


  public static canonicalPath(locale: string, contentType: CmsContentType | string, slug: string): string {
    this.assertSlug(slug);
    const route: Record<CmsContentType, string> = {
      [CmsContentType.ARTICLE]: 'articles',
      [CmsContentType.STUDY_GUIDE]: 'study-guides',
      [CmsContentType.NEWS]: 'news',
      [CmsContentType.FAQ]: 'faqs',
      [CmsContentType.CHECKLIST]: 'checklists',
      [CmsContentType.STATIC_PAGE]: 'pages',
      [CmsContentType.LANDING_PAGE]: 'landing',
    };
    const segment = route[contentType as CmsContentType];
    if (!segment) throw new Error('CMS_CONTENT_TYPE_ROUTE_UNSUPPORTED');
    const normalizedLocale = locale.trim().toLocaleLowerCase('en');
    if (!/^[a-z]{2}(?:-[a-z0-9]{2,8})?$/i.test(normalizedLocale)) throw new Error('CMS_LOCALE_INVALID');
    return `/${normalizedLocale}/${segment}/${slug}`;
  }

  /** Backward-compatible alias used by older policy tests/callers. */
  public static assertNavigationTarget(targetType: string, targetValue: string): void {
    this.assertSafeNavigationTarget(targetType, targetValue);
  }

  public static aggregateRootStatus(states: readonly CmsContentStatus[]): CmsContentStatus {
    if (states.includes(CmsContentStatus.PUBLISHED)) return CmsContentStatus.PUBLISHED;
    if (states.includes(CmsContentStatus.SCHEDULED)) return CmsContentStatus.SCHEDULED;
    if (states.includes(CmsContentStatus.READY_TO_PUBLISH)) return CmsContentStatus.READY_TO_PUBLISH;
    if (states.includes(CmsContentStatus.IN_REVIEW)) return CmsContentStatus.IN_REVIEW;
    if (states.length > 0 && states.every((state) => state === CmsContentStatus.ARCHIVED)) return CmsContentStatus.ARCHIVED;
    return CmsContentStatus.DRAFT;
  }

  public static assertBlockPayload(
    payload: Record<string, unknown>,
    fieldSchema: unknown,
    assetFields: unknown,
  ): void {
    this.validateSchemaNode(payload, fieldSchema, '$');
    for (const key of Array.isArray(assetFields) ? assetFields : []) {
      const value = payload[String(key)];
      if (Array.isArray(value)) {
        for (const item of value) this.assertAssetHandle(typeof item === 'string' ? item : null);
      } else {
        this.assertAssetHandle(typeof value === 'string' ? value : null);
      }
    }
  }

  private static validateSchemaNode(value: unknown, schemaValue: unknown, path: string): void {
    if (!schemaValue || typeof schemaValue !== 'object' || Array.isArray(schemaValue)) {
      throw new Error(`CMS_BLOCK_SCHEMA_INVALID:${path}`);
    }
    const schema = schemaValue as Record<string, unknown>;
    const type = typeof schema.type === 'string' ? schema.type : undefined;
    if (type && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(type)) {
      throw new Error(`CMS_BLOCK_SCHEMA_TYPE_UNSUPPORTED:${path}`);
    }
    const validType = (expected: string, candidate: unknown): boolean => {
      if (expected === 'array') return Array.isArray(candidate);
      if (expected === 'object') return Boolean(candidate && typeof candidate === 'object' && !Array.isArray(candidate));
      if (expected === 'integer') return typeof candidate === 'number' && Number.isInteger(candidate);
      if (expected === 'number') return typeof candidate === 'number' && Number.isFinite(candidate);
      if (expected === 'null') return candidate === null;
      return typeof candidate === expected;
    };
    if (type && !validType(type, value)) throw new Error(`CMS_BLOCK_FIELD_TYPE_INVALID:${path}`);
    if (Array.isArray(schema.enum) && !schema.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) {
      throw new Error(`CMS_BLOCK_FIELD_ENUM_INVALID:${path}`);
    }
    if (Object.prototype.hasOwnProperty.call(schema, 'const') && JSON.stringify(schema.const) !== JSON.stringify(value)) {
      throw new Error(`CMS_BLOCK_FIELD_CONST_INVALID:${path}`);
    }
    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) throw new Error(`CMS_BLOCK_FIELD_MIN_LENGTH:${path}`);
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) throw new Error(`CMS_BLOCK_FIELD_MAX_LENGTH:${path}`);
    }
    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) throw new Error(`CMS_BLOCK_FIELD_MINIMUM:${path}`);
      if (typeof schema.maximum === 'number' && value > schema.maximum) throw new Error(`CMS_BLOCK_FIELD_MAXIMUM:${path}`);
    }
    if (Array.isArray(value)) {
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) throw new Error(`CMS_BLOCK_FIELD_MIN_ITEMS:${path}`);
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) throw new Error(`CMS_BLOCK_FIELD_MAX_ITEMS:${path}`);
      if (schema.items !== undefined) value.forEach((item, index) => this.validateSchemaNode(item, schema.items, `${path}[${index}]`));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const properties = schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
        ? schema.properties as Record<string, unknown>
        : {};
      const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];
      for (const key of required) {
        if (!(key in record) || record[key] === undefined || record[key] === null || record[key] === '') {
          throw new Error(`CMS_BLOCK_FIELD_REQUIRED:${path}.${key}`);
        }
      }
      const allowAdditional = schema.additionalProperties === true;
      for (const [key, child] of Object.entries(record)) {
        const childSchema = properties[key];
        if (!childSchema) {
          if (!allowAdditional) throw new Error(`CMS_BLOCK_FIELD_UNDECLARED:${path}.${key}`);
          continue;
        }
        this.validateSchemaNode(child, childSchema, `${path}.${key}`);
      }
    }
  }

  public static readiness(
    content: CmsContentDto,
    localized: CmsLocalizedContentDto,
  ): CmsPublishingReadinessDto {
    const missing: string[] = [];
    const warnings: string[] = [];
    const seo = localized.seoMetadata as CmsSeoMetadata | null | undefined;
    if (!localized.title.trim()) missing.push('title');
    if (!localized.summary?.trim()) missing.push('summary');
    if (!localized.body.trim()) missing.push('body');
    if (!content.categoryId && !content.categorySlug) missing.push('category');
    if (!localized.localizedSlug.trim()) missing.push('localizedSlug');
    if (!seo?.title?.trim()) missing.push('seo.title');
    if (!seo?.description?.trim()) missing.push('seo.description');
    if (!content.featuredAssetId && !localized.featuredAssetId) warnings.push('featuredAssetId');
    if ((seo?.title?.length ?? 0) > 65) warnings.push('seo.title.length');
    if ((seo?.description?.length ?? 0) > 170) warnings.push('seo.description.length');
    return { ready: missing.length === 0, missing, warnings };
  }

  public static assertTransition(current: CmsContentStatus, next: CmsContentStatus): void {
    if (current === next) return;
    const allowed: Record<CmsContentStatus, CmsContentStatus[]> = {
      [CmsContentStatus.DRAFT]: [CmsContentStatus.IN_REVIEW],
      [CmsContentStatus.IN_REVIEW]: [CmsContentStatus.DRAFT, CmsContentStatus.READY_TO_PUBLISH],
      [CmsContentStatus.READY_TO_PUBLISH]: [
        CmsContentStatus.DRAFT,
        CmsContentStatus.SCHEDULED,
        CmsContentStatus.PUBLISHED,
      ],
      [CmsContentStatus.SCHEDULED]: [CmsContentStatus.DRAFT, CmsContentStatus.PUBLISHED],
      [CmsContentStatus.PUBLISHED]: [CmsContentStatus.DRAFT, CmsContentStatus.ARCHIVED],
      [CmsContentStatus.ARCHIVED]: [CmsContentStatus.DRAFT],
    };
    if (!allowed[current].includes(next)) throw new Error('CMS_INVALID_LIFECYCLE_TRANSITION');
  }

  public static assertMakerChecker(authorId: string, reviewerId: string): void {
    if (authorId === reviewerId) throw new Error('CMS_MAKER_CHECKER_VIOLATION');
  }
}
