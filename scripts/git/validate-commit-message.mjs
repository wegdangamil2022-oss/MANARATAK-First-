#!/usr/bin/env node
import process from 'node:process';

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('Commit message is required.');
  process.exit(2);
}

const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .{3,}$/;
const generated = /^(Merge|Revert)\b.+/;

if (!conventional.test(message) && !generated.test(message)) {
  console.error(`Invalid commit message: ${message}`);
  console.error('Expected Conventional Commit format, e.g. feat(api): add endpoint');
  process.exit(1);
}

console.log(`COMMIT_MESSAGE_VALID=${message}`);
