import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  authenticate,
  sha,
  sign,
  seal,
  unseal,
  locatorKey,
  signatureMatches,
  byteLimit,
} from './security.mjs';
import { scanBytes } from './clamd.mjs';
test('signed control request binds method, path, hash, credentials and a fresh timestamp', () => {
  const config = {
      apiKey: randomBytes(48).toString('hex'),
      signingSecret: randomBytes(48).toString('hex'),
    },
    body = Buffer.from('{"locator":1}'),
    timestamp = new Date().toISOString(),
    nonce = randomUUID(),
    url = '/v1/assets/malware-scan';
  const headers = {
    'x-manaratak-provider-key': config.apiKey,
    'x-manaratak-timestamp': timestamp,
    'x-manaratak-nonce': nonce,
    'x-manaratak-content-sha256': sha(body),
    'x-manaratak-signature': sign(
      config.signingSecret,
      `POST\n${url}\n${timestamp}\n${nonce}\n${sha(body)}`,
    ),
  };
  assert.equal(authenticate(headers, 'POST', url, body, config), nonce);
  for (const [method, path, bytes] of [
    ['GET', url, body],
    ['POST', url + '/other', body],
    ['POST', url, Buffer.from('{}')],
  ])
    assert.throws(() => authenticate(headers, method, path, bytes, config));
  assert.throws(() => authenticate(headers, 'POST', url, body, config, Date.now() + 61000));
  assert.throws(() =>
    authenticate({ ...headers, 'x-manaratak-provider-key': 'bad' }, 'POST', url, body, config),
  );
});
test('delivery and upload tokens reject tampering, expired, excessive and wrong-purpose grants', () => {
  const secret = randomBytes(48).toString('hex'),
    now = Date.now(),
    payload = { purpose: 'delivery', expires: now + 1000 };
  const token = seal(secret, payload);
  assert.deepEqual(unseal(secret, token, 'delivery', now), payload);
  for (const candidate of [
    token + 'x',
    token + '.extra',
    seal(secret, { ...payload, expires: now - 1 }),
    seal(secret, { ...payload, expires: now + 300001 }),
    seal(secret, { ...payload, purpose: 'upload' }),
  ])
    assert.throws(() => unseal(secret, candidate, 'delivery', now));
});
test('locators cannot traverse zones, buckets or paths', () => {
  const locator = { storageZone: 'CLEAN', bucketName: 'private', pathKey: 'clean/' + randomUUID() };
  assert.ok(locatorKey(locator, 'private'));
  for (const input of [
    { ...locator, pathKey: '../secret' },
    { ...locator, pathKey: 'uploads/' + randomUUID() },
    { ...locator, bucketName: 'other' },
    { ...locator, storageZone: 'PUBLIC' },
  ])
    assert.throws(() => locatorKey(input, 'private'));
});
test('signature and bounded type checks reject executable, invalid UTF-8 and non-VTT content', () => {
  assert.equal(byteLimit('video/mp4'), 64 * 1024 * 1024);
  assert.equal(byteLimit('text/vtt'), 2 * 1024 * 1024);
  assert.throws(() => byteLimit('image/svg+xml'));
  assert.equal(signatureMatches(Buffer.from('MZ executable'), 'application/pdf'), false);
  assert.equal(
    signatureMatches(Buffer.from('WEBVTT\n\n00:00.000 --> 00:01.000\nCaption'), 'text/vtt'),
    true,
  );
  assert.equal(signatureMatches(Buffer.from('bad'), 'text/vtt'), false);
  assert.equal(signatureMatches(Buffer.from([0xff, 0xfe]), 'text/plain'), false);
});
// TCP contract emulator only. This proves fail-closed protocol handling, not real antivirus detection.
async function withClamd(response, fn, { stale = false } = {}) {
  const server = net.createServer((socket) => {
    let input = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      input = Buffer.concat([input, chunk]);
      if (input.subarray(0, 9).toString() === 'zVERSION\0')
        socket.end(`ClamAV contract/1/${new Date(stale ? 0 : Date.now()).toUTCString()}\0`);
      else if (input.subarray(0, 10).toString() === 'zINSTREAM\0') {
        let offset = 10;
        while (offset + 4 <= input.length) {
          const size = input.readUInt32BE(offset);
          offset += 4;
          if (size === 0) {
            socket.end(response + '\0');
            return;
          }
          offset += size;
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn({ host: '127.0.0.1', port: server.address().port });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test('scanner accepts only an exact OK and treats found threats as rejection', async () => {
  await withClamd('stream: OK', async (config) =>
    assert.equal((await scanBytes(Buffer.from('sample'), config)).clean, true),
  );
  await withClamd('stream: Eicar-Signature FOUND', async (config) =>
    assert.deepEqual((await scanBytes(Buffer.from('sample'), config)).threatsFound, [
      'Eicar-Signature',
    ]),
  );
});
test('scanner failure and stale signatures never become a clean result', async () => {
  await withClamd('stream: size limit exceeded ERROR', async (config) =>
    assert.rejects(scanBytes(Buffer.alloc(0), config), /SCANNER_FAILED/),
  );
  await withClamd(
    'stream: OK',
    async (config) => assert.rejects(scanBytes(Buffer.alloc(0), config), /SCANNER_DATABASE_STALE/),
    { stale: true },
  );
});
