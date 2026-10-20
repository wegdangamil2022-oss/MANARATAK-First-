#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  required,
  verifySignedEvidence,
  releaseVerdict,
  verifyReleaseManifest,
  hash,
} from './lib/ReleaseContracts.mjs';
import { acceptanceDetails } from './lib/AcceptanceContracts.mjs';
export function verifyPromotionInputs(env = process.env) {
  const sha = required('SOURCE_SHA', env),
    directory = env.RELEASE_ARTIFACT_DIRECTORY ?? 'release-artifacts';
  const manifest = verifyReleaseManifest(directory, sha);
  const bundle = JSON.parse(required('RELEASE_EVIDENCE_BUNDLE_JSON', env));
  if (bundle.version !== 2) throw new Error('INDEPENDENT_SOURCE_RUNTIME_EVIDENCE_REQUIRED');
  const sourceKey = required('RELEASE_SOURCE_EVIDENCE_PUBLIC_KEY', env),
    runtimeKey = required('RELEASE_RUNTIME_EVIDENCE_PUBLIC_KEY', env);
  if (
    crypto
      .createPublicKey(sourceKey)
      .export({ type: 'spki', format: 'der' })
      .equals(crypto.createPublicKey(runtimeKey).export({ type: 'spki', format: 'der' }))
  )
    throw new Error('SOURCE_RUNTIME_TRUST_SEPARATION_REQUIRED');
  const source = verifySignedEvidence(bundle.source, sourceKey, sha),
    runtime = verifySignedEvidence(bundle.runtime, runtimeKey, sha);
  const approvalKey = required('RELEASE_EVIDENCE_PUBLIC_KEY', env);
  const authorityDer = crypto.createPublicKey(approvalKey).export({ type: 'spki', format: 'der' });
  if (
    [sourceKey, runtimeKey].some((key) =>
      authorityDer.equals(crypto.createPublicKey(key).export({ type: 'spki', format: 'der' })),
    )
  )
    throw new Error('RELEASE_APPROVAL_TRUST_SEPARATION_REQUIRED');
  const approval = verifySignedEvidence(bundle.approval, approvalKey, sha);
  if (
    source.kind !== 'SOURCE_VERIFICATION' ||
    runtime.kind !== 'RUNTIME_VERIFICATION' ||
    approval.kind !== 'RELEASE_APPROVAL' ||
    approval.sourceEvidenceDigest !== hash(bundle.source.payload + '.' + bundle.source.signature) ||
    approval.runtimeEvidenceDigest !== hash(bundle.runtime.payload + '.' + bundle.runtime.signature)
  )
    throw new Error('RELEASE_EVIDENCE_LINKAGE_INVALID');
  const evidence = {
    ...runtime,
    manifestSha256: approval.manifestSha256,
    artifacts: approval.artifacts,
    authority: approval.authority,
    sectionBlockers: source.sectionBlockers,
    gates: [...(source.gates ?? []), ...(runtime.gates ?? [])],
  };
  if (evidence.manifestSha256 !== hash(fs.readFileSync(`${directory}/release-manifest.json`)))
    throw new Error('RELEASE_EVIDENCE_MANIFEST_DIGEST_MISMATCH');
  for (const artifact of manifest.artifacts)
    if (
      !evidence.artifacts?.some(
        (row) => row.unit === artifact.unit && row.sha256 === artifact.sha256,
      )
    )
      throw new Error('RELEASE_EVIDENCE_UNIT_DIGEST_MISMATCH');
  if (
    source.taskInventorySha256 !== manifest.sourceLedger?.taskInventorySha256 ||
    source.taskInventorySha256 !==
      hash(
        fs.readFileSync(
          new URL('../../config/release/section-task-inventory.json', import.meta.url),
        ),
      )
  )
    throw new Error('RELEASE_TASK_INVENTORY_DIGEST_MISMATCH');
  const boot = evidence.gates?.find((row) => row.id === 'artifact-boot');
  if (
    boot?.lockSha256 !== manifest.runtimeRequirements.lockSha256 ||
    boot?.prismaSchemaSha256 !== manifest.runtimeRequirements.prismaSchemaSha256 ||
    !manifest.runtimeRequirements.externalModules.every((name) =>
      boot?.externalModulesVerified?.includes(name),
    )
  )
    throw new Error('RELEASE_RUNTIME_LAYER_BINDING_INVALID');
  const verdict = releaseVerdict(evidence, sha),
    additional = acceptanceDetails(evidence, sha);
  if (additional.length) {
    verdict.failures.push(...additional);
    verdict.decision = 'BLOCKED';
    verdict.runtimeStatus = 'RUNTIME_UNVERIFIED';
  }
  if (manifest.sourceLedger?.section27Closed !== true) {
    verdict.failures.push('SECTION_27_SOURCE_OPEN');
    verdict.decision = 'BLOCKED';
  }
  return { manifest, evidence, verdict };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { verdict } = verifyPromotionInputs();
  fs.mkdirSync('release-evidence', { recursive: true });
  fs.writeFileSync(
    'release-evidence/RELEASE_VERDICT.json',
    JSON.stringify(verdict, null, 2) + '\n',
  );
  console.log(
    `SOURCE_STATUS=${verdict.sourceStatus} RUNTIME_STATUS=${verdict.runtimeStatus} RELEASE_VERDICT=${verdict.decision}`,
  );
  if (verdict.decision !== 'GO') process.exitCode = 1;
}
