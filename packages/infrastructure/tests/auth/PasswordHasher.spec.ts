import { describe, it, expect } from 'vitest';
import { PasswordHasher } from '../../src/auth/PasswordHasher';

describe('PasswordHasher', () => {
  it('should hash a password and verify it successfully', async () => {
    const password = 'mySuperSecretPassword123!';
    const hashedPassword = await PasswordHasher.hash(password);

    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).toContain('scrypt:');

    const isValid = await PasswordHasher.verify(password, hashedPassword);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const password = 'mySuperSecretPassword123!';
    const hashedPassword = await PasswordHasher.hash(password);

    const isValid = await PasswordHasher.verify('wrongPassword', hashedPassword);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for the same password due to random salting', async () => {
    const password = 'constant_password';
    const hash1 = await PasswordHasher.hash(password);
    const hash2 = await PasswordHasher.hash(password);

    expect(hash1).not.toBe(hash2);
    
    expect(await PasswordHasher.verify(password, hash1)).toBe(true);
    expect(await PasswordHasher.verify(password, hash2)).toBe(true);
  });

  it('should respect custom cost parameters', async () => {
    const password = 'custom_params';
    const costParams = { N: 1024, r: 8, p: 1 };
    const hashedPassword = await PasswordHasher.hash(password, costParams);

    expect(hashedPassword).toContain('scrypt:1024:8:1:');
    expect(await PasswordHasher.verify(password, hashedPassword)).toBe(true);
  });

  it('should return false deterministically for malformed hashes without crashing', async () => {
    const malformed1 = 'plain_text_password';
    const malformed2 = 'scrypt:not-a-number:8:1:salt:hash';
    const malformed3 = 'scrypt:1024:8:1:too_few_parts';
    const malformed4 = '';

    expect(await PasswordHasher.verify('password', malformed1)).toBe(false);
    expect(await PasswordHasher.verify('password', malformed2)).toBe(false);
    expect(await PasswordHasher.verify('password', malformed3)).toBe(false);
    expect(await PasswordHasher.verify('password', malformed4)).toBe(false);
  });
});
