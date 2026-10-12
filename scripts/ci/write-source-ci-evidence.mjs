#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { REPOSITORY, requireSha, hash } from '../release/lib/ReleaseContracts.mjs';
const requiredSteps = [
  'source-quality',
  'source-preflight',
  'source-regressions',
  'source-closure',
  'prisma-source',
  'typecheck',
  'vercel-typecheck',
  'lint',
  'build',
  'unit',
  'artifacts',
];
const sha = requireSha(process.env.GITHUB_SHA),
  steps = JSON.parse(process.env.SOURCE_CI_STEPS_JSON ?? '{}');
const pass = requiredSteps.every((id) => steps[id] === 'success');
const report = {
  version: 3,
  kind: 'SOURCE_EXECUTION_REPORT',
  sha,
  repository: REPOSITORY,
  runId: process.env.GITHUB_RUN_ID ?? null,
  checkedAt: new Date().toISOString(),
  sourceStatus: pass ? 'EXECUTED_SOURCE_STEPS_PASSED' : 'SOURCE_STEPS_FAILED_OR_SKIPPED',
  runtimeStatus: 'UNVERIFIED',
  productionDecision: 'BLOCKED',
  steps: requiredSteps.map((id) => ({
    id,
    outcome: steps[id] ?? 'MISSING',
    executed: ['success', 'failure'].includes(steps[id]),
  })),
  pass,
  databaseConnectionRequired: false,
};
const out = 'p12-ci-evidence';
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'SOURCE_CI_CLOSURE.json'), JSON.stringify(report, null, 2) + '\n');
// Optional trusted main CI signer. The unsigned execution report never constitutes source attestation.
if (process.env.SOURCE_EVIDENCE_SIGNING_KEY) {
  if (
    process.env.GITHUB_REPOSITORY !== REPOSITORY ||
    process.env.GITHUB_EVENT_NAME !== 'push' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    !/^\d+$/.test(process.env.GITHUB_RUN_ID ?? '')
  )
    throw new Error('SOURCE_SIGNING_WORKFLOW_NOT_AUTHORIZED');
  const key = crypto.createPrivateKey(process.env.SOURCE_EVIDENCE_SIGNING_KEY);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('SOURCE_SIGNING_KEY_TYPE_INVALID');
  const payload = JSON.stringify({
    kind: 'SOURCE_VERIFICATION',
    taskInventorySha256: hash(fs.readFileSync('config/release/section-task-inventory.json')),
    sha,
    repository: REPOSITORY,
    checkedAt: report.checkedAt,
    expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    gates: [
      {
        id: 'source-ci',
        sha,
        outcome: pass ? 'PASS' : 'FAIL',
        executed: true,
        environment: 'SOURCE_CI',
        owner: 'Platform CI',
        fixture: 'registered-source-closure-manifest',
        suite: 'Enterprise CI Pipeline',
        checkedAt: report.checkedAt,
        artifact: `https://github.com/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
        reviewer: 'TRUSTED_MAIN_CI_SIGNER',
      },
    ],
    sectionBlockers: JSON.parse(process.env.SOURCE_SECTION_REVIEW_LEDGER_JSON ?? '[]'),
  });
  fs.writeFileSync(
    path.join(out, 'SOURCE_ATTESTATION.json'),
    JSON.stringify(
      {
        version: 1,
        algorithm: 'Ed25519',
        payload,
        signature: crypto.sign(null, Buffer.from(payload), key).toString('base64'),
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(
  `SOURCE_EXECUTION_REPORT=${report.sourceStatus} RUNTIME_VERIFIED=FALSE PRODUCTION=BLOCKED`,
);
