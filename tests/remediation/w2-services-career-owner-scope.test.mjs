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
  const js = ts.transpileModule(read(relPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const wrapper = vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: relPath });
  wrapper((id) => {
    if (id === 'node:crypto') return require('node:crypto');
    if (id in requireMap) return requireMap[id];
    throw new Error(`UNEXPECTED_REQUIRE:${id}`);
  }, module.exports, module);
  return module.exports;
}

const ServiceProviderStatus = { DRAFT:'DRAFT', QUALIFIED:'QUALIFIED', SUSPENDED:'SUSPENDED', RETIRED:'RETIRED' };
const ServicePackageStatus = { DRAFT:'DRAFT', ACTIVE:'ACTIVE', ARCHIVED:'ARCHIVED' };
const ServicePricingStatus = { DRAFT:'DRAFT', ACTIVE:'ACTIVE', RETIRED:'RETIRED' };
const ServiceDiscountType = { FIXED:'FIXED', PERCENTAGE:'PERCENTAGE' };
const ServicePromotionStatus = { DRAFT:'DRAFT', ACTIVE:'ACTIVE', PAUSED:'PAUSED', EXPIRED:'EXPIRED' };
const ServiceProviderAvailabilityStatus = { AVAILABLE:'AVAILABLE', BLOCKED:'BLOCKED', RETIRED:'RETIRED' };
const ServiceBookingStatus = { PENDING:'PENDING', CONFIRMED:'CONFIRMED', IN_PROGRESS:'IN_PROGRESS', COMPLETED:'COMPLETED', CANCELLED:'CANCELLED' };
const ServiceWorkflowDefinitionStatus = { DRAFT:'DRAFT', ACTIVE:'ACTIVE', RETIRED:'RETIRED' };
const ServiceWorkflowExecutionStatus = { PENDING:'PENDING', RUNNING:'RUNNING', COMPLETED:'COMPLETED', FAILED:'FAILED', CANCELLED:'CANCELLED' };
const ServiceStatus = { DRAFT:'DRAFT', PUBLISHED:'PUBLISHED', ARCHIVED:'ARCHIVED' };

const serviceDomain = {
  ServiceProviderStatus, ServicePackageStatus, ServicePricingStatus, ServiceDiscountType, ServicePromotionStatus,
  ServiceProviderAvailabilityStatus, ServiceBookingStatus, ServiceWorkflowDefinitionStatus, ServiceWorkflowExecutionStatus, ServiceStatus,
};
const assetHelper = {
  AssetReferencePolicy: class {},
  assertAssetReferenceUsable: async (policy, id, options) => {
    if (!id) return;
    if (!policy) throw new Error('ASSET_REFERENCE_POLICY_REQUIRED');
    await policy.assertUsable(id, options);
  },
};

test('MNT-AUD-0058 Service owner use case validates provider/package/pricing/slot invariants', async () => {
  const { ServiceOperationsUseCases } = loadTsModule(
    'packages/application/src/services-platform/use-cases/ServiceOperationsUseCases.ts',
    { '@manaratak/domain': serviceDomain, '../../asset-platform/AssetReferencePolicy': assetHelper },
  );
  const services = new Map([
    ['svc-1', { id:'svc-1', status:'PUBLISHED' }],
    ['svc-2', { id:'svc-2', status:'PUBLISHED' }],
  ]);
  const catalog = { findById: async (id) => services.get(id) ?? null };
  const captured = {};
  const operations = {
    createProvider: async (v) => ({ id:'p-1', createdAt:new Date(), updatedAt:new Date(), ...v }),
    findProviderById: async () => ({ id:'p-1', status:'QUALIFIED', timezone:'Asia/Aden', capacity:2, supportedServiceIds:['svc-1','svc-2'] }),
    updateProviderStatus: async (_id,status) => ({ id:'p-1', status, timezone:'Asia/Aden', capacity:2, supportedServiceIds:['svc-1','svc-2'] }),
    createPackage: async (v) => ({ id:'pkg-1', createdAt:new Date(), updatedAt:new Date(), ...v, items:v.items.map((x,i)=>({id:`pi-${i}`, ...x})) }),
    findPackageById: async () => ({ id:'pkg-1', status:'ACTIVE', items:[{ id:'pi-1', serviceId:'svc-1', sequence:1, quantity:1, required:true }] }),
    createPricing: async (v) => ({ id:'price-1', createdAt:new Date(), ...v }),
    findActivePricing: async () => ({ id:'price-1', serviceId:'svc-1', packageId:null, currencyCode:'USD', scale:2, amountMinorUnits:'1000', status:'ACTIVE', effectiveFrom:new Date(Date.now()-1000), effectiveTo:null, immutableFingerprint:'fp', createdAt:new Date() }),
    findAvailabilitySlotById: async () => ({ id:'slot-1', providerId:'p-1', serviceId:'svc-1', status:'AVAILABLE', startsAt:new Date(Date.now()+60000), endsAt:new Date(Date.now()+120000), timezone:'Asia/Aden', capacity:1 }),
    findDiscountById: async () => null,
    findPromotionById: async () => null,
    createBookingWithCapacity: async (v) => { captured.booking=v; return { id:'b-1', ...v, status:'PENDING', startsAt:new Date(), endsAt:new Date(), timezone:'Asia/Aden', createdAt:new Date(), updatedAt:new Date() }; },
  };
  const uc = new ServiceOperationsUseCases(catalog, operations, { assertUsable: async()=>{} });
  await assert.rejects(uc.registerProvider({ displayName:'Provider', timezone:'Not/AZone', capacity:1, supportedServiceIds:['svc-1'] }), /SERVICE_TIMEZONE_INVALID/);
  const provider = await uc.registerProvider({ displayName:'Provider', timezone:'Asia/Aden', capacity:2, supportedServiceIds:['svc-1','svc-1'] });
  assert.deepEqual(provider.supportedServiceIds, ['svc-1']);
  const pricing = await uc.createPricing({ serviceId:'svc-1', currencyCode:'USD', scale:2, amountMinorUnits:'1000', effectiveFrom:new Date('2026-01-01T00:00:00Z') });
  assert.equal(pricing.immutableFingerprint.length, 64);
  await uc.createBooking({ studentReferenceId:'student-1', serviceId:'svc-1', providerId:'p-1', slotId:'slot-1' });
  assert.equal(captured.booking.pricingSnapshot.finalAmountMinorUnits, '1000');
  assert.equal(captured.booking.items[0].serviceId, 'svc-1');
});

test('MNT-AUD-0058 Prisma booking transaction rechecks authority and consumes discount with optimistic CAS', async () => {
  const { PrismaServiceOperationsRepository } = loadTsModule(
    'packages/infrastructure/src/services-platform/PrismaServiceOperationsRepository.ts',
    { '@manaratak/domain': serviceDomain, '@prisma/client': {} },
  );
  const future = new Date(Date.now()+60000); const later = new Date(Date.now()+120000);
  let discountUpdates = 0; let created = 0;
  const tx = {
    serviceAvailabilitySlotRecord: { findUnique: async()=>({ id:'slot', providerId:'provider', serviceId:'svc', status:'AVAILABLE', startsAt:future, endsAt:later, timezone:'Asia/Aden', capacity:1 }) },
    serviceProviderRecord: { findUnique: async()=>({ id:'provider', status:'QUALIFIED', capacity:1, supportedServices:[{serviceId:'svc'}] }) },
    servicePricingRecord: { findUnique: async()=>({ id:'price', status:'ACTIVE', immutableFingerprint:'fp', effectiveFrom:new Date(Date.now()-1000), effectiveTo:null, serviceId:'svc', packageId:null }) },
    serviceDiscountRecord: {
      findUnique: async()=>({ id:'discount', activeFrom:new Date(Date.now()-1000), activeTo:null, serviceId:'svc', packageId:null, maxRedemptions:1, redemptionCount:0 }),
      updateMany: async(args)=>{ discountUpdates++; assert.equal(args.where.redemptionCount,0); return {count:1}; },
    },
    serviceBookingRecord: {
      count: async()=>0,
      create: async({data})=>{ created++; return { id:'booking', ...data, items:data.items.create, createdAt:new Date(), updatedAt:new Date() }; },
    },
  };
  const prisma = { $transaction: async(fn)=>fn(tx) };
  const repo = new PrismaServiceOperationsRepository(prisma);
  const booking = await repo.createBookingWithCapacity({
    publicId:'b', studentReferenceId:'student', serviceId:'svc', packageId:null, providerId:'provider', slotId:'slot',
    pricingSnapshot:{ pricingId:'price', baseAmountMinorUnits:'1000', discountId:'discount', promotionId:null, discountMinorUnits:'100', finalAmountMinorUnits:'900', currencyCode:'USD', scale:2, capturedAt:new Date(), pricingFingerprint:'fp' },
    items:[{serviceId:'svc',packageItemId:null,sequence:1,quantity:1,status:'PENDING'}],
  });
  assert.equal(booking.id,'booking'); assert.equal(discountUpdates,1); assert.equal(created,1);
});

test('MNT-AUD-0058 exhausted discount fails before booking creation', async () => {
  const { PrismaServiceOperationsRepository } = loadTsModule(
    'packages/infrastructure/src/services-platform/PrismaServiceOperationsRepository.ts',
    { '@manaratak/domain': serviceDomain, '@prisma/client': {} },
  );
  const future = new Date(Date.now()+60000), later = new Date(Date.now()+120000);
  let created=0;
  const tx={
    serviceAvailabilitySlotRecord:{findUnique:async()=>({providerId:'p',serviceId:'svc',status:'AVAILABLE',startsAt:future,endsAt:later,capacity:1})},
    serviceProviderRecord:{findUnique:async()=>({status:'QUALIFIED',capacity:1,supportedServices:[{serviceId:'svc'}]})},
    servicePricingRecord:{findUnique:async()=>({id:'price',status:'ACTIVE',immutableFingerprint:'fp',effectiveFrom:new Date(Date.now()-1000),effectiveTo:null,serviceId:'svc',packageId:null})},
    serviceDiscountRecord:{findUnique:async()=>({id:'d',activeFrom:new Date(Date.now()-1000),activeTo:null,serviceId:'svc',packageId:null,maxRedemptions:1,redemptionCount:1})},
    serviceBookingRecord:{count:async()=>0,create:async()=>{created++;}},
  };
  const repo=new PrismaServiceOperationsRepository({$transaction:async(fn)=>fn(tx)});
  await assert.rejects(repo.createBookingWithCapacity({publicId:'b',studentReferenceId:'s',serviceId:'svc',packageId:null,providerId:'p',slotId:'slot',pricingSnapshot:{pricingId:'price',baseAmountMinorUnits:'1000',discountId:'d',promotionId:null,discountMinorUnits:'100',finalAmountMinorUnits:'900',currencyCode:'USD',scale:2,capturedAt:new Date(),pricingFingerprint:'fp'},items:[{serviceId:'svc',packageItemId:null,sequence:1,quantity:1,status:'PENDING'}]}),/SERVICE_DISCOUNT_REDEMPTION_LIMIT_REACHED/);
  assert.equal(created,0);
});

const CareerApplicationStatus={SUBMITTED:'SUBMITTED',UNDER_REVIEW:'UNDER_REVIEW',SHORTLISTED:'SHORTLISTED',REJECTED:'REJECTED',ACCEPTED:'ACCEPTED',WITHDRAWN:'WITHDRAWN'};
const CareerJobStatus={DRAFT:'DRAFT',PUBLISHED:'PUBLISHED',CLOSED:'CLOSED',ARCHIVED:'ARCHIVED'};
const CareerProfileVisibility={PRIVATE:'PRIVATE',PLATFORM:'PLATFORM',PUBLIC:'PUBLIC'};
const AlumniProfileVisibility={PRIVATE:'PRIVATE',ALUMNI_ONLY:'ALUMNI_ONLY',PUBLIC:'PUBLIC'};
const careerDomain={CareerApplicationStatus,CareerJobStatus,CareerProfileVisibility,AlumniProfileVisibility};

test('MNT-AUD-0055 career profile/application enforce active student and P05-owned CV/resume', async()=>{
  const { CareerEngagementUseCases }=loadTsModule('packages/application/src/career-alumni/use-cases/CareerEngagementUseCases.ts',{'@manaratak/domain':careerDomain,'../../asset-platform/AssetReferencePolicy':assetHelper});
  const assetChecks=[];
  const policy={assertUsable:async(id,o)=>assetChecks.push([id,o])};
  const students={assertActiveStudent:async(id)=>{if(id!=='student-1')throw new Error('CAREER_STUDENT_NOT_ACTIVE');}};
  const job={id:'job-1',publicId:'job-public',status:'PUBLISHED',title:'Engineer',employerId:'emp',opportunityType:'JOB',employmentType:'FULL_TIME',countryReferenceId:'YE',cityReferenceId:null,applicationDeadline:new Date(Date.now()+60000),remoteOption:false};
  const career={findJobById:async()=>job};
  let profile={id:'cp',studentReferenceId:'student-1',headline:'Old',skills:[],resumeAssetId:'resume-old',visibility:'PRIVATE',version:1,createdAt:new Date(),updatedAt:new Date()};
  const engagement={
    findProfile:async()=>profile,
    upsertProfile:async(v)=>({...profile,...v,version:2}),
    findApplicationByJobAndStudent:async()=>null,
    createApplication:async(v)=>({id:'app',...v,submittedAt:new Date(),version:1,createdAt:new Date(),updatedAt:new Date()}),
    findApplication:async()=>null,
  };
  const uc=new CareerEngagementUseCases(career,engagement,students,policy);
  await uc.upsertCareerProfile({studentReferenceId:'student-1',headline:'New',expectedVersion:1});
  assert.equal(assetChecks[0][0],'resume-old','retained resume must be revalidated');
  const app=await uc.submitApplication({jobId:'job-1',studentReferenceId:'student-1',cvAssetId:'cv-1'});
  assert.equal(app.status,'SUBMITTED');
  assert.equal(assetChecks.at(-1)[1].expectedOwnerId,'student-1');
});

test('MNT-AUD-0055 alumni non-private visibility requires self-owned consent evidence', async()=>{
  const { CareerEngagementUseCases }=loadTsModule('packages/application/src/career-alumni/use-cases/CareerEngagementUseCases.ts',{'@manaratak/domain':careerDomain,'../../asset-platform/AssetReferencePolicy':assetHelper});
  const students={assertActiveStudent:async()=>{}}; const career={}; let saved;
  const engagement={findAlumniProfile:async()=>null,upsertAlumniProfile:async(v)=>{saved=v;return {id:'a',...v,version:1,createdAt:new Date(),updatedAt:new Date()}}};
  const uc=new CareerEngagementUseCases(career,engagement,students,{assertUsable:async()=>{}});
  await assert.rejects(uc.upsertAlumniProfile({studentReferenceId:'s1',displayName:'A',visibility:'PUBLIC'}),/PUBLIC_VISIBILITY_REQUIRES_CONSENT/);
  await assert.rejects(uc.upsertAlumniProfile({studentReferenceId:'s1',displayName:'A',visibility:'PUBLIC',consentGranted:true,consentActorStudentReferenceId:'other',consentSource:'student-ui'}),/CONSENT_ACTOR_MISMATCH/);
  await uc.upsertAlumniProfile({studentReferenceId:'s1',displayName:'A',visibility:'PUBLIC',consentGranted:true,consentActorStudentReferenceId:'s1',consentSource:'student-ui'});
  assert.equal(saved.consentGrantedBy,'s1'); assert.equal(saved.consentSource,'student-ui'); assert.equal(saved.consentRevokedAt,null);
});

test('MNT-AUD-0055 application lifecycle rejects invalid transitions and fences version', async()=>{
  const { CareerEngagementUseCases }=loadTsModule('packages/application/src/career-alumni/use-cases/CareerEngagementUseCases.ts',{'@manaratak/domain':careerDomain,'../../asset-platform/AssetReferencePolicy':assetHelper});
  let updated;
  const engagement={findApplication:async()=>({id:'app',studentReferenceId:'s',status:'SUBMITTED',version:2}),updateApplicationStatus:async(id,status,input)=>{updated={id,status,input};return {...updated,version:3}}};
  const uc=new CareerEngagementUseCases({},engagement,{assertActiveStudent:async()=>{}},{assertUsable:async()=>{}});
  await assert.rejects(uc.reviewApplication({applicationId:'app',nextStatus:'ACCEPTED',expectedVersion:2,actorId:'admin'}),/TRANSITION_NOT_ALLOWED/);
  await uc.reviewApplication({applicationId:'app',nextStatus:'UNDER_REVIEW',expectedVersion:2,actorId:'admin'});
  assert.equal(updated.input.expectedVersion,2); assert.equal(updated.input.decisionMetadata.reviewedBy,'admin');
});
