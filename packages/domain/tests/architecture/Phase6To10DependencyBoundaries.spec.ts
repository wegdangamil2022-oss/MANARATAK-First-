import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(process.cwd());

function sourceFiles(relativeDirectories: string[]): string[] {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.tsx?$/.test(entry.name)) files.push(target);
    }
  };
  for (const relativeDirectory of relativeDirectories) walk(path.join(repositoryRoot, relativeDirectory));
  return files;
}

function violations(files: string[], forbidden: RegExp): string[] {
  return files.filter((file) => forbidden.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(repositoryRoot, file));
}

describe('Phase 6-10 dependency boundaries', () => {
  it('keeps Import Foundation free of Tests, Majors, and Universities semantics', () => {
    const files = sourceFiles(['packages/domain/src/import-foundation', 'packages/application/src/import-foundation']);
    expect(violations(files, /(?:from|import\()[^\n]*(?:tests-platform|majors|universities)/i)).toEqual([]);
  });

  it('keeps Phase 8 free of Phase 10 persistence', () => {
    const files = sourceFiles(['packages/domain/src/academic-taxonomy', 'packages/application/src/academic-taxonomy']);
    expect(violations(files, /(?:@prisma\/client|PrismaClient|infrastructure\/src\/majors|from[^\n]*majors)/i)).toEqual([]);
  });

  it('keeps Admin and API presentation free of direct Prisma persistence', () => {
    const files = sourceFiles(['apps/admin/src', 'apps/api/src/presentation']);
    expect(violations(files, /@prisma\/client|\bPrismaClient\b/)).toEqual([]);
  });

  it('keeps Reference Data free of higher-domain semantics', () => {
    const files = sourceFiles(['packages/domain/src/reference-data', 'packages/application/src/reference-data']);
    expect(violations(files, /(?:from|import\()[^\n]*(?:tests-platform|majors|universities|scholarships)/i)).toEqual([]);
  });
});
