import fs from 'node:fs';
import { analyzeDiReachability } from './lib/di-reachability.mjs';

const manifestPath = 'docs/remediation/DI_RUNTIME_REACHABILITY_MANIFEST.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const analysis = analyzeDiReachability();
const errors = [];
if (analysis.unreachable.length) errors.push(`Unreachable production DI registrations: ${analysis.unreachable.join(', ')}`);
if (manifest.registrationCount !== analysis.registrationCount) errors.push(`Manifest registrationCount=${manifest.registrationCount}, actual=${analysis.registrationCount}`);
const manifestNames = new Set((manifest.registrations ?? []).map((entry) => entry.name));
for (const entry of analysis.registrations) {
  if (!manifestNames.has(entry.name)) errors.push(`Registration missing from manifest: ${entry.name}`);
}
for (const entry of manifest.registrations ?? []) {
  if (!analysis.registrations.some((actual) => actual.name === entry.name)) errors.push(`Stale registration remains in manifest: ${entry.name}`);
  if (entry.classification !== 'RUNTIME_REACHABLE') errors.push(`Production DI manifest classification must be RUNTIME_REACHABLE: ${entry.name}`);
}
const deferredNames = new Set((manifest.deferredOrRemovedSource ?? []).map((entry) => entry.registration));
for (const forbidden of ['manageMonitorsUseCase','manageLogsUseCase','manageSecurityPoliciesUseCase','manageConfigurationsUseCase','manageIntegrationsUseCase','manageLocalizationsUseCase','serviceOperationsUseCases','careerEngagementUseCases','monitoringRouter']) {
  if (!deferredNames.has(forbidden)) errors.push(`Deferred source classification missing: ${forbidden}`);
  if (analysis.registrations.some((entry) => entry.name === forbidden)) errors.push(`Deferred registration leaked back into production DI: ${forbidden}`);
}
const container = fs.readFileSync('apps/api/src/infrastructure/di/container.ts', 'utf8');
if (container.includes('createInMemoryPrismaClient')) errors.push('Obsolete createInMemoryPrismaClient shadow authority remains in production container.');
if (fs.existsSync('scripts/inspect_legacy.ts')) errors.push('Obsolete scripts/inspect_legacy.ts remains in canonical scripts.');
if (errors.length) {
  console.error('DI_REACHABILITY_VERIFY=FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`DI_REACHABILITY_VERIFY=PASS registrations=${analysis.registrationCount} reachable=${analysis.reachableCount} unreachable=0`);
