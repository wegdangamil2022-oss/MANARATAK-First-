import type { Plugin } from 'vite';
import path from 'node:path';
import { FRONTEND_CSP_DIRECTIVES, FRONTEND_SECURITY_HEADERS } from './ViteFrontendSecurityHeaders';

export function frontendHeadersForDevelopment(studio: boolean): Readonly<Record<string, string>> {
  if (!studio) return FRONTEND_SECURITY_HEADERS;
  // Dev iframe + Vite React preamble/style HMR only. Production _headers remain strict.
  const directives = FRONTEND_CSP_DIRECTIVES.filter((item) =>
    !/^(frame-ancestors|script-src |style-src |style-src-elem |connect-src |upgrade-insecure-requests)/.test(item));
  return {
    ...Object.fromEntries(Object.entries(FRONTEND_SECURITY_HEADERS).filter(([name]) => name !== 'X-Frame-Options')),
    'Content-Security-Policy': [...directives,
      "frame-ancestors 'self' https://aistudio.google.com https://ai.studio https://*.googleusercontent.com https://*.usercontent.goog",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "style-src-elem 'self' 'unsafe-inline'",
      "connect-src 'self' https: wss: ws:",
    ].join('; '),
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Opener-Policy': 'unsafe-none',
  };
}


export function isGoogleAiStudio(env: Readonly<Record<string, string | undefined>>): boolean {
  return env.MANARATAK_GOOGLE_AI_STUDIO === 'true' || env.MANARATAK_RUNTIME_PROFILE === 'google-ai-studio';
}

/** Frontend packages resolve from source in Vite; native Node entrypoints remain dist-based. */
export function previewWorkspaceAliases(root: string) {
  return Object.fromEntries(['domain', 'shared', 'types', 'ui'].map((name) => [
    '@manaratak/' + name, path.join(root, 'packages', name, name === 'ui' ? 'src/index.tsx' : 'src/index.ts'),
  ]));
}

/** No proxy, SSR loader or backend import: every local API request fails closed. */
export function googleAiStudioPreviewPlugin(): Plugin {
  return {
    name: 'manaratak-google-ai-studio-web-only',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Installed after the canonical header middleware, in dev only.
        res.removeHeader('X-Frame-Options');
        for (const [name, value] of Object.entries(frontendHeadersForDevelopment(true))) {
          res.setHeader(name, value);
        }
        if (!/^\/api(?:\/|\?|$)/.test(req.url || '')) return next();
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({
          error: 'AI_STUDIO_EXTERNAL_API_NOT_CONFIGURED',
          message: 'واجهة تجريبية: خدمة البيانات غير متصلة. اضبط VITE_API_URL لخادم تجريبي مستقل.',
        }));
      });
    },
  };
}
