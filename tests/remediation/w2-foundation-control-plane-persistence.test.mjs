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

function load(relPath, requireMap) {
  const js = ts.transpileModule(read(relPath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => requireMap[id] ?? (() => { throw new Error(`UNEXPECTED_REQUIRE:${id}`); })();
  vm.runInThisContext(`(function(require,exports,module){${js}\n})`, { filename: relPath })(localRequire, module.exports, module);
  return module.exports;
}

const noopClass = class { constructor(...args) { this.args = args; } };
const domain = new Proxy({ WorkflowLifecycleState: { CREATED:'CREATED', ACTIVE:'ACTIVE', COMPLETED:'COMPLETED', ARCHIVED:'ARCHIVED' } }, {
  get(target, prop) { return prop in target ? target[prop] : noopClass; },
});
const app = new Proxy({}, { get() { return noopClass; } });
const core = { ISpecification: noopClass };

function delegateRecorder() {
  const calls = [];
  return {
    calls,
    prisma: new Proxy({}, { get(_t, key) { return { upsert: async (args) => { calls.push([String(key), args]); }, findMany: async () => [] }; } }),
  };
}

const scalar = (value) => ({ getValue: () => value });

test('MNT-AUD-0049 workflow repository persists durable aggregate snapshot', async () => {
  const { prisma, calls } = delegateRecorder();
  const { PrismaWorkflowRepository } = load('packages/infrastructure/src/workflow/PrismaWorkflowRepository.ts', { '@manaratak/domain': domain, '@prisma/client': {} });
  const repo = new PrismaWorkflowRepository(prisma);
  const workflow = {
    getId: () => scalar('wf-1'), getReference: () => scalar('workflow.ref'), getOwnerReference: () => scalar('owner.ref'),
    getDefinition: () => ({ getName: () => 'Review', getStates: () => [{ getName:()=> 'OPEN', getIsInitial:()=>true, getIsTerminal:()=>false }], getTransitions:()=>[] }),
    getVersion: () => scalar(1), getMetadata: () => ({ getData: () => ({ source:'test' }) }), getExecutionIntent: () => scalar('MANUAL'),
    getLifecycleState: () => 'CREATED', getCurrentState: () => undefined,
  };
  await repo.save(workflow);
  assert.equal(calls[0][0], 'workflowControlRecord');
  assert.equal(calls[0][1].create.reference, 'workflow.ref');
  assert.equal(calls[0][1].create.snapshot.definitionName, 'Review');
});

test('MNT-AUD-0049 API and component repositories persist owner snapshots', async () => {
  const apiRec = delegateRecorder();
  const { PrismaApiServiceRepository } = load('packages/infrastructure/src/api-foundation/PrismaApiServiceRepository.ts', { '@manaratak/domain': domain, '@manaratak/core': core, '@prisma/client': {} });
  const apiRepo = new PrismaApiServiceRepository(apiRec.prisma);
  const endpoint = { getName:()=> 'users', getPurpose:()=> 'users api' };
  const operation = { getName:()=> 'create', getInputType:()=> 'Create', getOutputType:()=> 'User', getIsIdempotent:()=>true };
  const api = {
    getId:()=>scalar('api-1'), getReference:()=>scalar('api.ref'), getOwnerReference:()=>scalar('owner'),
    getDefinition:()=>({ getEndpoints:()=>[endpoint], getOperationsForEndpoint:()=>[operation] }),
    getVersion:()=>({ getMajor:()=>1,getMinor:()=>0,getPatch:()=>0 }),
    getContractMetadata:()=>({ getFormatType:()=> 'JSON', getIsStreaming:()=>false, getRequestSchemaType:()=> 'JSON_SCHEMA' }),
    getCompatibilityMetadata:()=>({ getBackwardCompatible:()=>true,getForwardCompatible:()=>false,getSupportStatus:()=> 'SUPPORTED' }),
    getExposureIntent:()=>({ getExposePublicly:()=>false,getEnvironmentTarget:()=> 'INTERNAL',getNetworkCategory:()=> 'PRIVATE' }),
    getMetadata:()=>({ getProperties:()=>new Map([['source','test']]) }), getLifecycleState:()=> 'DRAFT',
  };
  await apiRepo.save(api);
  assert.equal(apiRec.calls[0][0], 'apiServiceControlRecord');
  assert.equal(apiRec.calls[0][1].create.version, '1.0.0');

  const compRec = delegateRecorder();
  const { PrismaSharedComponentRepository } = load('packages/infrastructure/src/shared-components/PrismaSharedComponentRepository.ts', { '@manaratak/domain': domain, '@manaratak/core': core, '@prisma/client': {} });
  const compRepo = new PrismaSharedComponentRepository(compRec.prisma);
  const component = {
    getId:()=>scalar('cmp-1'), getReference:()=>scalar('cmp.ref'), getOwnerReference:()=>scalar('owner'),
    getDefinition:()=>({ getProperties:()=>[{name:'title'}], getSlots:()=>[] }), getVersion:()=>scalar('1.0.0'),
    getCompatibility:()=>({ getIsBackwardCompatible:()=>true,getIsForwardCompatible:()=>false }), getMetadata:()=>({ getData:()=>new Map() }),
    getRenderingIntent:()=>({ getVisualCategory:()=> 'FORM',getInteractionModel:()=> 'STATIC' }), getState:()=> 'ACTIVE',
  };
  await compRepo.save(component);
  assert.equal(compRec.calls[0][0], 'sharedComponentControlRecord');
  assert.equal(compRec.calls[0][1].create.reference, 'cmp.ref');
});

test('MNT-AUD-0049 operational projections write through Prisma instead of no-op gateways', async () => {
  const wf = delegateRecorder();
  const { PrismaWorkflowExecutionGateway } = load('packages/infrastructure/src/workflow/PrismaWorkflowExecutionGateway.ts', { '@manaratak/domain': domain, '@manaratak/application': app, '@prisma/client': {} });
  await new PrismaWorkflowExecutionGateway(wf.prisma).execute({ getValue:()=> 'wf.ref' });
  assert.equal(wf.calls[0][0], 'workflowExecutionProjection');

  const exposure = delegateRecorder();
  const { PrismaApiExposureGateway } = load('packages/infrastructure/src/api-foundation/PrismaApiExposureGateway.ts', { '@manaratak/domain': domain, '@manaratak/application': app, '@prisma/client': {} });
  const api = { getReference:()=>scalar('api.ref'), getId:()=>scalar('api-1'), getLifecycleState:()=> 'ACTIVE', getExposureIntent:()=>({ getExposePublicly:()=>true,getEnvironmentTarget:()=> 'PROD',getNetworkCategory:()=> 'PUBLIC' }) };
  await new PrismaApiExposureGateway(exposure.prisma).expose(api);
  assert.equal(exposure.calls[0][0], 'apiServiceExposureProjection');

  const render = delegateRecorder();
  const { PrismaComponentRenderingGateway } = load('packages/infrastructure/src/shared-components/PrismaComponentRenderingGateway.ts', { '@manaratak/domain': domain, '@manaratak/application': app, '@prisma/client': {} });
  const cmp = { getReference:()=>scalar('cmp.ref'), getId:()=>scalar('cmp-1'), getVersion:()=>scalar('1.0.0'), getState:()=> 'ACTIVE', getDefinition:()=>({getProperties:()=>[],getSlots:()=>[]}), getRenderingIntent:()=>({getVisualCategory:()=> 'FORM',getInteractionModel:()=> 'STATIC'}) };
  await new PrismaComponentRenderingGateway(render.prisma).synchronize(cmp);
  assert.equal(render.calls[0][0], 'sharedComponentRenderingProjection');
});
