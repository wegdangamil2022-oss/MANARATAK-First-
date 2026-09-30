/** Resolve legacy public routes to the canonical Admin app, whose Vite base is /admin/. */
export function canonicalAdminTarget(legacyPath: string, configuredAdminUrl?: string): string {
  const safePath = legacyPath.startsWith('/') && !legacyPath.startsWith('//')
    ? legacyPath
    : '/admin/dashboard';
  const current = new URL(safePath, 'https://manaratak.invalid');
  const normalizedPath = current.pathname.replace(/^\/(?:ar|en)(?=\/)/, '');
  const adminPath = normalizedPath.replace(/^\/admin(?=\/|$)/, '') || '/dashboard';
  const suffix = `${adminPath}${current.search}${current.hash}`;
  const configured = configuredAdminUrl?.trim();
  if (configured && configured !== '/admin') {
    try {
      const base = new URL(configured);
      if (base.protocol === 'http:' || base.protocol === 'https:') {
        const basePath = base.pathname.replace(/\/+$/, '');
        const adminBasePath = /\/admin$/i.test(basePath) ? basePath : `${basePath}/admin`;
        return `${base.origin}${adminBasePath}${suffix}`;
      }
    } catch { /* fall back to the same-origin Admin app */ }
  }
  return `/admin${suffix}`;
}
