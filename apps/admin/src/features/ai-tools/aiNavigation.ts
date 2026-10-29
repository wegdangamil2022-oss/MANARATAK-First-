export const AI_WORKSPACES = [
  { key: 'overview', ar: 'نظرة عامة', en: 'Overview', tabs: ['overview'] },
  {
    key: 'operations',
    ar: 'التنفيذ والمراقبة',
    en: 'Operations',
    tabs: ['executions', 'async-queue', 'incidents'],
  },
  {
    key: 'catalog',
    ar: 'المزوّدون والنماذج',
    en: 'Providers and models',
    tabs: ['providers', 'models', 'routingPolicies', 'modelPrices'],
  },
  {
    key: 'capabilities-prompts',
    ar: 'القدرات والموجّهات',
    en: 'Capabilities and prompts',
    tabs: ['capabilities', 'prompts', 'playground'],
  },
  {
    key: 'knowledge-automation',
    ar: 'المعرفة والأتمتة',
    en: 'Knowledge and automation',
    tabs: ['knowledgeSources', 'knowledgeIndexes', 'workflows'],
  },
  {
    key: 'governance-quality',
    ar: 'الحوكمة والجودة',
    en: 'Governance and quality',
    tabs: ['consumers', 'guardrails', 'evaluations', 'platformSettings'],
  },
] as const;
export function resolveAIWorkspace(section?: string, tab?: string | null) {
  const workspace =
    AI_WORKSPACES.find((item) => item.key === section) ??
    AI_WORKSPACES.find((item) => (item.tabs as readonly string[]).includes(section ?? '')) ??
    AI_WORKSPACES[0];
  const tabs: readonly string[] = workspace.tabs;
  const active =
    tab && tabs.includes(tab) ? tab : section && tabs.includes(section) ? section : tabs[0];
  return { workspace, active };
}
