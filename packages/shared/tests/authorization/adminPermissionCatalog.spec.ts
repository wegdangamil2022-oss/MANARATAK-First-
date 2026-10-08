import { describe, expect, it } from 'vitest';
import {
  ADMIN_PERMISSION_CATALOG,
  KNOWN_ADMIN_PERMISSIONS,
} from '../../src/authorization/adminPermissionCatalog';
import { ADMIN_SECTIONS } from '../../src/authorization/adminAccess';

describe('central administrative permission metadata', () => {
  it('defines every navigation guard exactly once with bilingual metadata', () => {
    expect(new Set(KNOWN_ADMIN_PERMISSIONS).size).toBe(KNOWN_ADMIN_PERMISSIONS.length);
    for (const [, permission] of ADMIN_SECTIONS) {
      const entry = ADMIN_PERMISSION_CATALOG.find((item) => item.key === permission);
      expect(entry, permission).toBeDefined();
      expect(entry?.labelAr).toBeTruthy();
      expect(entry?.labelEn).toBeTruthy();
      expect(entry?.descriptionAr).toBeTruthy();
      expect(entry?.descriptionEn).toBeTruthy();
    }
  });
  it('never makes identity, credential or authorization authority normally delegable', () => {
    for (const entry of ADMIN_PERMISSION_CATALOG.filter((item) =>
      ['identities', 'credentials', 'authorization'].includes(item.domain),
    )) {
      expect(entry.delegable).toBe(false);
      expect(entry.risk).toBe('CRITICAL');
    }
    expect(KNOWN_ADMIN_PERMISSIONS).not.toContain('admin:*');
  });
});
