import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { R14_PREVIOUS_RELEASE } from './lib/R14RollbackContracts.mjs';

// This preflight does not approve a new pair. The runtime guard in
// prepareRollbackImage remains authoritative and still rejects changed code.
assert.equal(process.argv.length, 5, 'ROLLBACK_ELIGIBILITY_OUTPUTS_REQUIRED');
const [receiptPath, actionsOutput, actionsSummary] = process.argv.slice(2);
const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sourceSha = git(['rev-parse', 'HEAD']);
git(['merge-base', '--is-ancestor', R14_PREVIOUS_RELEASE.sourceSha, sourceSha]);
const changedRuntimePaths = git(['diff', '--name-only', R14_PREVIOUS_RELEASE.sourceSha, sourceSha, '--', 'apps/api', 'apps/web', 'apps/admin', 'packages', 'vendor', 'package.json', 'package-lock.json']).split('\n').filter(Boolean);
const eligible = changedRuntimePaths.length === 0;
const receipt = {
  sourceSha, previousSourceSha: R14_PREVIOUS_RELEASE.sourceSha,
  status: eligible ? 'ELIGIBLE_FOR_EXISTING_SCOPED_DIAGNOSTIC' : 'BLOCKED_RUNTIME_COMPATIBILITY_REVIEW_REQUIRED',
  eligible, changedRuntimePaths, rollbackExecuted: false, rollbackPassed: false,
  formalAcceptance: false, productionAuthorized: false,
};
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.appendFileSync(actionsOutput, `eligible=${eligible}\n`);
fs.appendFileSync(actionsSummary, `### Scoped R14 rollback preflight\n\n${receipt.status}\n\nCurrent: ${sourceSha}\n\nPrevious: ${receipt.previousSourceSha}\n\n${eligible ? 'Eligible for the unchanged-implementation diagnostic; its execution must still pass.' : 'Rollback is blocked, not passed. The previous artifact lacks a runtime repair; a newly reviewed compatible pair is required. Other independent diagnostics continue.'}\n\nChanged runtime paths: ${changedRuntimePaths.join(', ') || 'none'}\n`);
console.log(JSON.stringify(receipt));
