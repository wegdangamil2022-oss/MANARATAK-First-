#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredComposeServices, extractOperationalPaths, findProductionReadyStatusClaims, hasRebaselineOpenStatusRows, parseComposeServiceNames } from './lib/w7-documentation-contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const checks = [];
const check = (id, ok, detail='') => checks.push({ id, ok: Boolean(ok), detail });

// 104 / dependency 0031: docs navigation + final relationship authority.
const docsReadme = read('docs/README.md');
const topDocDirs = fs.readdirSync(path.join(root, 'docs'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const phaseRoots = fs.readdirSync(path.join(root, 'docs/phases'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const matrix = read('docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md');
const p23p24Trace = read('docs/remediation/P23_P24_REBASELINE_TRACEABILITY.md');
check('MNT-AUD-0003', topDocDirs.every((name) => docsReadme.includes(`\`${name}/\``)) && phaseRoots.every((name) => docsReadme.includes(`\`${name}\``)), `topDirs=${topDocDirs.length} phases=${phaseRoots.length}`);
check('MNT-AUD-0031_DEP', matrix.includes('ACTIVE — SOURCE_REBASELINED / RUNTIME_EVIDENCE_PENDING') && !hasRebaselineOpenStatusRows(matrix) && !matrix.includes('**Status:** ACTIVE — REBASELINE_REQUIRED') && p23p24Trace.includes('P23_P24_SOURCE_REBASELINE = CLOSED'));

// 105: lifecycle truth, with a semantic status-line guard rather than broad word banning.
const lifecycle = read('docs/governance/COMPLETION_STATUS_LIFECYCLE.md');
const phaseEntries = walk(path.join(root, 'docs/phases')).filter((p) => p.endsWith('.md')).map((p) => ({ file: path.relative(root, p), text: fs.readFileSync(p, 'utf8') }));
const readinessFindings = findProductionReadyStatusClaims(phaseEntries);
check('MNT-AUD-0019', readinessFindings.length === 0 && ['SOURCE_COMPLETE','RUNTIME_VERIFIED','PRODUCTION_READY','PENDING_NON_BLOCKING'].every((token) => lifecycle.includes(token)), readinessFindings.map((f) => `${f.file}:${f.line}`).join(','));

// 106: active brand authority follows semantic tokens; old emerald brand anchor is gone.
const p24 = read('docs/phases/phase-24-enterprise-public-platform/phase-24-03-enterprise-public-platform-public-pages-user-experience.md');
const css = read('apps/web/src/features/public-template/template.css').toLowerCase();
check('MNT-AUD-0023', ['#142b5f','#0e7c86','#d6a43b','#f2cd78'].every((token) => css.includes(token)) && ['#142B5F','#0E7C86','#D6A43B','#F2CD78'].every((token) => p24.includes(token)) && !p24.includes('**Emerald Green:** Primary brand anchor'));

// 107: Phase 05 matrix is code-aligned and source-checked against critical DI bindings.
const p05 = read('docs/phases/phase-05-core-implementation/phase-05-traceability-matrix.md');
const p05Rows = p05.split(/\r?\n/).filter((line) => /^\| [^|-].* \| `(?:DURABLE|DEVELOPMENT_ONLY|UNAVAILABLE_FAIL_CLOSED|DEFERRED_UNMOUNTED|RUNTIME_PROOF_PENDING)` \|/.test(line));
const di = read('apps/api/src/infrastructure/di/container.ts');
const criticalDi = [
  'new PrismaNotificationIntentRepository', 'new PrismaNotificationTemplateRepository', 'new PrismaBackgroundJobRepository',
  'new PrismaEnterpriseEventRepository', 'new PrismaWorkflowRepository', 'new PrismaSearchRequestRepository',
  'new PrismaApiServiceRepository', 'new PrismaSharedComponentRepository', "createUnavailableCapability('cachePersistence')",
];
check('MNT-AUD-0051', p05Rows.length === 20 && criticalDi.every((token) => di.includes(token)) && p05.includes('PrismaTransactionalOutboxStore') && !p05.includes('No transaction outbox table exist in the DB'), `classified=${p05Rows.length}/20`);

// 108: operational docs only claim executable topology/paths.
const manual = read('docs/operations/containerization-and-ci.md');
const compose = read('docker-compose.yml');
const actualServices = parseComposeServiceNames(compose);
const claimedServices = extractDeclaredComposeServices(manual);
const missingPaths = extractOperationalPaths(manual).filter((rel) => !exists(rel));
const ci = read('.github/workflows/ci.yml');
check('MNT-AUD-0052', JSON.stringify(actualServices) === JSON.stringify(claimedServices) && missingPaths.length === 0 && !manual.includes('local-compose-up.sh') && !manual.includes('local-compose-down.sh') && !/playwright/i.test(ci) && exists('.github/workflows/release-promotion.yml'), `services=${actualServices.join(',')} missingPaths=${missingPaths.join(',')}`);

// 109: root layout matches actual packages.
const rootReadme = read('README.md');
const packageDirs = fs.readdirSync(path.join(root, 'packages'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
check('MNT-AUD-0004', !rootReadme.includes('packages/utils') && packageDirs.every((name) => rootReadme.includes(`packages/${name}`)), `packages=${packageDirs.length}`);

// W7 final authority synchronization.
const authorityDocs = [
  'docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md',
  'docs/phases/phase-23-enterprise-administration-portal/phase-23-02-enterprise-administration-portal-structure-contracts.md',
  'docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md',
  'docs/phases/phase-24-enterprise-public-platform/phase-24-01-enterprise-public-platform-architecture-specification.md',
  'docs/phases/phase-24-enterprise-public-platform/phase-24-02-enterprise-public-platform-structure-contracts.md',
  'docs/phases/phase-24-enterprise-public-platform/phase-24-03-enterprise-public-platform-public-pages-user-experience.md',
  'docs/phases/phase-24-enterprise-public-platform/phase-24-04-public-page-detail-requirements-backlog.md',
];
check('P23_P24_FINAL_AUTHORITY', authorityDocs.every((rel) => read(rel).includes('**Status:** SOURCE_REBASELINED — RUNTIME_EVIDENCE_PENDING')));

const w7Closure = read('docs/remediation/W7_CLOSED_2026-09-07.md');
const recount = read('docs/remediation/W7_FINAL_REMEDIATION_RECOUNT_2026-09-07.md');
const pending = read('docs/remediation/W7_RUNTIME_PENDING_CHECKS.md');
const manifest = JSON.parse(read('scripts/ci/source-closure-manifest.json'));
check('W7_FINAL_EVIDENCE', w7Closure.includes('W7 CLOSED — SOURCE VERIFIED') && recount.includes('SOURCE_OPEN = 0') && pending.includes('PENDING_NON_BLOCKING') && pending.includes('PENDING_EXTERNAL_GOVERNANCE') && manifest.runtimePendingManifest === 'docs/remediation/W7_RUNTIME_PENDING_CHECKS.md');

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.id}${item.detail ? ` :: ${item.detail}` : ''}`);
const failed = checks.filter((c) => !c.ok);
console.log(`W7_DOCUMENTATION_CLOSURE=${failed.length ? 'FAIL' : 'PASS'} ${checks.length-failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
