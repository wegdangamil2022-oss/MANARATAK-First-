#!/usr/bin/env node
import process from 'node:process';

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('Commit message is required.');
  process.exit(2);
}

// Configuration and merge commits are explicit project categories, including
// the already published remediation history. Keep scope/subject validation.
const conventional = /^(feat|fix|security|docs|style|refactor|perf|test|build|ci|chore|revert|config|merge)(\([a-z0-9._/-]+\))?!?: .{3,}$/;
const generated = /^(Merge|Revert)\b.+/;

if (!conventional.test(message) && !generated.test(message)) {
  console.error(`Invalid commit message: ${message}`);
  console.error('Expected Conventional Commit format, e.g. feat(api): add endpoint');
  process.exit(1);
}

console.log(`COMMIT_MESSAGE_VALID=${message}`);
