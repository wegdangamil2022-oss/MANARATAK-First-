import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const directory = resolve(process.cwd(), 'packages/application/src/scholarships/source-registry');

function sourceText(): string {
  return readdirSync(directory)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => readFileSync(resolve(directory, name), 'utf8'))
    .join('\n');
}

describe('WP12-6 source-only invariants', () => {
  it('does not implement a second acquisition engine or perform network access', () => {
    const source = sourceText();
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toMatch(/\bpuppeteer\b/);
    expect(source).not.toMatch(/\bplaywright\b/);
    expect(source).not.toContain('PrismaClient');
    expect(source).not.toContain('IScholarshipRepository');
  });

  it('reuses Phase 6 registry/source contracts and keeps live connector proof pending runtime', () => {
    const source = sourceText();
    expect(source).toContain('ISourceRegistryGateway');
    expect(source).toContain('ImportSourceDefinition');
    expect(source).toContain('PENDING_RUNTIME');
    expect(source).toContain('rawSnapshotRequiredBeforeSemanticTransform');
  });
});
