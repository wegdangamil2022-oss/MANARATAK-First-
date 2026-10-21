import assert from 'node:assert/strict';
import { requireSha, DIGEST } from './ReleaseContracts.mjs';

// Independently retrieved successful run and manifest digest; includes the
// authenticated-certificate, worker-health and financial alias fixes. This is a
// reference for the next scoped drill, not a claim that its rollback has passed.
export const R14_PREVIOUS_RELEASE = Object.freeze({
  runId: 39661105241,
  sourceSha: '8e001c92a97e0e2f865adce90fc4b3bc6d3b5514',
  manifestSha256: 'a95d1163305610383a89ab15285907251b4aacf2f79720afe91896ccfc55481b',
});

export function assertRollbackPair(current, previous, proof) {
  requireSha(current.sourceSha); requireSha(previous.sourceSha);
  assert.notEqual(current.sourceSha, previous.sourceSha, 'R14_DISTINCT_RELEASES_REQUIRED');
  assert.equal(previous.sourceSha, R14_PREVIOUS_RELEASE.sourceSha, 'R14_PREVIOUS_RELEASE_NOT_REVIEWED');
  assert.equal(proof.previousManifestSha256, R14_PREVIOUS_RELEASE.manifestSha256, 'R14_PREVIOUS_MANIFEST_NOT_PINNED');
  assert.equal(proof.ancestorVerified, true, 'R14_ANCESTOR_REQUIRED');
  assert.equal(proof.runtimeChanged, false, 'R14_RUNTIME_COMPATIBILITY_REVIEW_REQUIRED');
  for (const field of ['lockSha256', 'prismaSchemaSha256']) {
    assert(DIGEST.test(previous.runtimeRequirements[field]), 'R14_RUNTIME_DIGEST_REQUIRED');
    assert.equal(current.runtimeRequirements[field], previous.runtimeRequirements[field], 'R14_RUNTIME_REQUIREMENTS_CHANGED');
  }
  assert.deepEqual(current.runtimeRequirements.externalModules, previous.runtimeRequirements.externalModules, 'R14_EXTERNAL_MODULES_CHANGED');
  return { currentSourceSha: current.sourceSha, previousSourceSha: previous.sourceSha, sharedLockedDependencyLayer: true, differentApiImplementationDemonstrated: false, downMigrationsAllowed: false, formalAcceptance: false };
}
