import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as esmContainer from '@manaratak-vendor/awilix-core';

const require = createRequire(import.meta.url);
const cjsContainer = require('@manaratak-vendor/awilix-core') as typeof esmContainer;
const vendor = new URL('../../../../../vendor/awilix-core/', import.meta.url);

describe.each([
  ['ESM', esmContainer],
  ['CommonJS', cjsContainer],
] as const)('standalone container (%s)', (_format, api) => {
  it('preserves explicit registration, proxy injection and service lifetimes', async () => {
    const container = api.createContainer({ injectionMode: api.InjectionMode.PROXY, strict: true });
    let sequence = 0;
    class Service {
      constructor(public dependencies: { value: number }) {}
    }
    container.register({
      value: api.asValue(42),
      service: api.asClass(Service).singleton(),
      scoped: api.asFunction(() => ({ id: ++sequence })).scoped(),
      transient: api.asFunction(() => ({ id: ++sequence })),
    });
    const first = container.createScope();
    const second = container.createScope();
    expect(first.resolve<Service>('service').dependencies.value).toBe(42);
    expect(first.resolve('service')).toBe(second.resolve('service'));
    expect(first.resolve('scoped')).toBe(first.resolve('scoped'));
    expect(first.resolve('scoped')).not.toBe(second.resolve('scoped'));
    expect(first.resolve('transient')).not.toBe(first.resolve('transient'));
    await first.dispose();
    await second.dispose();
    await container.dispose();
  });

  it('disposes each resolved scoped and singleton resource exactly once', async () => {
    const container = api.createContainer();
    const disposed: string[] = [];
    container.register({
      shared: api.asFunction(() => ({ id: 'shared' })).singleton()
        .disposer(resource => { disposed.push(resource.id); }),
      request: api.asFunction(() => ({ id: 'request' })).scoped()
        .disposer(resource => { disposed.push(resource.id); }),
    });
    const scope = container.createScope();
    scope.resolve('shared');
    scope.resolve('request');
    await scope.dispose();
    await scope.dispose();
    expect(disposed).toEqual(['request']);
    await container.dispose();
    await container.dispose();
    expect(disposed).toEqual(['request', 'shared']);
  });

  it('rejects filesystem discovery without parsing deeply nested patterns', () => {
    const container = api.createContainer();
    const pattern = '{'.repeat(10000) + 'module' + '}'.repeat(10000);
    expect(() => container.loadModules([pattern])).toThrow(/loadModules is not supported/);
  });
});

describe('standalone dependency provenance and isolation', () => {
  it('preserves the recorded upstream files and excludes runtime dependencies', () => {
    const provenance = JSON.parse(readFileSync(new URL('provenance.json', vendor), 'utf8')) as {
      upstream: { name: string; version: string; integrity: string };
      files: Record<string, { sha256: string }>;
    };
    expect(provenance.upstream.name).toBe('awilix');
    expect(provenance.upstream.version).toBe('10.0.2');
    expect(provenance.upstream.integrity).toMatch(/^sha512-/);
    for (const [file, expected] of Object.entries(provenance.files)) {
      const hash = createHash('sha256').update(readFileSync(new URL(file, vendor))).digest('hex');
      expect(hash, file).toBe(expected.sha256);
    }
    const manifest = JSON.parse(readFileSync(new URL('package.json', vendor), 'utf8'));
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it('keeps the standalone server container blocked in the isolated preview', () => {
    const root = fileURLToPath(new URL('../../../../../', import.meta.url));
    const result = spawnSync(process.execPath, [
      '--import', './scripts/aistudio/isolation.mjs',
      '--input-type=module', '-e', "import './vendor/awilix-core/index.mjs'",
    ], { cwd: root, encoding: 'utf8', timeout: 10000 });
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('AI_STUDIO_BACKEND_MODULE_FORBIDDEN');
  });
});
