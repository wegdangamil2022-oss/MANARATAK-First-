import assert from 'node:assert/strict';
import { requireSha, DIGEST } from './ReleaseContracts.mjs';

// Independently retrieved successful run and manifest digest; includes the
// authenticated-certificate and worker-health fixes absent from older candidates.
export const R14_PREVIOUS_RELEASE = Object.freeze({
  runId: 39599847197,
  sourceSha: 'fb1a375eba5d09d3f7a01d5515270ed2cf011280',
  manifestSha256: 'f17c7d7a33efa90f51618fcb602e0f6a414cd62bef45e6bb43ffdfade0397c71',
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
