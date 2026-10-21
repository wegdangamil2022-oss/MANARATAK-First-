import fs from 'node:fs';
import assert from 'node:assert/strict';
import { hash, requireSha, REPOSITORY, READINESS_PATH } from './ReleaseContracts.mjs';

export function verifyReviewEvidence(root, sourceSha) {
  requireSha(sourceSha);
  const directory = new URL(`docs/reviews/evidence/post28/${sourceSha}/r14-linux-rollback/`, root);
  const index = JSON.parse(fs.readFileSync(new URL('evidence-index.json', directory)));
  assert.equal(index.sourceSha, sourceSha); assert.equal(index.passed, true);
  assert.equal(index.allSixCiSucceeded, true); assert.equal(index.formalAcceptance, false);
  for (const item of index.items) {
    assert(/^[a-z0-9][a-z0-9.-]+$/.test(item.file) && !item.file.includes('..'));
    const file = new URL(item.file, directory);
    assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, item.bytes); assert.equal(hash(bytes), item.sha256);
  }
  for (const name of ['result.json', 'ci-observation.json']) assert(index.items.some(item => item.file === name));
  return { proof: JSON.parse(fs.readFileSync(new URL('result.json', directory))), ci: JSON.parse(fs.readFileSync(new URL('ci-observation.json', directory))) };
}

export function buildStagingReview({ plan, proof, ci, requiredKeys, readiness, runtimeInputsUnchanged }) {
  assert.equal(plan.version, 1); assert.equal(plan.kind, 'MANARATAK_STAGING_REVIEW_PLAN');
  assert.equal(plan.environment, 'staging'); assert.equal(plan.reviewOnly, true);
  requireSha(plan.candidateSourceSha);
  assert.deepEqual(plan.target, { os: 'Linux', architecture: 'x64', nodeMajor: 22, postgresMajor: 16 });
  assert.equal(runtimeInputsUnchanged, true, 'STAGING_REVIEW_RUNTIME_CHANGED_REQUIRES_NEW_CANDIDATE');
  assert.equal(proof.sourceSha, plan.candidateSourceSha); assert.equal(proof.passed, true);
  assert.equal(ci.sourceSha, plan.candidateSourceSha); assert.equal(ci.runId, plan.candidateRunId);
  assert.equal(ci.allSixSucceeded, true);
  assert.equal(plan.dataScope, 'NEW_ISOLATED_SYNTHETIC_DATABASE_AND_PRIVATE_ASSET_NAMESPACE');
  assert.equal(plan.providers, 'STUB_OR_SANDBOX_ONLY_NO_REAL_CHARGES_OR_STUDENT_MESSAGES');
  assert.deepEqual(plan.publicLocales, ['ar']);
  for (const flag of ['CERTIFICATE_COMPLETION_WORKER_ENABLED', 'BACKGROUND_WORKER_ENABLED', 'STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED', 'OWNER_DOMAIN_OUTBOX_WORKER_ENABLED']) assert.equal(plan.runtimeFlags[flag], false, 'UNREVIEWED_WORKER_ENABLEMENT');
  assert(Array.isArray(requiredKeys) && requiredKeys.length > 0 && new Set(requiredKeys).size === requiredKeys.length);
  assert(requiredKeys.every(key => /^[A-Z][A-Z0-9_]+$/.test(key)));
  const runtimeBlockers = readiness.findings.filter(row => row.severity === 'BLOCKER').map(({ id, area }) => ({ id, area }));
  assert(runtimeBlockers.some(row => row.id === 'worker.certificate_completion_disabled'));
  assert(runtimeBlockers.some(row => row.id === 'worker.background_disabled'));
  return {
    kind: 'MANARATAK_STAGING_REVIEW_PACKET', version: 1,
    state: 'REVIEW_PREPARED_TARGET_AND_RUNTIME_BLOCKED', sourceSha: plan.candidateSourceSha,
    artifactRetrieval: { repository: REPOSITORY, runId: ci.runId, artifactName: 'manaratak-release-artifacts-' + plan.candidateSourceSha, freshManifestAndUnitDigestVerificationRequired: true, artifactBytesIncluded: false },
    target: plan.target, hostingDesign: plan.hostingDesign, topology: plan.topology, publicLocales: plan.publicLocales,
    runtimeFlags: plan.runtimeFlags, requiredRuntimeKeys: requiredKeys,
    runtimeProfileReady: false, runtimeBlockers,
    targetPrerequisites: plan.targetReadiness,
    readinessPath: READINESS_PATH,
    demonstratedScope: {
      evidenceIndex: `docs/reviews/evidence/post28/${plan.candidateSourceSha}/r14-linux-rollback/evidence-index.json`,
      linuxApiRollbackPassed: proof.rollbackJourney.passed,
      requestCount: proof.rollbackJourney.requestCount,
      elapsedMilliseconds: proof.rollbackJourney.elapsedMilliseconds,
      workersEnabled: proof.rollbackJourney.workersEnabled,
      financialEffectOnceClaimed: proof.rollbackJourney.financialEffectOnceClaimed,
      differentApiImplementationDemonstrated: proof.rollbackJourney.differentApiImplementationDemonstrated,
    },
    stagingExecuted: false, validationExecuted: false, deploymentAuthorized: false, productionAuthorized: false,
    evidenceIsDiagnosticNotSignedPromotionApproval: true,
  };
}

export function stagingEnvironmentTemplate(packet) {
  return [
    '# REVIEW REFERENCE ONLY. All assignments are commented; this is not a runnable env file.',
    '# Populate a private secret store after target and worker/provider approval. Never commit values.',
    '# All canonical staging/production keys are retained, including sandbox provider keys.',
    '# NODE_ENV=staging', '# RELEASE_SOURCE_SHA=' + packet.sourceSha,
    ...packet.requiredRuntimeKeys.map(key => '# ' + key + '=' + (key in packet.runtimeFlags ? String(packet.runtimeFlags[key]) : key === 'HEALTH_DEPLOYMENT_REVISION' ? packet.sourceSha : '')),
    '',
  ].join('\n');
}
