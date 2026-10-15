import { defineConfig } from 'vitest/config';
import base from './.section16-vitest.config';
import {resolve} from 'node:path';
export default defineConfig({
 ...base,
 resolve:{alias:{...base.resolve?.alias,'@manaratak/config':resolve('packages/config/src/index.ts')}},
 test:{...base.test,maxWorkers:1,include:[
  'apps/api/tests/presentation/security/SecurityMiddlewareFactory.spec.ts',
  'apps/api/tests/presentation/security/AuthSessionBoundary.spec.ts',
  'apps/api/tests/presentation/api/router/AuthRouter.spec.ts',
  'packages/config/tests/AppConfig.spec.ts',
  'packages/config/tests/ProductionReadinessValidator.spec.ts',
  'packages/shared/tests/security/CsrfClientManager.spec.ts',
  'apps/admin/src/api/client.spec.ts',
  'apps/web/src/api/client.auth.spec.ts',
  'apps/api/tests/presentation/security/SearchBoundary.spec.ts',
 ]},
});
