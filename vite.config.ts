import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// This repository is a frontend-only design sandbox, including in built previews.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'apps/web/public',
  define: {
    __MANARATAK_PROTOTYPE_DATA_ENABLED__: true,
    'import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE': JSON.stringify('prototype'),
    'import.meta.env.VITE_LOCAL_ADMIN_READ_ONLY': JSON.stringify('true'),
    'import.meta.env.VITE_ADMIN_URL': JSON.stringify('/admin'),
  },
  resolve: {
    alias: {
      '@manaratak/ui': source('./packages/ui/src/index.tsx'),
      '@manaratak/shared': source('./packages/shared/src/index.ts'),
      '@manaratak/types': source('./packages/types/src/index.ts'),
      '@manaratak/domain': source('./preview/domain-ui.ts'),
    },
  },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'lucide-react',
      'motion',
      'motion/react',
      'react-markdown',
      'remark-gfm',
      '@radix-ui/react-slot',
    ],
  },
});
