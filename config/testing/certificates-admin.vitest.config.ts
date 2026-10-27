import { defineConfig } from 'vitest/config';
import baseline from '../../.certificates-vitest.config';
export default defineConfig({
  ...baseline,
  test: {
    ...baseline.test,
    include: [...(baseline.test?.include ?? []), 'apps/admin/tests/certificates/**/*.spec.tsx'],
    exclude: ['**/CertificateIsolated*.spec.ts'],
  },
});
