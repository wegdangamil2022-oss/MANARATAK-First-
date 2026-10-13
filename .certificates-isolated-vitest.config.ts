import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      ['core', 'domain', 'shared', 'application', 'infrastructure'].map(
        (name) => [
          `@manaratak/${name}`,
          resolve(`packages/${name}/src/index.ts`),
        ],
      ),
    ),
  },
  test: {
    environment: 'node',
    include: [
      'packages/infrastructure/tests/certificates/CertificateIsolated*.spec.ts',
    ],
    testTimeout: 15000,
    hookTimeout: 30000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
