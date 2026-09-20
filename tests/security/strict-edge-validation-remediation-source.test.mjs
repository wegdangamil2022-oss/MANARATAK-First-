import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('MNT-AUD-0111 retires orphan DTO middleware and establishes strict route-local validation authority', () => {
  assert.equal(exists('apps/api/src/presentation/validation/DtoValidationMiddleware.ts'), false);
  const app = read('apps/api/src/app.ts');
  assert.doesNotMatch(app, /new DtoValidationMiddleware|new ValidationService|new ZodValidationProvider|new DefaultSanitizer/);
  const schemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');
  assert.match(schemas, /export function parseStrict/);
  assert.match(schemas, /\.strict\(\)/);
  assert.doesNotMatch(schemas, /\.passthrough\(\)/);
});

test('MNT-AUD-0111 privileged routers never forward raw request bodies into application commands', () => {
  const routerDir = path.join(root, 'apps/api/src/presentation/api/router');
  const violations = [];
  for (const name of fs.readdirSync(routerDir).filter((n) => n.endsWith('.ts'))) {
    const lines = fs.readFileSync(path.join(routerDir, name), 'utf8').split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.includes('req.body')) continue;
      if (/\.parse\(req\.body|\.safeParse\(req\.body|parseStrict\([^,]+, req\.body|req\.body \?\? \{\}/.test(line)) continue;
      // Failure-audit target extraction is not an application DTO and cannot mutate state.
      if (/targetId:\s*req\.body\?\./.test(line)) continue;
      violations.push(`${name}:${index + 1}:${line.trim()}`);
    }
  }
  assert.deepEqual(violations, []);
});

test('MNT-AUD-0111 known legacy and later-domain regressions are explicitly schema-gated', () => {
  const workflow = read('apps/api/src/presentation/api/router/WorkflowRouter.ts');
  const apiFoundation = read('apps/api/src/presentation/api/router/ApiFoundationRouter.ts');
  const shared = read('apps/api/src/presentation/api/router/SharedComponentRouter.ts');
  const notification = read('apps/api/src/presentation/api/router/NotificationRouter.ts');
  const cache = read('apps/api/src/presentation/api/router/CacheRouter.ts');
  const jobs = read('apps/api/src/presentation/api/router/BackgroundJobRouter.ts');
  const files = read('apps/api/src/presentation/api/router/FileManagementRouter.ts');
  const studentTools = read('apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts');
  const testsPlatform = read('apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts');
  const reference = read('apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts');

  for (const source of [workflow, apiFoundation, shared, notification, cache, jobs, files]) {
    assert.match(source, /parseStrict\(/);
  }
  assert.match(studentTools, /studentToolAdminTestSchema/);
  assert.doesNotMatch(testsPlatform, /\.passthrough\(\)/);
  assert.doesNotMatch(testsPlatform, /upsert(?:Variant|Section|ScoreScale|FeeMetadata|OfficialLink|Availability|PreparationMaterial)\(req\.params\.id, req\.body/);
  assert.doesNotMatch(reference, /parse\(\{ \.\.\.req\.body,/);
});
