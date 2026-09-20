import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { googleAiStudioPreviewPlugin, isGoogleAiStudio } from '../frontend-security/GoogleAiStudioPreview';
import { frontendSecurityHeadersPlugin } from '../frontend-security/ViteFrontendSecurityHeaders';
import { assertPublicBuildDataMode, prototypeCapabilityEnabled } from './src/config/PublicDataModePolicy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function disableHmrPlugin(): Plugin {
  return {
    name: 'disable-hmr-plugin',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (process.env.DISABLE_HMR === 'true') {
          return html.replace(/<script type="module" src="\/@vite\/client"><\/script>/g, '');
        }
        return html;
      }
    }
  };
}

function expressApiPlugin(): Plugin {
  let cachedApp: any = null;
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?'))) {
          const method = (req.method || 'GET').toUpperCase();
          const localReadOnly = process.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';
          if (localReadOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            res.statusCode = 423;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'READ_ONLY_PREVIEW',
              message: 'Database mutations are blocked in local admin preview mode.',
            }));
            return;
          }
          try {
            if (!cachedApp) {
              const apiModule = await server.ssrLoadModule(path.resolve(__dirname, '../api/src/app.ts'));
              cachedApp = await apiModule.createApiApp({ resetCache: false });
            }
            cachedApp(req, res, next);
          } catch (err) {
            cachedApp = null;
            console.error('[Vite Api Plugin Error]', err);
            next(err);
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const rootDir = path.resolve(__dirname, '../..');
  const studioEnv = { ...loadEnv(mode, rootDir, ['MANARATAK_', 'VITE_']), ...process.env };
  const studio = isGoogleAiStudio(studioEnv);
  process.env.PRISMA_TELEMETRY_DISABLED = '1';
  assertPublicBuildDataMode({ mode, nodeEnv: process.env.NODE_ENV, dataMode: process.env.VITE_PUBLIC_TEMPLATE_DATA_MODE });
  const studioTemplatePreview = studio && command === 'serve' && prototypeCapabilityEnabled(process.env.NODE_ENV || mode);
  const allowPrototypeData = (!studio || studioTemplatePreview) && prototypeCapabilityEnabled(process.env.NODE_ENV || mode);
  // Studio's isolated design preview uses fixtures only until an API is explicitly configured.
  // Production builds and configured API previews never silently fall back to demo data.
  const studioDataMode = studioEnv.VITE_PUBLIC_TEMPLATE_DATA_MODE ||
    (studioTemplatePreview && !studioEnv.VITE_API_URL ? 'prototype' : 'api');
  return {
    root: __dirname,
    envDir: studio ? rootDir : __dirname,
    define: {
      '__MANARATAK_PROTOTYPE_DATA_ENABLED__': JSON.stringify(allowPrototypeData),
      'import.meta.env.VITE_GOOGLE_AI_STUDIO': JSON.stringify(studio ? 'true' : 'false'),
      ...(studio ? { 'import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE': JSON.stringify(studioDataMode) } : {}),
    },
    plugins: [frontendSecurityHeadersPlugin(), react(), tailwindcss(),
      studio ? googleAiStudioPreviewPlugin() : expressApiPlugin(), disableHmrPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@manaratak/application': path.resolve(rootDir, 'packages/application/src/index.ts'),
        '@manaratak/config': path.resolve(rootDir, 'packages/config/src/index.ts'),
        '@manaratak/core': path.resolve(rootDir, 'packages/core/src/index.ts'),
        '@manaratak/domain': path.resolve(rootDir, 'packages/domain/src/index.ts'),
        '@manaratak/infrastructure': path.resolve(rootDir, 'packages/infrastructure/src/index.ts'),
        '@manaratak/shared': path.resolve(rootDir, 'packages/shared/src/index.ts'),
        '@manaratak/types': path.resolve(rootDir, 'packages/types/src/index.ts'),
        '@manaratak/ui': path.resolve(rootDir, 'packages/ui/src/index.tsx'),
      },
    },
    build: {
      sourcemap: false,
      minify: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('admin-preview')) {
              return 'admin-preview-data';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR === 'true' ? false : studio ? true : { clientPort: 443 },
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/tmp/**', '**/*.log', '**/dist/**', '**/.prisma/**']
      }
    },
    ssr: {
      external: ['@prisma/client', 'bcrypt', 'jsonwebtoken']
    }
  };
});
