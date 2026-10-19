import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
/** Health source gate reads the config source, never stale compiled workspace exports. */
export default defineConfig({
  resolve: { alias: { '@absheer/config': fileURLToPath(new URL('./packages/config/src/index.ts', import.meta.url)) } },
  test: { environment: 'node', globals: true, passWithNoTests: false },
});
