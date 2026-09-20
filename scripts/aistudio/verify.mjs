import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|LOCALAPPDATA)$/i.test(name)));
Object.assign(env, { MANARATAK_GOOGLE_AI_STUDIO: 'true', MANARATAK_RUNTIME_PROFILE: 'google-ai-studio', NO_COLOR: '1' });
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(manifest.scripts.dev, 'node scripts/aistudio/run.mjs web dev');
const child = spawn(process.execPath, [
  '--import', pathToFileURL(path.join(root, 'scripts/aistudio/isolation.mjs')).href,
  'scripts/aistudio/run.mjs', 'web', 'dev',
], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });
try {
  const deadline = Date.now() + 60000;
  while (!output.includes('AI_STUDIO_WEB_ONLY:')) {
    if (child.exitCode !== null || Date.now() > deadline) {
      // The child environment contains no credentials; this output is safe.
      throw new Error('AI_STUDIO_START_FAILED\n' + output);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const origin = 'http://127.0.0.1:3000';
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.equal(page.headers.has('x-frame-options'), false);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors.*aistudio\.google\.com/);
  assert.match(await page.text(), /src\/main.tsx/);
  for (const module of ['/src/main.tsx', '/src/App.tsx', '/@vite/client']) {
    const response = await fetch(origin + module);
    assert.equal(response.status, 200, module);
    assert.ok((await response.text()).length > 0);
  }
  for (const route of ['/api', '/api/v1/public/scholarships', '/api/v1/admin/users',
    '/api/v1/monitoring/health/database', '/api/v1/monitoring/health/database/direct']) {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const response = await fetch(origin + route, { method });
      assert.equal(response.status, 503);
      if (method !== 'HEAD') assert.equal((await response.json()).error, 'AI_STUDIO_EXTERNAL_API_NOT_CONFIGURED');
    }
  }
  assert.doesNotMatch(output, /FORBIDDEN|Bootstrap|PrismaClient|Redis.*connect|worker.*started/i);
  console.log('PASS: root dev launcher HTTP 3000, HTML/modules/HMR, iframe headers, read/write API routes closed.');
  console.log('PASS: backend module and external network traps active; no backend imports, database or workers.');
} finally {
  if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
}
