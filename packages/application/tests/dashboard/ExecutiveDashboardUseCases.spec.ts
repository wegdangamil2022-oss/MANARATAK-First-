import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dashboardPeriod,
  registrationGrowth,
  PublicAnalyticsUseCases,
  analyticsTokenHash,
  ManagedApplicationEvidenceUseCases,
} from '../../src/dashboard/ExecutiveDashboardUseCases';
import { ANALYTICS_POLICY_VERSION } from '@manaratak/shared';
import { AssetReferencePolicy } from '../../src/asset-platform/AssetReferencePolicy';

afterEach(() => vi.useRealTimers());
describe('Executive periods and real registration growth', () => {
  it.each([7, 30, 90, 365])(
    'compares exactly equal UTC windows of %i days, including leap dates',
    (days) => {
      const period = dashboardPeriod(days, new Date('2024-03-01T00:00:00Z'));
      expect(Date.parse(period.until) - Date.parse(period.from)).toBe(days * 86400000);
      expect(Date.parse(period.from) - Date.parse(period.previousFrom)).toBe(days * 86400000);
      expect(period.timezone).toBe('UTC');
    },
  );
  it.each([
    [1, 0, null, 'started_from_zero'],
    [0, 0, null, 'no_baseline'],
    [0, 4, -100, 'comparable'],
    [6, 4, 50, 'comparable'],
  ])('keeps %i/%i growth honest', (current, previous, percentage, state) => {
    expect(registrationGrowth(Number(current), Number(previous))).toEqual({
      growthPercent: percentage,
      growthState: state,
    });
  });
  it('rejects invalid periods and negative or unsafe counts', () => {
    expect(() => dashboardPeriod(8)).toThrow();
    expect(() => registrationGrowth(-1, 0)).toThrow();
    expect(() => registrationGrowth(Number.MAX_SAFE_INTEGER + 1, 0)).toThrow();
  });
});
function analyticsGateway() {
  return {
    grant: vi.fn(),
    record: vi.fn().mockResolvedValue('recorded'),
    withdraw: vi.fn(),
    purgeExpired: vi.fn(),
  };
}
describe('Explicit public analytics consent', () => {
  it('defaults to no collection until policy activation and never stores a plaintext capability', async () => {
    const gateway = analyticsGateway(),
      off = new PublicAnalyticsUseCases(gateway, false);
    await expect(off.grant(ANALYTICS_POLICY_VERSION, true)).rejects.toThrow('POLICY_NOT_APPROVED');
    expect(gateway.grant).not.toHaveBeenCalled();
    const on = new PublicAnalyticsUseCases(gateway, true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T00:00:00Z'));
    const granted = await on.grant(ANALYTICS_POLICY_VERSION, true);
    expect(granted.token).toMatch(/^[a-f0-9]{64}$/);
    expect(gateway.grant).toHaveBeenCalledWith(
      analyticsTokenHash(granted.token),
      new Date('2026-11-23T00:00:00Z'),
      ANALYTICS_POLICY_VERSION,
    );
    expect(gateway.grant.mock.calls[0][0]).not.toBe(granted.token);
  });
  it('does not reuse student personalization consent or accept another policy', async () => {
    const gateway = analyticsGateway(),
      service = new PublicAnalyticsUseCases(gateway, true);
    await expect(service.grant('allowProductAnalytics', true)).rejects.toThrow(
      'EXPLICIT_CONSENT_REQUIRED',
    );
    await expect(service.grant(ANALYTICS_POLICY_VERSION, false)).rejects.toThrow(
      'EXPLICIT_CONSENT_REQUIRED',
    );
    expect(gateway.grant).not.toHaveBeenCalled();
  });
  it('excludes bots before storing events; accepts withdrawal even after collection is disabled', async () => {
    const gateway = analyticsGateway(),
      service = new PublicAnalyticsUseCases(gateway, true),
      token = 'a'.repeat(64);
    expect(
      await service.record(token, { eventId: 'event', kind: 'page_view', pageKey: 'home' }, true),
    ).toEqual({ result: 'excluded' });
    expect(gateway.record).not.toHaveBeenCalled();
    await new PublicAnalyticsUseCases(gateway, false).withdraw(token);
    expect(gateway.withdraw).toHaveBeenCalledWith(analyticsTokenHash(token));
  });
});
describe('University evidence does not follow from file receipt, tracker or payment', () => {
  const base = {
    id: 'request',
    publicId: 'request-public',
    studentReferenceId: 'student',
    status: 'IN_PROGRESS',
    version: 1,
    serviceSnapshot: { managedApplication: true, fulfillmentPolicy: 'FREE' },
  };
  function setup(overrides: Record<string, unknown> = {}) {
    const gateway = {
        append: vi.fn().mockResolvedValue({ id: 'evidence', kind: 'UNIVERSITY_SUBMITTED' }),
        selfReport: vi.fn(),
        assets: vi.fn(),
      },
      requests = { findRequestById: vi.fn().mockResolvedValue({ ...base, ...overrides }) },
      assets = Object.assign(Object.create(AssetReferencePolicy.prototype), {
        assertUsable: vi
          .fn()
          .mockResolvedValue({ retention: { expiresAt: new Date(Date.now() + 100000) } }),
      }),
      finance = { getInvoiceClearance: vi.fn().mockResolvedValue({ financiallyCleared: false }) };
    return {
      gateway,
      requests,
      assets,
      finance,
      service: new ManagedApplicationEvidenceUseCases(
        gateway,
        requests as never,
        assets,
        finance as never,
      ),
    };
  }
  const input = {
    requestId: 'request',
    expectedVersion: 1,
    actorId: 'staff',
    kind: 'UNIVERSITY_SUBMITTED' as const,
    evidenceAssetId: 'asset',
    key: 'command-1',
  };
  it('requires a reviewed managed-service snapshot and a private trusted proof', async () => {
    const wrong = setup({ serviceSnapshot: { fulfillmentPolicy: 'FREE' } });
    await expect(wrong.service.append(input)).rejects.toThrow(
      'MANAGED_APPLICATION_REQUEST_REQUIRED',
    );
    const owner = setup();
    await expect(owner.service.append({ ...input, evidenceAssetId: null })).rejects.toThrow(
      'EVIDENCE_REQUIRED',
    );
    expect(owner.gateway.append).not.toHaveBeenCalled();
    await owner.service.append(input);
    expect(owner.assets.assertUsable).toHaveBeenCalledWith(
      'asset',
      expect.objectContaining({
        expectedOwnerId: 'staff',
        allowedClassifications: ['CONFIDENTIAL', 'RESTRICTED'],
      }),
    );
  });
  it('rejects expired proof and uncleared paid services without producing an event', async () => {
    const expired = setup();
    expired.assets.assertUsable.mockResolvedValue({ retention: { expiresAt: new Date(0) } });
    await expect(expired.service.append(input)).rejects.toThrow('EXPIRED');
    expect(expired.gateway.append).not.toHaveBeenCalled();
    const paid = setup({
      serviceSnapshot: { managedApplication: true, fulfillmentPolicy: 'CHARGEABLE' },
      financeInvoiceId: 'invoice',
    });
    await expect(paid.service.append(input)).rejects.toThrow('FINANCIAL_CLEARANCE_REQUIRED');
    expect(paid.gateway.append).not.toHaveBeenCalled();
  });
});
