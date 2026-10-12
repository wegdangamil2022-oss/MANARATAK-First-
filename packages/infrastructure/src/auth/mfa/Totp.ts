import { createHmac, timingSafeEqual } from 'node:crypto';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeBase32(bytes: Uint8Array): string {
  let value = 0,
    bits = 0,
    text = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      text += alphabet[(value >>> bits) & 31];
    }
  }
  if (bits) text += alphabet[(value << (5 - bits)) & 31];
  return text;
}
export function totp(secret: string, step: number, digits = 6): string {
  if (
    !/^[A-Z2-7]{16,128}$/.test(secret) ||
    !Number.isSafeInteger(step) ||
    step < 0 ||
    ![6, 8].includes(digits)
  )
    throw new Error('MFA_SECRET_INVALID');
  const bytes: number[] = [];
  let value = 0,
    bits = 0;
  for (const char of secret) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, '0');
}
export function matchingStep(
  secret: string,
  code: string,
  now: Date,
  lastAcceptedStep: number,
): number {
  if (!/^\d{6}$/.test(code)) throw new Error('MFA_CODE_INVALID');
  const current = Math.floor(now.getTime() / 30000);
  for (const step of [current, current - 1, current + 1]) {
    if (
      step > lastAcceptedStep &&
      step >= 0 &&
      timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, step)))
    )
      return step;
  }
  throw new Error('MFA_CODE_INVALID');
}
