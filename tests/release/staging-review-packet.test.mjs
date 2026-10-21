import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ProductionReadinessValidator } from '../../packages/config/src/ProductionReadinessValidator.ts';
import { PRODUCTION_REQUIRED_CONFIG_KEYS } from '../../packages/config/src/AppConfig.ts';
import { buildStagingReview, verifyReviewEvidence } from '../../scripts/release/lib/StagingReviewPacket.mjs';

const root = new URL('../../', import.meta.url);
const json = relative => JSON.parse(fs.readFileSync(new URL(relative, root)));
const plan = () => json('config/release/staging-review.json');
const inputs = () => {
  const selected = plan();
  const evidence = verifyReviewEvidence(root, selected.candidateSourceSha);
  return { plan: selected, ...evidence, requiredKeys: [...PRODUCTION_REQUIRED_CONFIG_KEYS], readiness: ProductionReadinessValidator.validate({ NODE_ENV: 'staging', ...selected.runtimeFlags }), runtimeInputsUnchanged: true };
};

test('review packet uses retained Linux evidence and exposes the actual staging worker blockers', () => {
  const packet = buildStagingReview(inputs());
  assert.equal(packet.sourceSha, plan().candidateSourceSha);
  assert.equal(packet.deploymentAuthorized, false); assert.equal(packet.productionAuthorized, false);
  assert.equal(packet.state, 'REVIEW_PREPARED_TARGET_AND_RUNTIME_BLOCKED');
  assert.equal(packet.requiredRuntimeKeys.length, PRODUCTION_REQUIRED_CONFIG_KEYS.length);
  for (const id of ['worker.certificate_completion_disabled', 'worker.background_disabled']) assert(packet.runtimeBlockers.some(row => row.id === id));
  assert.equal(packet.runtimeProfileReady, false);
});

test('preparation rejects production, enabled unreviewed workers, failed or rebound CI, and changed runtime inputs', () => {
  const source = inputs();
  for (const change of [
    { plan: { ...source.plan, environment: 'production' } },
    { plan: { ...source.plan, runtimeFlags: { ...source.plan.runtimeFlags, BACKGROUND_WORKER_ENABLED: true } } },
    { ci: { ...source.ci, allSixSucceeded: false } },
    { ci: { ...source.ci, sourceSha: 'b'.repeat(40) } },
    { runtimeInputsUnchanged: false },
  ]) assert.throws(() => buildStagingReview({ ...source, ...change }));
});

test('evidence verifier refuses path substitution and a modified retained result', t => {
  assert.throws(() => verifyReviewEvidence(root, '../outside'));
  const selected = plan();
  const scratch = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'manaratak-staging-evidence-'));
  t.after(() => { assert.equal(path.dirname(scratch), fs.realpathSync(os.tmpdir())); assert(path.basename(scratch).startsWith('manaratak-staging-evidence-')); fs.rmSync(scratch, { recursive: true }); });
  const relative = `docs/reviews/evidence/post28/${selected.candidateSourceSha}/r14-linux-rollback`;
  fs.mkdirSync(path.dirname(path.join(scratch, relative)), { recursive: true });
  fs.cpSync(new URL(relative, root), path.join(scratch, relative), { recursive: true });
  fs.appendFileSync(path.join(scratch, relative, 'result.json'), 'modified');
  assert.throws(() => verifyReviewEvidence(pathToFileURL(scratch + path.sep), selected.candidateSourceSha));
});
