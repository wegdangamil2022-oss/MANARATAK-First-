import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../../apps/web/src/features/students/studentWorkspacePreviewApi.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function previewClient() {
  let liveCalls = 0;
  let networkCalls = 0;
  const live = new Proxy({}, { get: () => () => { liveCalls++; throw new Error('LIVE_API_FORBIDDEN'); } });
  const sandbox = {
    module: { exports: {} }, structuredClone,
    fetch: () => { networkCalls++; throw new Error('NETWORK_FORBIDDEN'); },
    require: name => { assert.equal(name, '../../api/client'); return { ApiClient: live }; },
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(compiled, sandbox);
  return {
    client: sandbox.module.exports.PreviewStudentApiClient,
    assertOffline() { assert.equal(liveCalls, 0); assert.equal(networkCalls, 0); },
  };
}

test('shared student workspace preview reads detached synthetic data without calling the live API', async () => {
  const { client, assertOffline } = previewClient();
  const identity = await client.getCurrentStudentIdentity();
  const dashboard = await client.getMyStudentDashboard();
  assert.equal(identity.principalId, 'design-preview-student');
  assert.equal(dashboard.workspace.studentReferenceId, identity.principalId);
  dashboard.workspace.displayName = 'mutated returned copy';
  assert.notEqual((await client.getMyStudentDashboard()).workspace.displayName, dashboard.workspace.displayName);
  assertOffline();
});

test('unsupported private calls and real asset delivery fail closed without live fallback', async () => {
  const { client, assertOffline } = previewClient();
  await assert.rejects(client.getMyCertificateArtifactBlob('real-certificate', 'pdf'), /getMyCertificateArtifactBlob/);
  await assert.rejects(client.futurePrivateOperation('real-student'), /futurePrivateOperation/);
  await assert.rejects(client.getMyStudentAssetDeliveryGrant('real-asset'));
  assertOffline();
});
