import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { IStudentToolResultProtector, StudentToolOutput } from '@manaratak/domain';

/** Encrypts short-lived Phase 18 results; key material remains runtime-only. */
export class EnvironmentStudentToolResultProtector implements IStudentToolResultProtector {
  constructor(
    private readonly secretReference = 'STUDENT_TOOL_RESULT_KEY',
    private readonly environment: Readonly<Record<string, string | undefined>> = {},
  ) {}

  status(): 'READY' | 'NOT_CONFIGURED' {
    return this.key() ? 'READY' : 'NOT_CONFIGURED';
  }

  protect(value: StudentToolOutput) {
    const key = this.key();
    if (!key) throw new Error('TOOL_RESULT_PROTECTION_NOT_CONFIGURED');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyVersion: createHash('sha256').update(key).digest('hex').slice(0, 12),
    };
  }

  unprotect(value: { ciphertext: string; iv: string; authTag: string; keyVersion: string }) {
    const key = this.key();
    if (!key) throw new Error('TOOL_RESULT_PROTECTION_NOT_CONFIGURED');
    const currentVersion = createHash('sha256').update(key).digest('hex').slice(0, 12);
    if (currentVersion !== value.keyVersion) throw new Error('TOOL_RESULT_KEY_VERSION_UNAVAILABLE');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plaintext) as unknown;
  }

  private key(): Buffer | null {
    const raw = this.environment[this.secretReference]?.trim();
    if (!raw) return null;
    if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
    try {
      const decoded = Buffer.from(raw, 'base64');
      return decoded.length === 32 ? decoded : null;
    } catch {
      return null;
    }
  }
}
