#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { required, promotionState } from './lib/ReleaseContracts.mjs';
import { readBounded } from './lib/SmokeContracts.mjs';
import { verifyPromotionInputs } from './verify-release-evidence.mjs';
export async function reconcilePromotion(
  { endpoint, token, environment, manifest, evidence },
  fetcher = fetch,
  { maximumPolls = 60, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {},
) {
  if (!Number.isInteger(maximumPolls) || maximumPolls < 0 || maximumPolls > 60)
    throw new Error('PROMOTION_POLL_BOUND_INVALID');
  const deadline = Date.now() + 120_000;
  const origin = new URL(endpoint);
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    throw new Error('PROMOTION_CONTROL_PLANE_ORIGIN_INVALID');
  const base = endpoint.replace(/\/$/, '');
  const read = async (url, options = {}) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('PROMOTION_RECONCILIATION_TIMEOUT');
    const response = await fetcher(url, {
      ...options,
      redirect: 'manual',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(Math.min(15000, remaining)),
    });
    if (
      ![200, 201, 202].includes(response.status) ||
      response.redirected ||
      (response.url && response.url !== url) ||
      !response.headers.get('content-type')?.startsWith('application/json')
    )
      throw new Error('PROMOTION_CONTROL_PLANE_RESPONSE_INVALID');
    return JSON.parse(await readBounded(response, 128000));
  };
  let result = await read(`${base}/promotions`, {
    method: 'POST',
    body: JSON.stringify({
      environment,
      sourceSha: manifest.sourceSha,
      artifacts: manifest.artifacts,
      runtimeRequirements: manifest.runtimeRequirements,
      evidence,
    }),
  });
  const deploymentId = result.deploymentId;
  for (let attempt = 0; attempt <= maximumPolls; attempt++) {
    if (result.deploymentId !== deploymentId) throw new Error('PROMOTION_DEPLOYMENT_ID_CHANGED');
    if (promotionState(result, manifest, environment) === 'HEALTHY') return result;
    if (attempt === maximumPolls) throw new Error('PROMOTION_RECONCILIATION_TIMEOUT');
    await wait(2000);
    result = await read(`${base}/promotions/${encodeURIComponent(deploymentId)}`);
  }
}
export function isPromotionCliEntry(entry) {
  return typeof entry === 'string' && pathToFileURL(path.resolve(entry)).href === import.meta.url;
}
if (isPromotionCliEntry(process.argv[1])) {
  const environment = process.argv[2];
  if (!['validation', 'staging', 'production'].includes(environment))
    throw new Error('PROMOTION_ENVIRONMENT_INVALID');
  if (process.env.RELEASE_PROMOTION_ALLOWED !== 'true') throw new Error('PROMOTION_NOT_AUTHORIZED');
  const { manifest, evidence, verdict } = verifyPromotionInputs();
  if (verdict.decision !== 'GO' || !evidence.authority.approvedEnvironments.includes(environment))
    throw new Error('PROMOTION_EVIDENCE_BLOCKED');
  const result = await reconcilePromotion({
    endpoint: required('MANARATAK_DEPLOYMENT_CONTROL_PLANE_URL'),
    token: required('MANARATAK_DEPLOYMENT_CONTROL_PLANE_TOKEN'),
    environment,
    manifest,
    evidence: JSON.parse(required('RELEASE_EVIDENCE_BUNDLE_JSON')),
  });
  fs.mkdirSync('release-evidence', { recursive: true });
  fs.writeFileSync(
    `release-evidence/${environment}-promotion.json`,
    JSON.stringify(
      {
        version: 2,
        environment,
        sourceSha: manifest.sourceSha,
        state: 'HEALTHY',
        deploymentId: result.deploymentId,
        units: result.units,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`RELEASE_PROMOTION=${environment.toUpperCase()}_RECONCILED`);
}
