import { describe, expect, it } from 'vitest';
import { SafeImportedCourseLinkChecker } from '../../src/courses/SafeImportedCourseLinkChecker';

describe('SafeImportedCourseLinkChecker', () => {
  it('rejects non-HTTPS URLs before network access', async () => {
    const checker = new SafeImportedCourseLinkChecker();
    await expect(checker.check({
      url: 'http://example.org/course',
      allowedDomains: ['example.org'],
    })).rejects.toThrow('COURSE_LINK_HTTPS_REQUIRED');
  });

  it('blocks private IP literals even when listed as an allowed domain', async () => {
    const checker = new SafeImportedCourseLinkChecker();
    await expect(checker.check({
      url: 'https://127.0.0.1/course',
      allowedDomains: ['127.0.0.1'],
    })).rejects.toThrow('COURSE_LINK_PRIVATE_ADDRESS_BLOCKED');
  });

  it('blocks IPv4-mapped IPv6 private literals', async () => {
    const checker = new SafeImportedCourseLinkChecker();
    await expect(checker.check({ url: 'https://[::ffff:127.0.0.1]/course', allowedDomains: ['[::ffff:127.0.0.1]'] })).rejects.toThrow('COURSE_LINK_PRIVATE_ADDRESS_BLOCKED');
  });

  it('returns BLOCKED_DOMAIN before attempting a request outside provider policy', async () => {
    const checker = new SafeImportedCourseLinkChecker();
    const result = await checker.check({
      url: 'https://127.0.0.1/course',
      allowedDomains: ['example.org'],
    });
    expect(result.state).toBe('BLOCKED_DOMAIN');
  });
});
