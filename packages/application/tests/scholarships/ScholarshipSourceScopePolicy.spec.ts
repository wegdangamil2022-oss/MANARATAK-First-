import { describe, expect, it } from 'vitest';
import { ScholarshipSourceScopePolicy } from '../../src/scholarships/source-registry';

describe('WP12-6 ScholarshipSourceScopePolicy', () => {
  const scope = {
    allowedOrigins: ['https://scholarships.example.gov'],
    allowedPathPrefixes: ['/programs'],
    allowSubdomains: false,
  };

  it('accepts an in-scope HTTPS path', () => {
    const parsed = ScholarshipSourceScopePolicy.assertAllowed(
      'https://scholarships.example.gov/programs/doctoral/2027',
      scope,
    );
    expect(parsed.hostname).toBe('scholarships.example.gov');
  });

  it('rejects cross-origin, cross-path and credential-bearing URLs', () => {
    expect(() => ScholarshipSourceScopePolicy.assertAllowed('https://evil.example/programs', scope))
      .toThrow('SCHOLARSHIP_SOURCE_URL_OUTSIDE_ALLOWED_ORIGIN');
    expect(() => ScholarshipSourceScopePolicy.assertAllowed('https://scholarships.example.gov/news', scope))
      .toThrow('SCHOLARSHIP_SOURCE_URL_OUTSIDE_ALLOWED_PATH');
    expect(() => ScholarshipSourceScopePolicy.assertAllowed('https://user:pass@scholarships.example.gov/programs', scope))
      .toThrow('SCHOLARSHIP_SOURCE_URL_CREDENTIALS_FORBIDDEN');
  });

  it('rejects non-HTTP protocols before any runtime connector can be invoked', () => {
    expect(() => ScholarshipSourceScopePolicy.assertAllowed('file:///etc/passwd', scope))
      .toThrow('SCHOLARSHIP_SOURCE_URL_PROTOCOL_FORBIDDEN:candidateUrl');
  });
});
