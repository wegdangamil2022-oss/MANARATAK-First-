import { describe, expect, it, vi } from 'vitest';
import { availableAssetActions, executeAssetAction } from './AssetLifecycleActions';
import { adminApiClient } from '../api/client';
vi.mock('../api/client', () => ({ adminApiClient: { request: vi.fn() }, createAdminIdempotencyKey: () => 'isolated-key' }));
describe('asset action contract', () => {
  it.each(['INITIATED', 'QUARANTINED', 'MALWARE_SCAN_FAILED', 'DELETED', 'PURGED', 'UNKNOWN'])('never offers promotion for %s', lifecycleState => {
    expect(availableAssetActions({ id: 'a', lifecycleState })).not.toContain('activate');
  });
  it('requires post-sanitization scan evidence for promotion', () => {
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING' })).not.toContain('activate');
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING',
      securityEvidence: { uploadConfirmed: false, malwareStatus: 'PASSED', sanitized: true } })).not.toContain('activate');
    expect(availableAssetActions({ id: 'a', lifecycleState: 'SANITIZING',
      securityEvidence: { uploadConfirmed: true, malwareStatus: 'PASSED', sanitized: true } })).toContain('activate');
  });
  it('does not offer unsupported archived restore or irreversible purge', () => {
    expect(availableAssetActions({ id: 'a', lifecycleState: 'ARCHIVED' })).toEqual(['archive', 'delete']);
    expect(availableAssetActions({ id: 'a', lifecycleState: 'PURGED' })).toEqual([]);
  });
  it('encodes the handle and forwards only an empty server-verified command with retry key', async () => {
    await executeAssetAction('a/b', 'activate', 'same-operation');
    expect(adminApiClient.request).toHaveBeenCalledWith('/admin/assets/a%2Fb/activate', {
      method: 'POST', body: '{}', idempotencyKey: 'same-operation',
    });
  });
});
