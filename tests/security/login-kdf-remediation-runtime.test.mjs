import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../../packages/infrastructure/src/auth/PasswordHasher.ts', import.meta.url), 'utf8');
assert.doesNotMatch(source, /scryptSync/);
assert.match(source, /scrypt\(/);
assert.match(source, /verifyDummy/);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { module: { exports: {} }, exports: {}, console, Buffer, require };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'PasswordHasher.js' });
const { PasswordHasher } = sandbox.module.exports;

test('async scrypt hashes and verifies without sync KDF source', async () => {
  const hash = await PasswordHasher.hash('correct horse battery staple');
  assert.match(hash, /^scrypt:/);
  assert.equal(await PasswordHasher.verify('correct horse battery staple', hash), true);
  assert.equal(await PasswordHasher.verify('wrong password', hash), false);
});

test('dummy invalid-login KDF executes successfully', async () => {
  await PasswordHasher.verifyDummy('unknown-account-password');
});
