#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzeDiReachability } from './lib/di-reachability.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/remediation/DI_RUNTIME_REACHABILITY_MANIFEST.json');
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const analysis = analyzeDiReachability(root);
if (analysis.unreachable.length) {
  console.error(`DI_REACHABILITY_MANIFEST_GENERATION=FAIL unreachable=${analysis.unreachable.join(',')}`);
  process.exit(1);
}
const manifest = {
  schemaVersion: 1,
  finding: 'MNT-AUD-0109',
  generatedFor: 'Final source reconciliation after W7 — 2026-09-07',
  container: analysis.container,
  registrationCount: analysis.registrationCount,
  reachableCount: analysis.reachableCount,
  unreachable: analysis.unreachable,
  registrations: analysis.registrations,
  deferredOrRemovedSource: previous.deferredOrRemovedSource ?? [],
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`DI_REACHABILITY_MANIFEST_GENERATION=PASS registrations=${analysis.registrationCount} reachable=${analysis.reachableCount}`);
