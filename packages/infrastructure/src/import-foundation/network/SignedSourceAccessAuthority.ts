import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { SourceAccessClassification, SourceAccessExecutionPolicy, SourceConnectorCategory, type ImportSourceDefinition } from '@manaratak/domain';
import type { ISourceAccessAuthority } from '@manaratak/application';

interface AccessGrant { audience: 'MANARATAK_IMPORT'; sourceId: string; sourceRevision: string; classification: string;
  origin: string; pathPrefixes: string[]; policyReference: string; expiresAt: string; credentialBinding?: string; }
/** Ed25519 approvals are deployment-bound. Admin-editable metadata cannot mint them. */
export class SignedSourceAccessAuthority implements ISourceAccessAuthority {
  private readonly key?: KeyObject;
  private readonly tokens: readonly string[];
  constructor(publicKey: string | undefined, tokens: readonly string[] = [],
    private readonly credential: (binding: string) => string | undefined = binding => process.env[binding],
    private readonly now: () => number = Date.now) {
    if (tokens.length > 1000 || tokens.some(token => typeof token !== 'string' || token.length > 16_000)) throw new Error('SOURCE_AUTHORITY_CONFIGURATION_INVALID');
    this.tokens = Object.freeze([...tokens]);
    if (publicKey) { this.key = createPublicKey(publicKey); if (this.key.asymmetricKeyType !== 'ed25519') throw new Error('SOURCE_AUTHORITY_KEY_INVALID'); }
  }
  private grant(source: ImportSourceDefinition): AccessGrant {
    if (!this.key) throw new Error('SOURCE_ACCESS_SIGNED_APPROVAL_REQUIRED');
    for (const token of this.tokens) {
      const parts = token.split('.');
      if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) continue;
      if (!verify(null, Buffer.from(parts[0]), this.key, Buffer.from(parts[1], 'base64url'))) continue;
      let grant: AccessGrant; try { grant = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { continue; }
      if (!grant || typeof grant !== 'object' || grant.audience !== 'MANARATAK_IMPORT' || grant.sourceId !== source.sourceId || grant.classification !== source.accessClassification ||
          grant.sourceRevision !== source.updatedAt?.toISOString() || !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) <= this.now() ||
          typeof grant.policyReference !== 'string' || !grant.policyReference.trim() || grant.policyReference.length > 240 ||
          grant.origin !== new URL(source.baseUrl).origin || !Array.isArray(grant.pathPrefixes) || !grant.pathPrefixes.length || grant.pathPrefixes.length > 20 ||
          grant.pathPrefixes.some(prefix => typeof prefix !== 'string' || !prefix.startsWith('/') || prefix.length > 500 || /[%?#\\]/.test(prefix) || prefix.startsWith('//') || /(?:^|\/)\.\.?(?:\/|$)/.test(prefix))) continue;
      return grant;
    }
    throw new Error('SOURCE_ACCESS_SIGNED_APPROVAL_REQUIRED');
  }
  assertAllowed(source: ImportSourceDefinition, category: SourceConnectorCategory) {
    if (category === SourceConnectorCategory.MANUAL_UPLOAD || source.accessClassification === SourceAccessClassification.PUBLIC_ALLOWED)
      return SourceAccessExecutionPolicy.assertAllowed(source, category);
    if (source.status !== 'ACTIVE' || source.category !== category) throw new Error('SOURCE_NOT_ACTIVE');
    if (![SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED, SourceAccessClassification.AUTHORIZED_ACCOUNT, SourceAccessClassification.DATA_AGREEMENT].includes(source.accessClassification))
      return SourceAccessExecutionPolicy.assertAllowed(source, category);
    const grant = this.grant(source);
    if (source.accessClassification === SourceAccessClassification.AUTHORIZED_ACCOUNT) this.bearer(grant);
    if (source.accessClassification === SourceAccessClassification.PUBLIC_ROBOTS_RESTRICTED && !source.robotsPolicyUrl)
      throw new Error('SOURCE_ROBOTS_POLICY_URL_REQUIRED');
  }
  private bearer(grant: AccessGrant) {
    if (!grant.credentialBinding || !/^IMPORT_SOURCE_CREDENTIAL_[A-Z0-9_]{1,80}$/.test(grant.credentialBinding)) throw new Error('SOURCE_ACCOUNT_CREDENTIAL_REQUIRED');
    const value = this.credential(grant.credentialBinding);
    if (!value || value.length > 4096 || /[\r\n\x00-\x20]/.test(value)) throw new Error('SOURCE_ACCOUNT_CREDENTIAL_REQUIRED');
    return `Bearer ${value}`;
  }
  headersFor(source: ImportSourceDefinition, target: URL): Record<string, string> {
    this.assertAllowed(source, source.category);
    if (source.accessClassification === SourceAccessClassification.PUBLIC_ALLOWED) return {};
    const grant = this.grant(source);
    if (target.origin !== grant.origin || !grant.pathPrefixes.some(prefix => prefix === '/' || target.pathname === prefix || target.pathname.startsWith(`${prefix.replace(/\/$/, '')}/`)))
      throw new Error('SOURCE_ACCESS_APPROVAL_SCOPE_MISMATCH');
    return source.accessClassification === SourceAccessClassification.AUTHORIZED_ACCOUNT ? { Authorization: this.bearer(grant) } : {};
  }
}

export function assertRobotsAllowed(text: string, target: URL) {
  if (Buffer.byteLength(text) > 100_000) throw new Error('SOURCE_ROBOTS_POLICY_TOO_LARGE');
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }>; delay: number }> = [];
  let group: typeof groups[number] | undefined; let seenRule = false;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split('#')[0].trim(); if (!clean) continue;
    const colon = clean.indexOf(':'); if (colon < 0) continue;
    const key = clean.slice(0, colon).trim().toLowerCase(); const value = clean.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!group || seenRule) { group = { agents: [], rules: [], delay: 0 }; groups.push(group); seenRule = false; }
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow','disallow','crawl-delay'].includes(key)) {
      seenRule = true;
      if (key === 'crawl-delay') { const delay = Number(value); if (!Number.isFinite(delay) || delay < 0) throw new Error('SOURCE_ROBOTS_POLICY_INVALID'); group.delay = delay; }
      else if (value) { if (!value.startsWith('/')) throw new Error('SOURCE_ROBOTS_POLICY_INVALID'); group.rules.push({ allow: key === 'allow', path: value }); }
    }
  }
  const exact = groups.filter(group => group.agents.includes('manaratakimport'));
  const applicable = exact.length ? exact : groups.filter(group => group.agents.includes('*'));
  if (applicable.some(group => group.delay > 0)) throw new Error('SOURCE_ROBOTS_CRAWL_DELAY_REQUIRES_POLICY');
  const normalize = (value: string) => value.replace(/%([0-9a-f]{2})/gi, (_all, hex: string) => {
    const char = String.fromCharCode(parseInt(hex, 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : `%${hex.toUpperCase()}`;
  }).replace(/[^\x00-\x7f]/gu, char => encodeURIComponent(char));
  const path = normalize(target.pathname + target.search); let winner: { allow: boolean; weight: number } | undefined;
  for (const rule of applicable.flatMap(group => group.rules)) {
    const anchored = rule.path.endsWith('$'); const value = normalize(anchored ? rule.path.slice(0, -1) : rule.path);
    const regex = '^' + value.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : '');
    if (!new RegExp(regex).test(path)) continue;
    const weight = Buffer.byteLength(value.replaceAll('*', ''));
    if (!winner || weight > winner.weight || weight === winner.weight && rule.allow) winner = { allow: rule.allow, weight };
  }
  if (winner && !winner.allow) throw new Error('SOURCE_ROBOTS_PATH_DENIED');
}
