#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.resolve(process.argv[2] ?? 'wp-ic-10-results');
fs.mkdirSync(outputDir, { recursive: true });
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// This runner is intentionally invoked only by the Google Studio runtime runbook.
// It writes evidence solely after Playwright exits successfully.
execFileSync(process.execPath, ['node_modules/playwright/cli.js', 'test', '--config=apps/web/playwright.config.ts', 'apps/web/e2e/imported-courses-runtime-closure.spec.ts'], { stdio: 'inherit' });
fs.writeFileSync(path.join(outputDir, 'BROWSER_E2E.json'), `${JSON.stringify({ version: 1, kind: 'browser-e2e', gitSha, pass: true, generatedAt: new Date().toISOString(), detail: 'Imported-course browser E2E passed in the supplied runtime environment.' }, null, 2)}\n`);
