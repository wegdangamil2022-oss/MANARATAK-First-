#!/usr/bin/env node
import fs from 'node:fs';
const contract=JSON.parse(fs.readFileSync('config/recovery/production-recovery-contract.json','utf8'));
const required=[
  ['identity', contract.kind === 'MANARATAK_PRODUCTION_RECOVERY_CONTRACT'],
  ['RPO <= 5m', Number(contract.objectives?.regionalLossRpoMinutes) <= 5],
  ['RTO <= 60m', Number(contract.objectives?.regionalLossRtoMinutes) <= 60],
  ['PITR >= 30d', Number(contract.objectives?.pitrWindowDays) >= 30],
  ['weekly restore audit', contract.objectives?.restoreAuditCadence === 'WEEKLY'],
  ['PostgreSQL owner', Boolean(contract.postgresql?.owner)],
  ['Asset owner', Boolean(contract.assets?.owner)],
  ['immutable PostgreSQL', /WORM/i.test(contract.postgresql?.immutableCopy ?? '')],
  ['immutable assets', /WORM/i.test(contract.assets?.immutableCopy ?? '')],
  ['runbook', fs.existsSync('docs/operations/PLATFORM_DISASTER_RECOVERY_RUNBOOK.md')],
  ['restore drill', fs.existsSync('scripts/recovery/run-whole-platform-restore-drill.mjs')],
  ['scheduled workflow', fs.existsSync('.github/workflows/recovery-restore-audit.yml')],
];
const failed=required.filter(([,ok])=>!ok);
required.forEach(([name,ok])=>console.log(`${ok?'PASS':'FAIL'} ${name}`));
if(failed.length) process.exit(1);
console.log('RECOVERY_SOURCE_CONTRACT=PASS RUNTIME_RESTORE_EVIDENCE=PENDING_NON_BLOCKING');
