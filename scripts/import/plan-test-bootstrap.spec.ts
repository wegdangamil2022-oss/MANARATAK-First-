import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
// @ts-expect-error Operator ESM diagnostic has no declarations.
import {planTestBootstrap} from './plan-test-bootstrap.mjs';
const source=fs.readFileSync('workspace/import-sources/international-tests/reconciliation/final_matching_data.json','utf8');
const target={environment:'independent-development',projectId:'test-project',branchId:'test-branch',observedAt:'2026-10-23T00:00:00Z',providers:0,families:0,tests:0,identities:0,roles:0,roleAssignments:0};
describe('target-aware test bootstrap diagnostic',()=>{
 it('retains all historical classifications and blocks replacements on the empty target',()=>{
  const report=planTestBootstrap(source,target);expect(report.counts).toEqual({NEW_TEST:9,REPLACE_EXISTING:46,REVIEW_REQUIRED:1});
  expect(report.entries.filter((entry:{action:string})=>entry.action==='HOLD_HISTORICAL_REPLACE_WITHOUT_TARGET')).toHaveLength(46);
  expect(report.entries.every((entry:{targetId:unknown;providerId:unknown})=>entry.targetId===null&&entry.providerId===null)).toBe(true);expect(report.readyToWrite).toBe(false);expect(report.databaseWrites).toBe(0);
 });
 it('requires identity reconciliation for every entry if the target is not empty',()=>{expect(planTestBootstrap(source,{...target,tests:1}).entries.every((entry:{action:string})=>entry.action==='LIVE_IDENTITY_RECONCILIATION_REQUIRED')).toBe(true);});
 it('rejects missing observations and duplicate source identities',()=>{
  expect(()=>planTestBootstrap(source,{...target,identities:undefined})).toThrow('TARGET_COUNTS_REQUIRED');
  const manifest=JSON.parse(source);manifest.matching_rows[1]=manifest.matching_rows[0];expect(()=>planTestBootstrap(JSON.stringify(manifest),target)).toThrow('SOURCE_IDENTITY_INVALID');
 });
});
