import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// A loopback-only contract fixture, not a malware engine or production service.
// Real bytes cross HTTPS and are stored, hashed and delivered. Positive scan /
// sanitizer responses are permitted ONLY for hashes in the isolated fixture
// manifest. Unknown input and the EICAR marker fail closed. Never deploy this.
if (process.env.NODE_ENV !== 'test' || process.env.COURSES_MEDIA_PROVIDER_LAB !== 'YES')
  throw Error('ISOLATED_COURSES_MEDIA_LAB_AUTHORIZATION_REQUIRED');
const root = path.resolve(process.env.COURSES_MEDIA_LAB_ROOT ?? '');
if (
  !path.isAbsolute(root) ||
  !root.includes(path.sep + 'private' + path.sep) ||
  !root.endsWith('courses-media-provider-lab')
)
  throw Error('PRIVATE_ISOLATED_MEDIA_LAB_ROOT_REQUIRED');
const config = JSON.parse(fs.readFileSync(path.join(root, 'provider.private.json'), 'utf8'));
if (config.scope !== 'ISOLATED_COURSES_MEDIA_PROVIDER' || config.signingSecret.length < 32)
  throw Error('ISOLATED_PROVIDER_CONFIG_REQUIRED');
const origin = 'https://127.0.0.1:3168',
  bucketName = 'isolated-courses-media-lab';
const uploads = new Map(),
  deliveries = new Map(),
  nonces = new Map(),
  receipts = new Map();
const stats = {
  scope: config.scope,
  productionSecurityValidation: false,
  uploads: 0,
  verifications: 0,
  fixtureScans: 0,
  fixtureSanitizations: 0,
  cleanPromotions: 0,
  deliveries: 0,
  rejected: 0,
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const same = (left, right) =>
  typeof left === 'string' &&
  typeof right === 'string' &&
  left.length === right.length &&
  timingSafeEqual(Buffer.from(left), Buffer.from(right));
const file = (locator) => {
  if (
    !locator ||
    locator.bucketName !== bucketName ||
    !['QUARANTINE', 'CLEAN'].includes(locator.storageZone) ||
    !/^(uploads|clean)\/[a-f0-9-]{36}$/.test(locator.pathKey)
  )
    throw Error('LAB_LOCATOR_INVALID');
  const filename = path.resolve(root, locator.storageZone, locator.pathKey + '.bin');
  if (!filename.startsWith(root + path.sep)) throw Error('LAB_PATH_ESCAPE');
  return filename;
};
const metaFile = (locator) => file(locator) + '.json';
const metadata = (locator) => JSON.parse(fs.readFileSync(metaFile(locator), 'utf8'));
const putObject = (locator, bytes, meta) => {
  const filename = file(locator);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, bytes);
  fs.writeFileSync(metaFile(locator), JSON.stringify(meta));
};
const readObject = (locator) => fs.readFileSync(file(locator));
const fixtureAllowed = (bytes) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'fixture-hashes.json'), 'utf8'));
  return (
    manifest.scope === 'GENERATED_ISOLATED_COURSE_MEDIA_FIXTURES_ONLY' &&
    manifest.hashes.includes(sha(bytes))
  );
};
const signatureMatches = (bytes, mime) =>
  mime === 'video/webm'
    ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : mime === 'video/mp4'
      ? bytes.subarray(4, 8).toString() === 'ftyp'
      : mime === 'audio/wav' || mime === 'audio/x-wav'
        ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE'
        : mime === 'audio/ogg'
          ? bytes.subarray(0, 4).toString() === 'OggS'
          : mime === 'audio/mpeg'
            ? bytes.subarray(0, 3).toString() === 'ID3' ||
              (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0)
            : mime === 'image/png'
              ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : mime === 'image/jpeg'
                ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
                : mime === 'application/pdf'
                  ? bytes.subarray(0, 5).toString() === '%PDF-'
                  : ['text/plain', 'text/vtt'].includes(mime)
                    ? (() => {
                        try {
                          const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                          return (
                            !text.includes('\0') &&
                            (mime !== 'text/vtt' || text.startsWith('WEBVTT'))
                          );
                        } catch {
                          return false;
                        }
                      })()
                    : false;
const body = async (req) => {
  const chunks = [];
  let count = 0;
  for await (const chunk of req) {
    count += chunk.length;
    if (count > 64 * 1024 * 1024) throw Error('LAB_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
const authenticated = (req, url, bytes) => {
  const timestamp = req.headers['x-manaratak-timestamp'],
    nonce = req.headers['x-manaratak-nonce'];
  if (
    !same(req.headers['x-manaratak-provider-key'], config.apiKey) ||
    !Number.isFinite(Date.parse(timestamp)) ||
    Math.abs(Date.now() - Date.parse(timestamp)) > 60000 ||
    typeof nonce !== 'string' ||
    nonces.has(nonce)
  )
    throw Error('LAB_PROVIDER_AUTHENTICATION_FAILED');
  const hash = sha(bytes),
    canonical = `${req.method}\n${url.pathname}${url.search}\n${timestamp}\n${nonce}\n${hash}`;
  if (
    !same(req.headers['x-manaratak-content-sha256'], hash) ||
    !same(
      req.headers['x-manaratak-signature'],
      createHmac('sha256', config.signingSecret).update(canonical).digest('hex'),
    )
  )
    throw Error('LAB_PROVIDER_SIGNATURE_INVALID');
  nonces.set(nonce, Date.now());
  for (const [key, at] of nonces) if (at < Date.now() - 120000) nonces.delete(key);
};
const json = (res, value, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
const server = https.createServer(
  {
    key: fs.readFileSync(path.join(root, 'key.private.pem')),
    cert: fs.readFileSync(path.join(root, 'cert.pem')),
  },
  async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.2:3157');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type,Content-Length');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/upload/') && req.method === 'PUT') {
        const grant = uploads.get(url.pathname.slice(8));
        if (!grant || grant.expires < Date.now()) throw Error('LAB_UPLOAD_GRANT_EXPIRED');
        const bytes = await body(req);
        if (bytes.length !== grant.byteSize) throw Error('LAB_UPLOAD_SIZE_MISMATCH');
        if (fs.existsSync(file(grant.locator)) && sha(readObject(grant.locator)) !== sha(bytes))
          throw Error('LAB_UPLOAD_OBJECT_OVERWRITE_FORBIDDEN');
        putObject(grant.locator, bytes, {
          mimeType: grant.mimeType,
          byteSize: bytes.length,
          originalFilename: grant.originalFilename,
        });
        stats.uploads++;
        res.writeHead(200);
        res.end();
        return;
      }
      if (url.pathname.startsWith('/delivery/') && req.method === 'GET') {
        const grant = deliveries.get(url.pathname.slice(10));
        if (!grant || grant.expires < Date.now()) throw Error('LAB_DELIVERY_GRANT_EXPIRED');
        const bytes = readObject(grant.locator),
          meta = metadata(grant.locator);
        if (sha(bytes) !== grant.sha) throw Error('LAB_DELIVERY_CHECKSUM_CHANGED');
        stats.deliveries++;
        res.writeHead(200, {
          'Content-Type': meta.mimeType,
          'Content-Length': bytes.length,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(bytes);
        return;
      }
      const raw = await body(req);
      authenticated(req, url, raw);
      const input = raw.length ? JSON.parse(raw) : {};
      const receiptKey =
        req.headers['idempotency-key'] && url.pathname + ':' + req.headers['idempotency-key'];
      if (
        receiptKey &&
        receipts.has(receiptKey) &&
        ['/v1/assets/upload-grants', '/v1/assets/move-to-clean', '/v1/assets/sanitize'].includes(
          url.pathname,
        )
      ) {
        json(res, receipts.get(receiptKey));
        return;
      }
      let result;
      if (
        url.pathname === '/v1/assets/upload-grants' ||
        url.pathname === '/v1/assets/upload-grants/refresh'
      ) {
        const locator = input.locator ?? {
          storageZone: 'QUARANTINE',
          bucketName,
          pathKey: 'uploads/' + randomUUID(),
        };
        file(locator);
        if (fs.existsSync(metaFile(locator)) && metadata(locator).verified)
          throw Error('LAB_VERIFIED_UPLOAD_IMMUTABLE');
        const token = randomUUID(),
          expires = Date.now() + 120000;
        uploads.set(token, { locator, ...input, expires });
        result = {
          locator,
          uploadUrl: origin + '/upload/' + token,
          method: 'PUT',
          headers: { 'Content-Type': input.mimeType },
          expiresAt: new Date(expires).toISOString(),
        };
      } else if (url.pathname === '/v1/assets/verify-upload') {
        const bytes = readObject(input.locator),
          meta = metadata(input.locator);
        if (
          !signatureMatches(bytes, input.declaredMimeType) ||
          input.declaredMimeType !== meta.mimeType ||
          (input.expectedByteSize !== undefined && input.expectedByteSize !== bytes.length)
        )
          throw Error('LAB_UPLOAD_SIGNATURE_OR_SIZE_MISMATCH');
        stats.verifications++;
        fs.writeFileSync(metaFile(input.locator), JSON.stringify({ ...meta, verified: true }));
        result = {
          byteSize: bytes.length,
          verifiedMimeType: meta.mimeType,
          checksumSha256: sha(bytes),
          verifiedAt: new Date().toISOString(),
          signatureVerified: true,
        };
      } else if (url.pathname === '/v1/assets/malware-scan') {
        const bytes = readObject(input.locator);
        if (!metadata(input.locator).verified) throw Error('LAB_UNVERIFIED_SCAN_FORBIDDEN');
        stats.fixtureScans++;
        const clean =
          fixtureAllowed(bytes) && !bytes.toString().includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
        result = {
          clean,
          threatsFound: clean ? [] : ['ISOLATED_UNKNOWN_OR_EICAR_FIXTURE_REJECTED'],
        };
      } else if (url.pathname === '/v1/assets/sanitize') {
        const bytes = readObject(input.locator),
          meta = metadata(input.locator);
        if (!fixtureAllowed(bytes) || !meta.verified) throw Error('LAB_FIXTURE_SANITIZER_REJECTED');
        // Fixture manifest asserts generated files contain no EXIF/private metadata.
        // This exercises the service contract, not production codec sanitation.
        const locator = {
          storageZone: 'QUARANTINE',
          bucketName,
          pathKey: 'uploads/' + randomUUID(),
        };
        putObject(locator, bytes, meta);
        stats.fixtureSanitizations++;
        result = {
          sanitizedLocator: locator,
          exifStripped: true,
          sanitizedAt: new Date().toISOString(),
          sanitizerNotes: 'ISOLATED_KNOWN_METADATA_FREE_FIXTURE_ONLY_NOT_PRODUCTION_SANITIZATION',
        };
      } else if (url.pathname === '/v1/assets/move-to-clean') {
        const locator = {
          storageZone: 'CLEAN',
          bucketName,
          pathKey: input.locator.pathKey.replace(/^uploads\//, 'clean/'),
        };
        const source = fs.existsSync(file(input.locator)) ? input.locator : locator,
          bytes = readObject(source);
        if (sha(bytes) !== input.expectedSha256) throw Error('LAB_PROMOTION_CHECKSUM_MISMATCH');
        putObject(locator, bytes, metadata(source));
        stats.cleanPromotions++;
        result = { locator, verifiedSourceSha256: sha(bytes) };
      } else if (url.pathname === '/v1/assets/delivery-grants') {
        if (input.locator.storageZone !== 'CLEAN') throw Error('LAB_CLEAN_DELIVERY_REQUIRED');
        const bytes = readObject(input.locator),
          token = randomUUID(),
          expires = Date.now() + input.expiresInSeconds * 1000;
        deliveries.set(token, { locator: input.locator, expires, sha: sha(bytes) });
        result = {
          url: origin + '/delivery/' + token,
          headers: {},
          expiresAt: new Date(expires).toISOString(),
        };
      } else if (url.pathname === '/v1/assets/read') {
        const bytes = readObject(input.locator);
        if (bytes.length > input.maxBytes) throw Error('LAB_READ_LIMIT');
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': bytes.length,
        });
        res.end(bytes);
        return;
      } else if (url.pathname === '/__isolated/stats') result = stats;
      else throw Error('LAB_PROVIDER_OPERATION_UNSUPPORTED');
      if (receiptKey) receipts.set(receiptKey, result);
      json(res, result);
    } catch (error) {
      stats.rejected++;
      json(res, { error: error.message }, 403);
    }
  },
);
server.listen(3168, '127.0.0.1', () => console.log('ISOLATED_COURSES_MEDIA_PROVIDER_READY'));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    fs.writeFileSync(path.join(root, 'provider-stats.json'), JSON.stringify(stats, null, 2));
    server.close(() => process.exit(0));
  });
