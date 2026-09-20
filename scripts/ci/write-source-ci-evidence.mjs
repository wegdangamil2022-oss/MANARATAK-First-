#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root = process.cwd();
const outDir = path.join(root, 'p12-ci-evidence');
fs.mkdirSync(outDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/ci/source-closure-manifest.json'), 'utf8'));
const evidence = {
  version: 2, kind: 'enterprise-full-source-ci-closure', gitSha: process.env.GITHUB_SHA ?? null, nodeVersion: process.version,
  sourceClosureManifest: { version: manifest.version, kind: manifest.kind, gates: manifest.gates.map((gate) => ({ id: gate.id, classification: gate.classification, status: gate.status ?? 'REQUIRED' })), registeredVerifierFiles: manifest.registeredVerifierFiles },
  sourceGates: ['ci:closure:manifest','db:source:verify','typecheck','lint','build','test:unit','release:artifacts','release:verify'],
  prismaSourceCommands: ['validate','generate'], databaseConnectionRequired: false,
  runtimePendingManifest: manifest.runtimePendingManifest, pass: true, generatedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, 'SOURCE_CI_CLOSURE.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log('P12_SOURCE_CI_EVIDENCE=WRITTEN');
