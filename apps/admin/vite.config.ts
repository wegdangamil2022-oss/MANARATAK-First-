import { defineConfig, Plugin } from 'vite';
import { workspaceAliases } from '../frontend-security/WorkspaceAliases';
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
        return html.replace(/<script type="module" src="(?:\/admin)?\/@vite\/client"><\/script>/g, '');
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
  assertLocalReadOnlyBuildAllowed({ mode, nodeEnv: process.env.NODE_ENV, localReadOnly: process.env.VITE_LOCAL_ADMIN_READ_ONLY });
  const disableHmr = process.env.DISABLE_HMR === 'true';
  return {
  base: '/admin/',
  root: __dirname,
  envDir: __dirname,
  plugins: [frontendSecurityHeadersPlugin(), react(), tailwindcss(),
    localAdminReadOnlyGuardPlugin(), disableHmrPlugin()],
  server: {
    hmr: disableHmr ? false : undefined,
    host: '0.0.0.0',
    port: 3001,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...workspaceAliases(rootDir),
    },
  },
  };
});
