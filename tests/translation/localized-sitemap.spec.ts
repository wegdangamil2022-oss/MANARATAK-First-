import { describe, expect, it } from 'vitest';
import {
  generateLocalizedPublicSitemap,
  STATIC_INDEXABLE_PUBLIC_PATHS,
} from '../../scripts/generate-localized-public-sitemap';

describe('localized public sitemap', () => {
  it('contains both supported locales for every static indexable path', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://manaratak.example',
    );

    for (const path of STATIC_INDEXABLE_PUBLIC_PATHS) {
      const suffix = path === '/' ? '' : path;

      expect(sitemap).toContain(
        `https://manaratak.example/ar${suffix}`,
      );
      expect(sitemap).toContain(
        `https://manaratak.example/en${suffix}`,
      );
    }
  });

  it('emits hreflang ar, en and x-default alternates', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://manaratak.example',
    );

    expect(sitemap).toContain('hreflang="ar"');
    expect(sitemap).toContain('hreflang="en"');
    expect(sitemap).toContain('hreflang="x-default"');
  });

  it('does not invent dynamic entity URLs', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://manaratak.example',
    );

    expect(sitemap).not.toContain(':slug');
    expect(sitemap).not.toContain('/admin');
    expect(sitemap).not.toContain('/student/');
  });
});
