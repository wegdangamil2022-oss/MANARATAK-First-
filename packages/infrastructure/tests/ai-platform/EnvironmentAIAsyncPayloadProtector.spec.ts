import { describe, expect, it } from 'vitest';
import { EnvironmentAIAsyncPayloadProtector } from '../../src/ai-platform/EnvironmentAIAsyncPayloadProtector';

describe('EnvironmentAIAsyncPayloadProtector', () => {
  it('reports NOT_CONFIGURED without persisting or inventing a key', () => {
    const protector = new EnvironmentAIAsyncPayloadProtector('AI_ASYNC_PAYLOAD_KEY', {});
    expect(protector.status()).toBe('NOT_CONFIGURED');
    expect(() => protector.protect({ private: 'student' })).toThrow('AI_ASYNC_PAYLOAD_PROTECTION_NOT_CONFIGURED');
  });

  it('round-trips an authenticated encrypted payload without plaintext leakage', () => {
    const secret = Buffer.alloc(32, 7).toString('base64');
    const protector = new EnvironmentAIAsyncPayloadProtector('AI_ASYNC_PAYLOAD_KEY', { AI_ASYNC_PAYLOAD_KEY: secret });
    const protectedValue = protector.protect({ private: 'student@example.com' });
    expect(protectedValue.ciphertext).not.toContain('student@example.com');
    expect(protector.unprotect(protectedValue)).toEqual({ private: 'student@example.com' });
  });
});
