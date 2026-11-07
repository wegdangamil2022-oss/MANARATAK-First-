import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  verifyReviewedTestRelationships,
  reviewHash,
} from '../../scripts/import/reviewed-test-relationships.mjs';
const root = process.cwd(),
  file = path.join(root, 'docs/plans/imports/tests-source-relationships-2026-11-08.plan.json');
const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
const manifest = fs.readFileSync(
  path.join(
    root,
    'workspace/import-sources/international-tests/reviewed-20261107/catalog-manifest.json',
  ),
);
describe('reviewed test source relationships', () => {
  it('proves literal evidence for the complete reviewed manifest without a database', () => {
    const receipt = JSON.parse(fs.readFileSync(file.replace('.plan.json', '.result.json'), 'utf8'));
    expect(reviewHash(fs.readFileSync(file))).toBe(receipt.planHash);
    const proof = verifyReviewedTestRelationships(plan, manifest, root);
    expect(proof.owners).toBe(plan.rows.length);
    expect(plan.rows.filter((r) => r.provider?.decision === 'LINK')).toHaveLength(139);
    expect(
      plan.rows.filter((r) => r.provider?.decision === 'NO_SINGLE_SOURCE_PROVIDER'),
    ).toHaveLength(6);
    const ielts = plan.rows.find((r) => r.code === 'IELTS').provider;
    expect(ielts.providerName).toBe('IELTS (joint partnership)');
    expect(ielts.excerpt).toContain('IDP IELTS');
    expect(ielts.excerpt).toContain('Cambridge University Press');
  });
  it('rejects altered source manifest bytes', () => {
    expect(() => verifyReviewedTestRelationships(plan, Buffer.from('{}'), root)).toThrow(
      'SOURCE_MANIFEST_CHANGED',
    );
  });
  it('rejects invented source evidence', () => {
    const forged = structuredClone(plan);
    forged.rows[0].relationships[0].excerpt = 'invented condition not in original guide';
    expect(() => verifyReviewedTestRelationships(forged, manifest, root)).toThrow(
      'NON_LITERAL_SOURCE_EVIDENCE',
    );
  });
  it('rejects duplicate owners and relationships', () => {
    const duplicate = structuredClone(plan);
    duplicate.rows.push(duplicate.rows[0]);
    expect(() => verifyReviewedTestRelationships(duplicate, manifest, root)).toThrow(
      'DUPLICATE_OWNER',
    );
    duplicate.rows.pop();
    duplicate.rows[0].relationships.push(duplicate.rows[0].relationships[0]);
    expect(() => verifyReviewedTestRelationships(duplicate, manifest, root)).toThrow(
      'DUPLICATE_RELATIONSHIP',
    );
  });
  it('keeps missing references explicit and never substitutes French for French Sign Language or another country for Taiwan', () => {
    expect(plan.unresolvedReferences.map((r) => r.referenceCode).sort()).toEqual(['TW', 'fsl']);
    expect(
      plan.rows.find((r) => r.code === 'DCL').relationships.some((r) => r.referenceCode === 'fsl'),
    ).toBe(false);
    expect(
      plan.rows
        .find((r) => r.code === 'GSAT_Taiwan')
        .relationships.some((r) => r.kind === 'COUNTRY'),
    ).toBe(false);
    expect(reviewHash(manifest)).toBe(plan.sourceManifestHash);
  });
});
