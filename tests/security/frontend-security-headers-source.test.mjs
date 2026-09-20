import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

test('MNT-AUD-0101 Web/Admin share one source-controlled HTML header policy', () => {
  const policy = read('apps/frontend-security/ViteFrontendSecurityHeaders.ts');
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /'X-Frame-Options': 'DENY'/);
  assert.match(policy, /"script-src 'self'"/);
  assert.match(policy, /"script-src-attr 'none'"/);
  assert.match(policy, /"style-src 'self'"/);
  assert.match(policy, /generateBundle\(\)/);
  assert.match(policy, /fileName: '_headers'/);

  for (const app of ['web', 'admin']) {
    const config = read(`apps/${app}/vite.config.ts`);
    assert.match(config, /frontendSecurityHeadersPlugin/);
  }
});

test('MNT-AUD-0101 API defense-in-depth CSP no longer permits inline styles and denies framing', () => {
  const security = read('apps/api/src/presentation/security/SecurityMiddlewareFactory.ts');
  assert.match(security, /styleSrc: \["'self'"\]/);
  assert.match(security, /styleSrcAttr: \["'none'"\]/);
  assert.match(security, /frameAncestors: \["'none'"\]/);
  assert.doesNotMatch(security, /styleSrc: \[[^\]]*unsafe-inline/);
});

test('MNT-AUD-0114 Web/Admin source contains no inline style attributes or inline style elements', () => {
  const policy = read('apps/frontend-security/ViteFrontendSecurityHeaders.ts');
  assert.match(policy, /MNT-AUD-0114/);
  assert.match(policy, /"style-src-attr 'none'"/);
  assert.doesNotMatch(policy, /unsafe-inline/);

  for (const app of ['web', 'admin']) {
    const files = walk(path.join(root, 'apps', app, 'src')).filter((file) => /\.(tsx|jsx)$/.test(file));
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(source, /\bstyle\s*=\s*\{/, `${file} contains an inline style attribute`);
      assert.doesNotMatch(source, /<style(?:\s|>)/i, `${file} contains an inline <style> element`);
    }
  }
});
