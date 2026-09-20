import { describe, it, expect } from 'vitest';
import { ScopeIdentifier } from '../../src/settings/value-objects/ScopeIdentifier';
import { ScopeLevel } from '../../src/settings/enums/ScopeLevel';

describe('ScopeIdentifier', () => {
  it('accepts GLOBAL, TENANT, DOMAIN, IDENTITY scope levels', () => {
    const globalScope = new ScopeIdentifier('GLOBAL');
    expect(globalScope.getLevel()).toBe(ScopeLevel.GLOBAL);

    const tenantScope = new ScopeIdentifier('tenant', 'tenant-123');
    expect(tenantScope.getLevel()).toBe(ScopeLevel.TENANT);
    expect(tenantScope.getScopeId()).toBe('tenant-123');

    const domainScope = new ScopeIdentifier(ScopeLevel.DOMAIN, 'domain-456');
    expect(domainScope.getLevel()).toBe(ScopeLevel.DOMAIN);
    expect(domainScope.getScopeId()).toBe('domain-456');

    const identityScope = new ScopeIdentifier('Identity', 'user-789');
    expect(identityScope.getLevel()).toBe(ScopeLevel.IDENTITY);
    expect(identityScope.getScopeId()).toBe('user-789');
  });

  it('rejects Organization scope level per ADR-027', () => {
    expect(() => new ScopeIdentifier('Organization', 'org-1')).toThrow(
      'Scope level Organization is excluded per ADR-027'
    );
    expect(() => new ScopeIdentifier('ORGANIZATION', 'org-1')).toThrow(
      'Scope level Organization is excluded per ADR-027'
    );
    expect(() => new ScopeIdentifier('ORG', 'org-1')).toThrow(
      'Scope level Organization is excluded per ADR-027'
    );
  });

  it('requires scopeId for non-GLOBAL scopes', () => {
    expect(() => new ScopeIdentifier('TENANT')).toThrow('ScopeId is required for scope level TENANT');
  });
});
