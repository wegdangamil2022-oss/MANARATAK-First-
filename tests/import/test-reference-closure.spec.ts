import { expect, it } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const file = 'docs/plans/imports/tests-reference-closure-2026-11-08.plan.json';
it('binds the eight-case closure to its actual receipt without replacing the original source review', () => {
  const bytes = fs.readFileSync(file),
    plan = JSON.parse(bytes.toString('utf8')),
    result = JSON.parse(fs.readFileSync(file.replace('.plan.json', '.result.json'), 'utf8'));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(result.planHash);
  expect(plan.rows).toHaveLength(6);
  expect(plan.relations).toHaveLength(2);
  expect(
    plan.rows.filter((r) => r.resolution.mode === 'SINGLE_PROVIDER').map((r) => r.code),
  ).toEqual(['CSCA']);
  expect(
    plan.rows.filter((r) => r.resolution.mode === 'DECENTRALIZED_ADMINISTRATION')[0].resolution
      .providers,
  ).toEqual([]);
  expect(plan.references.map((r) => r.data.isoCode ?? r.data.iso2Code).sort()).toEqual([
    'TW',
    'fsl',
  ]);
  expect(result.counts.singleProviders + result.counts.reviewedMultipleOrRegional).toBe(234);
  expect(result.localProof.forcedRollback).toBe(true);
});
