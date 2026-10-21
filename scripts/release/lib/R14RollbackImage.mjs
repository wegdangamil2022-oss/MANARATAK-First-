import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { hash, verifyReleaseManifest } from './ReleaseContracts.mjs';
import { assertRollbackPair, R14_PREVIOUS_RELEASE } from './R14RollbackContracts.mjs';

export function prepareRollbackImage({ run, manifest, image, docker }) {
  const previousDirectory = path.join(run, 'previous-artifacts');
  const previousDigest = hash(fs.readFileSync(path.join(previousDirectory, 'release-manifest.json')));
  assert.equal(previousDigest, R14_PREVIOUS_RELEASE.manifestSha256, 'R14_PREVIOUS_MANIFEST_NOT_PINNED');
  const previous = verifyReleaseManifest(previousDirectory, R14_PREVIOUS_RELEASE.sourceSha);
  execFileSync('git', ['merge-base', '--is-ancestor', previous.sourceSha, manifest.sourceSha], { stdio: 'pipe' });
  const changes = execFileSync('git', ['diff', '--name-only', previous.sourceSha, manifest.sourceSha, '--', 'apps/api', 'apps/web', 'apps/admin', 'packages', 'vendor', 'package.json', 'package-lock.json'], { encoding: 'utf8' }).trim();
  const compatibility = assertRollbackPair(manifest, previous, { previousManifestSha256: previousDigest, ancestorVerified: true, runtimeChanged: changes.length !== 0 });
  const context = path.join(run, 'previous-image-context'), root = path.join(context, 'api-runtime');
  fs.mkdirSync(root, { recursive: true });
  const api = previous.artifacts.find(row => row.unit === 'api');
  execFileSync('tar', ['-xf', path.join(previousDirectory, api.file), '-C', root], { stdio: 'pipe' });
  assert.equal(hash(fs.readFileSync(path.join(root, 'packages/infrastructure/prisma/schema.prisma'))), previous.runtimeRequirements.prismaSchemaSha256);
  // Only dependencies are shared. All API bytes come from the verified old tar.
  const shared = fs.realpathSync(path.join(path.dirname(run), 'r07-linux/api-boot-root'));
  const identity = JSON.parse(fs.readFileSync(path.join(shared, 'runtime-layer.json')));
  assert.equal(identity.sourceSha, manifest.sourceSha);
  fs.cpSync(path.join(shared, 'node_modules'), path.join(root, 'node_modules'), { recursive: true });
  const rows = execFileSync('git', ['ls-tree', '-r', '--name-only', previous.sourceSha], { encoding: 'utf8' }).trim().split('\n').filter(file => /^(apps|packages)\/[^/]+\/package.json$/.test(file));
  for (const relative of rows) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), execFileSync('git', ['show', previous.sourceSha + ':' + relative]));
  }
  fs.writeFileSync(path.join(root, 'runtime-layer.json'), JSON.stringify({ ...identity, sourceSha: previous.sourceSha, dependencySourceSha: manifest.sourceSha }) + '\n');
  fs.mkdirSync(path.join(context, 'release-tools'));
  fs.copyFileSync('scripts/release/lib/RuntimeLayerPolicy.mjs', path.join(context, 'release-tools/RuntimeLayerPolicy.mjs'));
  fs.copyFileSync(path.join(previousDirectory, 'release-manifest.json'), path.join(context, 'release-tools/release-manifest.json'));
  fs.copyFileSync('config/release/linux-x64/Dockerfile', path.join(context, 'Dockerfile'));
  assert.match(image.baseDigest, /^node@sha256:[a-f0-9]{64}$/);
  const idFile = path.join(run, 'previous-image-id.txt');
  docker(['build', '--network=none', '--platform=linux/amd64', '--iidfile', idFile, '--build-arg', 'NODE_RUNTIME_IMAGE=' + image.baseDigest, context]);
  const imageId = fs.readFileSync(idFile, 'utf8').trim(); assert.match(imageId, /^sha256:[a-f0-9]{64}$/);
  const probe = `import fs from 'node:fs';import {verifyRuntimeLayer} from '/opt/release-tools/RuntimeLayerPolicy.mjs';if(process.getuid()===0)throw Error('ROOT_FORBIDDEN');console.log(JSON.stringify(verifyRuntimeLayer(process.cwd(),JSON.parse(fs.readFileSync('/opt/release-tools/release-manifest.json')),JSON.parse(fs.readFileSync('runtime-layer.json')))));`;
  const nativeProbe = JSON.parse(docker(['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--entrypoint=node', imageId, '--input-type=module', '-e', probe]));
  const result = { ...compatibility, imageId, previousManifestSha256: previousDigest, previousApiArtifactSha256: api.sha256, nativeProbe, previousRuntimeBooted: false };
  fs.writeFileSync(path.join(run, 'rollback-image.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}
