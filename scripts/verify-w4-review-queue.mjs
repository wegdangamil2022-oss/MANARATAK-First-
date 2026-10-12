// Behavioral owner/consumer contract regressions only. No DB, providers or E2E.
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'tests/review-queue/section24.test.ts'], { stdio: 'inherit' });
if (result.error) console.error('REVIEW_QUEUE_CHECK_START_FAILED');
process.exit(result.status ?? 1);
