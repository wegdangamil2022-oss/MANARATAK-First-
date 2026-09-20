import { ExternalCourseProviderDto } from '@manaratak/domain';

export interface CourseProviderNativeKeyResolution {
  key: string;
  adapter: string;
}

type Adapter = (url: URL) => string | undefined;

function normalizeNativeId(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function queryKey(name: string, prefix: string): Adapter {
  return (url) => {
    const value = url.searchParams.get(name);
    return value?.trim() ? `${prefix}:${normalizeNativeId(value)}` : undefined;
  };
}

function pathMatch(pattern: RegExp, prefix: string): Adapter {
  return (url) => {
    const match = url.pathname.match(pattern);
    const value = match?.[1];
    return value?.trim() ? `${prefix}:${normalizeNativeId(value)}` : undefined;
  };
}

const moodleCourseId = queryKey('id', 'moodle-course');

const PROVIDER_ADAPTERS: Readonly<Record<string, readonly Adapter[]>> = {
  'ecp-fao-elearning-academy': [moodleCourseId],
  'ecp-saylor-university': [moodleCourseId],
  'ecp-nextgenu': [moodleCourseId],
  'ecp-global-health-learning-center': [moodleCourseId],
  'ecp-google-skillshop': [pathMatch(/\/learn\/courses\/(\d+)(?:\/|$)/i, 'skillshop-course')],
  'ecp-hp-life': [pathMatch(/\/course\/(\d+)(?:[-/]|$)/i, 'hp-life-course')],
  'ecp-jmooc': [pathMatch(/^\/(\d+)\/?$/i, 'jmooc-course')],
  'ecp-wipo-academy': [queryKey('cc', 'wipo-course')],
  'ecp-openhpi': [pathMatch(/\/learn\/([^/?#]+)(?:\/|$)/i, 'openhpi-course')],
  'ecp-ibm-skillsbuild': [pathMatch(/\/activity\/([^/?#]+)(?:\/|$)/i, 'ibm-activity')],
};

const EXPLICIT_NATIVE_ID_FIELDS = [
  'providerCourseId',
  'providerNativeCourseId',
  'sourceNativeId',
  'sourceCourseId',
] as const;

export class CourseProviderNativeKeyAdapters {
  public resolve(
    provider: ExternalCourseProviderDto,
    directCourseUrl: string,
    rawPayload?: Readonly<Record<string, unknown>>,
  ): CourseProviderNativeKeyResolution | undefined {
    for (const field of EXPLICIT_NATIVE_ID_FIELDS) {
      const value = rawPayload?.[field];
      if (typeof value === 'string' && value.trim()) {
        return {
          key: `explicit:${normalizeNativeId(value)}`,
          adapter: `explicit-field:${field}`,
        };
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return {
          key: `explicit:${normalizeNativeId(String(value))}`,
          adapter: `explicit-field:${field}`,
        };
      }
    }

    let parsed: URL;
    try {
      parsed = new URL(directCourseUrl);
    } catch {
      return undefined;
    }

    for (const adapter of PROVIDER_ADAPTERS[provider.publicId] ?? []) {
      const key = adapter(parsed);
      if (key) return { key, adapter: provider.publicId };
    }

    return undefined;
  }
}
