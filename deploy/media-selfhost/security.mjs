import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function equal(left, right) {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    Buffer.byteLength(left) === Buffer.byteLength(right) &&
    timingSafeEqual(Buffer.from(left), Buffer.from(right))
  );
}
export function sign(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function seal(secret, payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(secret, encoded)}`;
}
export function unseal(secret, token, purpose, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 3000) throw Error('GRANT_INVALID');
  const [encoded, signature, ...extra] = token.split('.');
  if (extra.length || !equal(signature, sign(secret, encoded))) throw Error('GRANT_INVALID');
  const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (
    value.purpose !== purpose ||
    !Number.isSafeInteger(value.expires) ||
    value.expires <= now ||
    value.expires > now + 300000
  )
    throw Error('GRANT_EXPIRED');
  return value;
}
export function authenticate(headers, method, url, bytes, config, now = Date.now()) {
  const timestamp = headers['x-manaratak-timestamp'],
    nonce = headers['x-manaratak-nonce'];
  if (
    !equal(headers['x-manaratak-provider-key'], config.apiKey) ||
    typeof timestamp !== 'string' ||
    !Number.isFinite(Date.parse(timestamp)) ||
    Math.abs(now - Date.parse(timestamp)) > 60000 ||
    typeof nonce !== 'string' ||
    !/^[a-zA-Z0-9_-]{16,128}$/.test(nonce)
  )
    throw Error('PROVIDER_AUTH_INVALID');
  const digest = sha(bytes),
    canonical = `${method}\n${url}\n${timestamp}\n${nonce}\n${digest}`;
  if (
    !equal(headers['x-manaratak-content-sha256'], digest) ||
    !equal(headers['x-manaratak-signature'], sign(config.signingSecret, canonical))
  )
    throw Error('PROVIDER_SIGNATURE_INVALID');
  return nonce;
}
export function locatorKey(locator, bucket) {
  if (
    !locator ||
    locator.bucketName !== bucket ||
    !['QUARANTINE', 'CLEAN'].includes(locator.storageZone) ||
    !new RegExp(
      `^${locator.storageZone === 'CLEAN' ? 'clean' : 'uploads'}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
    ).test(locator.pathKey)
  )
    throw Error('LOCATOR_INVALID');
  return `${locator.storageZone}/${locator.pathKey}`;
}
export function signatureMatches(bytes, mime) {
  if (mime === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (mime === 'video/webm')
    return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (['audio/wav', 'audio/x-wav'].includes(mime))
    return (
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE'
    );
  if (mime === 'audio/ogg') return bytes.subarray(0, 4).toString() === 'OggS';
  if (mime === 'audio/mpeg')
    return (
      bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0)
    );
  if (mime === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (['text/plain', 'text/vtt'].includes(mime)) {
    try {
      const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return !value.includes('\0') && (mime !== 'text/vtt' || value.startsWith('WEBVTT'));
    } catch {
      return false;
    }
  }
  return false;
}
export const supportedMime = [
  'video/mp4',
  'video/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mpeg',
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
  'text/vtt',
];
export function byteLimit(mime) {
  if (!supportedMime.includes(mime)) throw Error('MIME_UNSUPPORTED');
  return mime.startsWith('text/') ? 2 * 1024 * 1024 : 64 * 1024 * 1024;
}
