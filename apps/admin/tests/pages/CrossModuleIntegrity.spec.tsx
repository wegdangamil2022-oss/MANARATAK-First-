import { describe, expect, it, vi } from 'vitest';
import { parseIntegrityReport } from '../../src/pages/CrossModuleIntegrityPage';
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
const report = {
  data: {
    coverage: 'PARTIAL_OWNER_SAMPLE',
    sourceOwner: 'MAJORS',
    page: 1,
    hasMore: false,
    scanned: 20,
    targetReferencesChecked: 50,
    referencesTruncated: false,
    capturedAt: new Date().toISOString(),
    findings: [],
  },
};
describe('integrity response identity', () => {
  it('accepts a bounded matching owner sample', () =>
    expect(parseIntegrityReport(report, 'MAJORS', 1).scanned).toBe(20));
  it('rejects another owner or page and unbounded counts', () => {
    expect(() => parseIntegrityReport(report, 'TESTS', 1)).toThrow();
    expect(() => parseIntegrityReport(report, 'MAJORS', 2)).toThrow();
    expect(() =>
      parseIntegrityReport({ data: { ...report.data, scanned: 21 } }, 'MAJORS', 1),
    ).toThrow();
  });
  it('rejects falsely complete coverage and malformed findings', () => {
    expect(() =>
      parseIntegrityReport({ data: { ...report.data, coverage: 'COMPLETE' } }, 'MAJORS', 1),
    ).toThrow();
    expect(() =>
      parseIntegrityReport({ data: { ...report.data, findings: [null] } }, 'MAJORS', 1),
    ).toThrow();
  });
});
