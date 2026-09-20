import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const pass = (name, ok, detail='') => {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const router = read('apps/api/src/presentation/api/router/ImportAdminRouter.ts');
pass('Phase 06 router has no domain promotion use-case dependency',
  !/internationalTestImportPromotionUseCase|majorImportPromotionUseCase|fellowshipImportPromotionUseCase/.test(router));
pass('Legacy promote endpoints are fail-closed',
  (router.match(/PHASE6_DOMAIN_PROMOTION_DISABLED/g) || []).length >= 1 &&
  /router\.post\('\/records\/:id\/promote'[\s\S]*?status\(422\)/.test(router) &&
  /router\.post\('\/batches\/:id\/promote'[\s\S]*?status\(422\)/.test(router));

const nav = read('apps/admin/src/components/AdminNavigation.tsx');
pass('Admin navigation exposes one Imports entry',
  (nav.match(/to: '\/imports'/g) || []).length === 1 && !nav.includes("to: '/imports/scholarships'"));

pass('Course parser is owned by Courses domain', exists('packages/application/src/courses/parsers/CourseMasterArtifactParser.ts'));
pass('Course parser is absent from Import Foundation', !exists('packages/application/src/import-foundation/parsers/CourseMasterArtifactParser.ts'));

const foundationDirs = [
  'packages/application/src/import-foundation',
  'packages/domain/src/import-foundation',
  'packages/infrastructure/src/import-foundation',
].filter(exists);
const forbidden = /from\s+['"][^'"]*(?:courses|majors|tests-platform|scholarships|universities)[^'"]*['"]/;
let upward = [];
for (const dir of foundationDirs) {
  const stack=[path.join(root,dir)];
  while(stack.length){
    const current=stack.pop();
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const full=path.join(current,entry.name);
      if(entry.isDirectory()) stack.push(full);
      else if(/\.(ts|tsx|mjs|js)$/.test(entry.name)){
        const text=fs.readFileSync(full,'utf8');
        if(forbidden.test(text)) upward.push(path.relative(root,full));
      }
    }
  }
}
pass('Import Foundation has zero upward domain imports', upward.length === 0, upward.join(', '));

const useCases = read('packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts');
pass('Capabilities distinguish handoff-ready from staging-only',
  useCases.includes("integrationMode: handoffReady ? 'DOMAIN_HANDOFF_READY' : 'STAGING_ONLY'") &&
  useCases.includes("semanticPromotionOwner: 'OWNING_DOMAIN'"));

const importWorker = read('packages/application/src/background-jobs/handlers/ImportQueueBackgroundJobHandler.ts');
const apiServer = read('apps/api/src/server.ts');
const appConfig = read('packages/config/src/AppConfig.ts');
pass('Durable Import retry/reclaim has an autonomous runtime worker',
  importWorker.includes('processNextQueuedBatch') && apiServer.includes('IMPORT_QUEUE_SWEEP_JOB_TYPE') && apiServer.includes('system.import.queue-sweep'));
pass('Import worker cadence is part of canonical production configuration',
  appConfig.includes('BACKGROUND_IMPORT_CRON must be explicitly configured in production/staging'));

const container = read('apps/api/src/infrastructure/di/container.ts');
pass('Registered generic handoff consumers are explicit',
  /SCHOLARSHIPS:\s*scholarshipImportHandoffConsumer/.test(container) &&
  /UNIVERSITIES:\s*universityImportHandoffConsumer/.test(container));

if (failures.length) {
  console.error(`\nIMPORT FOUNDATION SOURCE CLOSURE: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('\nIMPORT FOUNDATION SOURCE CLOSURE: PASS');
