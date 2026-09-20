import { defineConfig, loadEnv, Plugin } from 'vite';
import { googleAiStudioPreviewPlugin, isGoogleAiStudio, previewWorkspaceAliases } from '../frontend-security/GoogleAiStudioPreview';
import { frontendSecurityHeadersPlugin } from '../frontend-security/ViteFrontendSecurityHeaders';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { assertLocalReadOnlyBuildAllowed, isUnsafeAdminMethod } from './src/security/LocalAdminReadOnlyPolicy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function disableHmrPlugin(): Plugin {
  return {
    name: 'disable-hmr-plugin',
    enforce: 'post',
    transformIndexHtml(html) {
      if (process.env.DISABLE_HMR === 'true') {
        return html.replace(/<script type="module" src="\/@vite\/client"><\/script>/, '');
      }
      return html;
    }
  };
}

function localAdminReadOnlyGuardPlugin(): Plugin {
  return {
    name: 'local-admin-read-only-guard',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const enabled = process.env.VITE_LOCAL_ADMIN_READ_ONLY === 'true';
        if (enabled && req.url?.startsWith('/api') && isUnsafeAdminMethod(req.method)) {
          res.statusCode = 423;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'READ_ONLY_PREVIEW' }));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '../..');
  const studio = isGoogleAiStudio({ ...loadEnv(mode, rootDir, ['MANARATAK_', 'VITE_']), ...process.env });
  assertLocalReadOnlyBuildAllowed({ mode, nodeEnv: process.env.NODE_ENV, localReadOnly: process.env.VITE_LOCAL_ADMIN_READ_ONLY });
  return {
  root: __dirname,
  envDir: studio ? rootDir : __dirname,
  plugins: [frontendSecurityHeadersPlugin(), react(), tailwindcss(),
    ...(studio ? [googleAiStudioPreviewPlugin()] : []), localAdminReadOnlyGuardPlugin(), disableHmrPlugin()],
  server: {
    hmr: process.env.DISABLE_HMR === 'true' ? false : studio ? true : { clientPort: 443 },
    host: '0.0.0.0',
    port: 3001,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...(studio ? previewWorkspaceAliases(rootDir) : {}),
    },
  },
  };
});
