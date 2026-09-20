import type { Plugin, ViteDevServer, PreviewServer } from 'vite';

/**
 * Canonical browser-document security policy for MANARATAK Web/Admin.
 *
 * MNT-AUD-0101: the policy is enforced at the HTML/static-hosting boundary,
 * not inferred from API response headers.
 *
 * MNT-AUD-0114: Web/Admin source no longer uses inline style attributes or
 * inline <style> elements. Certificate preview colors are governed by a finite
 * source-controlled palette so the browser boundary can remain strict.
 */
export const FRONTEND_CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
] as const;

export const FRONTEND_CSP = FRONTEND_CSP_DIRECTIVES.join('; ');

export const FRONTEND_SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': FRONTEND_CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
});

export const FRONTEND_SECURITY_HEADERS_FILE = `/*\n${Object.entries(FRONTEND_SECURITY_HEADERS)
  .map(([name, value]) => `  ${name}: ${value}`)
  .join('\n')}\n`;

function installHeaders(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((_req, res, next) => {
    for (const [name, value] of Object.entries(FRONTEND_SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
    next();
  });
}

/**
 * - Dev/preview: emits headers directly from Vite.
 * - Production static build: emits `_headers` from the same canonical policy.
 *   The deployment adapter MUST preserve/apply this artifact or provide an
 *   equivalent source-controlled mapping and verify delivered headers.
 */
export function frontendSecurityHeadersPlugin(): Plugin {
  return {
    name: 'manaratak-frontend-security-headers',
    enforce: 'pre',
    configureServer(server) {
      installHeaders(server);
    },
    configurePreviewServer(server) {
      installHeaders(server);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: FRONTEND_SECURITY_HEADERS_FILE,
      });
    },
  };
}
