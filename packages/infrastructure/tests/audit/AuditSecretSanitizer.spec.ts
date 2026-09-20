import { describe, it, expect } from 'vitest';
import { AuditSecretSanitizer } from '../../src/audit/AuditSecretSanitizer';

describe('AuditSecretSanitizer', () => {
  it('redacts sensitive metadata keys recursively', () => {
    const rawData = {
      user: 'admin',
      password: 'myPassword123',
      passwordHash: '$2b$10$abcdef...',
      token: 'jwt-token-val',
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      secret: 'super-secret-key',
      apiKey: 'api-key-789',
      api_key: 'api-key-321',
      bearer: 'bearer-token-abc',
      authorization: 'Bearer auth-xyz',
      databaseUrl: 'postgresql://user:pass@localhost:5432/db',
      DATABASE_URL: 'postgresql://admin:secret@host:5432/proddb',
      JWT_SECRET: 'jwt-secret-value',
      ADMIN_BEARER_TOKEN: 'admin-bearer-token',
      creditCard: '4111-2222-3333-4444'
    };

    const sanitized = AuditSecretSanitizer.sanitize(rawData);

    expect(sanitized.user).toBe('admin');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.passwordHash).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.accessToken).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect(sanitized.bearer).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.databaseUrl).toBe('[REDACTED]');
    expect(sanitized.DATABASE_URL).toBe('[REDACTED]');
    expect(sanitized.JWT_SECRET).toBe('[REDACTED]');
    expect(sanitized.ADMIN_BEARER_TOKEN).toBe('[REDACTED]');
    expect(sanitized.creditCard).toBe('[REDACTED]');
  });

  it('redacts nested keys inside objects and arrays', () => {
    const nestedData = {
      request: {
        headers: {
          authorization: 'Bearer token-123',
          'content-type': 'application/json'
        },
        body: {
          user: {
            name: 'Jane Doe',
            credentials: {
              password: 'secretPassword'
            }
          }
        }
      },
      items: [
        { id: 1, apiKey: 'key-1' },
        { id: 2, name: 'public item' }
      ]
    };

    const sanitized = AuditSecretSanitizer.sanitize(nestedData);

    expect(sanitized.request.headers['content-type']).toBe('application/json');
    expect(sanitized.request.headers.authorization).toBe('[REDACTED]');
    expect(sanitized.request.body.user.name).toBe('Jane Doe');
    expect(sanitized.request.body.user.credentials.password).toBe('[REDACTED]');
    expect(sanitized.items[0].id).toBe(1);
    expect(sanitized.items[0].apiKey).toBe('[REDACTED]');
    expect(sanitized.items[1].name).toBe('public item');
  });

  it('preserves non-sensitive metadata and primitive values', () => {
    const safeData = {
      action: 'UPDATE_UNIVERSITY',
      entityId: 'uni-101',
      changesCount: 3,
      isPublished: true,
      tags: ['education', 'higher-ed'],
      timestamp: new Date('2026-07-29T12:00:00Z')
    };

    const sanitized = AuditSecretSanitizer.sanitize(safeData);

    expect(sanitized.action).toBe('UPDATE_UNIVERSITY');
    expect(sanitized.entityId).toBe('uni-101');
    expect(sanitized.changesCount).toBe(3);
    expect(sanitized.isPublished).toBe(true);
    expect(sanitized.tags).toEqual(['education', 'higher-ed']);
    expect(sanitized.timestamp.toISOString()).toBe('2026-07-29T12:00:00.000Z');
  });

  it('does not mutate original object', () => {
    const original = {
      password: 'raw-password',
      normal: 'normal-value'
    };

    const sanitized = AuditSecretSanitizer.sanitize(original);

    expect(original.password).toBe('raw-password');
    expect(sanitized.password).toBe('[REDACTED]');
  });

  it('handles null, undefined and primitives gracefully', () => {
    expect(AuditSecretSanitizer.sanitize(null)).toBeNull();
    expect(AuditSecretSanitizer.sanitize(undefined)).toBeUndefined();
    expect(AuditSecretSanitizer.sanitize(123)).toBe(123);
    expect(AuditSecretSanitizer.sanitize('plain string')).toBe('plain string');
  });
});
