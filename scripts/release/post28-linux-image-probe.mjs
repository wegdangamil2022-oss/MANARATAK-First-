// Build and inspect a review image only. No API, database or providers are started.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyReleaseManifest } from './lib/ReleaseContracts.mjs';

const run = fs.realpathSync(process.argv[2]);
if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('LINUX_X64_RUNNER_REQUIRED');
const manifest = verifyReleaseManifest(path.join(run, 'artifacts'), process.env.GITHUB_SHA);
const context = path.join(run, 'image-context');
fs.mkdirSync(context);
// The tar round-trip already dereferenced only validated in-layer links.
// Copy that fresh unpack so workspace symlinks cannot retain host-absolute paths.
fs.cpSync(path.join(run, 'api-boot-root'), path.join(context, 'api-runtime'), { recursive: true });
if (fs.existsSync(path.join(context, 'api-runtime/storage')) || fs.existsSync(path.join(context, 'api-runtime/.env')))
  throw new Error('LINUX_IMAGE_MUTABLE_STATE_REJECTED');
fs.mkdirSync(path.join(context, 'release-tools'));
fs.copyFileSync('scripts/release/lib/RuntimeLayerPolicy.mjs', path.join(context, 'release-tools/RuntimeLayerPolicy.mjs'));
fs.copyFileSync(path.join(run, 'artifacts/release-manifest.json'), path.join(context, 'release-tools/release-manifest.json'));
fs.copyFileSync('config/release/linux-x64/Dockerfile', path.join(context, 'Dockerfile'));
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const baseTag = 'node:22.16.0-bookworm';
docker(['pull', '--platform=linux/amd64', baseTag]);
const base = JSON.parse(docker(['image', 'inspect', baseTag]))[0];
const baseDigest = base.RepoDigests.find(value => /^node@sha256:[a-f0-9]{64}$/.test(value));
if (!baseDigest || base.Os !== 'linux' || base.Architecture !== 'amd64') throw new Error('LINUX_BASE_IDENTITY_INVALID');
const idFile = path.join(run, 'image-id.txt');
docker(['build', '--platform=linux/amd64', '--iidfile', idFile, '--build-arg', `NODE_RUNTIME_IMAGE=${baseDigest}`, context]);
const imageId = fs.readFileSync(idFile, 'utf8').trim();
if (!/^sha256:[a-f0-9]{64}$/.test(imageId)) throw new Error('LINUX_IMAGE_DIGEST_INVALID');
const probe = `
  import fs from 'node:fs';
  import assert from 'node:assert/strict';
  import {verifyRuntimeLayer} from '/opt/release-tools/RuntimeLayerPolicy.mjs';
  const manifest=JSON.parse(fs.readFileSync('/opt/release-tools/release-manifest.json'));
  const identity=JSON.parse(fs.readFileSync('runtime-layer.json'));
  assert.equal(manifest.sourceSha,${JSON.stringify(manifest.sourceSha)});
  assert.equal(process.version,'v22.16.0');
  assert.equal(process.platform,'linux'); assert.equal(process.arch,'x64');
  assert.notEqual(process.getuid(),0);
  console.log(JSON.stringify({node:process.version,uid:process.getuid(),...verifyRuntimeLayer(process.cwd(),manifest,identity)}));
`;
const nativeProbe = JSON.parse(docker(['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--entrypoint=node', imageId, '--input-type=module', '-e', probe]).trim());
docker(['pull', '--platform=linux/amd64', 'postgres:16']);
const postgres = JSON.parse(docker(['image', 'inspect', 'postgres:16']))[0];
const postgresDigest = postgres.RepoDigests.find(value => /^postgres@sha256:[a-f0-9]{64}$/.test(value));
if (!postgresDigest || postgres.Os !== 'linux' || postgres.Architecture !== 'amd64') throw new Error('POSTGRES_REVIEW_IMAGE_INVALID');
const postgresVersion = docker(['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--user=postgres', '--entrypoint=postgres', postgresDigest, '--version']).trim();
if (!/^postgres \(PostgreSQL\) 16\./.test(postgresVersion)) throw new Error('POSTGRES_REVIEW_VERSION_INVALID');
const report = {
  kind: 'POST28_LINUX_REVIEW_IMAGE', sourceSha: manifest.sourceSha,
  checkedAt: new Date().toISOString(), baseTag, baseDigest, imageId,
  dockerfileSha256: createHash('sha256').update(fs.readFileSync(path.join(context, 'Dockerfile'))).digest('hex'),
  nativeProbe, network: 'none', readOnly: true, capabilities: 'ALL_DROPPED',
  apiBooted: false, databaseConnected: false, targetDatabaseMajor: 16,
  postgresDigest, postgresVersion, postgresServerStarted: false,
  imagePushed: false, productionAcceptance: false, promotionAuthorized: false,
};
fs.writeFileSync(path.join(run, 'linux-image-probe.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
