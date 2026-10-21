// Offline preparation only. No network, database, provider or promotion operation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ProductionReadinessValidator } from '../../packages/config/src/ProductionReadinessValidator.ts';
import { PRODUCTION_REQUIRED_CONFIG_KEYS } from '../../packages/config/src/AppConfig.ts';
import { buildStagingReview, stagingEnvironmentTemplate, verifyReviewEvidence } from './lib/StagingReviewPacket.mjs';
import { hash } from './lib/ReleaseContracts.mjs';

assert.equal(process.argv.length, 3, 'USAGE_NODE_IMPORT_TSX_PREPARE_STAGING_REVIEW_OUTPUT_DIRECTORY');
assert.equal(Number(process.versions.node.split('.')[0]), 22);
const root = fs.realpathSync(process.cwd()), rootUrl = pathToFileURL(root + path.sep);
const plan = JSON.parse(fs.readFileSync(new URL('config/release/staging-review.json', rootUrl)));
const changed = execFileSync('git', ['diff', '--name-only', plan.candidateSourceSha, '--', 'apps', 'packages', 'vendor', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.base.json', 'config/release/linux-x64', 'scripts/release/build-immutable-artifacts.mjs', 'scripts/release/lib/RuntimeLayerPolicy.mjs'], { encoding: 'utf8' }).trim();
const packet = buildStagingReview({ plan, ...verifyReviewEvidence(rootUrl, plan.candidateSourceSha), requiredKeys: [...PRODUCTION_REQUIRED_CONFIG_KEYS], readiness: ProductionReadinessValidator.validate({ NODE_ENV: 'staging', ...plan.runtimeFlags }), runtimeInputsUnchanged: changed.length === 0 });
packet.preparerSourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'STAGING_REVIEW_CLEAN_PREPARER_REQUIRED');
const output = path.resolve(process.argv[2]);
assert(output !== root && !output.startsWith(root + path.sep), 'STAGING_REVIEW_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED');
// The parent must exist; never overwrite an existing packet.
const parent = fs.realpathSync(path.dirname(output));
assert(parent !== root && !parent.startsWith(root + path.sep));
const destination = path.join(parent, path.basename(output));
fs.mkdirSync(destination, { mode: 0o700 });
const files = { 'review.json': JSON.stringify(packet, null, 2) + '\n', 'api.env.reference': stagingEnvironmentTemplate(packet) };
for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(destination, name), bytes, { flag: 'wx', mode: 0o600 });
fs.writeFileSync(path.join(destination, 'packet-index.json'), JSON.stringify({ sourceSha: packet.sourceSha, preparerSourceSha: packet.preparerSourceSha, items: Object.entries(files).map(([file, bytes]) => ({ file, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) })), deploymentAuthorized: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ output: destination, state: packet.state, requiredRuntimeKeys: packet.requiredRuntimeKeys.length, runtimeBlockers: packet.runtimeBlockers.length, deploymentAuthorized: false }));
