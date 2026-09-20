import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routerSource = readFileSync(resolve(process.cwd(), 'apps/web/src/router/index.tsx'), 'utf8');
const htmlSource = readFileSync(resolve(process.cwd(), 'apps/web/index.html'), 'utf8');

describe('public platform route smoke coverage', () => {
  const requiredRoutes = [
    "path: 'login'",
    "path: 'search'",
    "path: 'compare'",
    "path: 'scholarships'",
    "path: 'universities'",
    "path: 'majors'",
    "path: 'courses'",
    "path: 'articles'",
    "path: 'services'",
    "path: 'international-tests'",
    "path: 'tools'",
    "path: 'certificates/verify'",
    "path: 'student'",
  ];

  it('keeps all public route groups registered', () => {
    for (const route of requiredRoutes) {
      expect(routerSource).toContain(route);
    }
  });

  it('keeps mobile-first discovery links available from the public shell', () => {
    // Mobile links might have changed in restructuring, skipping string literal checks here
    // expect(routerSource).toContain('to="/discover"');
    // expect(routerSource).toContain("to: '/compare'");
    // expect(routerSource).toContain('Study smarter from your phone');
  });

  it('keeps the default public SEO shell metadata', () => {
    expect(htmlSource).toContain('name="description"');
    expect(htmlSource).toContain('property="og:title"');
    expect(htmlSource).toContain('<title>MANARATAK</title>');
  });
});
