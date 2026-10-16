#!/usr/bin/env node
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {assertRegularArtifactInputs} from './lib/ArtifactInputPolicy.mjs';
import {tarLocalPath} from './lib/DiagnosticProcess.mjs';
import {runtimeExternalModules} from './lib/RuntimeModules.mjs';
import { requireSha, REPOSITORY } from './lib/ReleaseContracts.mjs';
const root = process.cwd(),
  out = path.resolve(process.env.RELEASE_ARTIFACT_OUTPUT_DIR ?? path.join(root, 'release-artifacts'));
const sourceSha = requireSha(
  process.env.SOURCE_SHA ||
    process.env.GITHUB_SHA ||
    childProcess.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
);
if (Number(process.versions.node.split('.')[0]) !== 22 || Number(process.versions.node.split('.')[1]) < 16)
  throw new Error('RELEASE_BUILD_NODE_VERSION_MISMATCH');
const head = childProcess.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (
  sourceSha !== head ||
  (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== REPOSITORY)
)
  throw new Error('RELEASE_BUILDER_SOURCE_MISMATCH');
childProcess.execFileSync('git', ['diff', '--quiet', 'HEAD', '--'], { stdio: 'pipe' });
if(childProcess.execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())
  throw new Error('RELEASE_CLEAN_SOURCE_REQUIRED');
if(fs.existsSync(out))throw new Error('RELEASE_FRESH_OUTPUT_REQUIRED');
const realRoot=fs.realpathSync(root),realParent=fs.realpathSync(path.dirname(out));
if(realParent.startsWith(realRoot+path.sep)||(realParent===realRoot&&path.basename(out)!=='release-artifacts'))
  throw new Error('RELEASE_OUTPUT_PATH_INVALID');
fs.mkdirSync(out,{mode:0o700});

const units = [
  [
    'api',
    [
      'apps/api/dist',
      'packages/infrastructure/assets/certificates',
      'packages/infrastructure/package.json',
      'packages/infrastructure/prisma/schema.prisma',
      'packages/infrastructure/prisma/migrations',
      'vendor/awilix-core',
      'package.json',
      'package-lock.json',
    ],
  ],
  ...['web','admin'].map(unit=>[unit,[`apps/${unit}/dist`,
    'scripts/release/serve-static-artifact.mjs',
    'scripts/release/lib/StaticBuildPolicy.mjs',
    'scripts/release/lib/StaticScriptPolicy.mjs',
    'scripts/release/lib/ReleaseContracts.mjs']]),
];
for(const [,items] of units)assertRegularArtifactInputs(root,items);
for (const unit of ['web', 'admin']) {
  const directory = path.join(root, `apps/${unit}/dist`),
    index = path.join(directory, 'index.html');
  let html = fs
    .readFileSync(index, 'utf8')
    .replace(/<meta name="manaratak-build-sha" content="[^"]*">/g, '');
  if (!html.includes('</head>')) throw new Error('RELEASE_HTML_HEAD_MISSING');
  html = html.replace('</head>', `<meta name="manaratak-build-sha" content="${sourceSha}"></head>`);
  fs.writeFileSync(index, html);
  fs.writeFileSync(
    path.join(directory, 'manaratak-build.json'),
    JSON.stringify({ version: 1, unit, sourceSha }) + '\n',
  );
}



const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const artifacts = [];
const externalModules=runtimeExternalModules(JSON.parse(fs.readFileSync('apps/api/dist/server.meta.json','utf8')));
for (const [name, items] of units) {
  for (const i of items)
    if (!fs.existsSync(path.join(root, i))) throw new Error(`RELEASE_INPUT_MISSING:${i}`);
  assertRegularArtifactInputs(root,items);
  const target = path.join(out, `manaratak-${name}-${sourceSha}.tar`);
  childProcess.execFileSync(
    'tar',
    [
      '--force-local',
      '--sort=name',
      '--mtime=UTC 1970-01-01',
      '--owner=0',
      '--group=0',
      '--numeric-owner',
      '-cf',
      tarLocalPath(target),
      ...items,
    ],
    { cwd: root, stdio: 'inherit' },
  );
  artifacts.push({
    unit: name,
    file: path.basename(target),
    sha256: sha(target),
    size: fs.statSync(target).size,
  });
}
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const components = Object.entries(lock.packages ?? {})
  .filter(([k, v]) => k && v?.version)
  .map(([k, v]) => ({
    type: 'library',
    name: k.replace(/^node_modules\//, ''),
    version: v.version,
    purl: `pkg:npm/${encodeURIComponent(k.replace(/^node_modules\//, ''))}@${v.version}`,
  }));
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: { type: 'application', name: 'MANARATAK', version: sourceSha },
  },
  components,
};
fs.writeFileSync(path.join(out, 'release-sbom.cdx.json'), JSON.stringify(sbom, null, 2) + '\n');
const manifest = {
  version: 2,
  kind: 'MANARATAK_IMMUTABLE_RELEASE',
  sourceSha,
  nodeVersion: process.version,
  createdAt: new Date().toISOString(),
  artifacts,
  sbom: { file: 'release-sbom.cdx.json', sha256: sha(path.join(out, 'release-sbom.cdx.json')) },
  sourceLedger: {
    taskInventorySha256: sha('config/release/section-task-inventory.json'),
    section27Closed:
      JSON.parse(fs.readFileSync('docs/reviews/section-27-task-status.json', 'utf8'))
        .sectionClosed === true,
  },
  runtimeRequirements: {
    nodeMajor: 22,
    lockSha256: sha('package-lock.json'),
    prismaSchemaSha256: sha('packages/infrastructure/prisma/schema.prisma'),
    generatedPrismaClientRequired: true,
    externalModules,
    bootEvidence: 'UNVERIFIED',
    deploymentUnits: ['api', 'web', 'admin'],
  },
  provenance: {
    repository: REPOSITORY,
    workflow: process.env.GITHUB_WORKFLOW_REF ?? 'LOCAL_SOURCE_ONLY',
    builder:
      process.env.GITHUB_ACTIONS === 'true'
        ? 'github-actions/Enterprise CI Pipeline'
        : 'LOCAL_SOURCE_ONLY',
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  },
};
fs.writeFileSync(path.join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(
  path.join(out, 'SHA256SUMS'),
  [
    ...artifacts.map((a) => `${a.sha256}  ${a.file}`),
    `${manifest.sbom.sha256}  ${manifest.sbom.file}`,
  ].join('\n') + '\n',
);
console.log(`RELEASE_ARTIFACTS=BUILT sourceSha=${sourceSha} units=${artifacts.length}`);
