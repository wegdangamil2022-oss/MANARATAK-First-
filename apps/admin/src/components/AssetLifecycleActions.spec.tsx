import { describe, expect, it, vi } from 'vitest';
import { availableAssetActions, executeAssetAction, shouldStartNewAssetAttempt } from './AssetLifecycleActions';
import { adminApiClient } from '../api/client';
vi.mock('../api/client', () => ({ adminApiClient: { request: vi.fn() }, createAdminIdempotencyKey: () => 'isolated-key' }));
describe('asset action contract', () => {
  it.each(['RUNNING', 'RECOVERY_REQUIRED'] as const)('suppresses competing archive lifecycle actions (%s)', phase => {
    expect(availableAssetActions({ id: 'pending-archive', lifecycleState: 'ARCHIVED', securityEvidence: {
      uploadConfirmed: true, malwareStatus: 'PASSED', sanitized: true, archivePhase: phase,
    } })).toEqual([]);
  });
  it.each(['INITIATED', 'QUARANTINED', 'MALWARE_SCAN_FAILED', 'DELETED', 'PURGED', 'UNKNOWN'])('never offers promotion for %s', lifecycleState => {
    expect(availableAssetActions({ id: 'a', lifecycleState })).not.toContain('activate');
  });
  it.each(['PREPARED', 'RESTORING', 'RECOVERY_REQUIRED'] as const)('prevents lifecycle actions on an unresolved restore (%s)', phase => {
    expect(availableAssetActions({ id: 'pending', lifecycleState: 'DELETED', securityEvidence: {
      uploadConfirmed: true, malwareStatus: 'PASSED', sanitized: true, restorePhase: phase,
    } })).toEqual([]);
  });
  it('requires post-sanitization scan evidence for promotion', () => {
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING' })).not.toContain('activate');
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING',
      securityEvidence: { uploadConfirmed: false, malwareStatus: 'PASSED', sanitized: true } })).not.toContain('activate');
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING',
      securityEvidence: { uploadConfirmed: true, malwareStatus: 'PASSED', sanitized: true } })).toContain('activate');
  });
  it('allows only recovery while a persisted promotion is pending', () => {
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING',
      securityEvidence: { uploadConfirmed: true, malwareStatus: 'PASSED', sanitized: true, activationPhase: 'PREPARED' } })).toEqual(['activate']);
  });
  it('does not offer unsupported archived restore or irreversible purge', () => {
    expect(availableAssetActions({ id: 'a', lifecycleState: 'ARCHIVED' })).toEqual(['archive', 'delete']);
    expect(availableAssetActions({ id: 'a', lifecycleState: 'PURGED' })).toEqual([]);
  });
  it('starts a new HTTP attempt after a cached terminal failure, preserving keys for ambiguous or in-progress requests', () => {
    expect(shouldStartNewAssetAttempt(new Error('[500] Asset operation failed'))).toBe(true);
    expect(shouldStartNewAssetAttempt(new Error('[409] Asset state conflict'))).toBe(true);
    expect(shouldStartNewAssetAttempt(new Error('Failed to fetch'))).toBe(false);
    expect(shouldStartNewAssetAttempt(new Error('[409] processing (IDEMPOTENCY_REQUEST_IN_PROGRESS)'))).toBe(false);
  });
  it('encodes the handle and forwards only an empty server-verified command with retry key', async () => {
    await executeAssetAction('a/b', 'activate', 'same-operation');
    expect(adminApiClient.request).toHaveBeenCalledWith('/admin/assets/a%2Fb/activate', {
      method: 'POST', body: '{}', idempotencyKey: 'same-operation',
    });
  });
});
