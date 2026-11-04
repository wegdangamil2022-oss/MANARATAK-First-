import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';
export default defineConfig({
  esbuild:{jsx:'automatic'},
  resolve:{alias:Object.fromEntries(['core','domain','shared','application','infrastructure'].map(name=>['@manaratak/'+name,resolve('packages/'+name+'/src/index.ts')]))},
  test:{environment:'node',globals:true,maxWorkers:2,include:[
    'packages/application/tests/students/**/*.spec.ts',
    'packages/infrastructure/tests/students/**/*.spec.ts',
    'packages/domain/tests/students/**/*.spec.ts',
    'apps/admin/tests/students/**/*.spec.tsx',
    'apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts',
    'packages/infrastructure/tests/services-platform/PrismaServicePaymentSupportTriage.spec.ts',
    'packages/infrastructure/tests/courses/PrismaCourseProgressRepository.spec.ts',
    'packages/infrastructure/tests/certificates/PrismaCertificateRepository.spec.ts',
    'packages/application/tests/certificates/CertificateReadModelService.spec.ts',
    'packages/application/tests/services-platform/ServiceRequestUseCases.spec.ts',
    'packages/application/tests/authorization/AssignRoleAudit.spec.ts',
  ]},
});
