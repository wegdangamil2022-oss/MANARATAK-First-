export interface SettingsDependencyRule {
  id: string;
  triggerKey: string;
  requiredKeys: string[];
  context?: { domainId?: string; identityId?: string };
}
export interface SettingsDependencyPolicy {
  rules: SettingsDependencyRule[];
}
export function validateSettingsDependencyPolicy(input: unknown): SettingsDependencyPolicy {
  const policy = input as SettingsDependencyPolicy;
  const key = /^[a-zA-Z0-9_\-.]{1,240}$/;
  if (
    !policy ||
    typeof policy !== 'object' ||
    Array.isArray(policy) ||
    Object.keys(policy).some((k) => k !== 'rules') ||
    !Array.isArray(policy.rules) ||
    policy.rules.length > 25
  )
    throw new Error('SETTINGS_DEPENDENCY_POLICY_INVALID');
  const ids = new Set<string>();
  for (const rule of policy.rules) {
    if (
      !rule ||
      Object.keys(rule).some((k) => !['id', 'triggerKey', 'requiredKeys', 'context'].includes(k)) ||
      typeof rule.id !== 'string' ||
      !key.test(rule.id) ||
      ids.has(rule.id) ||
      typeof rule.triggerKey !== 'string' ||
      !key.test(rule.triggerKey) ||
      !Array.isArray(rule.requiredKeys) ||
      !rule.requiredKeys.length ||
      rule.requiredKeys.length > 5 ||
      new Set(rule.requiredKeys).size !== rule.requiredKeys.length ||
      rule.requiredKeys.some((k) => typeof k !== 'string' || !key.test(k) || k === rule.triggerKey)
    )
      throw new Error('SETTINGS_DEPENDENCY_POLICY_INVALID');
    if (
      rule.context !== undefined &&
      (!rule.context ||
        typeof rule.context !== 'object' ||
        Array.isArray(rule.context) ||
        Object.keys(rule.context).some((k) => !['domainId', 'identityId'].includes(k)) ||
        Object.values(rule.context).some(
          (v) => typeof v !== 'string' || !v.trim() || v.length > 240,
        ))
    )
      throw new Error('SETTINGS_DEPENDENCY_POLICY_INVALID');
    ids.add(rule.id);
  }
  return policy;
}
export async function evaluateSettingsDependencies(
  policy: SettingsDependencyPolicy,
  read: (
    key: string,
    context: NonNullable<SettingsDependencyRule['context']>,
  ) => Promise<{ available: boolean; value?: unknown }>,
) {
  for (const rule of policy.rules) {
    const trigger = await read(rule.triggerKey, rule.context ?? {});
    if (!trigger.available || trigger.value !== true) continue;
    for (const key of rule.requiredKeys) {
      const value = await read(key, rule.context ?? {});
      if (
        !value.available ||
        value.value == null ||
        (typeof value.value === 'string' && !value.value.trim()) ||
        (typeof value.value === 'object' && !Object.keys(value.value).length)
      )
        throw new Error(`SETTINGS_DEPENDENCY_REQUIRED:${rule.id}:${key}`);
    }
  }
}
