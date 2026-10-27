import { describe, expect, it } from 'vitest';
import { preservesCmsDraftOnForbidden } from '../../src/api/CmsAuthorizationFailure';
describe('CMS command rejection and permission refresh', () => {
  it.each([
    { error: 'CMS_MAKER_CHECKER_VIOLATION' },
    { code: 'MFA_STEP_UP_REQUIRED' },
    { error: { code: 'MFA_ENROLLMENT_REQUIRED' } },
  ])('retains the mounted editor for a command-specific denial %j', (payload) => {
    expect(preservesCmsDraftOnForbidden('/admin/cms/content/id/approve', payload)).toBe(true);
  });
  it.each([
    { error: 'CMS_PERMISSION_DENIED' },
    { error: 'CMS_CAPABILITY_UNRECOGNIZED' },
    null,
    {},
    'invalid',
  ])('still rechecks actual or unknown permission denials %j', (payload) => {
    expect(preservesCmsDraftOnForbidden('/admin/cms/content', payload)).toBe(false);
  });
  it('does not change permission handling for other administration sections', () => {
    expect(
      preservesCmsDraftOnForbidden('/admin/courses/id', { code: 'MFA_STEP_UP_REQUIRED' }),
    ).toBe(false);
  });
});
