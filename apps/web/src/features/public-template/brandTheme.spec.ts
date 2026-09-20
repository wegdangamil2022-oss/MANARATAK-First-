import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const featureRoot = resolve(process.cwd(), 'apps/web/src/features/public-template');
const themeSource = readFileSync(join(featureRoot, 'template.css'), 'utf8');

function themeTokens(selector: string): Record<string, string> {
  const block = themeSource.slice(themeSource.indexOf(selector) + selector.length).split('}')[0];
  return Object.fromEntries([...block.matchAll(/(--mn-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
function resolveToken(tokens: Record<string, string>, key: string): string {
  const value = tokens[key];
  if (!value) throw new Error(`Missing theme token: ${key}`);
  const ref = value.match(/^var\((--mn-[\w-]+)\)$/);
  return ref ? resolveToken(tokens, ref[1]) : value;
}
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string): number {
  const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l[0] + 0.05) / (l[1] + 0.05);
}

function publicTemplateSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return publicTemplateSources(path);
    if (!/\.(css|tsx)$/.test(entry.name) || entry.name === 'ManaratakLogo.tsx') return [];
    return [readFileSync(path, 'utf8')];
  });
}

describe('public brand theme contract', () => {
  it('defines semantic surfaces and readable roles for both themes', () => {
    expect(themeSource).toContain('.manaratak-public {');
    expect(themeSource).toContain('.dark .manaratak-public {');
    for (const token of [
      '--mn-page',
      '--mn-surface',
      '--mn-surface-elevated',
      '--mn-heading',
      '--mn-text',
      '--mn-text-muted',
      '--mn-primary',
      '--mn-accent',
      '--mn-focus',
    ]) {
      expect(themeSource.match(new RegExp(token, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('does not restore global important overrides or translucent white card surfaces', () => {
    const source = publicTemplateSources(featureRoot).join('\n');
    expect(source).not.toContain('!important');
    expect(source).not.toMatch(/bg-white\/(?:80|90|95)/);
  });

  it('keeps legacy green colors out of the public template', () => {
    const source = publicTemplateSources(featureRoot).join('\n');
    expect(source).not.toMatch(/#(?:01241b|033a2c|012219|043324|166551|0a382b|082b21)/i);
  });

  it('uses the manual dark selector and never inverts the Tailwind neutral scale', () => {
    expect(themeSource).toContain('@custom-variant mn-dark (&:where(.dark, .dark *));');
    expect(themeSource).not.toMatch(/--color-(slate|stone|gray)-/);
    const source = publicTemplateSources(featureRoot).join('\n');
    expect(source).not.toMatch(/dark:text-(slate|stone|gray)-\d+/);
  });

  it('defines every semantic token consumed by a component', () => {
    const source = publicTemplateSources(featureRoot).join('\n');
    const defined = new Set([...themeSource.matchAll(/(--mn-[\w-]+):/g)].map((m) => m[1]));
    for (const m of source.matchAll(/var\((--mn-[\w-]+)\)/g)) expect(defined.has(m[1]), m[1]).toBe(true);
  });

  it('keeps normal text at AA contrast on theme surfaces and action fills', () => {
    const light = themeTokens('.manaratak-public {');
    const dark = { ...light, ...themeTokens('.dark .manaratak-public {') };
    for (const [mode, tokens] of Object.entries({ light, dark })) {
      const pairs = [
        ...['page', 'surface', 'surface-elevated', 'surface-muted'].flatMap((bg) =>
          ['heading', 'text', 'text-muted', 'accent-text'].map((fg) => [fg, bg])),
        ['on-primary', 'primary'], ['on-primary', 'primary-hover'],
        ['on-accent', 'accent'], ['on-accent', 'accent-soft'],
        ['accent-soft', 'hero-secondary'], ['on-dark-muted', 'hero-secondary'],
        ['link', 'surface-muted'], ['link', 'surface'],
        ...['success', 'danger', 'warning', 'info'].map((status) => [`${status}-text`, `${status}-soft`]),
      ];
      for (const [fg, bg] of pairs) {
        expect(contrast(resolveToken(tokens, `--mn-${fg}`), resolveToken(tokens, `--mn-${bg}`)), `${mode}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
