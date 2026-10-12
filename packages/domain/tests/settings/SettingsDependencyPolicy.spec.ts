import { describe, expect, it } from 'vitest';
import {
  evaluateSettingsDependencies,
  validateSettingsDependencyPolicy,
} from '../../src/settings/services/SettingsDependencyPolicy';
const policy = {
  rules: [
    {
      id: 'mail',
      triggerKey: 'mail.enabled',
      requiredKeys: ['mail.sender'],
      context: { domainId: 'notifications' },
    },
  ],
};
describe('Settings cross-key policy boundary', () => {
  it('has no invented dependencies when unconfigured', async () => {
    await expect(
      evaluateSettingsDependencies({ rules: [] }, async () => {
        throw new Error('unexpected read');
      }),
    ).resolves.toBeUndefined();
  });
  it('rejects an enabled feature whose effective dependency is missing', async () => {
    await expect(
      evaluateSettingsDependencies(policy, async (key) => ({
        available: true,
        value: key === 'mail.enabled' ? true : '',
      })),
    ).rejects.toThrow('SETTINGS_DEPENDENCY_REQUIRED:mail:mail.sender');
  });
  it('does not require a dependency for a disabled feature', async () => {
    await expect(
      evaluateSettingsDependencies(policy, async () => ({ available: true, value: false })),
    ).resolves.toBeUndefined();
  });
  it('checks the explicitly declared context and accepts resolved dependencies', async () => {
    const contexts: unknown[] = [];
    await evaluateSettingsDependencies(policy, async (key, context) => {
      contexts.push(context);
      return { available: true, value: key === 'mail.enabled' ? true : 'sender' };
    });
    expect(contexts).toEqual([{ domainId: 'notifications' }, { domainId: 'notifications' }]);
  });
  it.each([
    { rules: [{ id: 'r', requiredKeys: ['x'] }] },
    { rules: [{ id: 'r', triggerKey: 'x', requiredKeys: ['x'] }] },
    {
      rules: [
        { id: 'r', triggerKey: 'x', requiredKeys: ['y'], context: { tenantId: 'unsupported' } },
      ],
    },
  ])('rejects malformed or unsupported policies', (value) => {
    expect(() => validateSettingsDependencyPolicy(value)).toThrow(
      'SETTINGS_DEPENDENCY_POLICY_INVALID',
    );
  });
});
