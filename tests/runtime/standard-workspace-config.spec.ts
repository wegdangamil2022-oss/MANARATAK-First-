import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadConfigFromFile,resolveConfig} from 'vite';
import {afterEach,describe,it,expect,vi} from 'vitest';
afterEach(()=>vi.unstubAllEnvs());
describe('standard workspace runtime after retiring the hosted preview',()=>{
  it('starts the canonical workspaces and retains the general environment preflight',()=>{
    const pkg=JSON.parse(readFileSync('package.json','utf8'));
    expect(pkg.scripts.dev).toBe('npm run dev -w @manaratak/web');
    expect(pkg.scripts['dev:admin']).toBe('npm run dev -w @manaratak/admin');
    expect(Object.keys(pkg.scripts).filter(key=>key.includes('aistudio'))).toEqual([]);
    expect(readFileSync('.github/workflows/ci.yml','utf8')).not.toContain('ai-studio-compatibility');
    expect(readFileSync('scripts/ci/source-preflight.mjs','utf8')).toContain('scripts/config/environment-inventory.mjs');
  });
  it.each(['web','admin'])('loads %s production Vite configuration without an iframe bypass plugin',async app=>{
    vi.stubEnv('NODE_ENV','production');
    const loaded=await loadConfigFromFile({command:'build',mode:'production'},resolve(`apps/${app}/vite.config.ts`));
    expect(loaded).not.toBeNull();
    const plugins=((loaded!.config.plugins??[]) as unknown[]).flat(Infinity).filter(Boolean) as {name:string}[];
    expect(plugins.some(plugin=>/studio/i.test(plugin.name))).toBe(false);
    expect(plugins.some(plugin=>plugin.name.includes('security'))).toBe(true);
    if(app==='web')expect(loaded!.config.define?.__MANARATAK_PROTOTYPE_DATA_ENABLED__).toBe('false');
    expect(loaded!.config.envDir).toBe(resolve(`apps/${app}`));
  });
  it('uses a local Vite nonce while production retains canonical script and style restrictions',async()=>{
    vi.stubEnv('NODE_ENV','development');
    const development=await resolveConfig({configFile:resolve('apps/web/vite.config.ts'),mode:'development'},'serve');
    expect(development.html?.cspNonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
    vi.stubEnv('NODE_ENV','production');
    const production=await resolveConfig({configFile:resolve('apps/web/vite.config.ts'),mode:'production'},'build');
    expect(production.html?.cspNonce).toBeUndefined();
  });
});
