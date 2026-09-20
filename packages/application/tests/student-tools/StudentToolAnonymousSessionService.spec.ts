import { describe, expect, it } from 'vitest';
import { StudentToolAnonymousSessionService } from '../../src/student-tools/services/StudentToolAnonymousSessionService';

describe('StudentToolAnonymousSessionService', () => {
  const secret = '0123456789abcdef0123456789abcdef0123456789abcdef';

  it('issues and verifies a network-bound signed session', () => {
    const service = new StudentToolAnonymousSessionService(secret, 60);
    const issued = service.resolve(undefined, '203.0.113.10');
    expect(issued.newlyIssued).toBe(true);
    const verified = service.resolve(issued.token, '203.0.113.10');
    expect(verified.newlyIssued).toBe(false);
    expect(verified.sessionReference).toBe(issued.sessionReference);
  });

  it('rejects a token replayed from another network reference', () => {
    const service = new StudentToolAnonymousSessionService(secret, 60);
    const issued = service.resolve(undefined, '203.0.113.10');
    expect(() => service.resolve(issued.token, '198.51.100.20')).toThrow('TOOL_ANONYMOUS_SESSION_INVALID');
  });
});
