#!/usr/bin/env node
import process from 'node:process';

const branch = (process.argv[2] ?? '').trim();
if (!branch) {
  console.error('Branch name is required.');
  process.exit(2);
}

const protectedBranches = new Set(['main', 'develop']);
const categorized = /^(feat|fix|chore|docs|refactor|test|build|ci|perf|hotfix|release|revert)\/[a-z0-9][a-z0-9._/-]*$/;
const dependabot = /^dependabot\/(github_actions|npm_and_yarn)\/[a-z0-9][a-z0-9._/-]*$/;

if (!protectedBranches.has(branch) && !categorized.test(branch) && !dependabot.test(branch)) {
  console.error(`Invalid branch name: ${branch}`);
  console.error('Expected main/develop or <type>/<lowercase-description>.');
  process.exit(1);
}

console.log(`BRANCH_NAME_VALID=${branch}`);
