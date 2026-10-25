import { createHash } from 'node:crypto';
import { CourseSourceIdentityStrategy, type ExternalCourseProviderDto } from '@manaratak/domain';
import { CourseProviderNativeKeyAdapters } from './CourseProviderNativeKeyAdapters';
const TRACKING_QUERY_KEYS = new Set(['gclid', 'fbclid', 'mc_cid', 'mc_eid']);

const LANGUAGE_VERSION_ALIASES = new Map<string, string>([
  ['english', 'en'], ['eng', 'en'], ['en', 'en'],
  ['spanish', 'es'], ['spa', 'es'], ['es', 'es'],
  ['french', 'fr'], ['fra', 'fr'], ['fre', 'fr'], ['fr', 'fr'],
  ['arabic', 'ar'], ['ara', 'ar'], ['ar', 'ar'],
  ['german', 'de'], ['deu', 'de'], ['ger', 'de'], ['de', 'de'],
  ['portuguese', 'pt'], ['por', 'pt'], ['pt', 'pt'],
  ['italian', 'it'], ['ita', 'it'], ['it', 'it'],
  ['japanese', 'ja'], ['jpn', 'ja'], ['ja', 'ja'],
  ['chinese', 'zh'], ['zho', 'zh'], ['chi', 'zh'], ['zh', 'zh'],
  ['korean', 'ko'], ['kor', 'ko'], ['ko', 'ko'],
  ['russian', 'ru'], ['rus', 'ru'], ['ru', 'ru'],
  ['dutch', 'nl'], ['nld', 'nl'], ['dut', 'nl'], ['nl', 'nl'],
  ['turkish', 'tr'], ['tur', 'tr'], ['tr', 'tr'],
  ['hindi', 'hi'], ['hin', 'hi'], ['hi', 'hi'],
  ['indonesian', 'id'], ['ind', 'id'], ['id', 'id'],
  ['vietnamese', 'vi'], ['vie', 'vi'], ['vi', 'vi'],
  ['polish', 'pl'], ['pol', 'pl'], ['pl', 'pl'],
]);


/** Shared by manual creation and import: identity normalization must never drift. */
export class CourseSourceIdentityPolicy {
  public static normalizeTitle(value: string): string {
    return value
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase('en-US')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, ' ');
  }

  public static normalizeLanguageVersion(value: string): string {
    const normalized = this.normalizeTextValue(value).toLocaleLowerCase('en-US');
    if (!normalized) return '';
    const locale = normalized.replace(/_/g, '-');
    const alias = LANGUAGE_VERSION_ALIASES.get(locale);
    if (alias) return alias;
    const [base, ...rest] = locale.split('-');
    const canonicalBase = LANGUAGE_VERSION_ALIASES.get(base);
    return canonicalBase && rest.length > 0 ? [canonicalBase, ...rest].join('-') : locale;
  }

  public static normalizeTextValue(value: string): string {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }

  public static normalizeUrl(value: string): string {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') throw new Error('COURSE_DIRECT_URL_HTTPS_REQUIRED');
    if (parsed.username || parsed.password) throw new Error('COURSE_URL_CREDENTIALS_FORBIDDEN');
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLocaleLowerCase('en-US').replace(/\.$/, '');
    if (parsed.port === '443') parsed.port = '';

    const keys = [...parsed.searchParams.keys()];
    for (const key of keys) {
      const lower = key.toLocaleLowerCase('en-US');
      if (lower.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lower)) {
        parsed.searchParams.delete(key);
        continue;
      }
      if (
        lower === 'active-tab' &&
        (parsed.hostname === 'open.edu' || parsed.hostname.endsWith('.open.edu'))
      ) {
        parsed.searchParams.delete(key);
      }
    }

    const sorted = [...parsed.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey),
    );
    parsed.search = '';
    for (const [key, item] of sorted) parsed.searchParams.append(key, item);
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  }


  public static derive(provider: ExternalCourseProviderDto, title: string, language: string, url: string) {
    const normalizedOriginalTitle = this.normalizeTitle(title);
    const languageVersionKey = this.normalizeLanguageVersion(language);
    const normalizedUrl = this.normalizeUrl(url);
    const native = new CourseProviderNativeKeyAdapters().resolve(provider, url);
    const sourceNativeKey = native?.key ?? 'title:' + createHash('sha256').update(normalizedOriginalTitle).digest('hex');
    const identityStrategy = native ? CourseSourceIdentityStrategy.PROVIDER_URL_KEY : CourseSourceIdentityStrategy.PROVISIONAL_TITLE_LANGUAGE;
    const canonicalDedupKey = 'course-src:' + createHash('sha256').update(provider.id + '|' + sourceNativeKey + '|' + languageVersionKey).digest('hex');
    return { providerId: provider.id, sourceNativeKey, identityStrategy, originalTitle: title.trim(), normalizedOriginalTitle, languageVersionKey, currentUrl: url, normalizedUrl, canonicalDedupKey };
  }
}
