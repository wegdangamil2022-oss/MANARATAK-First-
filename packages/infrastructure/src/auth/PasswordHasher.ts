import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

export class PasswordHasher {
  private static readonly KEY_LEN = 64;
  private static readonly SALT_LEN = 16;
  private static readonly DEFAULT_N = 16384;
  private static readonly DEFAULT_R = 8;
  private static readonly DEFAULT_P = 1;
  // Fixed non-secret salt/hash target used only to equalize invalid-login KDF cost.
  private static readonly DUMMY_SALT = Buffer.from('7b8f4f770e49a1c0d3b44c616bc50bd2', 'hex');

  public static async hash(password: string, costParams?: { N?: number; r?: number; p?: number }): Promise<string> {
    const N = costParams?.N ?? this.DEFAULT_N;
    const r = costParams?.r ?? this.DEFAULT_R;
    const p = costParams?.p ?? this.DEFAULT_P;
    const salt = randomBytes(this.SALT_LEN);
    const derivedKey = await this.derive(password, salt, this.KEY_LEN, { N, r, p });
    return `scrypt:${N}:${r}:${p}:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  public static async verify(password: string, hashedPasswordFormat: string): Promise<boolean> {
    try {
      const parsed = this.parseHash(hashedPasswordFormat);
      if (!parsed) return false;
      const derivedKey = await this.derive(password, parsed.salt, parsed.hash.length, parsed.params);
      return parsed.hash.length === derivedKey.length && timingSafeEqual(parsed.hash, derivedKey);
    } catch {
      return false;
    }
  }

  /** Execute the same approved KDF cost for login paths with no usable credential. */
  public static async verifyDummy(password: string): Promise<void> {
    try {
      await this.derive(password || 'invalid-credential', this.DUMMY_SALT, this.KEY_LEN, {
        N: this.DEFAULT_N, r: this.DEFAULT_R, p: this.DEFAULT_P,
      });
    } catch {
      // Authentication remains fail-closed; timing equalization must never turn a failure into success.
    }
  }

  private static parseHash(value: string): { salt: Buffer; hash: Buffer; params: { N: number; r: number; p: number } } | null {
    if (!value || typeof value !== 'string' || !value.startsWith('scrypt:')) return null;
    const parts = value.split(':');
    if (parts.length !== 6) return null;
    const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
    const N = Number.parseInt(nStr, 10);
    const r = Number.parseInt(rStr, 10);
    const p = Number.parseInt(pStr, 10);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N <= 1 || r <= 0 || p <= 0) return null;
    if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex) || saltHex.length % 2 || hashHex.length % 2) return null;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');
    if (salt.length === 0 || hash.length === 0) return null;
    return { salt, hash, params: { N, r, p } };
  }

  private static derive(
    password: string,
    salt: Buffer,
    keyLength: number,
    params: { N: number; r: number; p: number },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, keyLength, params, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey as Buffer);
      });
    });
  }
}
