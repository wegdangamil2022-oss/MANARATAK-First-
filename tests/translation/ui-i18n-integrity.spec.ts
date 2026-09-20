import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ar as webAr } from '../../apps/web/src/i18n/ar';
import { en as webEn } from '../../apps/web/src/i18n/en';
import { ar as adminAr } from '../../apps/admin/src/i18n/ar';
import { en as adminEn } from '../../apps/admin/src/i18n/en';

function sortedKeys(dictionary: Record<string, string>): string[] {
  return Object.keys(dictionary).sort();
}

function literalTranslationKeys(source: string): string[] {
  const keys = new Set<string>();
  const pattern = /\bt\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const match of source.matchAll(pattern)) {
    keys.add(match[1]);
  }

  return [...keys].sort();
}

function missingKeys(
  sourcePath: string,
  dictionary: Record<string, string>,
): string[] {
  const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
  return literalTranslationKeys(source).filter((key) => !(key in dictionary));
}

describe('UI translation integrity', () => {
  it('keeps Web Arabic and English dictionary keys in parity', () => {
    expect(sortedKeys(webAr)).toEqual(sortedKeys(webEn));
  });

  it('keeps Admin Arabic and English dictionary keys in parity', () => {
    expect(sortedKeys(adminAr)).toEqual(sortedKeys(adminEn));
  });

  it('resolves every literal Web shell translation key in both dictionaries', () => {
    const sourcePath = 'apps/web/src/router/index.tsx';

    expect(missingKeys(sourcePath, webEn)).toEqual([]);
    expect(missingKeys(sourcePath, webAr)).toEqual([]);
  });

  it('resolves every literal Admin shell translation key in both dictionaries', () => {
    const sourcePath = 'apps/admin/src/App.tsx';

    expect(missingKeys(sourcePath, adminEn)).toEqual([]);
    expect(missingKeys(sourcePath, adminAr)).toEqual([]);
  });

  it('removes the legacy languageText helper from the canonical Admin shell', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/admin/src/App.tsx'),
      'utf8',
    );

    expect(source).not.toMatch(/\blanguageText\s*\(/);
  });

  it('does not embed bilingual user-facing copy ternaries in the Web shell', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/web/src/router/index.tsx'),
      'utf8',
    );

    expect(source).not.toMatch(
      /language\s*===\s*['"]ar['"]\s*\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]+['"]/,
    );
  });
});
