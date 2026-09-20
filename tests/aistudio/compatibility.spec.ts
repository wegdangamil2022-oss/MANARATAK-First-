import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfigFromFile } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { FRONTEND_SECURITY_HEADERS } from '../../apps/frontend-security/ViteFrontendSecurityHeaders';
import { frontendHeadersForDevelopment } from '../../apps/frontend-security/GoogleAiStudioPreview';
import { isPreviewDatabaseProbeEnabled } from '../../apps/api/src/infrastructure/runtime/PreviewDatabaseProbe.js';

afterEach(() => vi.unstubAllEnvs());

describe('Google AI Studio compatibility boundaries', () => {
  it('retains the complete runtime monorepo and regression guards after Studio exports', () => {
    const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    expect(manifest.workspaces).toEqual(['apps/*', 'packages/*']);
    expect(manifest.scripts.dev).toBe('node scripts/aistudio/run.mjs web dev');
    for (const file of [
      ...['api', 'web', 'admin'].map((app) => `apps/${app}/package.json`),
      ...['core', 'config', 'domain', 'shared', 'application', 'infrastructure', 'types', 'ui']
        .map((pkg) => `packages/${pkg}/package.json`),
      'scripts/verify-api-native-esm-specifiers.mjs',
      'scripts/resolve-api-workspace-esm.mjs',
      'scripts/verify-vercel-api-handler.mjs',
      'scripts/verify-vercel-typescript-context.mjs',
      'apps/api/tests/preview-database-probe.spec.ts',
      'packages/infrastructure/prisma/schema.prisma',
      '.github/workflows/ci.yml',
    ]) expect(existsSync(resolve(file)), file).toBe(true);
    expect(existsSync(resolve('preview/mock-api.ts'))).toBe(false);
  });

  it('relaxes iframe and HMR headers only for development, never production', () => {
    expect(frontendHeadersForDevelopment(false)).toEqual(FRONTEND_SECURITY_HEADERS);
    expect(FRONTEND_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(FRONTEND_SECURITY_HEADERS['Content-Security-Policy']).not.toContain('unsafe-inline');
    const dev = frontendHeadersForDevelopment(true);
    expect(dev['X-Frame-Options']).toBeUndefined();
    expect(dev['Content-Security-Policy']).toContain('https://aistudio.google.com');
    expect(dev['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline'");
    expect(dev['Content-Security-Policy']).toContain("script-src-attr 'none'");
  });

  it.each(['web', 'admin'])('uses source aliases and Web-only middleware for %s without dist artifacts', async (app) => {
    vi.stubEnv('MANARATAK_GOOGLE_AI_STUDIO', 'true');
    const result = await loadConfigFromFile({ command: 'serve', mode: 'aistudio' }, resolve('apps', app, 'vite.config.ts'));
    expect(result).not.toBeNull();
    const plugins = result!.config.plugins?.flat().filter(Boolean) as Array<{ name: string }>;
    expect(plugins.map((plugin) => plugin.name)).toContain('manaratak-google-ai-studio-web-only');
    expect(plugins.map((plugin) => plugin.name)).not.toContain('express-api-plugin');
    expect(result!.config.server?.hmr).toBe(true);
    const aliases = result!.config.resolve?.alias as Record<string, string>;
    expect(aliases['@manaratak/shared'].replaceAll('\\', '/')).toMatch(/packages\/shared\/src\/index\.ts$/);
    expect(aliases['@manaratak/domain'].replaceAll('\\', '/')).toMatch(/packages\/domain\/src\/index\.ts$/);
  });

  it('keeps the existing API plugin outside Google AI Studio', async () => {
    vi.stubEnv('MANARATAK_GOOGLE_AI_STUDIO', 'false');
    vi.stubEnv('MANARATAK_RUNTIME_PROFILE', '');
    const result = await loadConfigFromFile({ command: 'serve', mode: 'development' }, resolve('apps/web/vite.config.ts'));
    const plugins = result!.config.plugins?.flat().filter(Boolean) as Array<{ name: string }>;
    expect(plugins.map((plugin) => plugin.name)).toContain('express-api-plugin');
  });

  it('passes an external API base through to the browser unchanged', async () => {
    vi.stubEnv('MANARATAK_GOOGLE_AI_STUDIO', 'true');
    vi.stubEnv('VITE_API_URL', 'https://experimental.example.invalid/api/v1');
    const { resolveConfig } = await import('vite');
    const config = await resolveConfig({ configFile: resolve('apps/web/vite.config.ts'), mode: 'aistudio' }, 'serve');
    expect(config.env.VITE_API_URL).toBe('https://experimental.example.invalid/api/v1');
  });

  it('prevents accidental Preview database probing with the Web-only profile', () => {
    const preview = { VERCEL: '1', VERCEL_ENV: 'preview', MANARATAK_PREVIEW_DATABASE_PROBE: 'true' };
    expect(isPreviewDatabaseProbeEnabled(preview)).toBe(true);
    expect(isPreviewDatabaseProbeEnabled({ ...preview, MANARATAK_RUNTIME_PROFILE: 'google-ai-studio' })).toBe(false);
    expect(isPreviewDatabaseProbeEnabled({ ...preview, MANARATAK_GOOGLE_AI_STUDIO: 'true' })).toBe(false);
  });

  it('shows template fixtures only in an isolated Studio development preview without an API', async () => {
    vi.stubEnv('MANARATAK_GOOGLE_AI_STUDIO', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_PUBLIC_TEMPLATE_DATA_MODE', '');
    const config = await loadConfigFromFile({ command: 'serve', mode: 'aistudio' }, resolve('apps/web/vite.config.ts'));
    expect(config!.config.define?.__MANARATAK_PROTOTYPE_DATA_ENABLED__).toBe('true');
    expect(config!.config.define?.['import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE']).toBe('"prototype"');
    vi.stubEnv('VITE_API_URL', 'https://api.example.invalid/api/v1');
    const live = await loadConfigFromFile({ command: 'serve', mode: 'aistudio' }, resolve('apps/web/vite.config.ts'));
    expect(live!.config.define?.['import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE']).toBe('"api"');
    vi.stubEnv('VITE_API_URL', '');
    const build = await loadConfigFromFile({ command: 'build', mode: 'aistudio' }, resolve('apps/web/vite.config.ts'));
    expect(build!.config.define?.__MANARATAK_PROTOTYPE_DATA_ENABLED__).toBe('false');
    expect(build!.config.define?.['import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE']).toBe('"api"');
  });
});
