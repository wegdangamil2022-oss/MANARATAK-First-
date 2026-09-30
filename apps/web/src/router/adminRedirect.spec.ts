import { describe, expect, it } from 'vitest';
import { canonicalAdminTarget } from './adminRedirect';

describe('canonical Admin redirect', () => {
  it('keeps the /admin base when VITE_ADMIN_URL is an Admin origin', () => {
    expect(canonicalAdminTarget('/ar/admin/dashboard', 'http://localhost:3001'))
      .toBe('http://localhost:3001/admin/dashboard');
  });

  it('does not duplicate an explicitly configured /admin base', () => {
    expect(canonicalAdminTarget('/en/admin/universities?id=one', 'https://admin.example.test/admin/'))
      .toBe('https://admin.example.test/admin/universities?id=one');
  });

  it('preserves query and fragment on the same-origin Studio proxy', () => {
    expect(canonicalAdminTarget('/ar/admin/login?returnTo=%2Fadmin%2Funiversities#form'))
      .toBe('/admin/login?returnTo=%2Fadmin%2Funiversities#form');
  });

  it('routes legacy administrative sections through the Admin app', () => {
    expect(canonicalAdminTarget('/ar/study-destinations/YE', 'https://admin.example.test'))
      .toBe('https://admin.example.test/admin/study-destinations/YE');
  });
});
