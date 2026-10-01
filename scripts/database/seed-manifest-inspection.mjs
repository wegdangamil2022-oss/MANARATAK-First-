import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Source-only validation. Never constructs a database client or runs a seed.
export function inspectSeedManifest(manifest, root) {
  const blockers = [];
  const sourceErrors = [];
  if (manifest.version !== 1 || !manifest.seedSetVersion || !Array.isArray(manifest.steps)) {
    return { steps: [], blockers, sourceErrors: ['MANIFEST_SHAPE_INVALID'] };
  }
  const seenIds = new Set();
  const seenOrders = new Set();
  const steps = [...manifest.steps].sort((a, b) => a.order - b.order).map(step => {
    if (!step.id || seenIds.has(step.id)) sourceErrors.push(`DUPLICATE_OR_MISSING_STEP_ID:${step.id ?? '(missing)'}`);
    if (!Number.isInteger(step.order) || seenOrders.has(step.order)) sourceErrors.push(`DUPLICATE_OR_INVALID_STEP_ORDER:${step.id}`);
    seenIds.add(step.id); seenOrders.add(step.order);
    if (step.required && step.state !== 'READY') blockers.push(`${step.id}:${step.state}`);
    if (step.script && !fs.existsSync(path.join(root, step.script))) sourceErrors.push(`SCRIPT_MISSING:${step.id}:${step.script}`);
    if (step.required && step.state === 'READY' && (!step.script || !step.sourcePath || !step.sourceSha256 || !step.sourceVersion || !step.provenance || !step.expected)) {
      sourceErrors.push(`READY_SOURCE_CONTRACT_MISSING:${step.id}`);
    }
    if (step.sourcePath) {
      const full = path.join(root, step.sourcePath);
      if (!fs.existsSync(full)) sourceErrors.push(`SOURCE_MISSING:${step.id}:${step.sourcePath}`);
      else if (step.sourceSha256 && createHash('sha256').update(fs.readFileSync(full)).digest('hex') !== step.sourceSha256) {
        sourceErrors.push(`SOURCE_HASH_MISMATCH:${step.id}`);
      }
    }
    return step;
  });
  return { steps, blockers, sourceErrors };
}
