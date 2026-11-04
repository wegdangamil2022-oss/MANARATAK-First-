import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';

for (const app of ['admin', 'web']) {
  test(`${app} ships one Cairo file per character subset with valid stylesheet references`, () => {
    const directory = path.resolve(`apps/${app}/public/fonts`);
    const fonts = readdirSync(directory).filter(name => /^cairo-\d+\.woff2$/.test(name)).sort();
    assert.deepEqual(fonts, ['cairo-0.woff2', 'cairo-1.woff2', 'cairo-2.woff2']);
    const digests = fonts.map(name => {
      const bytes = readFileSync(path.join(directory, name));
      assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
      return createHash('sha256').update(bytes).digest('hex');
    });
    assert.equal(new Set(digests).size, fonts.length);
    const css = readFileSync(path.join(directory, 'cairo.css'), 'utf8');
    const references = [...css.matchAll(/cairo-\d+\.woff2/g)].map(match => match[0]);
    assert.ok(references.length >= fonts.length);
    for (const name of references) assert.ok(fonts.includes(name), `Missing ${name}`);
    if (app === 'admin') {
      assert.equal((css.match(/@font-face/g) ?? []).length, 3);
      assert.equal((css.match(/font-weight: 200 1000/g) ?? []).length, 3);
    }
  });
}
