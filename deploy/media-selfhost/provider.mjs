import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import {
  sha,
  seal,
  unseal,
  authenticate,
  locatorKey,
  signatureMatches,
  byteLimit,
} from './security.mjs';
import { scanBytes } from './clamd.mjs';

const secret = async (name) => (await fs.readFile(`/run/secrets/${name}`, 'utf8')).trim();
const config = {
  apiKey: await secret('provider_key'),
  signingSecret: await secret('provider_signing'),
  grantSecret: await secret('grant_signing'),
  workerToken: await secret('worker_token'),
};
if (
  Object.values(config).some((value) => value.length < 48) ||
  new Set(Object.values(config)).size !== 4
)
  throw Error('DISTINCT_STRONG_PROVIDER_SECRETS_REQUIRED');
const root = path.resolve(process.env.MEDIA_STORAGE_ROOT ?? '/storage'),
  jobs = path.resolve(process.env.MEDIA_JOBS_ROOT ?? '/jobs'),
  bucket = process.env.MEDIA_BUCKET ?? 'manaratak-media';
const origin = new URL(process.env.MEDIA_PUBLIC_ORIGIN ?? '');
if (
  origin.protocol !== 'https:' ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
)
  throw Error('HTTPS_MEDIA_ORIGIN_REQUIRED');
const worker = new URL(process.env.MEDIA_WORKER_ORIGIN ?? 'http://processor:8081');
if (worker.origin !== 'http://processor:8081') throw Error('PRIVATE_PROCESSOR_ORIGIN_REQUIRED');
const allowedOrigins = (process.env.MEDIA_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
if (
  !allowedOrigins.length ||
  allowedOrigins.some((value) => new URL(value).origin !== value || !value.startsWith('https://'))
)
  throw Error('EXPLICIT_HTTPS_CORS_ORIGINS_REQUIRED');
await fs.mkdir(root, { recursive: true, mode: 0o700 });
await fs.mkdir(jobs, { recursive: true, mode: 0o700 });
for (const dir of ['nonces', 'receipts', 'objects', 'operations'])
  await fs.mkdir(path.join(root, dir), { recursive: true, mode: 0o700 });
const file = (locator) => path.join(root, 'objects', locatorKey(locator, bucket) + '.bin');
const metadata = async (locator) => JSON.parse(await fs.readFile(file(locator) + '.json', 'utf8'));
const bytes = async (locator) => {
  const filename = file(locator),
    stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 * 1024)
    throw Error('OBJECT_INVALID');
  return fs.readFile(filename);
};
async function atomic(filename, value) {
  const temp = filename + '.' + randomUUID();
  await fs.writeFile(temp, value, { flag: 'wx', mode: 0o600 });
  await fs.rename(temp, filename);
}
async function put(locator, data, meta) {
  const filename = file(locator);
  await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  await fs.writeFile(filename, data, { flag: 'wx', mode: 0o600 });
  await atomic(filename + '.json', JSON.stringify({ ...meta, sha256: sha(data) }));
}
async function readVerified(locator) {
  const data = await bytes(locator),
    meta = await metadata(locator);
  if (!meta.verified || meta.archived || meta.sha256 !== sha(data))
    throw Error('VERIFIED_OBJECT_REQUIRED');
  return { data, meta };
}
const json = (res, value, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
async function body(req, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Error('REQUEST_LIMIT');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function reserveNonce(nonce) {
  const name = path.join(root, 'nonces', sha(nonce));
  await fs.writeFile(name, String(Date.now()), { flag: 'wx', mode: 0o600 });
}
async function operate(operation, input) {
  if (operation === '/locators') {
    if (input.storageZone !== 'QUARANTINE') throw Error('QUARANTINE_REQUIRED');
    return {
      locator: {
        storageZone: 'QUARANTINE',
        bucketName: bucket,
        pathKey: 'uploads/' + randomUUID(),
      },
    };
  }
  if (operation === '/archive' || operation === '/restore') {
    if (
      typeof input.operationId !== 'string' ||
      !input.operationId ||
      input.operationId.length > 200
    )
      throw Error('LIFECYCLE_OPERATION_REQUIRED');
    const operationFile = path.join(root, 'operations', sha(input.operationId) + '.json');
    try {
      const prior = JSON.parse(await fs.readFile(operationFile, 'utf8'));
      if (
        (await metadata(input.locator)).operationId !== input.operationId ||
        locatorKey(prior.locator, bucket) !== locatorKey(input.locator, bucket) ||
        prior.proof.kind !== (operation === '/archive' ? 'ARCHIVE' : 'RESTORE')
      )
        throw Error('LIFECYCLE_FENCE_CHANGED');
      return {};
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const data = await bytes(input.locator),
      meta = await metadata(input.locator),
      kind = operation === '/archive' ? 'ARCHIVE' : 'RESTORE';
    if (
      kind === 'RESTORE' &&
      (!meta.sanitized ||
        !meta.verified ||
        meta.sha256 !== sha(data) ||
        (await scanBytes(data)).clean !== true)
    )
      throw Error('RESTORE_TRUST_REQUIRED');
    const proof = {
      operationId: input.operationId,
      kind,
      status: kind === 'ARCHIVE' ? 'ARCHIVED' : 'RESTORED',
      fenced: true,
      fenceToken: randomUUID(),
      observedAt: new Date().toISOString(),
    };
    await atomic(
      file(input.locator) + '.json',
      JSON.stringify({
        ...meta,
        archived: kind === 'ARCHIVE',
        operationId: input.operationId,
        deliveryEpoch: (meta.deliveryEpoch ?? 0) + 1,
      }),
    );
    await atomic(
      path.join(root, 'operations', sha(input.operationId) + '.json'),
      JSON.stringify({ proof, locator: input.locator, sha256: sha(data) }),
    );
    return {};
  }
  if (operation === '/lifecycle/reconcile') {
    const observed = JSON.parse(
      await fs.readFile(
        path.join(root, 'operations', sha(String(input.operationId)) + '.json'),
        'utf8',
      ),
    );
    if (
      observed.proof.kind !== input.kind ||
      locatorKey(observed.locator, bucket) !== locatorKey(input.locator, bucket) ||
      (input.expectedSha256 && input.expectedSha256 !== observed.sha256) ||
      (await metadata(input.locator)).operationId !== input.operationId
    )
      throw Error('LIFECYCLE_FENCE_CHANGED');
    return { pending: false, proof: observed.proof };
  }
  if (operation === '/verify-clean') {
    const { data, meta } = await readVerified(input.locator);
    if (
      input.locator.storageZone !== 'CLEAN' ||
      sha(data) !== input.expectedSha256 ||
      data.length !== input.expectedByteSize ||
      meta.mimeType !== input.declaredMimeType ||
      !signatureMatches(data, meta.mimeType) ||
      (await scanBytes(data)).clean !== true
    )
      throw Error('CLEAN_VERIFICATION_FAILED');
    return {
      verifiedSha256: sha(data),
      verifiedByteSize: data.length,
      verifiedMimeType: meta.mimeType,
      verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    };
  }
  if (operation === '/upload-grants' || operation === '/upload-grants/refresh') {
    const max = byteLimit(input.mimeType);
    if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > max)
      throw Error('UPLOAD_SIZE_INVALID');
    const locator = input.locator ?? {
      storageZone: 'QUARANTINE',
      bucketName: bucket,
      pathKey: 'uploads/' + randomUUID(),
    };
    file(locator);
    if (locator.storageZone !== 'QUARANTINE') throw Error('QUARANTINE_REQUIRED');
    try {
      const meta = await metadata(locator);
      if (meta.verified) throw Error('VERIFIED_UPLOAD_IMMUTABLE');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const expires = Date.now() + 120000,
      token = seal(config.grantSecret, {
        purpose: 'upload',
        locator,
        mime: input.mimeType,
        size: input.byteSize,
        expires,
      });
    return {
      locator,
      uploadUrl: origin.origin + '/upload/' + token,
      method: 'PUT',
      headers: { 'Content-Type': input.mimeType },
      expiresAt: new Date(expires).toISOString(),
    };
  }
  if (operation === '/verify-upload') {
    const data = await bytes(input.locator),
      meta = await metadata(input.locator);
    if (
      !signatureMatches(data, input.declaredMimeType) ||
      meta.mimeType !== input.declaredMimeType ||
      data.length > byteLimit(meta.mimeType) ||
      (input.expectedByteSize !== undefined && data.length !== input.expectedByteSize)
    )
      throw Error('UPLOAD_VERIFICATION_FAILED');
    const verifiedAt = new Date().toISOString();
    await atomic(
      file(input.locator) + '.json',
      JSON.stringify({ ...meta, verified: true, sha256: sha(data) }),
    );
    return {
      byteSize: data.length,
      verifiedMimeType: meta.mimeType,
      checksumSha256: sha(data),
      verifiedAt,
      signatureVerified: true,
    };
  }
  if (operation === '/malware-scan') {
    const { data, meta } = await readVerified(input.locator),
      scan = await scanBytes(data);
    await atomic(
      file(input.locator) + '.json',
      JSON.stringify({
        ...meta,
        scan: {
          clean: scan.clean,
          sha256: sha(data),
          scannedAt: new Date().toISOString(),
          engine: scan.engine,
        },
      }),
    );
    return { clean: scan.clean, threatsFound: scan.threatsFound };
  }
  if (operation === '/sanitize') {
    const { data, meta } = await readVerified(input.locator);
    if (!meta.scan?.clean || meta.scan.sha256 !== sha(data)) throw Error('CLEAN_SCAN_REQUIRED');
    const id = randomUUID(),
      directory = path.join(jobs, id);
    await fs.mkdir(directory, { mode: 0o700 });
    try {
      await fs.writeFile(path.join(directory, 'input'), data, { flag: 'wx', mode: 0o600 });
      const response = await fetch(new URL('/sanitize', worker), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-worker-token': config.workerToken },
        body: JSON.stringify({ id, mime: meta.mimeType }),
        signal: AbortSignal.timeout(130000),
      });
      if (!response.ok) throw Error('PROCESSOR_REJECTED');
      const filename = path.join(directory, 'output'),
        stat = await fs.lstat(filename);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size < 1 ||
        stat.size > byteLimit(meta.mimeType)
      )
        throw Error('SANITIZED_SIZE_INVALID');
      const output = await fs.readFile(filename);
      if (!signatureMatches(output, meta.mimeType)) throw Error('SANITIZED_SIGNATURE_INVALID');
      const scan = await scanBytes(output);
      if (!scan.clean) throw Error('SANITIZED_SCAN_REJECTED');
      const locator = {
          storageZone: 'QUARANTINE',
          bucketName: bucket,
          pathKey: 'uploads/' + randomUUID(),
        },
        sanitizedAt = new Date().toISOString();
      await put(locator, output, {
        mimeType: meta.mimeType,
        verified: true,
        sanitized: true,
        scan: { clean: true, sha256: sha(output), engine: scan.engine, scannedAt: sanitizedAt },
      });
      return {
        sanitizedLocator: locator,
        exifStripped: true,
        sanitizedAt,
        sanitizerNotes: 'RECONSTRUCTED_AND_CLAMAV_RESCANNED',
      };
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
  if (operation === '/move-to-clean') {
    const { data, meta } = await readVerified(input.locator);
    if (
      input.locator.storageZone !== 'QUARANTINE' ||
      !meta.sanitized ||
      !meta.scan?.clean ||
      meta.scan.sha256 !== sha(data) ||
      sha(data) !== input.expectedSha256
    )
      throw Error('PROMOTION_TRUST_INVALID');
    const locator = {
      ...input.locator,
      storageZone: 'CLEAN',
      pathKey: input.locator.pathKey.replace(/^uploads\//, 'clean/'),
    };
    try {
      await put(locator, data, meta);
    } catch (error) {
      if (error.code !== 'EEXIST' || sha(await bytes(locator)) !== sha(data)) throw error;
      await atomic(file(locator) + '.json', JSON.stringify(meta));
    }
    return { locator, verifiedSourceSha256: sha(data) };
  }
  if (operation === '/delivery-grants') {
    if (
      input.locator.storageZone !== 'CLEAN' ||
      !Number.isSafeInteger(input.expiresInSeconds) ||
      input.expiresInSeconds < 1 ||
      input.expiresInSeconds > 300
    )
      throw Error('DELIVERY_REQUEST_INVALID');
    const { data, meta } = await readVerified(input.locator);
    if (!meta.sanitized || !meta.scan?.clean || meta.scan.sha256 !== sha(data))
      throw Error('DELIVERY_TRUST_INVALID');
    const expires = Date.now() + input.expiresInSeconds * 1000,
      token = seal(config.grantSecret, {
        purpose: 'delivery',
        locator: input.locator,
        sha256: sha(data),
        epoch: meta.deliveryEpoch ?? 0,
        expires,
      });
    return {
      url: origin.origin + '/delivery/' + token,
      headers: {},
      expiresAt: new Date(expires).toISOString(),
    };
  }
  if (operation === '/read') {
    if (
      !Number.isSafeInteger(input.maxBytes) ||
      input.maxBytes < 1 ||
      input.maxBytes > 64 * 1024 * 1024
    )
      throw Error('READ_LIMIT_INVALID');
    const data = await bytes(input.locator);
    if (data.length > input.maxBytes) throw Error('READ_LIMIT');
    return data;
  }
  throw Error('OPERATION_UNSUPPORTED');
}
let occupied = false;
const server = https.createServer(
  {
    key: await fs.readFile('/run/secrets/tls_key'),
    cert: await fs.readFile('/run/secrets/tls_certificate'),
    minVersion: 'TLSv1.2',
  },
  async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const cors = req.headers.origin;
    if (cors && allowedOrigins.includes(cors)) {
      res.setHeader('Access-Control-Allow-Origin', cors);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type,Content-Length');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(cors && allowedOrigins.includes(cors) ? 204 : 403).end();
      return;
    }
    // One bounded mutation at a time: no partially verified object or duplicate job races.
    if (occupied) {
      json(res, { error: 'PROVIDER_BUSY' }, 503);
      return;
    }
    occupied = true;
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/upload/') && req.method === 'PUT') {
        const grant = unseal(config.grantSecret, url.pathname.slice(8), 'upload'),
          data = await body(req, grant.size);
        if (data.length !== grant.size || req.headers['content-type'] !== grant.mime)
          throw Error('UPLOAD_CONTRACT_MISMATCH');
        try {
          await put(grant.locator, data, { mimeType: grant.mime, verified: false });
        } catch (error) {
          if (
            error.code !== 'EEXIST' ||
            (await metadata(grant.locator)).verified ||
            sha(await bytes(grant.locator)) !== sha(data)
          )
            throw error;
        }
        res.writeHead(200).end();
        return;
      }
      if (url.pathname.startsWith('/delivery/') && req.method === 'GET') {
        const grant = unseal(config.grantSecret, url.pathname.slice(10), 'delivery'),
          { data, meta } = await readVerified(grant.locator);
        if (
          grant.locator.storageZone !== 'CLEAN' ||
          sha(data) !== grant.sha256 ||
          grant.epoch !== (meta.deliveryEpoch ?? 0) ||
          !meta.sanitized ||
          !meta.scan?.clean
        )
          throw Error('DELIVERY_CHANGED');
        res.writeHead(200, {
          'Content-Type': meta.mimeType,
          'Content-Length': data.length,
          'Content-Disposition': 'inline',
          'Content-Security-Policy': "sandbox; default-src 'none'",
        });
        res.end(data);
        return;
      }
      const raw = await body(req, 16384),
        nonce = authenticate(req.headers, req.method, url.pathname + url.search, raw, config);
      await reserveNonce(nonce);
      if (req.method === 'GET' && url.pathname === '/v1/capabilities/readiness') {
        let scanner = false,
          processor = false;
        try {
          scanner = (await scanBytes(Buffer.alloc(0))).clean;
        } catch {}
        try {
          processor = (
            await fetch(new URL('/ready', worker), {
              headers: { 'x-worker-token': config.workerToken },
              signal: AbortSignal.timeout(1500),
            })
          ).ok;
        } catch {}
        json(res, {
          protocolVersion: 1,
          scope:process.env.MEDIA_INSTANCE_KIND==='isolated'?'ISOLATED_SELFHOST_MEDIA':'PRODUCTION_SELFHOST_MEDIA',
          checkedAt: new Date().toISOString(),
          capabilities: {
            'asset-storage': {
              ready:
                (await fs.statfs(root)).bavail * (await fs.statfs(root)).bsize > 128 * 1024 * 1024,
              authorized: true,
            },
            'malware-scanner': { ready: scanner, authorized: true },
            'asset-sanitizer': { ready: scanner && processor, authorized: true },
          },
        });
        return;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/v1/assets/lifecycle/operations/')) {
        const operationId = decodeURIComponent(
            url.pathname.slice('/v1/assets/lifecycle/operations/'.length),
          ),
          observed = JSON.parse(
            await fs.readFile(path.join(root, 'operations', sha(operationId) + '.json'), 'utf8'),
          );
        if ((await metadata(observed.locator)).operationId !== operationId)
          throw Error('LIFECYCLE_FENCE_CHANGED');
        json(res, { pending: false, proof: observed.proof });
        return;
      }
      const input = raw.length ? JSON.parse(raw) : {},
        key = req.headers['idempotency-key'];
      if (req.method === 'DELETE' && url.pathname === '/v1/assets') {
        const filename = file(input.locator);
        await fs.rm(filename, { force: true });
        await fs.rm(filename + '.json', { force: true });
        json(res, {});
        return;
      }
      if (req.method !== 'POST' || !url.pathname.startsWith('/v1/assets/'))
        throw Error('OPERATION_UNSUPPORTED');
      if (key && (typeof key !== 'string' || key.length > 200))
        throw Error('IDEMPOTENCY_KEY_INVALID');
      const receipt = key
          ? path.join(root, 'receipts', sha(url.pathname + ':' + key) + '.json')
          : null,
        fingerprint = sha(raw);
      if (receipt) {
        try {
          const previous = JSON.parse(await fs.readFile(receipt, 'utf8'));
          if (previous.fingerprint !== fingerprint) throw Error('IDEMPOTENCY_CONFLICT');
          const expiry = previous.value.expiresAt;
          if (!expiry || Date.parse(expiry) > Date.now() + 5000) {
            json(res, previous.value);
            return;
          }
          if (url.pathname.includes('/upload-grants')) input.locator = previous.value.locator;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      const value = await operate(url.pathname.slice('/v1/assets'.length), input);
      if (Buffer.isBuffer(value)) {
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': value.length,
        });
        res.end(value);
        return;
      }
      if (receipt) await atomic(receipt, JSON.stringify({ fingerprint, value, at: Date.now() }));
      json(res, value);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'media_provider_rejected',
          code:
            error.code === 'ENOENT'
              ? 'OBJECT_NOT_FOUND'
              : /^[A-Z_]{3,80}$/.test(error.message ?? '')
                ? error.message
                : 'MEDIA_INTERNAL_ERROR',
        }),
      );
      json(res, { error: 'MEDIA_OPERATION_REJECTED' }, 422);
    } finally {
      occupied = false;
    }
  },
);
server.requestTimeout = 150000;
server.headersTimeout = 10000;
server.maxHeadersCount = 32;
server.listen(8443, '0.0.0.0');
// Nonce replay evidence survives restarts. Prune only entries older than the auth window.
const retention = setInterval(async () => {
  if (occupied) return;
  occupied = true;
  try {
    for (const dir of ['nonces', 'receipts'])
      for (const entry of await fs.readdir(path.join(root, dir))) {
        const filename = path.join(root, dir, entry),
          stat = await fs.stat(filename);
        if (Date.now() - stat.mtimeMs > (dir === 'nonces' ? 180000 : 86400000))
          await fs.unlink(filename);
      }
  } catch {
    console.error('{"event":"media_retention_failed"}');
  } finally {
    occupied = false;
  }
}, 60000);
retention.unref();
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    clearInterval(retention);
    server.close();
  });
