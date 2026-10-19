import { describe, expect, it } from 'vitest';
import {
  generateLocalizedPublicSitemap,
  STATIC_INDEXABLE_PUBLIC_PATHS,
} from '../../scripts/generate-localized-public-sitemap';

describe('localized public sitemap', () => {
  it('contains only released locales for every static indexable path', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://absheer.example',
    );

    for (const path of STATIC_INDEXABLE_PUBLIC_PATHS) {
      const suffix = path === '/' ? '' : path;

      expect(sitemap).toContain(
        `https://absheer.example/ar${suffix}`,
      );
      expect(sitemap).not.toContain(
        `https://absheer.example/en${suffix}`,
      );
    }
  });

  it('emits only released hreflang alternates', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://absheer.example',
    );

    expect(sitemap).toContain('hreflang="ar"');
    expect(sitemap).not.toContain('hreflang="en"');
    expect(sitemap).toContain('hreflang="x-default"');
  });

  it('does not invent dynamic entity URLs', () => {
    const sitemap = generateLocalizedPublicSitemap(
      'https://absheer.example',
    );

    expect(sitemap).not.toContain(':slug');
    expect(sitemap).not.toContain('/admin');
    expect(sitemap).not.toContain('/student/');
  });
});
