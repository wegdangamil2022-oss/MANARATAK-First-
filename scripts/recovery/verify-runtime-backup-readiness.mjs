#!/usr/bin/env node
import fs from 'node:fs';
import { backupEvidence } from './BackupEvidencePolicy.mjs';
import { required } from '../release/lib/ReleaseContracts.mjs';
const read = (name) => {
  const input = required(name);
  return JSON.parse(input.startsWith('{') ? input : fs.readFileSync(input, 'utf8'));
};
const result = backupEvidence(
  read('RECOVERY_POSTGRES_READINESS_JSON'),
  read('RECOVERY_ASSET_READINESS_JSON'),
  required('RECOVERY_AUTHORITY_PUBLIC_KEY'),
  required('SOURCE_SHA'),
);
console.log(`RECOVERY_RUNTIME_BACKUP_READINESS=${result.status}`);
if (result.status !== 'PASS') process.exitCode = 1;
