import fs from 'node:fs';
import {
  buildAuditInventory,
  checkGlobalAuditBoundaries,
  checkAuditInventory,
} from './verify-admin-audit-coverage.mjs';
const read = (path) => fs.readFileSync(path, 'utf8');
const directory = 'apps/api/src/presentation/api/router';
const appSource = read('apps/api/src/app.ts');
const inventory = buildAuditInventory({
  appSource,
  containerSource: read('apps/api/src/infrastructure/di/container.ts'),
  routerSources: Object.fromEntries(
    fs
      .readdirSync(directory)
      .filter((name) => name.endsWith('Router.ts'))
      .map((name) => [name, read(`${directory}/${name}`)]),
  ),
  policySource: read('apps/api/src/presentation/audit/MutationAuditMiddleware.ts'),
});
const approved = JSON.parse(
  read('docs/remediation/evidence/section-02/admin-mutation-audit-inventory.json'),
);
const certificates = (rows) => rows.filter((row) => row.owner === 'CertificateAdminRouter');
const errors = [
  ...checkGlobalAuditBoundaries(appSource),
  ...checkAuditInventory(certificates(inventory), certificates(approved.routes)),
];
for (const error of errors) console.error(error);
console.log(
  `CERTIFICATE_ADMIN_AUDIT_COVERAGE=${errors.length ? 'FAIL' : 'PASS'}; handlers=${certificates(inventory).length}; includes global auth/idempotency/audit boundaries; other owners are outside this check`,
);
process.exitCode = errors.length ? 1 : 0;
