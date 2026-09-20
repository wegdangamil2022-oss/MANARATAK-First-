#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const phase2Path = 'docs/phases/phase-02-solution-architecture/phase-2-arb-compliance-report.md';
const phase4Path = 'docs/phases/phase-04-architecture-governance/baselines/phase-04-21-report.md';
const registerPath = 'docs/governance/audits/remediation/MANARATAK_MASTER_DEEP_AUDIT_REGISTER_PHASES_2_TO_19_v1.2.md';
const closurePath = 'docs/governance/audits/remediation/W15_SOURCE_REMEDIATION_CLOSURE.md';

for (const p of [phase2Path, phase4Path, registerPath, closurePath]) {
  check(`required_file:${p}`, exists(p));
}

const phase2 = read(phase2Path);
const phase4 = read(phase4Path);
const register = read(registerPath);
const closure = read(closurePath);

check('p2_historical_vs_active_truth', phase2.includes('W15 source-truth reconciliation — 2026-08-26'));
check('p2_source_implemented_classification', phase2.includes('SOURCE_IMPLEMENTED / LIVE_DB_TRANSACTION_AND_RECOVERY_PROOF_PENDING_GOOGLE_STUDIO'));
check('p2_runtime_boundary_explicit', phase2.includes('PENDING_GOOGLE_STUDIO'));
check('p2_stale_no_outbox_claim_removed', !phase2.includes('current source baseline does not yet contain an outbox table'));
check('p2_stale_implementation_pending_row_removed', !phase2.includes('Transactional outbox is designed but not yet persisted or wired at runtime'));

check('p4_upstream_reconciliation_present', phase4.includes('Current source now contains outbox persistence/migration, store/dispatcher, and atomic integration paths'));
check('p4_runtime_proof_not_overclaimed', phase4.includes('RUNTIME_PROOF_REQUIRED') && phase4.includes('Google Studio'));

const sourceEvidence = [
  ['packages/infrastructure/prisma/schema.prisma', 'model TransactionalOutboxRecord'],
  ['packages/infrastructure/prisma/migrations/20260813000000_add_transactional_outbox/migration.sql', null],
  ['packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts', 'PrismaTransactionalOutboxStore'],
  ['packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork.ts', 'PrismaAtomicPersistenceUnitOfWork'],
  ['packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts', 'AtomicAuditedOutboxMutationExecutor'],
  ['packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts', 'TransactionalOutboxDispatcher'],
  ['apps/api/src/infrastructure/di/container.ts', 'PrismaTransactionalOutboxStore'],
];
for (const [p, token] of sourceEvidence) {
  const ok = exists(p) && (!token || read(p).includes(token));
  check(`source_evidence:${p}`, ok);
}

check('register_p2_closed_after_remediation', register.includes('| 152 | `P2-GOV-001` | `CLOSED_AFTER_REMEDIATION` |'));
check('register_p4_resolved_by_upstream', register.includes('| 153 | `P4-GOV-001` | `RESOLVED_BY_UPSTREAM_REMEDIATION` |'));
check('closure_preserves_runtime_boundary', closure.includes('PENDING_GOOGLE_STUDIO') && closure.includes('RUNTIME_PROOF_REQUIRED'));
check('closure_forbids_redundant_p4_patch', closure.includes('No redundant W15 edit is made to Phase 4.21'));

for (const item of checks) console.log(`${item.name}=${item.ok ? 'PASS' : 'FAIL'}${item.detail ? ` ${item.detail}` : ''}`);
const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`W15_SOURCE_VERIFIER=FAIL (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`W15_SOURCE_VERIFIER=PASS (${checks.length}/${checks.length})`);
