import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function loadTsModule(relPath, requireMap = {}) {
  const js = ts.transpileModule(read(relPath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const wrapper = vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: relPath });
  wrapper((id) => id in requireMap ? requireMap[id] : (()=>{ throw new Error(`UNEXPECTED_REQUIRE:${id}`); })(), module.exports, module);
  return module.exports;
}

const serviceDomain = {
  ServiceStatus: { PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
  ServiceRequestStatus: { REQUESTED: 'REQUESTED', AWAITING_PAYMENT: 'AWAITING_PAYMENT', COMPLETED: 'COMPLETED' },
};

test('MNT-AUD-0096 service catalog/request mutations use id+version CAS and increment monotonically', async () => {
  const { PrismaServicePlatformRepository } = loadTsModule('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts', {
    '@manaratak/domain': serviceDomain, '@prisma/client': {},
  });
  const calls = [];
  const catalog = {
    update: async (args) => { calls.push(['catalog', args]); return { id:'svc', version: args.where.id_version.version + 1, publicId:'p',slug:'s',canonicalName:'c',canonicalDedupKey:'d',displayName:'x',status:'ARCHIVED',completenessStatus:'COMPLETE',serviceCategory:'X',fulfillmentType:'X',serviceDescription:'x',serviceAvailabilityStatus:'AVAILABLE',requiredInputsOrDocuments:[],deliveryMode:'ONLINE',responsibleServiceOwnerType:'X',supportedCountries:[],supportedLanguages:[],createdAt:new Date(),updatedAt:new Date() }; },
  };
  const requests = {
    update: async (args) => { calls.push(['request', args]); return { id:'req', publicId:'rp',studentReferenceId:'student',serviceId:'svc',status:'COMPLETED',requestParameters:{},version:args.where.id_version.version+1,createdAt:new Date(),updatedAt:new Date() }; },
  };
  const repo = new PrismaServicePlatformRepository({ serviceCatalogRecord: catalog, serviceRequestRecord: requests });
  const svc = await repo.updateStatus('svc', 'ARCHIVED', 4);
  const req = await repo.updateRequestStatus('req', 'COMPLETED', 7, { ok:true });
  assert.deepEqual(calls[0][1].where, { id_version: { id:'svc', version:4 } });
  assert.deepEqual(calls[0][1].data.version, { increment:1 });
  assert.deepEqual(calls[1][1].where, { id_version: { id:'req', version:7 } });
  assert.deepEqual(calls[1][1].data.version, { increment:1 });
  assert.equal(svc.version, 5); assert.equal(req.version, 8);
});

test('MNT-AUD-0096 service stale writes fail with canonical version conflict', async () => {
  const { PrismaServicePlatformRepository } = loadTsModule('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts', {
    '@manaratak/domain': serviceDomain, '@prisma/client': {},
  });
  const stale = Object.assign(new Error('not found'), { code:'P2025' });
  const repo = new PrismaServicePlatformRepository({ serviceCatalogRecord:{ update:async()=>{throw stale;} }, serviceRequestRecord:{ update:async()=>{throw stale;} } });
  await assert.rejects(repo.updateStatus('svc','ARCHIVED',1), /SERVICE_CATALOG_VERSION_CONFLICT/);
  await assert.rejects(repo.assignProvider('req','provider',1), /SERVICE_REQUEST_VERSION_CONFLICT/);
});

test('MNT-AUD-0096 career employer/job mutations use id+version CAS and stale writes fail closed', async () => {
  const careerDomain = { CareerEmployerStatus:{VERIFIED:'VERIFIED'}, CareerJobStatus:{ARCHIVED:'ARCHIVED',PUBLISHED:'PUBLISHED'} };
  const { PrismaCareerRepository } = loadTsModule('packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts', {
    '@manaratak/domain': careerDomain, '@prisma/client': {},
  });
  const seen=[];
  const employer={ update:async(args)=>{seen.push(args); return {id:'e',version:3,publicId:'ep',slug:'e',canonicalName:'e',canonicalDedupKey:'e',displayName:'E',employerType:'X',verificationStatus:'VERIFIED',createdAt:new Date(),updatedAt:new Date()};} };
  const job={ update:async(args)=>{seen.push(args); return {id:'j',version:6,publicId:'jp',slug:'j',canonicalTitle:'J',canonicalDedupKey:'j',title:'J',opportunityType:'JOB',employmentType:'FULL_TIME',jobCategory:'X',description:'x',countryReferenceId:'YE',status:'ARCHIVED',employerId:'e',remoteOption:false,createdAt:new Date(),updatedAt:new Date(),employer:null};} };
  const repo=new PrismaCareerRepository({careerEmployerRecord:employer,careerJobPostingRecord:job});
  await repo.updateEmployer('e',{verificationStatus:'VERIFIED'},2);
  await repo.updateJobStatus('j','ARCHIVED',5);
  assert.deepEqual(seen[0].where,{id_version:{id:'e',version:2}});
  assert.deepEqual(seen[1].where,{id_version:{id:'j',version:5}});
  const stale=Object.assign(new Error('stale'),{code:'P2025'});
  employer.update=async()=>{throw stale;}; job.update=async()=>{throw stale;};
  await assert.rejects(repo.updateEmployer('e',{},2),/CAREER_EMPLOYER_VERSION_CONFLICT/);
  await assert.rejects(repo.updateJobStatus('j','ARCHIVED',5),/CAREER_JOB_VERSION_CONFLICT/);
});

test('MNT-AUD-0096 HTTP/Admin boundaries require expectedVersion and display current version', () => {
  const serviceRouter=read('apps/api/src/presentation/api/router/ServiceAdminRouter.ts');
  const careerRouter=read('apps/api/src/presentation/api/router/CareerAdminRouter.ts');
  const servicePage=read('apps/admin/src/pages/ServicesAdminPage.tsx');
  const careerPage=read('apps/admin/src/pages/CareerAdminPage.tsx');
  assert.match(serviceRouter,/expectedVersion: z\.number\(\)\.int\(\)\.positive\(\)/);
  assert.match(careerRouter,/expectedVersionSchema/);
  assert.match(servicePage,/expectedVersion: service\.version/);
  assert.match(careerPage,/expectedVersion: (?:employer|job)\.version/);
});
