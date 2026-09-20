const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

async function loadProviderModule() {
  const source = fs.readFileSync('packages/infrastructure/src/auth/JwtTokenProvider.ts', 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      isolatedModules: true,
    },
  }).outputText;
  assert.doesNotMatch(output, /@manaratak\/core/);
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

test('RS256 provider executes: access verification, opaque refresh and JWKS', async () => {
  const { JwtTokenProvider, generateEphemeralJwtKeySet } = await loadProviderModule();
  const provider = new JwtTokenProvider(generateEphemeralJwtKeySet('runtime-test-key'), {
    accessTokenTtl: 900,
    issuer: 'runtime-test',
    audience: 'runtime-client',
  });
  const tokens = await provider.generateTokens({ userId: 'u-1', sessionId: 's-1' });
  const payload = await provider.verifyAccessToken(tokens.accessToken);
  assert.deepEqual(payload, { userId: 'u-1', sessionId: 's-1' });
  assert.match(tokens.refreshToken, /^mrt_[A-Za-z0-9_-]{43}$/);
  await provider.validateRefreshToken(tokens.refreshToken);
  assert.equal(tokens.refreshToken.includes('.'), false);
  const jwks = provider.getJwks();
  assert.equal(jwks.keys[0].kid, 'runtime-test-key');
  assert.equal(jwks.keys[0].alg, 'RS256');
  assert.equal('d' in jwks.keys[0], false);
});

test('provider rejects overlong TTL and tokens signed by an unknown/retired kid', async () => {
  const { JwtTokenProvider, generateEphemeralJwtKeySet } = await loadProviderModule();
  const keyA = generateEphemeralJwtKeySet('key-a');
  assert.throws(() => new JwtTokenProvider(keyA, { accessTokenTtl: 901 }), /900/);

  const signerA = new JwtTokenProvider(keyA, { accessTokenTtl: 900 });
  const token = (await signerA.generateTokens({ userId: 'u' })).accessToken;
  const keyB = generateEphemeralJwtKeySet('key-b');
  const verifierWithoutA = new JwtTokenProvider(keyB, { accessTokenTtl: 900 });
  await assert.rejects(verifierWithoutA.verifyAccessToken(token), /Invalid access token/);
});

test('provider rejects algorithm confusion and tampering', async () => {
  const { JwtTokenProvider, generateEphemeralJwtKeySet } = await loadProviderModule();
  const provider = new JwtTokenProvider(generateEphemeralJwtKeySet('key-a'), { accessTokenTtl: 900 });
  const token = (await provider.generateTokens({ userId: 'u' })).accessToken;
  const [header, payload, signature] = token.split('.');
  const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  parsedHeader.alg = 'HS256';
  const confusedHeader = Buffer.from(JSON.stringify(parsedHeader)).toString('base64url');
  await assert.rejects(provider.verifyAccessToken(`${confusedHeader}.${payload}.${signature}`), /Invalid access token/);
  const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'attacker' })).toString('base64url');
  await assert.rejects(provider.verifyAccessToken(`${header}.${tamperedPayload}.${signature}`), /Invalid access token/);
});
