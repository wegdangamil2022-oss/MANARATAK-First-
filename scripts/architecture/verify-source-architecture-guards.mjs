#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { collectSourceArchitectureViolations } from './source-architecture-guard-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const violations = collectSourceArchitectureViolations(root);

const grouped = new Map();
for (const item of violations) grouped.set(item.kind, (grouped.get(item.kind) ?? 0) + 1);
for (const [kind, count] of [...grouped.entries()].sort()) console.error(`SOURCE_ARCH_GUARD_${kind.toUpperCase().replace(/-/g, '_')}=${count}`);

if (violations.length) {
  console.error(`SOURCE_ARCHITECTURE_GUARD=FAIL ${violations.length}`);
  for (const item of violations) console.error(`FAIL ${item.kind} ${item.file}:${item.line} :: ${item.detail}`);
  process.exit(1);
}

console.log('SOURCE_ARCHITECTURE_GUARD=PASS');
console.log('SOURCE_ARCHITECTURE_GUARD_RULES=PrismaBoundary,CanonicalIdentity,PublicLiveFixtures,P15LocalStorage,P23ControlPlane,P17VendorAuthority,P13P14CertificateBoundary,RoadmapAuthority,CrossPhaseMatrix,OperationalTooling');
